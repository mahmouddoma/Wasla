import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, untracked, inject, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';
import { DoctorPracticesApi } from '../../../domains/doctor-practices';
import { PatientsApi } from '../../../domains/patients';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import {
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  PublicDiscoveryApi,
} from '../../../domains/public-discovery';
import {
  BookablePatient,
  CancelReservationRequest,
  CreateReservationRequest,
  ProviderRescheduleRequest,
  Reservation,
  ReservationActor,
  ReservationFilterOptions,
  ReservationMetadata,
  ReservationPage,
  ReservationQuery,
  ReservationsApi,
  ReservationScope,
  RescheduleReservationRequest,
} from '../../../domains/reservations';
import { CheckInSubmission, PracticeTicket, TicketsApi } from '../../../domains/tickets';

export interface ReservationDraft {
  patientId: string;
  segmentId: string;
  visitTypeId: string;
  bookingNote: string;
  reasonCode: string;
  comment: string;
  patientConsentConfirmed: boolean;
  reason: string;
}
export type ReservationEditorMode = 'create' | 'cancel' | 'reschedule' | 'restore';
/** A route-scoped workflow. Server projections own availability, late flags and capabilities. */
@Injectable()
export class ReservationWorkspaceStore {
  private readonly api = inject(ReservationsApi);
  private readonly ticketsApi = inject(TicketsApi);
  private readonly publicApi = inject(PublicDiscoveryApi);
  private readonly practicesApi = inject(DoctorPracticesApi);
  private readonly patientsApi = inject(PatientsApi);
  readonly reception = inject(ReceptionPracticeContext);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly language = inject(LanguageService);
  readonly actor = signal<ReservationActor>('Patient');
  readonly practiceId = signal('');
  readonly practices = signal<{ id: string; nameAr: string; nameEn: string | null }[]>([]);
  readonly patients = signal<BookablePatient[]>([]);
  readonly metadata = signal<ReservationMetadata | null>(null);
  readonly filters = signal<ReservationFilterOptions | null>(null);
  readonly query = signal<ReservationQuery>({ view: 'Upcoming', pageNumber: 1, pageSize: 20 });
  readonly page = signal<ReservationPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly detail = signal<Reservation | null>(null);
  readonly editor = signal<ReservationEditorMode | null>(null);
  readonly dates = signal<AvailableDate[]>([]);
  readonly slots = signal<AvailableSlot[]>([]);
  readonly options = signal<BookingOptions | null>(null);
  readonly date = signal('');
  readonly time = signal('');
  readonly messages = signal<string[]>([]);
  readonly loading = signal(false);
  readonly listFailed = signal(false);
  readonly detailLoading = signal(false);
  readonly bookingLoading = signal(false);
  readonly busy = signal(false);
  readonly checkedInTicket = signal<PracticeTicket | null>(null);
  private patientSearchSequence = 0;
  private listSequence = 0;
  private bookingSequence = 0;
  private detailSequence = 0;
  private scopeGeneration = 0;
  private intent: { signature: string; key: string } | null = null;
  readonly scope = computed<ReservationScope>(() => ({
    actor: this.actor(),
    practiceId: this.practiceId(),
  }));
  readonly scoped = computed(() => this.actor() === 'Doctor' || this.actor() === 'Reception');
  readonly canView = computed(() => this.allowed('View'));
  readonly canCreate = computed(
    () =>
      (this.actor() === 'Reception' ||
        (this.actor() === 'Patient' && this.patients().length > 0)) &&
      this.allowed('Create'),
  );
  readonly canRegisterPatient = computed(
    () => this.actor() === 'Reception' && this.session.hasPermission('Patients.Register'),
  );
  readonly canCancel = computed(
    () => !!this.detail()?.capabilities?.canCancel && this.allowed('Cancel'),
  );
  readonly canReschedule = computed(
    () => !!this.detail()?.capabilities?.canReschedule && this.allowed('Reschedule'),
  );
  readonly canRestore = computed(
    () =>
      this.actor() === 'Reception' &&
      !!this.detail()?.capabilities?.canRestoreFromNoShow &&
      this.allowed('RestoreNoShow'),
  );
  readonly canCheckIn = computed(
    () =>
      this.actor() === 'Reception' &&
      this.detail()?.status === 'Active' &&
      this.detail()?.price !== undefined &&
      this.reception.currentPracticeId() === this.practiceId() &&
      this.reception.allows('PracticeTickets.CheckIn') &&
      this.reception.allows('PracticeTickets.RecordPayment'),
  );
  readonly canForceCheckIn = computed(
    () =>
      this.actor() === 'Reception' &&
      this.detail()?.status === 'Active' &&
      this.detail()?.price !== undefined &&
      this.reception.currentPracticeId() === this.practiceId() &&
      this.reception.allows('PracticeTickets.ForceCheckIn') &&
      this.reception.allows('PracticeTickets.RecordPayment'),
  );

