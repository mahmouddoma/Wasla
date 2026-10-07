import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  untracked,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, min, required, submit, validate, disabled } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { PatientsApi, PatientSearchItem } from '../../../../domains/patients';
import {
  WalkInPatientSearchComponent,
  WalkInPatientSearch,
} from '../../components/walk-in-patient-search/walk-in-patient-search.component';
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
import { FollowUpEligibility, FollowUpsApi } from '../../../../domains/follow-ups';
import {
  WalkInSegmentOption,
  CreateWalkInTicketRequest,
  PracticeQueue,
  PracticeTicket,
  TicketActor,
  TicketsApi,
} from '../../../../domains/tickets';

type QueueAction = 'manual-call' | 'recall' | 'no-response' | 'restore' | 'start' | 'cancel';

/**
 * Practice-scoped Queue, calling actions, and walk-in arrival workflow.
 */
@Component({
  selector: 'app-queue-workspace',
  imports: [
    FormField,
    RouterLink,
    TranslatePipe,
    PageHeader,
    NgTemplateOutlet,
    SideDrawer,
    WalkInPatientSearchComponent,
  ],
  templateUrl: './queue-workspace.html',
  styleUrl: './queue-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueWorkspace implements OnInit {
  private readonly api = inject(TicketsApi);
  private readonly patientsApi = inject(PatientsApi);
  private readonly followUps = inject(FollowUpsApi);
  protected readonly eligibilities = signal<readonly FollowUpEligibility[]>([]);
  protected readonly eligibility = signal<FollowUpEligibility | null>(null);
  protected readonly optionsLoading = signal(false);
  protected readonly optionsFailed = signal(false);
  private optionsSequence = 0;
  private readonly doctorPractices = inject(DoctorPracticesApi);
  protected readonly reception = inject(ReceptionPracticeContext);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);
  private initialized = false;
  private generation = 0;
  private queueSequence = 0;
  private detailSequence = 0;
  private eligibilitySequence = 0;
  private patientSearchSequence = 0;
  private accessStamp = '';
  private readonly intents = new Map<string, string>();

  protected readonly actor = signal<TicketActor>('Doctor');
  protected readonly practices = signal<
    readonly { id: string; nameAr: string; nameEn: string | null }[]
  >([]);
  protected readonly practiceId = signal('');
  protected readonly queue = signal<PracticeQueue>(this.emptyQueue());
  protected readonly selected = signal<PracticeTicket | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly busy = signal(false);
  protected readonly messages = signal<readonly string[]>([]);
  protected readonly walkInOpen = signal(false);
  protected readonly walkInDone = signal<PracticeTicket | null>(null);
  protected readonly acceptedWalkIn = signal<{
    paidAmount: number;
    paymentMethod: PaymentMethod;
    patientName: string;
  } | null>(null);
  protected readonly selectedPatient = signal<PatientSearchItem | null>(null);
  protected readonly patientResults = signal<PatientSearchItem[]>([]);
  protected readonly patientSearchLoading = signal(false);
  protected readonly patientSearched = signal(false);
  protected readonly patientSearchFailed = signal(false);
  protected readonly pendingAction = signal<'manual-call' | 'cancel' | null>(null);
  protected readonly paymentMethods = ['Cash', 'Card', 'Wallet'] as const;
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
  protected readonly walkInChoices = computed(() =>
    this.segments().flatMap((segment) =>
      segment.visitTypes.map((visit) => ({
        key: segment.segmentId + ':' + visit.visitTypeId,
        segmentId: segment.segmentId,
        ...visit,
        segment,
      })),
    ),
  );
  protected readonly reasonForm = form(this.reasonModel, (path) => {
    disabled(path.reason, () => this.busy());
    required(path.reason, { message: 'tickets.validation.reasonRequired' });
  });
  protected readonly walkInForm = form(this.walkInModel, (path) => {
    disabled(path.patientId, () => this.busy());
    disabled(path.referenceNumber, () => this.busy());
    disabled(path.notes, () => this.busy());
    required(path.patientId, { message: 'tickets.validation.patientRequired' });
    required(path.segmentId, { message: 'tickets.validation.segmentRequired' });
    required(path.visitTypeId, { message: 'tickets.validation.visitTypeRequired' });
    required(path.paymentMethod, { message: 'finance.validation.methodRequired' });
    min(path.paidAmount, 0, { message: 'tickets.validation.paymentNonnegative' });
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
      (this.reception.currentPracticeId() === this.practiceId() &&
        this.reception.allows(PERMISSIONS.practicePaymentsView) &&
        this.reception.allows(PERMISSIONS.practicePaymentsRefund)),
  );
  protected readonly canWalkIn = computed(
    () =>
      this.actor() === 'Reception' &&
      this.reception.currentPracticeId() === this.practiceId() &&
      this.reception.allows(PERMISSIONS.practiceTicketsCreateWalkIn) &&
      this.reception.allows(PERMISSIONS.practiceTicketsRecordPayment),
  );
  protected readonly canSearchPatient = computed(
    () =>
      this.canWalkIn() &&
      this.session.hasPermission(PERMISSIONS.patientsSearchBasic) &&
      this.reception.allows(PERMISSIONS.patientsSearchBasic),
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
    () =>
      this.isDoctor() &&
      this.session.hasPermission(PERMISSIONS.doctorPracticeTicketsStartOwn) &&
      this.session.hasPermission(PERMISSIONS.medicalEncountersStartOwn),
  );
  protected readonly canOpenClinical = computed(
    () =>
      this.isDoctor() &&
      this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwn) &&
      this.session.hasPermission(PERMISSIONS.diagnosesViewOwn),
  );

  constructor() {
    effect(() => {
      const id = this.reception.currentPracticeId();
      const stamp =
        [
          PERMISSIONS.practiceTicketsView,
          PERMISSIONS.practiceTicketsCall,
          PERMISSIONS.practiceTicketsManualCall,
          PERMISSIONS.practiceTicketsCancel,
          PERMISSIONS.practiceTicketsRestoreNoShow,
          PERMISSIONS.practiceTicketsCreateWalkIn,
          PERMISSIONS.practiceTicketsRecordPayment,
          PERMISSIONS.patientsSearchBasic,
          PERMISSIONS.followUpEligibilityViewBookingEligibility,
        ]
          .map((code) => this.reception.allows(code))
          .join(':') +
        ':' +
        this.session.hasPermission(PERMISSIONS.patientsSearchBasic);
      if (
        this.initialized &&
        this.actor() === 'Reception' &&
        (id !== this.practiceId() || stamp !== this.accessStamp)
      ) {
        untracked(() => {
          this.accessStamp = stamp;
          void this.selectPractice(id);
        });
      } else this.accessStamp = stamp;
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
    this.queueSequence++;
    this.detailSequence++;
    this.eligibilitySequence++;
    this.practiceId.set(id);
    if (this.actor() === 'Reception') this.reception.select(id);
    this.selected.set(null);
    this.pendingAction.set(null);
    this.detailLoading.set(false);
    this.queue.set(this.emptyQueue());
    this.loading.set(false);
    this.loadFailed.set(false);
    this.messages.set([]);
    this.resetWalkIn();
    this.intents.clear();
    if (id && this.canViewQueue()) await this.loadQueue();
    if (generation === this.generation && this.canWalkIn()) await this.loadWalkInOptions();
  }

  protected async loadQueue(): Promise<void> {
    if (!this.practiceId() || !this.canViewQueue() || this.busy()) return;
    const id = this.practiceId(),
      generation = this.generation,
      sequence = ++this.queueSequence;
    this.loading.set(true);
    this.loadFailed.set(false);
    this.messages.set([]);
    try {
      const queue = await firstValueFrom(this.api.queue(id));
      if (this.current(id, generation) && sequence === this.queueSequence && this.canViewQueue())
        this.queue.set(queue);
    } catch (error) {
      if (this.current(id, generation) && sequence === this.queueSequence) {
        this.loadFailed.set(true);
        await this.failure(error, id, generation);
      }
    } finally {
      if (this.current(id, generation) && sequence === this.queueSequence) this.loading.set(false);
    }
  }

  protected async inspect(ticketId: string): Promise<void> {
    if (!this.practiceId() || !this.canViewQueue() || this.busy()) return;
    this.walkInOpen.set(false);
    this.walkInDone.set(null);
    this.pendingAction.set(null);
    const generation = this.generation,
      id = this.practiceId(),
      sequence = ++this.detailSequence;
    this.detailLoading.set(true);
    this.messages.set([]);
    this.selected.set(null);
    this.reasonModel.set({ reason: '' });
    try {
      const ticket = await firstValueFrom(this.api.details(id, ticketId));
      if (this.current(id, generation) && sequence === this.detailSequence && this.canViewQueue())
        this.selected.set(ticket);
    } catch (error) {
      if (this.current(id, generation) && sequence === this.detailSequence)
        await this.failure(error, id, generation);
    } finally {
      if (this.current(id, generation) && sequence === this.detailSequence)
        this.detailLoading.set(false);
    }
  }

  protected async callNext(): Promise<void> {
    if (!this.canCallNext() || !this.practiceId() || this.busy() || this.queueOccupied()) return;
    await this.runMutation(
      'call-next',
      this.api.callNext(this.practiceId(), this.intentKey('call-next')),
    );
  }

  protected submitWalkIn(): void {
    submit(this.walkInForm, async () => {
      if (!this.canWalkIn() || !this.practiceId() || this.optionsLoading() || this.busy()) return;
      const price = this.walkInPrice();
      if (price === undefined) return;
      const value = this.walkInModel();
      const patientName = this.selectedPatient() ? this.label(this.selectedPatient()!) : '';
      const eligibility = this.eligibility();
      const visit = this.visitTypes().find((v) => v.visitTypeId === value.visitTypeId);
      if (
        !visit ||
        (visit.code === 'FollowUp' &&
          (!eligibility?.canBook || eligibility.patientId !== value.patientId))
      )
        return;
      const body: CreateWalkInTicketRequest = {
        ...value,
        paidAmount: price,
        referenceNumber: value.referenceNumber.trim() || null,
        notes: value.notes.trim() || null,
        ...(eligibility
          ? {
              followUpEligibilityId: eligibility.eligibilityId,
              followUpEligibilityRowVersion: eligibility.rowVersion,
            }
          : {}),
      };
      const succeeded = await this.runMutation(
        `walk-in:${JSON.stringify(body)}`,
        this.api.createWalkIn(
          this.practiceId(),
          body,
          this.intentKey(`walk-in:${JSON.stringify(body)}`),
        ),
      );
      if (succeeded && this.selected()) {
        this.walkInDone.set(this.selected());
        this.acceptedWalkIn.set({
          paidAmount: price,
          paymentMethod: value.paymentMethod,
          patientName,
        });
        this.walkInOpen.set(false);
        this.selected.set(null);
        this.resetWalkInForm();
        this.selectedPatient.set(null);
      }
    });
  }

  protected canRecall(ticket: PracticeTicket): boolean {
    return ticket.callAttempts.at(-1)?.outcome === 'NoResponse';
  }

  protected async act(action: QueueAction, ticket = this.selected()): Promise<void> {
    if (!ticket || !this.practiceId() || this.busy()) return;
    if (action === 'manual-call' && ticket.status !== 'Waiting') return;
    if (
      (action === 'recall' || action === 'no-response' || action === 'start') &&
      ticket.status !== 'Called'
    )
      return;
    if (action === 'restore' && ticket.status !== 'NoShow') return;
    if (action === 'cancel' && !['Waiting', 'Called', 'NoShow'].includes(ticket.status)) return;
    const reason = this.reasonModel().reason.trim();
    if ((action === 'manual-call' || action === 'cancel') && !reason) return;
    if (action === 'manual-call' && this.queueOccupied()) return;
    if (action === 'recall' && !this.canRecall(ticket)) return;
    if (action === 'restore' && ticket.isRefunded) return;
    if (action === 'start' && !this.canStart()) return;
    const allowed =
      action === 'manual-call'
        ? this.canManualCall()
        : action === 'restore'
          ? this.canRestore()
          : action === 'cancel'
            ? this.canCancel()
            : action === 'start'
              ? this.canStart()
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
      case 'cancel':
        request = this.api.cancel(this.practiceId(), ticket.ticketId, reasonBody, key);
        break;
    }
    if (await this.runMutation(signature, request)) this.pendingAction.set(null);
  }

  protected async openWalkIn(): Promise<void> {
    if (!this.canWalkIn() || this.busy()) return;
    this.detailSequence++;
    this.selected.set(null);
    this.detailLoading.set(false);
    this.resetWalkIn();
    this.pendingAction.set(null);
    this.messages.set([]);
    this.walkInOpen.set(true);
    await this.loadWalkInOptions();
  }

  protected async searchPatients(query: WalkInPatientSearch): Promise<void> {
    if (!this.canSearchPatient() || this.busy()) return;
    this.messages.set([]);
    const id = this.practiceId(),
      generation = this.generation,
      sequence = ++this.patientSearchSequence;
    this.patientSearchLoading.set(true);
    this.patientSearchFailed.set(false);
    this.patientSearched.set(false);
    this.patientResults.set([]);
    try {
      const result = await firstValueFrom(
        this.patientsApi.search({ ...query, doctorPracticeId: id, pageNumber: 1, pageSize: 20 }),
      );
      if (
        this.current(id, generation) &&
        sequence === this.patientSearchSequence &&
        this.canSearchPatient()
      ) {
        this.patientResults.set(result.items);
        this.patientSearched.set(true);
      }
    } catch (error) {
      if (this.current(id, generation) && sequence === this.patientSearchSequence) {
        this.patientSearchFailed.set(true);
        await this.failure(error, id, generation);
      }
    } finally {
      if (this.current(id, generation) && sequence === this.patientSearchSequence)
        this.patientSearchLoading.set(false);
    }
  }

  protected async choosePatient(patientId: string): Promise<void> {
    if (!this.canSearchPatient() || this.busy()) return;
    const patient = this.patientResults().find((item) => item.patientId === patientId);
    if (!patient) return;
    this.selectedPatient.set(patient);
    this.walkInModel.update((model) => ({ ...model, patientId }));
    await this.refreshWalkInPatient();
  }

  protected changePatient(): void {
    if (this.busy()) return;
    this.optionsSequence++;
    this.eligibilitySequence++;
    this.optionsLoading.set(false);
    this.selectedPatient.set(null);
    this.eligibilities.set([]);
    this.eligibility.set(null);
    this.segments.set([]);
    this.walkInModel.update((model) => ({
      ...model,
      patientId: '',
      segmentId: '',
      visitTypeId: '',
      paidAmount: 0,
    }));
  }

  protected async refreshChoices(): Promise<void> {
    if (this.busy()) return;
    this.walkInModel.update((model) => ({
      ...model,
      segmentId: '',
      visitTypeId: '',
      paidAmount: 0,
    }));
    await this.loadWalkInOptions();
  }

  protected selectChoice(event: Event): void {
    if (this.busy() || this.optionsLoading()) return;
    const key = (event.target as HTMLSelectElement).value;
    const choice = this.walkInChoices().find((item) => item.key === key);
    if (choice)
      this.walkInModel.update((model) => ({
        ...model,
        segmentId: choice.segmentId,
        visitTypeId: choice.visitTypeId,
        paidAmount: choice.price,
      }));
  }
  protected choosePayment(paymentMethod: PaymentMethod): void {
    if (!this.busy()) this.walkInModel.update((model) => ({ ...model, paymentMethod }));
  }

  protected chooseAction(action: 'manual-call' | 'cancel'): void {
    if (this.busy()) return;
    this.pendingAction.set(action);
    this.reasonModel.set({ reason: '' });
  }
  protected sourceLabel(value: string): string {
    return this.language.t(
      ['Reservation', 'WalkIn'].includes(value)
        ? 'tickets.source.' + value
        : 'tickets.source.unknown',
    );
  }
  protected outcomeLabel(value?: string | null): string {
    if (!value) return this.language.t('tickets.pendingOutcome');
    return this.language.t(
      ['NoResponse', 'Responded', 'Started'].includes(value)
        ? 'tickets.outcome.' + value
        : 'tickets.outcome.unknown',
    );
  }

  protected close(): void {
    if (this.busy()) return;
    this.detailSequence++;
    this.selected.set(null);
    this.detailLoading.set(false);
    this.reasonModel.set({ reason: '' });
    this.pendingAction.set(null);
    this.walkInOpen.set(false);
    this.walkInDone.set(null);
    this.acceptedWalkIn.set(null);
    this.patientSearchSequence++;
    this.optionsSequence++;
    this.eligibilitySequence++;
    this.optionsLoading.set(false);
    this.patientSearchLoading.set(false);
  }

  protected statusKey(status: string): string {
    return `tickets.status.${status}`;
  }

  private async runMutation(
    signature: string,
    request: Observable<PracticeTicket>,
  ): Promise<boolean> {
    if (this.busy()) return false;
    const generation = this.generation,
      id = this.practiceId();
    let accessRejected = false;
    this.queueSequence++;
    this.detailSequence++;
    this.busy.set(true);
    this.messages.set([]);
    try {
      const ticket = await firstValueFrom(request);
      if (!this.current(id, generation)) return false;
      this.intents.delete(signature);
      this.toast.success('tickets.mutationSuccess');
      this.selected.set(ticket);
      await this.loadQueueAfterMutation(id, generation);
      return this.current(id, generation);
    } catch (error) {
      if (!this.current(id, generation)) return false;
      accessRejected = error instanceof HttpErrorResponse && error.status === 403;
      await this.failure(error, id, generation);
      if (
        this.current(id, generation) &&
        !(error instanceof HttpErrorResponse && error.status === 403)
      ) {
        await this.loadQueueAfterMutation(id, generation);
        if (this.current(id, generation) && this.selected()) {
          const ticketId = this.selected()!.ticketId;
          const sequence = ++this.detailSequence;
          try {
            const ticket = await firstValueFrom(this.api.details(id, ticketId));
            if (this.current(id, generation) && sequence === this.detailSequence)
              this.selected.set(ticket);
          } catch (detailError) {
            if (this.current(id, generation) && sequence === this.detailSequence)
              await this.failure(detailError, id, generation);
          }
        }
        if (
          this.current(id, generation) &&
          signature.startsWith('walk-in:') &&
          error instanceof HttpErrorResponse &&
          error.status === 409
        ) {
          this.walkInModel.update((model) => ({
            ...model,
            segmentId: '',
            visitTypeId: '',
            paidAmount: 0,
          }));
          await this.loadWalkInOptions();
        }
      }
      return false;
    } finally {
      this.busy.set(false);
      if (
        (!accessRejected || id !== this.practiceId()) &&
        !this.current(id, generation) &&
        this.practiceId()
      )
        await this.loadQueue();
    }
  }

  private async loadQueueAfterMutation(id: string, generation: number): Promise<void> {
    if (!this.current(id, generation) || !this.canViewQueue()) return;
    const sequence = ++this.queueSequence;
    try {
      const queue = await firstValueFrom(this.api.queue(id));
      if (this.current(id, generation) && sequence === this.queueSequence && this.canViewQueue()) {
        this.queue.set(queue);
        this.loading.set(false);
        this.loadFailed.set(false);
      }
    } catch (error) {
      if (this.current(id, generation) && sequence === this.queueSequence) {
        this.loading.set(false);
        this.loadFailed.set(true);
        await this.failure(error, id, generation);
      }
    }
  }

  private async loadWalkInOptions(): Promise<void> {
    if (!this.canWalkIn()) return;
    const sequence = ++this.optionsSequence;
    this.optionsLoading.set(true);
    this.optionsFailed.set(false);
    this.segments.set([]);
    const id = this.practiceId(),
      generation = this.generation;
    try {
      const eligibility = this.eligibility(),
        patientId = this.walkInModel().patientId;
      const options = await firstValueFrom(
        this.api.walkInOptions(id, {
          ...(patientId ? { patientId } : {}),
          ...(eligibility ? { followUpEligibilityId: eligibility.eligibilityId } : {}),
        }),
      );
      if (sequence === this.optionsSequence && generation === this.generation && this.canWalkIn())
        this.segments.set(
          options.segments.map((segment) => ({
            ...segment,
            visitTypes: segment.visitTypes.filter(
              (v) => v.code === (eligibility ? 'FollowUp' : 'NewConsultation'),
            ),
          })),
        );
    } catch (error) {
      if (this.current(id, generation) && sequence === this.optionsSequence) {
        this.optionsFailed.set(true);
        await this.failure(error, id, generation);
      }
    } finally {
      if (sequence === this.optionsSequence) this.optionsLoading.set(false);
    }
  }
  protected async refreshWalkInPatient(): Promise<void> {
    this.optionsSequence++;
    const generation = this.generation,
      id = this.practiceId(),
      patientId = this.walkInModel().patientId,
      sequence = ++this.eligibilitySequence;
    this.eligibility.set(null);
    this.eligibilities.set([]);
    this.segments.set([]);
    this.walkInModel.update((model) => ({
      ...model,
      segmentId: '',
      visitTypeId: '',
      paidAmount: 0,
    }));
    if (patientId && this.reception.allows(PERMISSIONS.followUpEligibilityViewBookingEligibility)) {
      try {
        const items = await firstValueFrom(this.followUps.reception(this.practiceId(), patientId));
        if (
          !this.current(id, generation) ||
          sequence !== this.eligibilitySequence ||
          patientId !== this.walkInModel().patientId
        )
          return;
        this.eligibilities.set(
          items.filter((e) => e.patientId === patientId && e.practiceId === this.practiceId()),
        );
      } catch (error) {
        if (this.current(id, generation) && sequence === this.eligibilitySequence)
          await this.failure(error, id, generation);
      }
    }
    if (
      this.current(id, generation) &&
      sequence === this.eligibilitySequence &&
      patientId === this.walkInModel().patientId
    )
      await this.loadWalkInOptions();
  }
  protected async selectWalkInEligibility(event: Event): Promise<void> {
    if (this.busy()) return;
    const id = (event.target as HTMLSelectElement).value;
    const eligibility = this.eligibilities().find((e) => e.eligibilityId === id && e.canBook);
    if (id && !eligibility) return;
    this.eligibility.set(eligibility || null);
    this.walkInModel.update((model) => ({
      ...model,
      segmentId: '',
      visitTypeId: '',
      paidAmount: 0,
    }));
    await this.loadWalkInOptions();
  }

  private resetWalkIn(): void {
    this.patientSearchSequence++;
    this.patientResults.set([]);
    this.selectedPatient.set(null);
    this.patientSearchLoading.set(false);
    this.patientSearchFailed.set(false);
    this.patientSearched.set(false);
    this.walkInOpen.set(false);
    this.walkInDone.set(null);
    this.acceptedWalkIn.set(null);
    this.eligibilitySequence++;
    this.optionsSequence++;
    this.optionsLoading.set(false);
    this.optionsFailed.set(false);
    this.eligibilities.set([]);
    this.eligibility.set(null);
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

  private current(id: string, generation: number): boolean {
    return (
      generation === this.generation &&
      id === this.practiceId() &&
      (this.isDoctor() || id === this.reception.currentPracticeId())
    );
  }

  private async failure(
    error: unknown,
    id = this.practiceId(),
    generation = this.generation,
  ): Promise<void> {
    if (!this.current(id, generation)) return;
    if (
      error instanceof HttpErrorResponse &&
      error.status === 403 &&
      this.actor() === 'Reception'
    ) {
      await this.reception.refresh();
      if (!this.current(id, generation)) return;
      this.practices.set(this.reception.practices());
      this.generation++;
      this.queue.set(this.emptyQueue());
      this.selected.set(null);
      this.pendingAction.set(null);
      this.detailLoading.set(false);
      this.loading.set(false);
      this.loadFailed.set(this.canViewQueue());
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
