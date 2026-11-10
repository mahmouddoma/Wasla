import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
import { PatientBookingState, PatientBookingDrawerComponent } from '../../../patient-booking';
import { DoctorProfileApi, EgyptLocationOption } from '../../../../domains/doctor-profile';
import {
  PublicDiscoveryApi,
  PublicDoctorSearchItem,
  PublicDoctorSearchResponse,
  PublicPracticeSummary,
  PublicSpecialization,
} from '../../../../domains/public-discovery';

@Component({
  selector: 'app-public-doctors',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher, PageHeader, PatientBookingDrawerComponent],
  templateUrl: './public-doctors.html',
  styleUrl: './public-doctors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctors {
  protected readonly failedPracticeLogos = signal<ReadonlySet<string>>(new Set());
  protected practiceLogoUrl(id: string): string {
    return this.api.practiceLogoUrl(id);
  }
  protected markPracticeLogoFailed(id: string): void {
    this.failedPracticeLogos.update((ids) => new Set([...ids, id]));
  }
  protected readonly language = inject(LanguageService);
  protected readonly authSession = inject(AuthSession);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly api = inject(PublicDiscoveryApi);
  private readonly locationsApi = inject(DoctorProfileApi);
  private searchSequence = 0;
  private citySequence = 0;
  private areaSequence = 0;
  private destroyed = false;
  protected readonly citiesLoading = signal(false);
  protected readonly areasLoading = signal(false);
  protected readonly locationFailed = signal(false);

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

  protected readonly booking = inject(PatientBookingState);
  protected readonly showDetailedLocation = signal(false);
  protected toggleDetailedLocation(): void { this.showDetailedLocation.update(value => !value); }

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; ++this.searchSequence; ++this.citySequence; ++this.areaSequence; });
    void this.initialize();
  }

  protected formatDateChip(dateStr: string): { dayName: string; dayNumber: string; monthName: string } {
    if (!dateStr) return { dayName: '', dayNumber: '', monthName: '' };
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        const isAr = this.language.isRtl();
        const dayName = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' }).format(date);
        const monthName = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { month: 'short' }).format(date);
        return { dayName, dayNumber: String(day), monthName };
      }
    } catch {
      // fallback
    }
    return { dayName: '', dayNumber: dateStr, monthName: '' };
  }

  protected onDoctorCardSelect(doctor: PublicDoctorSearchItem): void {
    const activePractice = this.getActivePractice(doctor);
    void this.openDoctorDrawer(
      doctor,
      activePractice?.id,
      activePractice?.nextAvailableSlotDate,
      activePractice?.nextAvailableSlotTime,
    );
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
    const sequence = ++this.citySequence;
    ++this.areaSequence;
    this.areasLoading.set(false);
    this.locationFailed.set(false);
    const id = Number(this.filters().governorateId);
    this.citiesLoading.set(!!id);
    try {
      if (id) {
        const cities = await firstValueFrom(this.locationsApi.cities(id));
        if (sequence === this.citySequence && id === Number(this.filters().governorateId)) this.cities.set(cities);
      }
    } catch { if (sequence === this.citySequence) this.locationFailed.set(true); }
    finally { if (sequence === this.citySequence) this.citiesLoading.set(false); }
  }

  protected async cityChanged(event: Event): Promise<void> {
    this.updateFilter('cityId', event);
    this.filters.update((value) => ({ ...value, areaId: '' }));
    this.areas.set([]);
    const sequence = ++this.areaSequence;
    this.locationFailed.set(false);
    const id = Number(this.filters().cityId);
    this.areasLoading.set(!!id);
    try {
      if (id) {
        const areas = await firstValueFrom(this.locationsApi.areas(id));
        if (sequence === this.areaSequence && id === Number(this.filters().cityId)) this.areas.set(areas);
      }
    } catch { if (sequence === this.areaSequence) this.locationFailed.set(true); }
    finally { if (sequence === this.areaSequence) this.areasLoading.set(false); }
  }

  protected async resetFilters(): Promise<void> {
    ++this.citySequence;
    ++this.areaSequence;
    this.citiesLoading.set(false);
    this.areasLoading.set(false);
    this.locationFailed.set(false);
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
    if (this.destroyed) return;
    const sequence = ++this.searchSequence;
    this.isLoading.set(true);
    this.messages.set([]);
    this.result.set({ items: [], totalCount: 0, pageNumber, pageSize: this.result().pageSize });
    try {
      const f = this.filters();
      const result = await firstValueFrom(
          this.api.doctors({
            searchText: f.searchText.trim() || undefined,
            specializationId: f.specializationId || undefined,
            governorateId: numberOrUndefined(f.governorateId),
            cityId: numberOrUndefined(f.cityId),
            areaId: numberOrUndefined(f.areaId),
            pageNumber,
            pageSize: this.result().pageSize,
          }),
      );
      if (sequence === this.searchSequence) this.result.set(result);
    } catch (error) {
      if (sequence === this.searchSequence) this.messages.set(this.mapDrawerError(error));
    } finally {
      if (sequence === this.searchSequence) this.isLoading.set(false);
    }
  }

  protected imageFailed(doctorId: string): void {
    this.brokenImages.update((ids) => [...new Set([...ids, doctorId])]);
  }

  protected async openDoctorDrawer(
    doctor: PublicDoctorSearchItem, practiceId?: string,
    businessDate?: string | null, slotStartTime?: string | null,
  ): Promise<void> {
    await this.booking.open({ doctorId: doctor.doctorId, doctorPracticeId: practiceId, businessDate, slotStartTime });
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

  private async initialize(): Promise<void> {
    try {
      const [specializations, governorates] = await Promise.all([
        firstValueFrom(this.api.specializations()),
        firstValueFrom(this.locationsApi.governorates()),
      ]);
      if (this.destroyed) return;
      this.specializations.set(specializations);
      this.governorates.set(governorates);
    } catch (error) {
      const parsed = parseApiErrors(error);
      if (!this.destroyed) this.messages.set(parsed.messages);
    }
    await this.search();
  }
}

function numberOrUndefined(value: string): number | undefined {
  const number = Number(value);
  return number ? number : undefined;
}
