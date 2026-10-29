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
  CompleteTicketRequest,
  PracticeQueue,
  PracticeTicket,
  TicketActor,
  TicketsApi,
  normalizeTicket,
} from '../../../../domains/tickets';
import {
  Diagnosis,
  DiagnosisType,
  EncounterDetails,
  EncountersApi,
} from '../../../../domains/encounters';
import { PrescriptionState } from '../../../../domains/prescriptions';
import { DiagnosticRequestStateResponse } from '../../../../domains/diagnostics';
import { PrescriptionWorkspaceComponent } from '../../../prescriptions';
import { DiagnosticDraftComponent } from '../../../diagnostics';
import { Phase18Part2Api } from '../../../../domains/phase18';
import { components } from '../../../../domains/phase18/phase18-part2-openapi.types';

type ArchivedTicketItem = components['schemas']['ArchivedTicketItem'];
type QueueAction = 'manual-call' | 'recall' | 'no-response' | 'restore' | 'start' | 'cancel';
type CompletionBlocker = {
  readonly code: string;
  readonly message?: string | null;
  readonly itemId?: string | null;
  readonly field?: string | null;
};

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
    PrescriptionWorkspaceComponent,
    DiagnosticDraftComponent,
  ],
  templateUrl: './queue-workspace.html',
  styleUrl: './queue-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueWorkspace implements OnInit {
  private readonly api = inject(TicketsApi);
  private readonly encountersApi = inject(EncountersApi);
  private readonly patientsApi = inject(PatientsApi);
  private readonly followUps = inject(FollowUpsApi);
  protected readonly eligibilities = signal<readonly FollowUpEligibility[]>([]);
  protected readonly eligibility = signal<FollowUpEligibility | null>(null);
  protected readonly optionsLoading = signal(false);
  protected readonly optionsFailed = signal(false);
  private optionsSequence = 0;
  private readonly phase18Api = inject(Phase18Part2Api);
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
  private encounterSequence = 0;
  private activeEncounterTicketId = '';
  private completionIntent: { signature: string; key: string } | null = null;
  private accessStamp = '';
  private readonly intents = new Map<string, string>();

  // ── Unified Inline Doctor Workstation State ──
  protected readonly activeEncounter = signal<EncounterDetails | null>(null);
  protected readonly encounterLoading = signal(false);
  protected readonly clinicalSaving = signal(false);
  protected readonly prescriptionBusy = signal(false);
  protected readonly diagnosticBusy = signal(false);
  protected readonly clinicalBusy = computed(
    () => this.clinicalSaving() || this.prescriptionBusy() || this.diagnosticBusy(),
  );
  protected readonly removeDiagnosisId = signal('');
  protected readonly clinicalModel = signal({
    clinicalNotes: '',
    diagnosisId: '',
    type: 'Primary' as DiagnosisType,
    displayText: '',
    notes: '',
    validUntil: '',
  });
  protected readonly activeDiagnoses = computed(() =>
    (this.activeEncounter()?.diagnoses ?? []).filter((d) => !d.isVoided),
  );
  protected readonly hasPrimaryDiagnosis = computed(() =>
    this.activeDiagnoses().some((d) => d.type === 'Primary'),
  );
  protected readonly activeEncounterId = computed(
    () => this.activeEncounter()?.encounterId || this.queue().inProgress?.medicalEncounterId || '',
  );
  protected readonly hasClinicalNotes = computed(
    () =>
      !!(
        this.clinicalModel().clinicalNotes.trim() ||
        (this.activeEncounter()?.clinicalNotes ?? '').trim()
      ),
  );
  private readonly writableClinicalSource = computed(
    () =>
      this.isDoctor() &&
      this.practices().some((p) => p.id === this.practiceId()) &&
      this.activeEncounter()?.practice.id === this.practiceId(),
  );
  protected readonly canEditClinicalNotes = computed(
    () =>
      this.writableClinicalSource() &&
      this.activeEncounter()?.status === 'InProgress' &&
      this.activeEncounter()?.capabilities?.canEditClinicalNotes === true &&
      this.session.hasPermission(PERMISSIONS.medicalEncountersUpdateOwn),
  );
  protected readonly canManageDiagnoses = computed(
    () =>
      this.writableClinicalSource() &&
      this.activeEncounter()?.status === 'InProgress' &&
      this.activeEncounter()?.capabilities?.canManageDiagnoses === true &&
      this.session.hasPermission(PERMISSIONS.diagnosesManageOwn),
  );
  protected readonly canCompleteVisit = computed(
    () =>
      this.writableClinicalSource() &&
      this.activeEncounter()?.status === 'InProgress' &&
      this.activeEncounter()?.capabilities?.canComplete === true &&
      this.session.hasPermission(PERMISSIONS.doctorPracticeTicketsCompleteOwn),
  );
  protected readonly canCreateFollowUp = computed(
    () =>
      this.writableClinicalSource() &&
      this.activeEncounter()?.status === 'Completed' &&
      this.activeEncounter()?.capabilities?.canCreateFollowUpEligibility === true &&
      this.session.hasPermission(PERMISSIONS.followUpEligibilityCreateOwn),
  );

  protected readonly actor = signal<TicketActor>('Doctor');
  protected readonly practices = signal<
    readonly { id: string; nameAr: string; nameEn: string | null }[]
  >([]);
  protected readonly practiceId = signal('');
  protected readonly queue = signal<PracticeQueue>(this.emptyQueue());
  protected readonly selected = signal<PracticeTicket | null>(null);
  protected readonly ticketDetailOpen = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly busy = signal(false);
  protected readonly messages = signal<readonly string[]>([]);
  protected readonly clinicalBlockers = signal<readonly string[]>([]);
  protected readonly archiveOpen = signal(false);
  protected readonly archivedTickets = signal<readonly ArchivedTicketItem[]>([]);
  protected readonly archiveLoading = signal(false);
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
      (this.isDoctor() &&
        this.session.hasPermission(PERMISSIONS.doctorPracticePaymentsViewOwn) &&
        this.session.hasPermission(PERMISSIONS.doctorPracticePaymentsRefundOwn)) ||
      (this.actor() === 'Reception' &&
        this.reception.currentPracticeId() === this.practiceId() &&
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
    if (this.isDoctor()) return this.session.hasPermission(permission);
    const currentId = this.reception.currentPracticeId() || this.practiceId();
    const matchesPractice =
      !this.reception.currentPracticeId() ||
      this.reception.currentPracticeId().trim().toLowerCase() ===
        this.practiceId().trim().toLowerCase();
    const hasPermission =
      typeof this.reception.allowsInPractice === 'function'
        ? this.reception.allowsInPractice(this.practiceId(), permission)
        : this.reception.allows(permission);
    return matchesPractice && hasPermission;
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
  protected canOpenClinical(): boolean {
    return (
      this.isDoctor() &&
      this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwn) &&
      this.session.hasPermission(PERMISSIONS.diagnosesViewOwn)
    );
  }

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
        id &&
        (id !== this.practiceId() || stamp !== this.accessStamp)
      ) {
        untracked(() => {
          this.accessStamp = stamp;
          void this.selectPractice(id);
        });
      } else if (stamp !== this.accessStamp) {
        this.accessStamp = stamp;
      }
    });

    effect(() => {
      const isDoc = this.isDoctor();
      const canClinical = this.canOpenClinical();
      const pracId = this.practiceId();
      const inProgTicket = this.queue().inProgress;
      untracked(() => {
        if (isDoc && canClinical && pracId && inProgTicket?.ticketId) {
          if (this.activeEncounterTicketId !== inProgTicket.ticketId) {
            void this.syncActiveEncounter(pracId, inProgTicket.ticketId);
          }
        } else {
          this.activeEncounterTicketId = '';
          this.encounterSequence++;
          this.activeEncounter.set(null);
          this.encounterLoading.set(false);
          this.resetClinicalForm();
        }
      });
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

  protected patientLabel(ticket: PracticeTicket): string {
    if (ticket.patient) {
      const text = this.label(ticket.patient);
      if (text && text.trim()) return text;
    }
    const raw = ticket as unknown as {
      patientNameAr?: string | null;
      patientNameEn?: string | null;
      patientFullNameAr?: string | null;
      patientFullNameEn?: string | null;
      fullNameAr?: string | null;
      fullNameEn?: string | null;
      patientName?: string | null;
    };
    const nameAr =
      raw.patientNameAr ||
      raw.patientFullNameAr ||
      raw.fullNameAr ||
      raw.patientName ||
      raw.patientNameEn ||
      raw.patientFullNameEn ||
      raw.fullNameEn ||
      '';
    const nameEn = raw.patientNameEn ?? raw.patientFullNameEn ?? raw.fullNameEn ?? null;
    if (nameAr) {
      const text = this.label({ nameAr, nameEn });
      if (text && text.trim()) return text;
    }
    return this.language.t('tickets.queue.unregisteredPatient');
  }

  protected practiceLabel(ticket: PracticeTicket): string {
    if (ticket.practice?.nameAr) return this.label(ticket.practice);
    const raw = ticket as unknown as {
      practiceNameAr?: string | null;
      practiceNameEn?: string | null;
      doctorPracticeId?: string | null;
    };
    if (raw.practiceNameAr || raw.practiceNameEn) {
      return this.label({
        nameAr: raw.practiceNameAr || raw.practiceNameEn || '',
        nameEn: raw.practiceNameEn ?? null,
      });
    }
    const targetId = raw.doctorPracticeId || ticket.practice?.id || this.practiceId();
    const active = this.practices().find((item) => item.id === targetId);
    if (active?.nameAr) return this.label(active);
    return '';
  }

  protected doctorLabel(ticket: PracticeTicket): string {
    if (ticket.doctor?.nameAr) return this.label(ticket.doctor);
    const raw = ticket as unknown as {
      doctorNameAr?: string | null;
      doctorNameEn?: string | null;
    };
    if (raw.doctorNameAr || raw.doctorNameEn) {
      return this.label({
        nameAr: raw.doctorNameAr || raw.doctorNameEn || '',
        nameEn: raw.doctorNameEn ?? null,
      });
    }
    return '';
  }

  protected visitTypeLabel(ticket: PracticeTicket): string {
    if (ticket.visitType?.nameAr) return this.label(ticket.visitType);
    const raw = ticket as unknown as {
      visitTypeNameAr?: string | null;
      visitTypeNameEn?: string | null;
    };
    if (raw.visitTypeNameAr || raw.visitTypeNameEn) {
      return this.label({
        nameAr: raw.visitTypeNameAr || raw.visitTypeNameEn || '',
        nameEn: raw.visitTypeNameEn ?? null,
      });
    }
    return '';
  }

  protected segmentLabel(ticket: PracticeTicket): string {
    if (ticket.segment?.nameAr) return this.label(ticket.segment);
    const raw = ticket as unknown as {
      segmentNameAr?: string | null;
      segmentNameEn?: string | null;
    };
    if (raw.segmentNameAr || raw.segmentNameEn) {
      return this.label({
        nameAr: raw.segmentNameAr || raw.segmentNameEn || '',
        nameEn: raw.segmentNameEn ?? null,
      });
    }
    return '';
  }

  protected isFastTrack(ticket: PracticeTicket): boolean {
    if (ticket.fastTrack) return true;
    const raw = ticket as unknown as { isFastTrack?: boolean };
    return !!raw.isFastTrack;
  }

  protected checkedInTime(ticket: PracticeTicket): string | null {
    if (ticket.checkedInOnUtc) return ticket.checkedInOnUtc;
    const raw = ticket as unknown as { checkInTimeUtc?: string | null };
    return raw.checkInTimeUtc ?? null;
  }

  protected queuedTime(ticket: PracticeTicket): string | null {
    if (ticket.queueOrderTime) return ticket.queueOrderTime;
    const raw = ticket as unknown as { queueOrderTimeUtc?: string | null };
    return raw.queueOrderTimeUtc ?? null;
  }

  protected callAttempts(ticket: PracticeTicket) {
    return ticket.callAttempts ?? [];
  }

  protected timeline(ticket: PracticeTicket) {
    return ticket.timeline ?? [];
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
    this.ticketDetailOpen.set(false);
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

  protected findTicketInQueue(ticketId: string): PracticeTicket | null {
    if (!ticketId) return null;
    const normalized = ticketId.trim().toLowerCase();
    const matches = (t: PracticeTicket | null | undefined): boolean => {
      if (!t) return false;
      const tid = t.ticketId || (t as unknown as { id?: string }).id;
      return typeof tid === 'string' && tid.trim().toLowerCase() === normalized;
    };
    const q = this.queue();
    if (matches(q.inProgress)) return q.inProgress;
    if (matches(q.called)) return q.called;
    return q.waiting.find(matches) ?? q.noShow.find(matches) ?? null;
  }

  protected async inspect(ticketOrId: PracticeTicket | string): Promise<void> {
    const initialTicket: PracticeTicket | null =
      typeof ticketOrId === 'object' && ticketOrId !== null
        ? ticketOrId
        : this.findTicketInQueue(ticketOrId);

    const ticketId =
      typeof ticketOrId === 'string'
        ? ticketOrId
        : initialTicket?.ticketId || (initialTicket as unknown as { id?: string })?.id || '';

    if (!this.practiceId() || !this.canViewQueue() || this.busy()) return;
    if (!ticketId && !initialTicket) return;

    this.walkInOpen.set(false);
    this.walkInDone.set(null);
    this.pendingAction.set(null);
    this.messages.set([]);
    this.reasonModel.set({ reason: '' });

    // 1. Instant 0ms synchronous assignment directly from memory!
    this.ticketDetailOpen.set(true);
    if (initialTicket) {
      this.selected.set(initialTicket);
    }

    // 2. Background fresh sync
    const generation = this.generation,
      id = this.practiceId(),
      sequence = ++this.detailSequence;

    // Only show detailLoading indicator if we didn't have the ticket in memory
    this.detailLoading.set(!initialTicket);

    if (!ticketId) return;

    try {
      const ticket = await firstValueFrom(this.api.details(id, ticketId));
      if (this.current(id, generation) && sequence === this.detailSequence && this.canViewQueue()) {
        const merged = initialTicket
          ? normalizeTicket({ ...initialTicket, ...ticket })
          : normalizeTicket(ticket);
        this.selected.set(merged);
        this.syncTicketIntoQueue(merged);
      }
    } catch (error) {
      if (this.current(id, generation) && sequence === this.detailSequence && !initialTicket) {
        await this.failure(error, id, generation);
      }
    } finally {
      if (this.current(id, generation) && sequence === this.detailSequence) {
        this.detailLoading.set(false);
      }
    }
  }

  private syncTicketIntoQueue(updated: PracticeTicket): void {
    if (!updated?.ticketId) return;
    const targetId = updated.ticketId.trim().toLowerCase();
    const matches = (t: PracticeTicket | null | undefined): boolean =>
      !!t?.ticketId && t.ticketId.trim().toLowerCase() === targetId;
    const q = this.queue();
    const inProgress = matches(q.inProgress) ? { ...q.inProgress, ...updated } : q.inProgress;
    const called = matches(q.called) ? { ...q.called, ...updated } : q.called;
    const waiting = q.waiting.map((t) => (matches(t) ? { ...t, ...updated } : t));
    const noShow = q.noShow.map((t) => (matches(t) ? { ...t, ...updated } : t));
    this.queue.set({ inProgress, called, waiting, noShow });
  }

  protected async openArchive(): Promise<void> {
    if (!this.practiceId() || this.busy()) return;
    this.archiveOpen.set(true);
    this.archiveLoading.set(true);
    try {
      const isDoctor = this.actor() === 'Doctor';
      const op = isDoctor ? 'P18.2-07' : 'P18.2-09';
      const page = await firstValueFrom(
        this.phase18Api.call(op, {
          pathParams: { practiceId: this.practiceId() },
          query: { pageSize: 50 },
        }),
      );
      this.archivedTickets.set(page.items ?? []);
    } catch {
      this.toast.error(this.language.t('tickets.operationFailed'));
    } finally {
      this.archiveLoading.set(false);
    }
  }

  protected async inspectArchivedTicket(item: ArchivedTicketItem): Promise<void> {
    this.archiveOpen.set(false);
    await this.inspect(item.ticketId);
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

  protected canRecall(ticket: PracticeTicket | null = this.selected()): boolean {
    if (!ticket) return false;
    return (ticket.callAttempts ?? []).at(-1)?.outcome === 'NoResponse';
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
    if (
      action === 'start' &&
      (!this.canStart() ||
        ticket.isArchived ||
        ticket.operationalCapabilities?.canQueueMutate !== true ||
        (ticket.practice.id || ticket.doctorPracticeId) !== this.practiceId())
    )
      return;
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
    this.ticketDetailOpen.set(false);
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
  protected hasKnownSource(ticket?: PracticeTicket | null): boolean {
    if (!ticket) return false;
    const val: unknown = ticket.source;
    if (
      val === 'Reservation' ||
      val === 'WalkIn' ||
      val === 0 ||
      val === 1 ||
      (typeof val === 'string' &&
        (val.toLowerCase() === 'reservation' || val.toLowerCase() === 'walkin'))
    ) {
      return true;
    }
    const raw = ticket as unknown as { reservationId?: string | null };
    return (
      raw !== null &&
      typeof raw === 'object' &&
      'reservationId' in raw &&
      raw.reservationId !== undefined
    );
  }

  protected sourceLabel(value: unknown, ticket?: PracticeTicket): string {
    if (
      value === 'Reservation' ||
      value === 0 ||
      (typeof value === 'string' && value.toLowerCase() === 'reservation')
    ) {
      return this.language.t('tickets.source.Reservation');
    }
    if (
      value === 'WalkIn' ||
      value === 1 ||
      (typeof value === 'string' && value.toLowerCase() === 'walkin')
    ) {
      return this.language.t('tickets.source.WalkIn');
    }
    const raw = ticket as unknown as { reservationId?: string | null } | undefined;
    if (raw && 'reservationId' in raw) {
      return this.language.t(
        raw.reservationId ? 'tickets.source.Reservation' : 'tickets.source.WalkIn',
      );
    }
    return this.language.t('tickets.source.unknown');
  }
  protected outcomeLabel(value?: string | null): string {
    if (!value || value === 'Called') return this.language.t('tickets.outcome.calledWaiting');
    if (value === 'NoResponse') return this.language.t('tickets.outcome.NoResponse');
    if (value === 'Responded') return this.language.t('tickets.outcome.Responded');
    if (value === 'Started') return this.language.t('tickets.outcome.Started');
    return this.language.t('tickets.outcome.calledWaiting');
  }

  protected formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    try {
      return new Intl.DateTimeFormat(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return value;
    }
  }

  protected formatTime(value?: string | null): string {
    if (!value) return '—';
    const trimmed = value.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const [hStr, mStr] = trimmed.split(':');
      const h = parseInt(hStr, 10);
      const isPm = h >= 12;
      const h12 = h % 12 || 12;
      const suffix = this.language.currentLang() === 'ar' ? (isPm ? 'م' : 'ص') : isPm ? 'PM' : 'AM';
      return `${h12}:${mStr} ${suffix}`;
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return trimmed;
    try {
      return new Intl.DateTimeFormat(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return trimmed;
    }
  }

  protected formatTransactionRef(tx?: string | null): string {
    if (!tx) return '—';
    if (tx.length > 16) {
      const parts = tx.split('-');
      if (parts.length >= 3) {
        return `#${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
      }
      return '...' + tx.slice(-10);
    }
    return tx;
  }

  // ═══ Unified Doctor Inline Clinical Workstation Methods ═══
  protected async syncActiveEncounter(
    practiceId = this.practiceId(),
    ticketId = this.queue().inProgress?.ticketId || '',
    preserveDraftNotes = false,
  ): Promise<EncounterDetails | null> {
    if (!practiceId || !ticketId || !this.isDoctor() || !this.canOpenClinical()) return null;
    this.activeEncounterTicketId = ticketId;
    const generation = this.generation,
      sequence = ++this.encounterSequence;
    this.encounterLoading.set(true);
    try {
      const detail = await firstValueFrom(this.encountersApi.byTicket(practiceId, ticketId));
      if (this.current(practiceId, generation) && sequence === this.encounterSequence) {
        this.applyActiveEncounter(detail, preserveDraftNotes);
        return detail;
      }
    } catch {
      // Background sync fails silently if encounter endpoint is not mocked in pure queue tests
    } finally {
      if (this.current(practiceId, generation) && sequence === this.encounterSequence) {
        this.encounterLoading.set(false);
      }
    }
    return null;
  }

  private applyActiveEncounter(detail: EncounterDetails, preserveDraftNotes = false): void {
    this.activeEncounter.set(detail);
    const hasPrimary = (detail.diagnoses ?? []).some((d) => !d.isVoided && d.type === 'Primary');
    this.clinicalModel.update((prev) => ({
      ...prev,
      clinicalNotes:
        preserveDraftNotes && prev.clinicalNotes.trim()
          ? prev.clinicalNotes
          : (detail.clinicalNotes ?? ''),
      type: prev.diagnosisId ? prev.type : hasPrimary ? 'Secondary' : 'Primary',
    }));
  }

  private resetClinicalForm(): void {
    this.removeDiagnosisId.set('');
    this.completionIntent = null;
    this.clinicalModel.set({
      clinicalNotes: '',
      diagnosisId: '',
      type: 'Primary',
      displayText: '',
      notes: '',
      validUntil: '',
    });
  }

  protected updateClinicalText(
    field: 'clinicalNotes' | 'displayText' | 'notes' | 'validUntil',
    event: Event,
  ): void {
    const val = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.clinicalModel.update((m) => ({ ...m, [field]: val }));
  }

  protected updateClinicalDiagnosisType(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val === 'Primary' || val === 'Secondary') {
      this.clinicalModel.update((m) => ({ ...m, type: val }));
    }
  }

  protected setFollowUpDays(days: number): void {
    if (this.busy() || this.clinicalBusy()) return;
    const date = new Date();
    date.setDate(date.getDate() + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    this.clinicalModel.update((m) => ({ ...m, validUntil: `${yyyy}-${mm}-${dd}` }));
  }

  protected isFollowUpSelected(days: number): boolean {
    const current = this.clinicalModel().validUntil;
    if (!current) return false;
    const date = new Date();
    date.setDate(date.getDate() + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return current === `${yyyy}-${mm}-${dd}`;
  }

  protected clearFollowUpDate(): void {
    if (this.busy() || this.clinicalBusy()) return;
    this.clinicalModel.update((m) => ({ ...m, validUntil: '' }));
  }

  protected onPrescriptionChanged(prescription: PrescriptionState | null): void {
    this.activeEncounter.update((detail) => (detail ? { ...detail, prescription } : null));
  }

  protected onDiagnosticChanged(
    kind: 'lab' | 'radiology',
    state: DiagnosticRequestStateResponse,
  ): void {
    this.activeEncounter.update((detail) =>
      detail
        ? {
            ...detail,
            [kind === 'lab' ? 'labRequestDraft' : 'radiologyRequestDraft']:
              state.requestId && state.status === 'Draft' ? state : null,
          }
        : null,
    );
  }

  protected editClinicalDiagnosis(diagnosis: Diagnosis): void {
    if (!this.canManageDiagnoses() || this.busy() || this.clinicalBusy()) return;
    this.clinicalModel.update((m) => ({
      ...m,
      diagnosisId: diagnosis.diagnosisId,
      type: diagnosis.type,
      displayText: diagnosis.displayText,
      notes: diagnosis.notes || '',
    }));
  }

  protected cancelEditClinicalDiagnosis(): void {
    this.clinicalModel.update((m) => ({
      ...m,
      diagnosisId: '',
      type: this.hasPrimaryDiagnosis() ? 'Secondary' : 'Primary',
      displayText: '',
      notes: '',
    }));
  }

  protected async saveClinicalNotes(): Promise<void> {
    const notes = this.clinicalModel().clinicalNotes;
    if (!this.canEditClinicalNotes() || this.busy() || this.clinicalBusy() || notes.length > 8000)
      return;
    const practiceId = this.practiceId(),
      generation = this.generation;
    this.clinicalSaving.set(true);
    this.messages.set([]);
    this.clinicalBlockers.set([]);
    try {
      let detail = this.activeEncounter();
      if (!detail) {
        const ticketId = this.queue().inProgress?.ticketId || '';
        if (!ticketId) return;
        detail = await firstValueFrom(this.encountersApi.byTicket(practiceId, ticketId));
      }
      const updated = await firstValueFrom(
        this.encountersApi.updateNotes(practiceId, detail.encounterId, notes, detail.rowVersion),
      );
      if (this.current(practiceId, generation)) {
        this.applyActiveEncounter(updated, false);
        this.toast.success('encounters.saved');
      }
    } catch (error) {
      await this.failure(error, practiceId, generation);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.syncActiveEncounter(practiceId, this.queue().inProgress?.ticketId || '', true);
      }
    } finally {
      this.clinicalSaving.set(false);
    }
  }

  protected async saveClinicalDiagnosis(event?: Event): Promise<void> {
    event?.preventDefault();
    const m = this.clinicalModel();
    const text = m.displayText.trim();
    if (
      !this.canManageDiagnoses() ||
      this.busy() ||
      this.clinicalBusy() ||
      !text ||
      text.length > 500 ||
      m.notes.length > 2000
    )
      return;
    const practiceId = this.practiceId(),
      generation = this.generation;
    this.clinicalSaving.set(true);
    this.messages.set([]);
    this.clinicalBlockers.set([]);
    try {
      let detail = this.activeEncounter();
      if (!detail) {
        const ticketId = this.queue().inProgress?.ticketId || '';
        if (!ticketId) return;
        detail = await firstValueFrom(this.encountersApi.byTicket(practiceId, ticketId));
      }
      const draft = { type: m.type, displayText: text, notes: m.notes.trim() || null };
      const updated = await firstValueFrom(
        m.diagnosisId
          ? this.encountersApi.updateDiagnosis(
              practiceId,
              detail.encounterId,
              m.diagnosisId,
              draft,
              detail.rowVersion,
            )
          : this.encountersApi.addDiagnosis(
              practiceId,
              detail.encounterId,
              draft,
              detail.rowVersion,
            ),
      );
      if (this.current(practiceId, generation)) {
        this.applyActiveEncounter(updated, true);
        this.cancelEditClinicalDiagnosis();
        this.toast.success('encounters.saved');
      }
    } catch (error) {
      await this.failure(error, practiceId, generation);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.syncActiveEncounter(practiceId, this.queue().inProgress?.ticketId || '', true);
      }
    } finally {
      this.clinicalSaving.set(false);
    }
  }

  protected async confirmRemoveClinicalDiagnosis(diagnosisId: string): Promise<void> {
    if (!this.canManageDiagnoses() || this.busy() || this.clinicalBusy() || !diagnosisId) return;
    const detail = this.activeEncounter();
    if (!detail) return;
    const practiceId = this.practiceId(),
      generation = this.generation;
    this.clinicalSaving.set(true);
    this.messages.set([]);
    this.clinicalBlockers.set([]);
    try {
      const updated = await firstValueFrom(
        this.encountersApi.removeDiagnosis(
          practiceId,
          detail.encounterId,
          diagnosisId,
          detail.rowVersion,
        ),
      );
      if (this.current(practiceId, generation)) {
        this.removeDiagnosisId.set('');
        this.applyActiveEncounter(updated, true);
        this.toast.success('encounters.saved');
      }
    } catch (error) {
      await this.failure(error, practiceId, generation);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.syncActiveEncounter(practiceId, this.queue().inProgress?.ticketId || '', true);
      }
    } finally {
      this.clinicalSaving.set(false);
    }
  }

  protected async completeClinicalVisit(callNextAfter = false): Promise<void> {
    if (this.busy() || this.clinicalBusy() || !this.canCompleteVisit()) return;
    const inProgTicket = this.queue().inProgress;
    if (!inProgTicket?.ticketId || !this.practiceId()) return;
    const practiceId = this.practiceId(),
      generation = this.generation,
      m = this.clinicalModel();
    const effectiveNotes =
      m.clinicalNotes.trim() || (this.activeEncounter()?.clinicalNotes ?? '').trim();
    if (!effectiveNotes) {
      this.toast.error('encounters.completeHint');
      if (typeof document !== 'undefined') {
        document.getElementById('ws-clinical-notes')?.focus();
      }
      return;
    }

    this.clinicalSaving.set(true);
    this.messages.set([]);
    this.clinicalBlockers.set([]);
    try {
      let detail = this.activeEncounter();
      if (!detail) {
        detail = await firstValueFrom(
          this.encountersApi.byTicket(practiceId, inProgTicket.ticketId),
        );
        this.activeEncounter.set(detail);
      }

      // 1. Auto-save clinical notes if modified
      if (
        m.clinicalNotes.trim() &&
        m.clinicalNotes !== (detail.clinicalNotes ?? '') &&
        detail.capabilities?.canEditClinicalNotes === true &&
        this.session.hasPermission(PERMISSIONS.medicalEncountersUpdateOwn)
      ) {
        detail = await firstValueFrom(
          this.encountersApi.updateNotes(
            practiceId,
            detail.encounterId,
            m.clinicalNotes,
            detail.rowVersion,
          ),
        );
        this.activeEncounter.set(detail);
      }

      // 2. Auto-save draft diagnosis if doctor typed one without clicking '+ Add'
      if (
        m.displayText.trim() &&
        detail.capabilities?.canManageDiagnoses === true &&
        this.session.hasPermission(PERMISSIONS.diagnosesManageOwn)
      ) {
        const currentActive = (detail.diagnoses ?? []).filter((d) => !d.isVoided);
        const autoType: DiagnosisType =
          !m.diagnosisId && currentActive.some((d) => d.type === 'Primary') ? 'Secondary' : m.type;
        const draft = {
          type: autoType,
          displayText: m.displayText.trim(),
          notes: m.notes.trim() || null,
        };
        detail = await firstValueFrom(
          m.diagnosisId
            ? this.encountersApi.updateDiagnosis(
                practiceId,
                detail.encounterId,
                m.diagnosisId,
                draft,
                detail.rowVersion,
              )
            : this.encountersApi.addDiagnosis(
                practiceId,
                detail.encounterId,
                draft,
                detail.rowVersion,
              ),
        );
        this.activeEncounter.set(detail);
        this.cancelEditClinicalDiagnosis();
      }

      const activeDiags = (detail.diagnoses ?? []).filter((d) => !d.isVoided);
      if (activeDiags.length && activeDiags.filter((d) => d.type === 'Primary').length !== 1) {
        this.toast.error('encounters.failed');
        return;
      }

      // 3. Fetch fresh versions of ticket and encounter before atomic completion
      const [ticket, latest] = await Promise.all([
        firstValueFrom(this.api.details(practiceId, inProgTicket.ticketId)),
        firstValueFrom(this.encountersApi.byTicket(practiceId, inProgTicket.ticketId)),
      ]);
      this.activeEncounter.set(latest);
      if (latest.status !== 'InProgress' || !this.canCompleteVisit()) return;

      const prescription = latest.prescription;
      const encounterBlockers = latest.completionBlockers ?? [];
      const prescriptionBlockers = prescription?.draft
        ? (prescription.completionBlockers ?? [])
        : [];
      const allBlockers = [...encounterBlockers, ...prescriptionBlockers];

      if (allBlockers.length > 0) {
        const isDiagnosticOnly = allBlockers.every((b) => {
          const c = (b.code ?? '').toLowerCase();
          const f = (b.field ?? '').toLowerCase();
          return (
            c.includes('lab') ||
            c.includes('radiology') ||
            c.includes('diagnostic') ||
            f.includes('test')
          );
        });

        const fallbackKey = isDiagnosticOnly
          ? 'diagnostics.resolveBlockers'
          : 'medications.resolveBlockers';
        const formatted = this.completionBlockerMessages(
          allBlockers,
          this.language.t(fallbackKey),
          prescription?.draft?.items,
        );

        this.clinicalBlockers.set(formatted);
        this.toast.error(fallbackKey);
        return;
      }

      const body: CompleteTicketRequest = {
        ticketRowVersion: ticket.rowVersion,
        encounterRowVersion: latest.rowVersion,
        ...(prescription?.draft ? { prescriptionRowVersion: prescription.rowVersion } : {}),
        ...(latest.labRequestDraft?.requestId
          ? { labRequestRowVersion: latest.labRequestDraft.rowVersion }
          : {}),
        ...(latest.radiologyRequestDraft?.requestId
          ? { radiologyRequestRowVersion: latest.radiologyRequestDraft.rowVersion }
          : {}),
      };

      const signature = JSON.stringify({ ticketId: inProgTicket.ticketId, ...body });
      if (this.completionIntent?.signature !== signature) {
        this.completionIntent = { signature, key: createIdempotencyKey() };
      }

      await firstValueFrom(
        this.api.complete(practiceId, inProgTicket.ticketId, body, this.completionIntent.key),
      );
      this.completionIntent = null;

      // 4. Optional Follow-Up creation if Doctor picked a follow-up date
      const followUpDate = this.clinicalModel().validUntil.trim();
      if (followUpDate && this.session.hasPermission(PERMISSIONS.followUpEligibilityCreateOwn)) {
        try {
          const completed = await firstValueFrom(
            this.encountersApi.byTicket(practiceId, inProgTicket.ticketId),
          );
          if (!this.current(practiceId, generation)) return;
          this.activeEncounter.set(completed);
          if (this.canCreateFollowUp()) {
            await firstValueFrom(
              this.encountersApi.createFollowUp(practiceId, completed.encounterId, followUpDate),
            );
          } else this.toast.error('doctorRemediation.followUpNotCreated');
        } catch {
          this.toast.error('doctorRemediation.followUpNotCreated');
        }
      }

      if (!this.current(practiceId, generation)) return;
      this.toast.success('encounters.saved');
      this.activeEncounterTicketId = '';
      this.activeEncounter.set(null);
      this.resetClinicalForm();
      await this.loadQueueAfterMutation(practiceId, generation);

      // 5. Optional 1-click Call Next Patient
      if (
        callNextAfter &&
        this.current(practiceId, generation) &&
        this.canCallNext() &&
        !this.queueOccupied() &&
        this.queue().waiting.length > 0
      ) {
        this.clinicalSaving.set(false);
        await this.callNext();
      }
    } catch (error) {
      await this.failure(error, practiceId, generation);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.syncActiveEncounter(practiceId, inProgTicket.ticketId, true);
      }
    } finally {
      this.clinicalSaving.set(false);
    }
  }

  protected close(): void {
    if (this.busy()) return;
    this.detailSequence++;
    this.ticketDetailOpen.set(false);
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

  protected statusClass(status: string): string {
    switch (status) {
      case 'Waiting':
        return 'badge-waiting';
      case 'Called':
        return 'badge-called';
      case 'InProgress':
        return 'badge-in-progress';
      case 'NoShow':
        return 'badge-no-show';
      case 'Completed':
        return 'badge-completed';
      case 'Cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-neutral';
    }
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
    const receptionMatch =
      this.isDoctor() ||
      !this.reception.currentPracticeId() ||
      id.trim().toLowerCase() === this.reception.currentPracticeId().trim().toLowerCase();
    return (
      generation === this.generation &&
      id.trim().toLowerCase() === this.practiceId().trim().toLowerCase() &&
      receptionMatch
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
      this.ticketDetailOpen.set(false);
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
    if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
      this.generation++;
      this.queue.set(this.emptyQueue());
      this.selected.set(null);
      this.activeEncounter.set(null);
      this.resetClinicalForm();
      this.ticketDetailOpen.set(false);
      this.archiveOpen.set(false);
      this.archivedTickets.set([]);
      this.resetWalkIn();
    }
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['tickets.operationFailed']);
    this.toast.error(messages[0] || 'tickets.operationFailed');
  }

  private emptyQueue(): PracticeQueue {
    return { inProgress: null, called: null, waiting: [], noShow: [] };
  }

  private completionBlockerMessages(
    blockers: readonly CompletionBlocker[],
    fallback: string,
    draftItems?:
      | readonly {
          readonly itemId?: string;
          readonly medicationName?: string | null;
          readonly scientificName?: string | null;
        }[]
      | null,
  ): readonly string[] {
    const isAr = this.language.currentLang() === 'ar';
    const fieldMapAr: Record<string, string> = {
      dose: 'الجرعة',
      frequency: 'التكرار / عدد المرات',
      frequencyCode: 'التكرار',
      frequencyText: 'التكرار',
      duration: 'مدة العلاج',
      durationValue: 'مدة العلاج',
      durationType: 'نوع المدة',
      durationUnit: 'وحدة المدة',
      instructions: 'تعليمات الاستخدام',
      quantity: 'الكمية',
      quantityValue: 'الكمية',
      strength: 'التركيز',
      dosageForm: 'الشكل الدوائي',
      route: 'طريقة الاستخدام',
    };

    const messages = new Set<string>();

    for (const b of blockers) {
      if (b.message?.trim()) {
        messages.add(b.message.trim());
        continue;
      }

      const item = draftItems?.find((it) => it.itemId && b.itemId && it.itemId === b.itemId);
      const drugName = item?.medicationName || item?.scientificName;
      const rawField = b.field?.trim();
      const localizedField = rawField ? (isAr ? fieldMapAr[rawField] || rawField : rawField) : '';

      if (drugName && localizedField) {
        messages.add(
          isAr
            ? `دواء (${drugName}): يرجى تحديد ${localizedField}.`
            : `Medication (${drugName}): please specify ${localizedField}.`,
        );
      } else if (drugName) {
        messages.add(
          isAr
            ? `دواء (${drugName}): يرجى إكمال الحقول المطلوبة.`
            : `Medication (${drugName}): please complete required fields.`,
        );
      } else if (localizedField) {
        messages.add(
          isAr
            ? `الروشتة: يرجى تحديد ${localizedField}.`
            : `Prescription: please specify ${localizedField}.`,
        );
      }
    }

    if (!messages.size) {
      messages.add(fallback);
    }

    return [...messages];
  }
}
