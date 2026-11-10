import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { parseApiErrors } from '../../core/auth/api-errors';
import { createIdempotencyKey } from '../../core/http/create-idempotency-key';
import { ToastService } from '../../core/notifications/toast.service';
import {
  PublicDiscoveryApi,
  PublicDoctorDetails,
  PublicPracticeSummary,
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  BookingSegmentOption,
  BookingVisitTypeOption,
} from '../../domains/public-discovery';
import {
  ReservationsApi,
  BookablePatient,
  Reservation,
  CreatePatientReservationRequest,
} from '../../domains/reservations';

export interface PatientBookingIntent {
  doctorId: string;
  doctorPracticeId?: string;
  businessDate?: string | null;
  slotStartTime?: string | null;
}

/** One patient booking flow across both public entry points. Sensitive selections stay in memory. */
@Injectable({ providedIn: 'root' })
export class PatientBookingState {
  private readonly api = inject(PublicDiscoveryApi);
  private readonly reservations = inject(ReservationsApi);
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly opened = signal(false);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly doctor = signal<PublicDoctorDetails | null>(null);
  readonly practice = signal<PublicPracticeSummary | null>(null);
  readonly dates = signal<AvailableDate[]>([]);
  readonly date = signal('');
  readonly slots = signal<AvailableSlot[]>([]);
  readonly time = signal('');
  readonly options = signal<BookingOptions | null>(null);
  readonly patients = signal<BookablePatient[]>([]);
  readonly patientId = signal('');
  readonly note = signal('');
  readonly segment = signal<BookingSegmentOption | null>(null);
  readonly visit = signal<BookingVisitTypeOption | null>(null);
  readonly receipt = signal<Reservation | null>(null);
  readonly messages = signal<string[]>([]);
  readonly isPatient = computed(
    () => this.auth.isAuthenticated() && this.auth.user()?.userType === 'Patient',
  );
  readonly canConfirm = computed(
    () =>
      this.isPatient() &&
      !this.loading() &&
      !this.submitting() &&
      !!this.segment() &&
      !!this.visit() &&
      !!this.time() &&
      this.patients().some((p) => p.patientId === this.patientId()),
  );
  private generation = 0;
  private mutation: { signature: string; key: string } | null = null;
  private patientOwner: string | null = null;
  private observedToken: string | null | undefined;

  constructor() {
    effect(() => {
      const token = this.auth.token();
      const changed = this.observedToken !== undefined && token !== this.observedToken;
      this.observedToken = token;
      if (changed) {
        ++this.generation;
        this.patientOwner = null;
        this.patients.set([]);
        this.patientId.set('');
        this.note.set('');
        this.receipt.set(null);
        this.opened.set(false);
      }
    });
  }

