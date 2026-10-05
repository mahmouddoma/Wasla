import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { DoctorProfileApi, EgyptLocationOption } from '../../../../domains/doctor-profile';
import { ToastService } from '../../../../core/notifications/toast.service';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { ReservationsApi } from '../../../../domains/reservations/reservations-api';
import {
  BookablePatient,
  CreatePatientReservationRequest,
  Reservation,
} from '../../../../domains/reservations/reservation.models';
import {
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  PublicDiscoveryApi,
  PublicDoctorDetails,
  PublicDoctorSearchItem,
  PublicDoctorSearchResponse,
  PublicPracticeSummary,
  PublicSpecialization,
} from '../../../../domains/public-discovery';

@Component({
  selector: 'app-public-doctors',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher, PageHeader, SideDrawer],
  templateUrl: './public-doctors.html',
  styleUrl: './public-doctors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctors {
  protected readonly language = inject(LanguageService);
  protected readonly authSession = inject(AuthSession);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly api = inject(PublicDiscoveryApi);
  private readonly locationsApi = inject(DoctorProfileApi);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly toastService = inject(ToastService);

  protected readonly specializations = signal<PublicSpecialization[]>([]);
  protected readonly governorates = signal<EgyptLocationOption[]>([]);
  protected readonly cities = signal<EgyptLocationOption[]>([]);
  protected readonly areas = signal<EgyptLocationOption[]>([]);
  protected readonly result = signal<PublicDoctorSearchResponse>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  protected readonly filters = signal({
    searchText: '',
    specializationId: '',
    governorateId: '',
    cityId: '',
    areaId: '',
  });
  protected readonly isLoading = signal(true);
  protected readonly messages = signal<string[]>([]);
  protected readonly brokenImages = signal<string[]>([]);
  protected readonly selectedDoctorPracticeId = signal<Record<string, string>>({});
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.result().totalCount / this.result().pageSize)),
  );
  protected readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return Boolean(
      f.searchText.trim() || f.specializationId || f.governorateId || f.cityId || f.areaId,
    );
  });
  protected readonly userWorkspaceLink = computed(() => {
    const user = this.authSession.session()?.user;
    return user ? this.authSession.destinationFor(user) : '/workspace';
  });
  protected readonly isInsidePortal = computed(() => this.authSession.isAuthenticated());

  // Slide-Over Drawer state for doctor details & booking
  protected readonly drawerOpened = signal(false);
  protected readonly drawerLoading = signal(false);
  protected readonly drawerDoctor = signal<PublicDoctorDetails | null>(null);
  protected readonly drawerSelectedPractice = signal<PublicPracticeSummary | null>(null);
  protected readonly drawerDates = signal<AvailableDate[]>([]);
  protected readonly drawerSelectedDate = signal('');
  protected readonly drawerSlots = signal<AvailableSlot[]>([]);
  protected readonly drawerSelectedTime = signal('');
  protected readonly drawerOptions = signal<BookingOptions | null>(null);
  protected readonly drawerBookingLoading = signal(false);
  protected readonly drawerMessages = signal<string[]>([]);
  protected readonly drawerDoctorImageBroken = signal(false);
  protected readonly drawerBrokenLogos = signal<string[]>([]);
  private drawerBookingRequest = 0;

  // Direct In-Place Booking State
  protected readonly isPatient = computed(
    () => this.authSession.isAuthenticated() && this.authSession.user()?.userType === 'Patient',
  );
  protected readonly bookablePatients = signal<BookablePatient[]>([]);
  protected readonly selectedPatientId = signal<string>('');
  protected readonly bookingNote = signal<string>('');
  protected readonly bookingSubmitting = signal(false);
  protected readonly bookingConfirmedReservation = signal<Reservation | null>(null);
  protected readonly currentUrl = computed(() => this.router.url);

  constructor() {
    void this.initialize();
  }

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/patient/reservations']);
    }
  }

  protected updateFilter(key: keyof ReturnType<typeof this.filters>, event: Event): void {
    const value = (event.currentTarget as HTMLInputElement | HTMLSelectElement).value;
    this.filters.update((filters) => ({ ...filters, [key]: value }));
  }

  protected async governorateChanged(event: Event): Promise<void> {
    this.updateFilter('governorateId', event);
    this.filters.update((value) => ({ ...value, cityId: '', areaId: '' }));
    this.cities.set([]);
    this.areas.set([]);
    const id = Number(this.filters().governorateId);
    if (id) this.cities.set(await firstValueFrom(this.locationsApi.cities(id)));
  }

  protected async cityChanged(event: Event): Promise<void> {
    this.updateFilter('cityId', event);
    this.filters.update((value) => ({ ...value, areaId: '' }));
    this.areas.set([]);
    const id = Number(this.filters().cityId);
    if (id) this.areas.set(await firstValueFrom(this.locationsApi.areas(id)));
  }

  protected async resetFilters(): Promise<void> {
    this.filters.set({
      searchText: '',
      specializationId: '',
      governorateId: '',
      cityId: '',
      areaId: '',
    });
    this.cities.set([]);
    this.areas.set([]);
    await this.search(1);
  }

  protected async search(pageNumber = 1): Promise<void> {
    this.isLoading.set(true);
    this.messages.set([]);
    try {
      const f = this.filters();
      this.result.set(
        await firstValueFrom(
          this.api.doctors({
            searchText: f.searchText.trim() || undefined,
            specializationId: f.specializationId || undefined,
            governorateId: numberOrUndefined(f.governorateId),
            cityId: numberOrUndefined(f.cityId),
            areaId: numberOrUndefined(f.areaId),
            pageNumber,
            pageSize: this.result().pageSize,
          }),
        ),
      );
    } catch (error) {
      this.messages.set(this.mapDrawerError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected imageFailed(doctorId: string): void {
    this.brokenImages.update((ids) => [...new Set([...ids, doctorId])]);
  }

  // Slide-Over Drawer booking actions
  protected async openDoctorDrawer(
    doctorItem: PublicDoctorSearchItem,
    practiceId?: string,
    preselectedDate?: string | null,
    preselectedTime?: string | null,
  ): Promise<void> {
    this.drawerOpened.set(true);
    this.drawerLoading.set(true);
    this.drawerDoctor.set(null);
    this.drawerSelectedPractice.set(null);
    this.drawerDates.set([]);
    this.drawerSelectedDate.set('');
    this.drawerSlots.set([]);
    this.drawerSelectedTime.set('');
    this.drawerOptions.set(null);
    this.drawerMessages.set([]);
    this.drawerDoctorImageBroken.set(false);
    this.bookingConfirmedReservation.set(null);
    this.bookingNote.set('');
    this.bookingSubmitting.set(false);

    if (this.isPatient() && this.bookablePatients().length === 0) {
      try {
        const patients = await firstValueFrom(this.reservationsApi.bookablePatients());
        this.bookablePatients.set(patients);
        const self = patients.find((p) => p.isSelf) || patients[0];
        if (self) this.selectedPatientId.set(self.patientId);
      } catch {
        // Patient list optional or loaded on confirm
      }
    }

    try {
      const details = await firstValueFrom(this.api.doctor(doctorItem.doctorId));
      this.drawerDoctor.set(details);

      const targetPractice = practiceId
        ? details.practices.find((p) => p.id === practiceId)
        : details.practices.length === 1
          ? details.practices[0]
          : null;

      if (
        targetPractice &&
        targetPractice.isBookable &&
        targetPractice.onlineBookingEnabled !== false
      ) {
        await this.chooseDrawerPractice(targetPractice);
        if (
          preselectedDate &&
          this.drawerDates().some((d) => d.date === preselectedDate && d.isAvailable)
        ) {
          await this.chooseDrawerDate(preselectedDate);
          if (preselectedTime) {
            const cleanTime = preselectedTime.slice(0, 5);
            const matched = this.drawerSlots().find((s) => s.time.startsWith(cleanTime));
            if (matched) {
              await this.chooseDrawerSlot(matched.time);
            }
          }
        }
      }
    } catch (error) {
      this.drawerMessages.set(this.mapDrawerError(error));
    } finally {
      this.drawerLoading.set(false);
    }
  }

  protected closeDrawer(): void {
    this.drawerOpened.set(false);
    this.bookingConfirmedReservation.set(null);
    this.bookingNote.set('');
    this.bookingSubmitting.set(false);
  }

  protected updateBookingNote(event: Event): void {
    this.bookingNote.set((event.target as HTMLInputElement).value);
  }

  protected selectPatient(patientId: string): void {
    this.selectedPatientId.set(patientId);
  }

  protected async confirmBooking(
    segment: { segmentId: string; nameAr: string; nameEn?: string | null; price: number },
    visitType: { visitTypeId: string; nameAr: string; nameEn?: string | null },
  ): Promise<void> {
    const practice = this.drawerSelectedPractice();
    const date = this.drawerSelectedDate();
    const time = this.drawerSelectedTime();

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
        this.drawerMessages.set(this.mapDrawerError(err));
        return;
      }
    }

    if (!patientId) {
      this.toastService.error('booking.patientRequired');
      return;
    }

    this.bookingSubmitting.set(true);
    this.drawerMessages.set([]);

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
      const errMsgs = this.mapDrawerError(error);
      this.drawerMessages.set(errMsgs);
      if (errMsgs.length > 0) {
        this.toastService.error(errMsgs[0]);
      }
    } finally {
      this.bookingSubmitting.set(false);
    }
  }

  protected async chooseDrawerPractice(practice: PublicPracticeSummary): Promise<void> {
    if (!practice.isBookable || practice.onlineBookingEnabled === false) return;
    const request = ++this.drawerBookingRequest;
    this.drawerSelectedPractice.set(practice);
    this.drawerDates.set([]);
    this.drawerSelectedDate.set('');
    this.drawerSlots.set([]);
    this.drawerSelectedTime.set('');
    this.drawerOptions.set(null);
    this.drawerMessages.set([]);
    this.drawerBookingLoading.set(true);

    try {
      const dates = await firstValueFrom(this.api.availableDates(practice.id));
      if (request === this.drawerBookingRequest) this.drawerDates.set(dates);
    } catch (error) {
      if (request === this.drawerBookingRequest) {
        this.drawerMessages.set(this.mapDrawerError(error));
      }
    } finally {
      if (request === this.drawerBookingRequest) this.drawerBookingLoading.set(false);
    }
  }

  protected async chooseDrawerDate(date: string): Promise<void> {
    const practice = this.drawerSelectedPractice();
    if (!practice) return;
    const request = ++this.drawerBookingRequest;
    this.drawerSelectedDate.set(date);
    this.drawerSlots.set([]);
    this.drawerSelectedTime.set('');
    this.drawerOptions.set(null);
    this.drawerMessages.set([]);
    this.drawerBookingLoading.set(true);

    try {
      const slots = await firstValueFrom(this.api.availableSlots(practice.id, date));
      if (request === this.drawerBookingRequest) this.drawerSlots.set(slots);
    } catch (error) {
      if (request === this.drawerBookingRequest) {
        this.drawerMessages.set(this.mapDrawerError(error));
      }
    } finally {
      if (request === this.drawerBookingRequest) this.drawerBookingLoading.set(false);
    }
  }

  protected async chooseDrawerSlot(time: string): Promise<void> {
    const practice = this.drawerSelectedPractice();
    const date = this.drawerSelectedDate();
    if (!practice || !date) return;
    const request = ++this.drawerBookingRequest;
    this.drawerSelectedTime.set(time);
    this.drawerOptions.set(null);
    this.drawerMessages.set([]);
    this.drawerBookingLoading.set(true);

    try {
      const options = await firstValueFrom(this.api.bookingOptions(practice.id, date, time));
      if (request === this.drawerBookingRequest) this.drawerOptions.set(options);
    } catch (error) {
      if (request !== this.drawerBookingRequest) return;
      this.drawerMessages.set(this.mapDrawerError(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.chooseDrawerDate(date);
      }
    } finally {
      if (request === this.drawerBookingRequest) this.drawerBookingLoading.set(false);
    }
  }

  protected formatSlot(date: string | null | undefined, time: string | null | undefined): string {
    if (!date) return '';
    const cleanTime = this.formatSlotTime(time);
    return cleanTime ? `${date} · ${cleanTime}` : date;
  }

  protected formatSlotTime(time: string | null | undefined): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length >= 2) {
      let hour = parseInt(parts[0], 10);
      const minute = parts[1];
      const isAr = this.language.isRtl();
      const period = hour >= 12 ? (isAr ? 'م' : 'PM') : isAr ? 'ص' : 'AM';
      hour = hour % 12 || 12;
      const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
      return `${hourStr}:${minute} ${period}`;
    }
    return time.slice(0, 5);
  }

  protected getActivePractice(doctor: PublicDoctorSearchItem): PublicPracticeSummary | undefined {
    const selectedId = this.selectedDoctorPracticeId()[doctor.doctorId];
    if (selectedId) {
      const found = doctor.practices.find((p) => p.id === selectedId);
      if (found) return found;
    }
    return doctor.practices[0];
  }

  protected selectDoctorPractice(doctorId: string, practiceId: string): void {
    this.selectedDoctorPracticeId.update((map) => ({ ...map, [doctorId]: practiceId }));
  }

  protected getScheduleDays(practice: PublicPracticeSummary | undefined): Array<{
    key: string;
    label: string;
    subLabel: string;
    isAvailable: boolean;
    slotTime?: string;
  }> {
    if (!practice) return [];
    const isAr = this.language.isRtl();
    const today = new Date();
    const days: Array<{
      key: string;
      label: string;
      subLabel: string;
      isAvailable: boolean;
      slotTime?: string;
    }> = [];

    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;

      let label = '';
      if (i === 0) label = isAr ? 'اليوم' : 'Today';
      else if (i === 1) label = isAr ? 'غداً' : 'Tomorrow';
      else {
        label = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' });
      }

      const subLabel = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        day: 'numeric',
        month: 'short',
      });

      let isAvailable = false;
      let slotTime: string | undefined = undefined;

      if (practice.nextAvailableSlotDate === dateStr) {
        isAvailable = true;
        slotTime = this.formatSlotTime(practice.nextAvailableSlotTime);
      } else if (i === 0 && practice.isToday && practice.nextAvailableSlotTime) {
        isAvailable = true;
        slotTime = this.formatSlotTime(practice.nextAvailableSlotTime);
      }

      days.push({
        key: dateStr,
        label,
        subLabel,
        isAvailable,
        slotTime,
      });
    }

    return days;
  }

  private mapDrawerError(error: unknown): string[] {
    if (error instanceof Error && error.message === 'discovery.invalidPractice') {
      return ['discovery.invalidPractice'];
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return ['discovery.resourceNotFound'];
    }
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    return messages.map((msg) =>
      msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('resource')
        ? 'discovery.resourceNotFound'
        : msg,
    );
  }

  protected drawerLogoFailed(id: string): void {
    this.drawerBrokenLogos.update((ids) => [...new Set([...ids, id])]);
  }

  private async initialize(): Promise<void> {
    try {
      const [specializations, governorates] = await Promise.all([
        firstValueFrom(this.api.specializations()),
        firstValueFrom(this.locationsApi.governorates()),
      ]);
      this.specializations.set(specializations);
      this.governorates.set(governorates);
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.messages.set(parsed.messages);
    }
    await this.search();
  }
}

function numberOrUndefined(value: string): number | undefined {
  const number = Number(value);
  return number ? number : undefined;
}
