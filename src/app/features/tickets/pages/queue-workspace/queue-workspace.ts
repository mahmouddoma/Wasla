import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, min, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, Observable } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import {
  DoctorPracticePrice,
  DoctorPracticeSegment,
  DoctorPracticesApi,
  DoctorPracticeVisitType,
} from '../../../../domains/doctor-practices';
import { ReceptionPracticeContext } from '../../../../domains/reception-practices';
import {
  CreateWalkInTicketRequest,
  PracticeQueue,
  PracticeTicket,
  TicketActor,
  TicketsApi,
} from '../../../../domains/tickets';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';
import { PlatformFooter } from '../../../../shared/components/platform-footer/platform-footer';

type QueueAction =
  'manual-call' | 'recall' | 'no-response' | 'restore' | 'start' | 'complete' | 'cancel';

@Component({
  selector: 'app-queue-workspace',
  imports: [FormField, RouterLink, TranslatePipe, LanguageSwitcher, PlatformFooter],
  templateUrl: './queue-workspace.html',
  styleUrl: './queue-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueWorkspace implements OnInit {
  private readonly api = inject(TicketsApi);
  private readonly doctorPractices = inject(DoctorPracticesApi);
  protected readonly reception = inject(ReceptionPracticeContext);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  private readonly intents = new Map<string, string>();

  protected readonly actor = signal<TicketActor>('Doctor');
  protected readonly practices = signal<
    readonly { id: string; nameAr: string; nameEn: string | null }[]
  >([]);
  protected readonly practiceId = signal('');
  protected readonly queue = signal<PracticeQueue>(this.emptyQueue());
  protected readonly selected = signal<PracticeTicket | null>(null);
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly busy = signal(false);
  protected readonly messages = signal<readonly string[]>([]);
  protected readonly segments = signal<readonly DoctorPracticeSegment[]>([]);
  protected readonly visitTypes = signal<readonly DoctorPracticeVisitType[]>([]);
  protected readonly prices = signal<readonly DoctorPracticePrice[]>([]);
  protected readonly reasonModel = signal({ reason: '' });
  protected readonly walkInModel = signal({
    patientId: '',
    segmentId: '',
    visitTypeId: '',
    paidAmount: 0,
  });
  protected readonly walkInPrice = computed(
    () =>
      this.prices().find(
        (price) =>
          price.segmentId === this.walkInModel().segmentId &&
          price.visitTypeId === this.walkInModel().visitTypeId,
      )?.price,
  );
  protected readonly reasonForm = form(this.reasonModel, (path) => {
    required(path.reason, { message: 'tickets.validation.reasonRequired' });
  });
  protected readonly walkInForm = form(this.walkInModel, (path) => {
    required(path.patientId, { message: 'tickets.validation.patientRequired' });
    required(path.segmentId, { message: 'tickets.validation.segmentRequired' });
    required(path.visitTypeId, { message: 'tickets.validation.visitTypeRequired' });
    required(path.paidAmount, { message: 'tickets.validation.paymentRequired' });
    min(path.paidAmount, 0.01, { message: 'tickets.validation.paymentPositive' });
    validate(path.paidAmount, ({ value }) =>
      this.walkInPrice() !== undefined && value() === this.walkInPrice()
        ? undefined
        : { kind: 'priceMismatch', message: 'tickets.validation.paymentExact' },
    );
  });

  protected readonly isDoctor = computed(() => this.actor() === 'Doctor');
  protected readonly canCall = computed(
    () =>
      this.isDoctor() ||
      this.reception.allows('PracticeQueue.Manage') ||
      this.reception.allows('DoctorReception.Queue.Call'),
  );
  protected readonly canViewQueue = computed(
    () =>
      this.isDoctor() ||
      this.reception.allows('PracticeQueue.View') ||
      this.reception.allows('DoctorReception.Queue.View') ||
      this.canCall(),
  );
  protected readonly canWalkIn = computed(
    () =>
      this.actor() === 'Reception' &&
      (this.reception.allows('PracticeTickets.CreateWalkIn') ||
        this.reception.allows('PracticeWalkIns.Create')) &&
      this.reception.allows('PracticeTickets.RecordPayment'),
  );
  protected readonly queueOccupied = computed(
    () => !!this.queue().called || !!this.queue().inProgress,
  );
  protected readonly canStart = computed(
    () => this.isDoctor() && this.session.hasPermission(PERMISSIONS.doctorPracticeTicketsStartOwn),
  );
  protected readonly canComplete = computed(
    () =>
      this.isDoctor() && this.session.hasPermission(PERMISSIONS.doctorPracticeTicketsCompleteOwn),
  );

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.drawer()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  async ngOnInit(): Promise<void> {
    this.actor.set(this.route.snapshot.data['actor'] as TicketActor);
    this.loading.set(true);
    try {
      if (this.isDoctor()) {
        this.practices.set(
          (await firstValueFrom(this.doctorPractices.list())).filter((item) => item.isActive),
        );
      } else {
        await this.reception.refresh();
        this.practices.set(this.reception.practices());
      }
      const requested = this.route.snapshot.queryParamMap.get('practiceId') || '';
      const initial = this.practices().some((item) => item.id === requested)
        ? requested
        : this.practices().length === 1
          ? this.practices()[0].id
          : '';
      await this.selectPractice(initial);
    } catch (error) {
      this.failure(error);
    } finally {
      this.loading.set(false);
    }
  }

  protected label(item: { nameAr: string; nameEn?: string | null }): string {
    return this.language.currentLang() === 'en' ? item.nameEn || item.nameAr : item.nameAr;
  }

  protected async selectPractice(idOrEvent: string | Event): Promise<void> {
    const id =
      typeof idOrEvent === 'string' ? idOrEvent : (idOrEvent.target as HTMLSelectElement).value;
    if (id && !this.practices().some((item) => item.id === id)) return;
    this.practiceId.set(id);
    if (this.actor() === 'Reception') this.reception.select(id);
    this.close();
    this.queue.set(this.emptyQueue());
    this.resetWalkIn();
    if (id && this.canViewQueue()) {
      await this.loadQueue();
      if (this.canWalkIn()) await this.loadWalkInOptions();
    }
  }

  protected async loadQueue(): Promise<void> {
    if (!this.practiceId() || !this.canViewQueue() || this.busy()) return;
    this.loading.set(true);
    this.messages.set([]);
    try {
      this.queue.set(await firstValueFrom(this.api.queue(this.practiceId())));
    } catch (error) {
      this.failure(error);
    } finally {
      this.loading.set(false);
    }
  }

  protected async inspect(ticketId: string): Promise<void> {
    if (!this.practiceId()) return;
    this.detailLoading.set(true);
    this.messages.set([]);
    this.selected.set(null);
    this.reasonModel.set({ reason: '' });
    try {
      this.selected.set(await firstValueFrom(this.api.details(this.practiceId(), ticketId)));
    } catch (error) {
      this.failure(error);
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected async callNext(): Promise<void> {
    if (!this.canCall() || !this.practiceId()) return;
    await this.runMutation(
      'call-next',
      this.api.callNext(this.practiceId(), this.intentKey('call-next')),
    );
  }

  protected submitWalkIn(): void {
    submit(this.walkInForm, async () => {
      if (!this.canWalkIn() || !this.practiceId()) return;
      const price = this.walkInPrice();
      if (price === undefined) return;
      const body: CreateWalkInTicketRequest = { ...this.walkInModel(), paidAmount: price };
      await this.runMutation(
        `walk-in:${JSON.stringify(body)}`,
        this.api.createWalkIn(
          this.practiceId(),
          body,
          this.intentKey(`walk-in:${JSON.stringify(body)}`),
        ),
      );
      this.resetWalkInForm();
    });
  }

  protected selectWalkInOption(field: 'segmentId' | 'visitTypeId', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.walkInModel.update((model) => ({ ...model, [field]: value }));
    this.walkInModel.update((model) => ({ ...model, paidAmount: this.walkInPrice() ?? 0 }));
  }

  protected canRecall(ticket: PracticeTicket): boolean {
    const latestAttempt = ticket.callAttempts.at(-1);
    return (
      latestAttempt?.outcome
        ?.toLowerCase()
        .replaceAll(/[^a-z]/g, '')
        .includes('noresponse') ?? false
    );
  }

  protected async act(action: QueueAction): Promise<void> {
    const ticket = this.selected();
    if (!ticket || !this.practiceId()) return;
    const reason = this.reasonModel().reason.trim();
    if ((action === 'manual-call' || action === 'cancel') && !reason) return;
    if (action === 'manual-call' && this.queueOccupied()) return;
    if (action === 'recall' && !this.canRecall(ticket)) return;
    if (action === 'start' && !this.canStart()) return;
    if (action === 'complete' && !this.canComplete()) return;
    if (action !== 'start' && action !== 'complete' && !this.canCall()) return;
    const version = { rowVersion: ticket.rowVersion };
    const reasonBody = { ...version, reason };
    const signature = `${action}:${ticket.ticketId}:${ticket.rowVersion}:${reason}`;
    const key = this.intentKey(signature);
    let request: Observable<PracticeTicket>;
    switch (action) {
      case 'manual-call':
        request = this.api.manualCall(this.practiceId(), ticket.ticketId, reasonBody, key);
        break;
      case 'recall':
        request = this.api.recall(this.practiceId(), ticket.ticketId, version, key);
        break;
      case 'no-response':
        request = this.api.confirmNoResponse(this.practiceId(), ticket.ticketId, version, key);
        break;
      case 'restore':
        request = this.api.restoreNoShow(this.practiceId(), ticket.ticketId, version, key);
        break;
      case 'start':
        request = this.api.start(this.practiceId(), ticket.ticketId, version, key);
        break;
      case 'complete':
        request = this.api.complete(this.practiceId(), ticket.ticketId, version, key);
        break;
      case 'cancel':
        request = this.api.cancel(this.practiceId(), ticket.ticketId, reasonBody, key);
        break;
    }
    await this.runMutation(signature, request);
  }

  protected close(): void {
    if (this.busy()) return;
    this.selected.set(null);
    this.detailLoading.set(false);
    this.reasonModel.set({ reason: '' });
  }

  protected cancelDialog(event: Event): void {
    event.preventDefault();
    this.close();
  }

  protected back(): string {
    return `/workspace/${this.actor().toLowerCase()}`;
  }

  protected statusKey(status: string): string {
    return `tickets.status.${status}`;
  }

  private async runMutation(signature: string, request: Observable<PracticeTicket>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      const ticket = await firstValueFrom(request);
      this.intents.delete(signature);
      this.selected.set(ticket);
      this.toast.success('tickets.mutationSuccess');
      await this.loadQueueAfterMutation();
    } catch (error) {
      this.failure(error);
      await this.loadQueueAfterMutation();
    } finally {
      this.busy.set(false);
    }
  }

  private async loadQueueAfterMutation(): Promise<void> {
    try {
      this.queue.set(await firstValueFrom(this.api.queue(this.practiceId())));
    } catch (error) {
      this.failure(error);
    }
  }

  private async loadWalkInOptions(): Promise<void> {
    try {
      const { segments, visitTypes, prices } = await firstValueFrom(
        forkJoin({
          segments: this.doctorPractices.segments(this.practiceId()),
          visitTypes: this.doctorPractices.visitTypes(this.practiceId()),
          prices: this.doctorPractices.prices(this.practiceId()),
        }),
      );
      this.segments.set(segments.filter((segment) => segment.isActive));
      this.visitTypes.set(
        visitTypes.filter(
          (visitType) => visitType.isActive && visitType.type === 'NewConsultation',
        ),
      );
      this.prices.set(prices);
    } catch (error) {
      this.failure(error);
    }
  }

  private resetWalkIn(): void {
    this.resetWalkInForm();
    this.segments.set([]);
    this.visitTypes.set([]);
    this.prices.set([]);
  }

  private resetWalkInForm(): void {
    this.walkInModel.set({ patientId: '', segmentId: '', visitTypeId: '', paidAmount: 0 });
  }

  private intentKey(signature: string): string {
    const current = this.intents.get(signature);
    if (current) return current;
    const key = createIdempotencyKey();
    this.intents.set(signature, key);
    return key;
  }

  private failure(error: unknown): void {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['tickets.operationFailed']);
    this.toast.error(messages[0] || 'tickets.operationFailed');
  }

  private emptyQueue(): PracticeQueue {
    return { inProgress: null, called: null, waiting: [], noShow: [] };
  }
}