  async open(intent: PatientBookingIntent): Promise<void> {
    if (this.submitting()) return;
    const generation = ++this.generation;
    this.opened.set(true);
    this.loading.set(true);
    this.doctor.set(null);
    this.practice.set(null);
    this.receipt.set(null);
    this.resetAvailability();
    this.messages.set([]);
    this.note.set('');
    try {
      const doctor = await firstValueFrom(this.api.doctor(intent.doctorId));
      if (generation !== this.generation) return;
      this.doctor.set(doctor);
      const practice = intent.doctorPracticeId
        ? doctor.practices.find((p) => p.id === intent.doctorPracticeId)
        : (doctor.practices.find((p) => p.isBookable && p.onlineBookingEnabled !== false) ??
          doctor.practices[0]);
      if (!practice) {
        this.messages.set(['discovery.invalidPractice']);
        return;
      }
      this.practice.set(practice);
      await this.loadPatients(generation);
      if (
        generation !== this.generation ||
        !practice.isBookable ||
        practice.onlineBookingEnabled === false
      )
        return;
      const dates = await firstValueFrom(this.api.availableDates(practice.id));
      if (generation !== this.generation) return;
      this.dates.set(dates);
      const date = intent.businessDate ?? dates.find((d) => d.isAvailable)?.date;
      if (date && !dates.some((d) => d.date === date && d.isAvailable)) {
        this.messages.set(['booking.selectionExpired']);
        return;
      }
      if (date) await this.loadDate(date, generation, intent.slotStartTime);
    } catch (error) {
      if (generation === this.generation) this.messages.set(this.errors(error));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  close(): void {
    if (this.submitting()) return;
    ++this.generation;
    this.opened.set(false);
    this.loading.set(false);
    this.note.set('');
  }

  async choosePractice(id: string): Promise<void> {
    if (this.submitting()) return;
    const doctor = this.doctor();
    if (!doctor?.practices.some((p) => p.id === id)) return;
    await this.open({ doctorId: doctor.doctorId, doctorPracticeId: id });
  }

  async chooseDate(date: string): Promise<void> {
    if (this.submitting() || !this.dates().some((d) => d.date === date && d.isAvailable)) return;
    const generation = ++this.generation;
    this.loading.set(true);
    this.messages.set([]);
    try {
      await this.loadDate(date, generation);
    } catch (error) {
      if (generation === this.generation) this.messages.set(this.errors(error));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  async chooseTime(time: string): Promise<void> {
    if (this.submitting() || !this.slots().some((s) => s.time === time)) return;
    const generation = ++this.generation;
    this.loading.set(true);
    this.messages.set([]);
    try {
      await this.loadOptions(time, generation);
    } catch (error) {
      if (generation !== this.generation) return;
      this.clearOptions();
      this.messages.set(this.errors(error));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  selectPatient(id: string): void {
    if (!this.submitting() && this.patients().some((p) => p.patientId === id))
      this.patientId.set(id);
  }

  selectOption(visitId: string, segmentId: string): void {
    if (this.submitting()) return;
    const visit = this.options()?.visitTypes.find((v) => v.visitTypeId === visitId);
    const segment = visit?.segments.find((s) => s.segmentId === segmentId);
    if (visit && segment) {
      this.visit.set(visit);
      this.segment.set(segment);
    }
  }

  async login(): Promise<void> {
    const doctor = this.doctor();
    if (!doctor) return;
    const query = new URLSearchParams();
    if (this.practice()) query.set('practiceId', this.practice()!.id);
    if (this.date()) query.set('date', this.date());
    if (this.time()) query.set('time', this.time());
    this.close();
    await this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/doctors/${encodeURIComponent(doctor.doctorId)}?${query}` },
    });
  }

  async confirm(): Promise<void> {
    if (!this.canConfirm()) return;
    const practice = this.practice();
    const segment = this.segment();
    const visit = this.visit();
    if (
      !practice ||
      !segment ||
      !visit ||
      !practice.isBookable ||
      practice.onlineBookingEnabled === false
    )
      return;
    const generation = this.generation;
    const token = this.auth.token();
    const request: CreatePatientReservationRequest = {
      doctorPracticeId: practice.id,
      patientId: this.patientId(),
      businessDate: this.date(),
      slotStartTime: this.time(),
      segmentId: segment.segmentId,
      visitTypeId: visit.visitTypeId,
      bookingNote: this.note().trim() || null,
    };
    const signature = JSON.stringify(request);
    if (this.mutation?.signature !== signature)
      this.mutation = { signature, key: createIdempotencyKey() };
    this.submitting.set(true);
    this.messages.set([]);
    try {
      const receipt = await firstValueFrom(
        this.reservations.createPatient(request, this.mutation.key),
      );
      this.mutation = null;
      if (generation === this.generation && token === this.auth.token()) {
        this.toast.success('booking.successToast');
        this.receipt.set(receipt);
      }
    } catch (error) {
      if (generation !== this.generation || token !== this.auth.token()) return;
      const messages = this.errors(error);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.clearOptions();
        try {
          await this.loadDate(request.businessDate, generation);
        } catch {
          this.slots.set([]);
        }
        this.messages.set(['booking.selectionExpired', ...messages]);
      } else {
        if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
          this.clearOptions();
          this.patients.set([]);
          this.patientId.set('');
        }
        this.messages.set(messages);
      }
      this.toast.error(this.messages()[0] ?? 'common.requestFailed');
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadPatients(generation: number): Promise<void> {
    const token = this.auth.token();
    if (token !== this.patientOwner) {
      this.patientId.set('');
      this.patients.set([]);
      this.patientOwner = token;
    }
    if (!this.isPatient()) {
      this.patients.set([]);
      return;
    }
    const patients = await firstValueFrom(this.reservations.bookablePatients());
    if (generation !== this.generation || token !== this.auth.token()) return;
    this.patients.set(patients);
    this.patientId.set(
      patients.find((p) => p.patientId === this.patientId())?.patientId ??
        patients.find((p) => p.isSelf)?.patientId ??
        '',
    );
  }

  private async loadDate(
    date: string,
    generation: number,
    preselectedTime?: string | null,
  ): Promise<void> {
    const practice = this.practice();
    if (!practice) return;
    this.date.set(date);
    this.slots.set([]);
    this.clearOptions();
    const slots = await firstValueFrom(this.api.availableSlots(practice.id, date));
    if (generation !== this.generation) return;
    this.slots.set(slots);
    if (preselectedTime) {
      const match = slots.find((s) => s.time.slice(0, 5) === preselectedTime.slice(0, 5));
      if (match) await this.loadOptions(match.time, generation);
      else this.messages.set(['booking.selectionExpired']);
    }
  }

  private async loadOptions(time: string, generation: number): Promise<void> {
    const practice = this.practice();
    if (!practice) return;
    this.clearOptions();
    const options = await firstValueFrom(this.api.bookingOptions(practice.id, this.date(), time));
    if (generation !== this.generation) return;
    this.time.set(time);
    this.options.set(options);
    const visit =
      options.visitTypes.find((v) => v.type === 'NewConsultation') ??
      options.visitTypes.find((v) => v.type !== 'FollowUp');
    const segment = visit?.segments.find((s) => s.isDefault) ?? visit?.segments[0];
    if (visit && segment) this.selectOption(visit.visitTypeId, segment.segmentId);
  }

  private resetAvailability(): void {
    this.dates.set([]);
    this.date.set('');
    this.slots.set([]);
    this.clearOptions();
  }
  private clearOptions(): void {
    this.time.set('');
    this.options.set(null);
    this.segment.set(null);
    this.visit.set(null);
  }
  private errors(error: unknown): string[] {
    if (error instanceof HttpErrorResponse && error.status === 404)
      return ['discovery.resourceNotFound'];
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    return messages.length ? messages : ['common.requestFailed'];
  }
}