  constructor() {
    effect(() => {
      const id = this.reception.currentPracticeId();
      if (
        this.actor() === 'Reception' &&
        this.metadata() &&
        !this.busy() &&
        id !== this.practiceId()
      )
        untracked(() => {
          void this.selectPractice(id);
        });
    });
  }
  async initialize(actor: ReservationActor, practiceId = ''): Promise<void> {
    this.actor.set(actor);
    this.loading.set(true);
    try {
      this.metadata.set(await firstValueFrom(this.api.metadata()));
      if (actor === 'Patient') {
        this.patients.set([]);
        try {
          this.patients.set(await firstValueFrom(this.api.bookablePatients()));
        } catch (error) {
          // Create authority is independent of View authority; keep the list accessible.
          await this.failure(error);
        }
      }
      if (actor === 'Doctor')
        this.practices.set(
          (await firstValueFrom(this.practicesApi.list())).filter((p) => p.isActive),
        );
      if (actor === 'Reception') {
        await this.reception.refresh();
        this.practices.set(this.reception.practices());
      }
      if (this.scoped()) {
        const candidate =
          this.practices().find((p) => p.id === practiceId)?.id ||
          (actor === 'Reception' ? this.reception.currentPracticeId() : '') ||
          (this.practices().length === 1 ? this.practices()[0].id : '');
        await this.selectPractice(candidate);
      } else {
        this.practiceId.set(practiceId);
        await this.loadList();
      }
    } catch (error) {
      await this.failure(error);
    } finally {
      this.loading.set(false);
    }
  }
  async selectPractice(id: string): Promise<void> {
    if (this.busy()) return;
    if (this.scoped() && id && !this.practices().some((p) => p.id === id)) return;
    const generation = ++this.scopeGeneration;
    this.listSequence++;
    this.bookingSequence++;
    this.detailSequence++;
    this.practiceId.set(id);
    if (this.actor() === 'Reception') this.reception.select(id);
    this.close();
    this.filters.set(null);
    this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    this.query.update((q) => ({ ...q, pageNumber: 1, segmentId: undefined }));
    if (this.scoped() && !id) return;
    if (this.scoped() && this.canView()) {
      try {
        const filters = await firstValueFrom(this.api.filterOptions(this.scope()));
        if (generation !== this.scopeGeneration) return;
        this.filters.set(filters);
      } catch (error) {
        await this.failure(error);
        return;
      }
    }
    await this.loadList();
  }
  async loadList(): Promise<void> {
    if (!this.canView() || (this.scoped() && !this.practiceId())) return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.listFailed.set(false);
    this.messages.set([]);
    try {
      const page = await firstValueFrom(this.api.list(this.scope(), this.listQuery()));
      if (sequence === this.listSequence) this.page.set(page);
    } catch (error) {
      if (sequence === this.listSequence) {
        this.listFailed.set(true);
        this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
        await this.failure(error);
      }
    } finally {
      if (sequence === this.listSequence) this.loading.set(false);
    }
  }
  async inspect(id: string): Promise<void> {
    if (!this.canView() || (this.scoped() && !this.practiceId())) return;
    const sequence = ++this.detailSequence;
    this.detailLoading.set(true);
    this.detail.set(null);
    this.editor.set(null);
    try {
      const item = await firstValueFrom(this.api.details(this.scope(), id));
      if (sequence === this.detailSequence) this.detail.set(item);
    } catch (error) {
      if (sequence === this.detailSequence) await this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  async openEditor(mode: ReservationEditorMode): Promise<void> {
    if (this.busy() || !this.actionAllowed(mode)) return;
    this.editor.set(mode);
    this.messages.set([]);
    this.resetAvailability();
    this.intent = null;
    if (mode === 'create' || mode === 'reschedule') {
      const sequence = ++this.bookingSequence;
      this.bookingLoading.set(true);
      try {
        const dates = await firstValueFrom(
          mode === 'reschedule'
            ? this.api.rescheduleDates(this.scope(), this.detail()!.reservationId)
            : this.actor() === 'Reception'
              ? this.api.receptionDates(this.practiceId())
              : this.publicApi.availableDates(this.practiceId()),
        );
        if (sequence === this.bookingSequence) this.dates.set(dates);
      } catch (error) {
        if (sequence === this.bookingSequence) {
          this.editor.set(null);
          await this.failure(error);
        }
      } finally {
        if (sequence === this.bookingSequence) this.bookingLoading.set(false);
      }
    }
  }
  async chooseDate(date: string): Promise<void> {
    if (!this.dates().some((d) => d.date === date && d.isAvailable) || this.busy()) return;
    const sequence = ++this.bookingSequence;
    this.date.set(date);
    this.time.set('');
    this.slots.set([]);
    this.options.set(null);
    this.bookingLoading.set(true);
    try {
      const slots = await firstValueFrom(
        this.editor() === 'reschedule'
          ? this.api.rescheduleSlots(this.scope(), this.detail()!.reservationId, date)
          : this.actor() === 'Reception'
            ? this.api.receptionSlots(this.practiceId(), date)
            : this.publicApi.availableSlots(this.practiceId(), date),
      );
      if (sequence === this.bookingSequence)
        this.slots.set(
          slots.filter(
            (s) =>
              !(
                this.editor() === 'reschedule' &&
                date === this.detail()?.appointment.businessDate &&
                s.time === this.detail()?.appointment.slotStartTime
              ),
          ),
        );
    } catch (error) {
      if (sequence === this.bookingSequence) await this.failure(error);
    } finally {
      if (sequence === this.bookingSequence) this.bookingLoading.set(false);
    }
  }
  async chooseTime(time: string): Promise<void> {
    if (!this.slots().some((s) => s.time === time) || this.busy()) return;
    this.time.set(time);
    this.options.set(null);
    if (this.editor() !== 'create') return;
    const sequence = ++this.bookingSequence;
    this.bookingLoading.set(true);
    try {
      const options = await firstValueFrom(
        this.actor() === 'Reception'
          ? this.api.receptionOptions(this.practiceId(), this.date(), time)
          : this.publicApi.bookingOptions(this.practiceId(), this.date(), time),
      );
      if (sequence === this.bookingSequence)
        this.options.set({
          ...options,
          visitTypes: options.visitTypes.filter((v) => v.type === 'NewConsultation'),
        });
    } catch (error) {
      if (sequence === this.bookingSequence) await this.failure(error);
    } finally {
      if (sequence === this.bookingSequence) this.bookingLoading.set(false);
    }
  }
  async searchPatients(searchText: string): Promise<void> {
    if (
      this.actor() !== 'Reception' ||
      !this.reception.allows('Patients.SearchBasic') ||
      !searchText.trim()
    )
      return;
    const generation = this.scopeGeneration,
      sequence = ++this.patientSearchSequence;
    try {
      const page = await firstValueFrom(
        this.patientsApi.search({
          name: searchText,
          doctorPracticeId: this.practiceId(),
          pageNumber: 1,
          pageSize: 20,
        }),
      );
      if (generation === this.scopeGeneration && sequence === this.patientSearchSequence)
        this.patients.set(
          page.items.map((p) => ({
            patientId: p.patientId,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            dateOfBirth: p.dateOfBirth,
            gender: p.gender,
            isSelf: false,
            relationshipType: null,
          })),
        );
    } catch (error) {
      await this.failure(error);
    }
  }
  async save(draft: ReservationDraft): Promise<void> {
    const mode = this.editor(),
      current = this.detail();
    if (!mode || this.busy() || !this.actionAllowed(mode)) return;
    let request: Observable<Reservation>;
    const scope = this.scope();
    if (mode === 'create') {
      if (
        (this.actor() === 'Patient'
          ? !this.patients().some((p) => p.patientId === draft.patientId)
          : !draft.patientId.trim()) ||
        !this.date() ||
        !this.time()
      )
        return;
      const visit = this.options()?.visitTypes.find((v) => v.visitTypeId === draft.visitTypeId);
      if (!visit?.segments.some((s) => s.segmentId === draft.segmentId)) return;
      const body: CreateReservationRequest = {
        patientId: draft.patientId,
        businessDate: this.date(),
        slotStartTime: this.time(),
        segmentId: draft.segmentId,
        visitTypeId: draft.visitTypeId,
        bookingNote: draft.bookingNote.trim() || null,
      };
      request =
        this.actor() === 'Patient'
          ? this.api.createPatient(
              { ...body, doctorPracticeId: this.practiceId() },
              this.intentKey(mode, body),
            )
          : this.api.createReception(this.practiceId(), body, this.intentKey(mode, body));
    } else {
      if (!current?.rowVersion) return;
      if (mode === 'cancel') {
        const reasons =
          this.actor() === 'Patient'
            ? this.metadata()?.patientCancellationReasons
            : this.metadata()?.providerCancellationReasons;
        const reason = reasons?.find((r) => r.code === draft.reasonCode);
        if (!reason || (reason.requiresComment && !draft.comment.trim())) return;
        const body: CancelReservationRequest = {
          reasonCode: draft.reasonCode,
          comment: draft.comment.trim() || null,
          rowVersion: current.rowVersion,
        };
        request = this.api.cancel(scope, current.reservationId, body, this.intentKey(mode, body));
      } else if (mode === 'restore')
        request = this.api.restoreNoShow(
          this.practiceId(),
          current.reservationId,
          current.rowVersion,
          this.intentKey(mode, { rowVersion: current.rowVersion }),
        );
      else {
        if (!this.date() || !this.time() || !this.slots().some((s) => s.time === this.time()))
          return;
        const base: RescheduleReservationRequest = {
          businessDate: this.date(),
          slotStartTime: this.time(),
          rowVersion: current.rowVersion,
        };
        if (this.actor() !== 'Patient' && (!draft.patientConsentConfirmed || !draft.reason.trim()))
          return;
        const body: RescheduleReservationRequest | ProviderRescheduleRequest =
          this.actor() === 'Patient'
            ? base
            : { ...base, patientConsentConfirmed: true, reason: draft.reason.trim() };
        request = this.api.reschedule(
          scope,
          current.reservationId,
          body,
          this.intentKey(mode, body),
        );
      }
    }
    this.busy.set(true);
    this.messages.set([]);
    try {
      const response = await firstValueFrom(request);
      if (this.actor() === 'Reception' && this.reception.currentPracticeId() !== scope.practiceId) {
        this.toast.success(this.language.t('reservations.saved'));
        return;
      }
      this.detail.set(response);
      this.editor.set(null);
      this.resetAvailability();
      this.intent = null;
      this.toast.success(this.language.t('reservations.saved'));
      await this.loadList();
    } catch (error) {
      await this.failure(error);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        const date = this.date(),
          time = this.time();
        if (current) {
          try {
            this.detail.set(await firstValueFrom(this.api.details(scope, current.reservationId)));
          } catch (refreshError) {
            await this.failure(refreshError);
          }
        }
        this.busy.set(false);
        if (this.actionAllowed(mode) && (mode === 'create' || mode === 'reschedule')) {
          const messages = this.messages();
          await this.refreshAvailability(mode, date, time);
          this.messages.set(messages);
        }
      }
    } finally {
      this.busy.set(false);
    }
  }
  async checkIn(draft: CheckInSubmission): Promise<void> {
    const reservation = this.detail();
    const allowed = draft.force ? this.canForceCheckIn() : this.canCheckIn();
    if (
      !reservation ||
      !allowed ||
      this.busy() ||
      reservation.price === undefined ||
      draft.paidAmount !== reservation.price
    )
      return;
    if (draft.force && (!this.canForceCheckIn() || !draft.reason)) return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      let request: Observable<PracticeTicket>;
      if (draft.force) {
        const body = { paidAmount: draft.paidAmount, reason: draft.reason };
        request = this.ticketsApi.forceCheckIn(
          this.practiceId(),
          reservation.reservationId,
          body,
          this.intentKey('force-check-in', body),
        );
      } else {
        const body = { paidAmount: draft.paidAmount };
        request = this.ticketsApi.checkIn(
          this.practiceId(),
          reservation.reservationId,
          body,
          this.intentKey('check-in', body),
        );
      }
      const ticket = await firstValueFrom(request);
      this.intent = null;
      this.toast.success('tickets.checkIn.success');
      this.resetDrawer();
      await this.loadList();
      this.checkedInTicket.set(ticket);
    } catch (error) {
      await this.failure(error);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.inspect(reservation.reservationId);
        await this.loadList();
      }
    } finally {
      this.busy.set(false);
    }
  }
  close(): void {
    if (this.busy()) return;
    this.resetDrawer();
  }
  private resetDrawer(): void {
    this.detailSequence++;
    this.bookingSequence++;
    this.detail.set(null);
    this.editor.set(null);
    this.detailLoading.set(false);
    this.bookingLoading.set(false);
    this.resetAvailability();
    this.intent = null;
  }
  private async refreshAvailability(
    mode: ReservationEditorMode,
    date: string,
    time: string,
  ): Promise<void> {
    const intent = this.intent;
    await this.openEditor(mode);
    this.intent = intent;
    await this.chooseDate(date);
    if (this.slots().some((s) => s.time === time)) await this.chooseTime(time);
  }
  private resetAvailability(): void {
    this.dates.set([]);
    this.slots.set([]);
    this.options.set(null);
    this.date.set('');
    this.time.set('');
  }
  private intentKey(mode: string, body: object): string {
    const signature = JSON.stringify({
      mode,
      scope: this.scope(),
      id: this.detail()?.reservationId,
      body,
    });
    if (this.intent?.signature !== signature) this.intent = { signature, key: this.newIntentKey() };
    return this.intent.key;
  }
  private newIntentKey(): string {
    return createIdempotencyKey();
  }
  private actionAllowed(mode: ReservationEditorMode): boolean {
    return mode === 'create'
      ? this.canCreate() && !!this.practiceId()
      : mode === 'cancel'
        ? this.canCancel()
        : mode === 'reschedule'
          ? this.canReschedule()
          : this.canRestore();
  }
  private allowed(action: string): boolean {
    if (this.actor() === 'Patient') return this.session.user()?.userType === 'Patient';
    if (this.actor() === 'Admin')
      return action === 'View' && this.session.hasPermission('Reservations.ViewAdministrative');
    if (this.actor() === 'Reception')
      return (
        this.reception.currentPracticeId() === this.practiceId() &&
        this.reception.allows(`PracticeReservations.${action}`)
      );
    return this.session.hasPermission(`DoctorPracticeReservations.${action}Own`);
  }
  private listQuery(): ReservationQuery {
    const q = this.query();
    if (this.actor() === 'Patient')
      return {
        patientId: q.patientId,
        view: q.view,
        status: q.status,
        fromDate: q.fromDate,
        toDate: q.toDate,
        pageNumber: q.pageNumber,
        pageSize: q.pageSize,
      };
    if (this.actor() === 'Admin')
      return {
        search: q.search,
        doctorId: q.doctorId,
        practiceId: q.practiceId,
        status: q.status,
        bookingSource: q.bookingSource,
        fromDate: q.fromDate,
        toDate: q.toDate,
        pageNumber: q.pageNumber,
        pageSize: q.pageSize,
      };
    return {
      search: q.search,
      fromDate: q.fromDate,
      toDate: q.toDate,
      status: q.status,
      segmentId: q.segmentId,
      bookingSource: q.bookingSource,
      isLate: q.isLate,
      pageNumber: q.pageNumber,
      pageSize: q.pageSize,
    };
  }
  private async failure(error: unknown): Promise<void> {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages);
    this.toast.error(messages.join(' ') || this.language.t('common.requestFailed'));
    if (
      error instanceof HttpErrorResponse &&
      error.status === 403 &&
      this.actor() === 'Reception'
    ) {
      this.scopeGeneration++;
      this.listSequence++;
      this.bookingSequence++;
      this.detailSequence++;
      this.detail.set(null);
      this.editor.set(null);
      this.resetAvailability();
      this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
      await this.reception.refresh();
      this.practices.set(this.reception.practices());
      this.practiceId.set(this.reception.currentPracticeId());
      this.detailLoading.set(false);
      this.bookingLoading.set(false);
      this.loading.set(false);
    }
  }
}
