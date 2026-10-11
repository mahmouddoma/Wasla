import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { ToastService } from '../../../../core/notifications/toast.service';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';
import {
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  PublicDiscoveryApi,
  PublicDoctorDetails,
  PublicPracticeSummary,
} from '../../../../domains/public-discovery';
import { ReservationsApi } from '../../../../domains/reservations/reservations-api';
import {
  BookablePatient,
  CreatePatientReservationRequest,
  Reservation,
} from '../../../../domains/reservations/reservation.models';

@Component({
  selector: 'app-public-doctor-details',
  imports: [RouterLink, TranslatePipe, PageHeader, LanguageSwitcher],
  templateUrl: './public-doctor-details.html',
  styleUrl: './public-doctor-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctorDetailsPage {
  protected readonly uiLanguage = inject(LanguageService);
  protected readonly authSession = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly api = inject(PublicDiscoveryApi);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly toastService = inject(ToastService);
  private readonly doctorId = inject(ActivatedRoute).snapshot.paramMap.get('doctorId') ?? '';

  private bookingRequest = 0;
  protected readonly doctor = signal<PublicDoctorDetails | null>(null);
  protected readonly selectedPractice = signal<PublicPracticeSummary | null>(null);
  protected readonly dates = signal<AvailableDate[]>([]);
  protected readonly selectedDate = signal('');
  protected readonly slots = signal<AvailableSlot[]>([]);
  protected readonly selectedTime = signal('');
  protected readonly options = signal<BookingOptions | null>(null);
  protected readonly selectedSegment = signal<{
    segmentId: string;
    nameAr: string;
    nameEn?: string | null;
    price: number;
  } | null>(null);
  protected readonly selectedVisitType = signal<{
    visitTypeId: string;
    nameAr: string;
    nameEn?: string | null;
  } | null>(null);
  protected readonly bookablePatients = signal<BookablePatient[]>([]);
  protected readonly selectedPatientId = signal('');
  protected readonly bookingNote = signal('');
  protected readonly bookingSubmitting = signal(false);
  protected readonly bookingConfirmedReservation = signal<Reservation | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly bookingLoading = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly notFound = signal(false);
  protected readonly doctorImageBroken = signal(false);
  protected readonly brokenLogos = signal<string[]>([]);

  protected readonly isInsidePortal = computed(() => this.authSession.isAuthenticated());
  protected readonly isPatient = computed(() => {
    const user = this.authSession.user();
    return user?.userType === 'Patient' || (user?.roles.includes('Patient') ?? false);
  });
  protected readonly currentUrl = computed(() => this.router.url);
  protected readonly userWorkspaceLink = computed(() => {
    const user = this.authSession.user();
    return user ? this.authSession.destinationFor(user) : '/workspace';
  });

  constructor() {
    void this.loadDoctor();
  }

  protected async choosePractice(
    practice: PublicPracticeSummary,
    autoAdvance = true,
  ): Promise<void> {
    const request = ++this.bookingRequest;
    this.selectedPractice.set(practice);
    this.dates.set([]);
    this.selectedDate.set('');
    this.selectedTime.set('');
    this.slots.set([]);
    this.options.set(null);
    this.selectedSegment.set(null);
    this.selectedVisitType.set(null);
    this.messages.set([]);
    this.bookingConfirmedReservation.set(null);

    // If practice is not bookable online (walk-in only), stop here; template renders the walk-in guide
    if (!practice.isBookable || practice.onlineBookingEnabled === false) return;

    this.bookingLoading.set(true);

    if (this.isPatient() && this.bookablePatients().length === 0) {
      try {
        const patients = await firstValueFrom(this.reservationsApi.bookablePatients());
        this.bookablePatients.set(patients);
        const self = patients.find((p) => p.isSelf) || patients[0];
        if (self) this.selectedPatientId.set(self.patientId);
      } catch {
        // Patient list loaded on demand
      }
    }

    try {
      const dates = await firstValueFrom(this.api.availableDates(practice.id));
      if (request === this.bookingRequest) {
        this.dates.set(dates);
        // Smart Default: auto-select first available date
        if (autoAdvance) {
          const firstAvailable = dates.find((d) => d.isAvailable);
          if (firstAvailable) {
            void this.chooseDate(firstAvailable.date, autoAdvance);
          }
        }
      }
    } catch (error) {
      if (request === this.bookingRequest) this.setErrors(error);
    } finally {
      if (request === this.bookingRequest) this.bookingLoading.set(false);
    }
  }

  protected async chooseDate(date: string, autoAdvance = true): Promise<void> {
    const practice = this.selectedPractice();
    if (!practice) return;
    const request = ++this.bookingRequest;
    this.selectedDate.set(date);
    this.slots.set([]);
    this.selectedTime.set('');
    this.options.set(null);
    this.selectedSegment.set(null);
    this.selectedVisitType.set(null);
    this.messages.set([]);
    this.bookingLoading.set(true);
    try {
      const slots = await firstValueFrom(this.api.availableSlots(practice.id, date));
      if (request === this.bookingRequest) {
        this.slots.set(slots);
        // Smart Default: auto-select first slot
        if (autoAdvance && slots.length > 0) {
          void this.chooseSlot(slots[0].time);
        }
      }
    } catch (error) {
      if (request === this.bookingRequest) this.setErrors(error);
    } finally {
      if (request === this.bookingRequest) this.bookingLoading.set(false);
    }
  }

  protected async chooseSlot(time: string): Promise<void> {
    const practice = this.selectedPractice();
    const date = this.selectedDate();
    if (!practice || !date) return;
    const request = ++this.bookingRequest;
    this.selectedTime.set(time);
    this.options.set(null);
    this.messages.set([]);
    this.bookingLoading.set(true);
    try {
      const options = await firstValueFrom(this.api.bookingOptions(practice.id, date, time));
      if (request === this.bookingRequest) {
        this.options.set(options);
        // Smart Default: auto-select standard visitType and default segment
        const defaultVisit =
          options.visitTypes.find((vt) => vt.type !== 'FollowUp') || options.visitTypes[0];
        if (defaultVisit) {
          this.selectedVisitType.set({
            visitTypeId: defaultVisit.visitTypeId,
            nameAr: defaultVisit.nameAr,
            nameEn: defaultVisit.nameEn,
          });
          const defaultSeg =
            defaultVisit.segments.find((s) => s.isDefault) || defaultVisit.segments[0];
          if (defaultSeg) {
            this.selectedSegment.set({
              segmentId: defaultSeg.segmentId,
              nameAr: defaultSeg.nameAr,
              nameEn: defaultSeg.nameEn,
              price: defaultSeg.price,
            });
          }
        }
      }
    } catch (error) {
      if (request !== this.bookingRequest) return;
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.chooseDate(date);
    } finally {
      if (request === this.bookingRequest) this.bookingLoading.set(false);
    }
  }

  protected selectSegment(
    segment: { segmentId: string; nameAr: string; nameEn?: string | null; price: number },
    visitType: { visitTypeId: string; nameAr: string; nameEn?: string | null },
  ): void {
    this.selectedSegment.set(segment);
    this.selectedVisitType.set(visitType);
  }

  protected async confirmQuickBooking(): Promise<void> {
    const seg = this.selectedSegment();
    const vt = this.selectedVisitType();
    if (!seg || !vt) return;
    await this.confirmBooking(seg, vt);
  }

  protected selectPatient(patientId: string): void {
    this.selectedPatientId.set(patientId);
  }

  protected updateBookingNote(event: Event): void {
    this.bookingNote.set((event.target as HTMLInputElement).value);
  }

  protected async confirmBooking(
    segment: { segmentId: string; nameAr: string; nameEn?: string | null; price: number },
    visitType: { visitTypeId: string; nameAr: string; nameEn?: string | null },
  ): Promise<void> {
    const practice = this.selectedPractice();
    const date = this.selectedDate();
    const time = this.selectedTime();

    if (!practice || !date || !time) return;

    if (!this.authSession.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    let patientId = this.selectedPatientId();
    if (!patientId && this.bookablePatients().length > 0) {
      patientId = this.bookablePatients()[0].patientId;
      this.selectedPatientId.set(patientId);
    }

    if (!patientId && this.isPatient()) {
      try {
        const patients = await firstValueFrom(this.reservationsApi.bookablePatients());
        this.bookablePatients.set(patients);
        const self = patients.find((p) => p.isSelf) || patients[0];
        if (self) {
          patientId = self.patientId;
          this.selectedPatientId.set(patientId);
        }
      } catch (err) {
        this.setErrors(err);
        return;
      }
    }

    if (!patientId) {
      this.toastService.error('booking.patientRequired');
      return;
    }

    this.bookingSubmitting.set(true);
    this.messages.set([]);

    try {
      const request: CreatePatientReservationRequest = {
        doctorPracticeId: practice.id,
        patientId,
        businessDate: date,
        slotStartTime: time,
        segmentId: segment.segmentId,
        visitTypeId: visitType.visitTypeId,
        bookingNote: this.bookingNote().trim() || null,
      };

      const idempotencyKey = createIdempotencyKey();
      const reservation = await firstValueFrom(
        this.reservationsApi.createPatient(request, idempotencyKey),
      );

      this.toastService.success('booking.successToast');
      this.bookingConfirmedReservation.set(reservation);
    } catch (error) {
      this.setErrors(error);
      const parsed = parseApiErrors(error);
      if (parsed.messages.length > 0) {
        this.toastService.error(parsed.messages[0]);
      }
    } finally {
      this.bookingSubmitting.set(false);
    }
  }

  protected formatSlot(date: string | null | undefined, time: string | null | undefined): string {
    if (!date) return '';
    const cleanTime = time ? time.slice(0, 5) : '';
    let timeStr = '';
    if (cleanTime) {
      const [h, m] = cleanTime.split(':').map(Number);
      if (!isNaN(h)) {
        const period =
          h >= 12 ? (this.uiLanguage.isRtl() ? 'م' : 'PM') : this.uiLanguage.isRtl() ? 'ص' : 'AM';
        const displayH = h % 12 || 12;
        timeStr = ` · ${displayH}:${String(m).padStart(2, '0')} ${period}`;
      }
    }
    return `${date}${timeStr}`;
  }

  protected resetBookingFlow(): void {
    this.selectedPractice.set(null);
    this.dates.set([]);
    this.selectedDate.set('');
    this.slots.set([]);
    this.selectedTime.set('');
    this.options.set(null);
    this.selectedSegment.set(null);
    this.selectedVisitType.set(null);
    this.bookingConfirmedReservation.set(null);
  }

  protected logoFailed(id: string): void {
    this.brokenLogos.update((ids) => [...new Set([...ids, id])]);
  }

  private async loadDoctor(): Promise<void> {
    try {
      const doc = await firstValueFrom(this.api.doctor(this.doctorId));
      this.doctor.set(doc);
      if (doc?.practices.length) {
        // Smart Default: auto-select primary bookable practice or first practice
        const target =
          doc.practices.find((p) => p.isBookable && p.onlineBookingEnabled !== false) ||
          doc.practices[0];
        if (target) {
          void this.choosePractice(target);
        }
      }
    } catch (error) {
      this.notFound.set(error instanceof HttpErrorResponse && error.status === 404);
      this.setErrors(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private setErrors(error: unknown): void {
    if (error instanceof Error && error.message === 'discovery.invalidPractice') {
      this.messages.set(['discovery.invalidPractice']);
      return;
    }
    const parsed = parseApiErrors(error);
    this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
  }
}
