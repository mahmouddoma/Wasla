import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterRenderEffect,
  computed,
  effect,
  untracked,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, min, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { ReceptionPracticeContext } from '../../../../domains/reception-practices';
import { PaymentMethod } from '../../../../domains/finance';
import {
  WalkInSegmentOption,
  CreateWalkInTicketRequest,
  PracticeQueue,
  PracticeTicket,
  TicketActor,
  TicketsApi,
} from '../../../../domains/tickets';

type QueueAction =
  'manual-call' | 'recall' | 'no-response' | 'restore' | 'start' | 'complete' | 'cancel';

/**
 * Queue workspace managing practice queues, live calling, and direct walk-in tickets.
 */
@Component({
  selector: 'app-queue-workspace',
  imports: [FormField, RouterLink, TranslatePipe, PageHeader],
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
  private initialized = false;
  private generation = 0;
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
  protected readonly segments = signal<readonly WalkInSegmentOption[]>([]);
  protected readonly visitTypes = computed(
    () =>
      this.segments().find((segment) => segment.segmentId === this.walkInModel().segmentId)
        ?.visitTypes ?? [],
  );
  protected readonly reasonModel = signal({ reason: '' });
  protected readonly walkInModel = signal({
    patientId: '',
    segmentId: '',
    visitTypeId: '',
    paidAmount: 0,
    paymentMethod: 'Cash' as PaymentMethod,
    referenceNumber: '',
    notes: '',
  });
  protected readonly walkInPrice = computed(
    () =>
      this.visitTypes().find((visit) => visit.visitTypeId === this.walkInModel().visitTypeId)
        ?.price,
  );
  protected readonly reasonForm = form(this.reasonModel, (path) => {
    required(path.reason, { message: 'tickets.validation.reasonRequired' });
  });
  protected readonly walkInForm = form(this.walkInModel, (path) => {
    required(path.patientId, { message: 'tickets.validation.patientRequired' });
    required(path.segmentId, { message: 'tickets.validation.segmentRequired' });
    required(path.visitTypeId, { message: 'tickets.validation.visitTypeRequired' });
    required(path.paidAmount, { message: 'tickets.validation.paymentRequired' });
    required(path.paymentMethod, { message: 'finance.validation.methodRequired' });
    min(path.paidAmount, 0.01, { message: 'tickets.validation.paymentPositive' });
    validate(path.paidAmount, ({ value }) =>
      this.walkInPrice() !== undefined && value() === this.walkInPrice()
        ? undefined
        : { kind: 'priceMismatch', message: 'tickets.validation.paymentExact' },
    );
  });

  protected readonly isDoctor = computed(() => this.actor() === 'Doctor');
  protected readonly canCallNext = computed(() => this.permitted(PERMISSIONS.practiceTicketsCall));
  protected readonly canManualCall = computed(() =>
    this.permitted(PERMISSIONS.practiceTicketsManualCall),
  );
  protected readonly canRestore = computed(() =>
    this.permitted(PERMISSIONS.practiceTicketsRestoreNoShow),
  );
  protected readonly canCancel = computed(() => this.permitted(PERMISSIONS.practiceTicketsCancel));
  protected readonly canViewQueue = computed(() => this.permitted(PERMISSIONS.practiceTicketsView));
  protected readonly canRefund = computed(
    () =>
      this.isDoctor() ||
      (this.reception.allows(PERMISSIONS.practicePaymentsView) &&
        this.reception.allows(PERMISSIONS.practicePaymentsRefund)),
  );
  protected readonly canWalkIn = computed(
    () =>
      this.actor() === 'Reception' &&
      this.reception.currentPracticeId() === this.practiceId() &&
      this.reception.allows(PERMISSIONS.practiceTicketsCreateWalkIn) &&
      this.reception.allows(PERMISSIONS.practiceTicketsRecordPayment),
  );

  private permitted(permission: string): boolean {
    return (
      this.isDoctor() ||
      (this.reception.currentPracticeId() === this.practiceId() &&
        this.reception.allows(permission))
    );
  }
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
    effect(() => {
      const id = this.reception.currentPracticeId();
      if (this.initialized && this.actor() === 'Reception' && id !== this.practiceId()) {
        untracked(() => {
          void this.selectPractice(id);
        });
      }
    });
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
        await this.reception.ensureLoaded();
        this.practices.set(this.reception.practices());
      }
      const requested =
        this.route.snapshot.queryParamMap.get('practiceId') ||
        (this.actor() === 'Reception' ? this.reception.currentPracticeId() : '');
      const initial = this.practices().some((item) => item.id === requested)
        ? requested
        : this.practices().length === 1
          ? this.practices()[0].id
          : '';
      await this.selectPractice(initial);
      this.initialized = true;
    } catch (error) {
      await this.failure(error);
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
    const generation = ++this.generation;
    this.practiceId.set(id);
    if (this.actor() === 'Reception') this.reception.select(id);
    this.selected.set(null);
    this.detailLoading.set(false);
    this.queue.set(this.emptyQueue());
    this.resetWalkIn();
    this.intents.clear();
    if (id && this.canViewQueue()) {
      await this.loadQueue();
      if (generation === this.generation && this.canWalkIn()) await this.loadWalkInOptions();
    }
  }

  protected async loadQueue(): Promise<void> {
    if (!this.practiceId() || !this.canViewQueue() || this.busy()) return;
    const id = this.practiceId(),
      generation = this.generation;
    this.loading.set(true);
    this.messages.set([]);
    try {
      const queue = await firstValueFrom(this.api.queue(id));
      if (generation === this.generation && this.canViewQueue()) this.queue.set(queue);
    } catch (error) {
      if (generation === this.generation) await this.failure(error);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  protected async inspect(ticketId: string): Promise<void> {
    if (!this.practiceId() || !this.canViewQueue()) return;
    const generation = this.generation;
    this.detailLoading.set(true);
    this.messages.set([]);
    this.selected.set(null);
    this.reasonModel.set({ reason: '' });
    try {
      const ticket = await firstValueFrom(this.api.details(this.practiceId(), ticketId));
      if (generation === this.generation && this.canViewQueue()) this.selected.set(ticket);
    } catch (error) {
      if (generation === this.generation) await this.failure(error);
    } finally {
      if (generation === this.generation) this.detailLoading.set(false);
    }
  }

  protected async callNext(): Promise<void> {
    if (!this.canCallNext() || !this.practiceId()) return;
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
      const value = this.walkInModel();
      const body: CreateWalkInTicketRequest = {
        ...value,
        paidAmount: price,
        referenceNumber: value.referenceNumber.trim() || null,
        notes: value.notes.trim() || null,
      };
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
    this.walkInModel.update((model) => ({
      ...model,
      [field]: value,
      ...(field === 'segmentId' ? { visitTypeId: '' } : {}),
    }));
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
    if (action === 'restore' && ticket.isRefunded) return;
    if (action === 'start' && !this.canStart()) return;
    if (action === 'complete' && !this.canComplete()) return;
    const allowed =
      action === 'manual-call'
        ? this.canManualCall()
        : action === 'restore'
          ? this.canRestore()
          : action === 'cancel'
            ? this.canCancel()
            : action === 'start'
              ? this.canStart()
              : action === 'complete'
                ? this.canComplete()
                : this.canCallNext();
    if (!allowed) return;
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
    const generation = this.generation;
    this.busy.set(true);
    this.messages.set([]);
    try {
      const ticket = await firstValueFrom(request);
      this.intents.delete(signature);
      this.toast.success('tickets.mutationSuccess');
      if (generation !== this.generation) return;
      this.selected.set(ticket);
      await this.loadQueueAfterMutation();
    } catch (error) {
      await this.failure(error);
      if (!(error instanceof HttpErrorResponse && error.status === 403))
        await this.loadQueueAfterMutation();
    } finally {
      this.busy.set(false);
    }
  }

  private async loadQueueAfterMutation(): Promise<void> {
    if (!this.canViewQueue()) return;
    const id = this.practiceId(),
      generation = this.generation;
    try {
      const queue = await firstValueFrom(this.api.queue(id));
      if (generation === this.generation && this.canViewQueue()) this.queue.set(queue);
    } catch (error) {
      await this.failure(error);
    }
  }

  private async loadWalkInOptions(): Promise<void> {
    if (!this.canWalkIn()) return;
    const id = this.practiceId(),
      generation = this.generation;
    try {
      const options = await firstValueFrom(this.api.walkInOptions(id));
      if (generation === this.generation && this.canWalkIn()) this.segments.set(options.segments);
    } catch (error) {
      if (generation === this.generation) await this.failure(error);
    }
  }

  private resetWalkIn(): void {
    this.resetWalkInForm();
    this.segments.set([]);
  }

  private resetWalkInForm(): void {
    this.walkInModel.set({
      patientId: '',
      segmentId: '',
      visitTypeId: '',
      paidAmount: 0,
      paymentMethod: 'Cash',
      referenceNumber: '',
      notes: '',
    });
  }

  private intentKey(signature: string): string {
    const current = this.intents.get(signature);
    if (current) return current;
    const key = createIdempotencyKey();
    this.intents.set(signature, key);
    return key;
  }

  private async failure(error: unknown): Promise<void> {
    if (
      error instanceof HttpErrorResponse &&
      error.status === 403 &&
      this.actor() === 'Reception'
    ) {
      await this.reception.refresh();
      this.practices.set(this.reception.practices());
      this.generation++;
      this.queue.set(this.emptyQueue());
      this.selected.set(null);
      this.resetWalkIn();
      this.messages.set(['reception.accessChanged']);
      this.toast.error('reception.accessChanged');
      return;
    }
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['tickets.operationFailed']);
    this.toast.error(messages[0] || 'tickets.operationFailed');
  }

  private emptyQueue(): PracticeQueue {
    return { inProgress: null, called: null, waiting: [], noShow: [] };
  }
}
