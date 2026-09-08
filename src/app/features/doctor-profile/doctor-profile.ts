import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { AuthSession } from '../../core/auth/auth-session';
import { PERMISSIONS } from '../../core/auth/permissions';
import { DoctorProfileApi } from '../../core/doctor-profile/doctor-profile-api';
import {
  DoctorPracticeLocation,
  DoctorSpecializationHistoryItem,
  DoctorSpecializationRequest,
  DoctorSpecializationSelection,
  DoctorSpecializationsResponse,
  EgyptLocationOption,
  MedicalSpecializationOption,
} from '../../core/doctor-profile/doctor-profile.models';
import { SpecializationSelector } from '../../shared/specialization-selector/specialization-selector';

@Component({
  selector: 'app-doctor-profile',
  imports: [FormField, RouterLink, SpecializationSelector],
  templateUrl: './doctor-profile.html',
  styleUrl: './doctor-profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorProfile {
  private readonly api = inject(DoctorProfileApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly options = signal<MedicalSpecializationOption[]>([]);
  protected readonly current = signal<DoctorSpecializationsResponse>({ items: [] });
  protected readonly openRequest = signal<DoctorSpecializationRequest | null>(null);
  protected readonly history = signal<DoctorSpecializationHistoryItem[]>([]);
  protected readonly selected = signal<DoctorSpecializationSelection[]>([]);
  protected readonly governorates = signal<EgyptLocationOption[]>([]);
  protected readonly cities = signal<EgyptLocationOption[]>([]);
  protected readonly areas = signal<EgyptLocationOption[]>([]);
  protected readonly location = signal<DoctorPracticeLocation | null>(null);
  protected readonly locationModel = signal({
    governorateId: '',
    cityId: '',
    areaId: '',
    detailedAddress: '',
    latitude: 0,
    longitude: 0,
  });
  protected readonly locationForm = form(this.locationModel, (field) => {
    required(field.governorateId, { message: 'اختر المحافظة.' });
    required(field.cityId, { message: 'اختر المدينة.' });
    required(field.areaId, { message: 'اختر المنطقة.' });
    required(field.detailedAddress, { message: 'العنوان التفصيلي مطلوب.' });
    maxLength(field.detailedAddress, 500, { message: 'الحد الأقصى 500 حرف.' });
    min(field.latitude, -90, { message: 'خط العرض يجب أن يكون بين -90 و90.' });
    max(field.latitude, 90, { message: 'خط العرض يجب أن يكون بين -90 و90.' });
    min(field.longitude, -180, { message: 'خط الطول يجب أن يكون بين -180 و180.' });
    max(field.longitude, 180, { message: 'خط الطول يجب أن يكون بين -180 و180.' });
  });
  protected readonly isLoading = signal(true);
  protected readonly isSpecializationSubmitting = signal(false);
  protected readonly isLocationSubmitting = signal(false);
  protected readonly citiesLoading = signal(false);
  protected readonly areasLoading = signal(false);
  protected readonly isLocating = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly canViewSpecializations = this.session.hasPermission(
    PERMISSIONS.doctorSpecializationsViewOwn,
  );
  protected readonly canSubmit = this.session.hasPermission(
    PERMISSIONS.doctorSpecializationsSubmitOwn,
  );
  protected readonly canResubmit = this.session.hasPermission(
    PERMISSIONS.doctorSpecializationsResubmitOwn,
  );
  protected readonly canViewLocation = this.session.hasPermission(
    PERMISSIONS.doctorPracticeLocationViewOwn,
  );
  protected readonly canManageLocation = this.session.hasPermission(
    PERMISSIONS.doctorPracticeLocationManageOwn,
  );
  protected readonly canEditProposal = computed(
    () =>
      (!this.openRequest() && this.canSubmit) ||
      (this.openRequest()?.status === 'ModificationRequested' && this.canResubmit),
  );

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.isLoading.set(true);
    this.apiMessages.set([]);
    const tasks: Promise<void>[] = [];
    if (this.canViewSpecializations) tasks.push(this.loadSpecializations());
    if (this.canViewLocation || this.canManageLocation) tasks.push(this.loadLocation());
    await Promise.all(tasks);
    this.isLoading.set(false);
  }

  protected async saveSpecializations(): Promise<void> {
    if (!this.canEditProposal() || this.isSpecializationSubmitting()) return;
    if (!this.selected().length || this.selected().filter((item) => item.isPrimary).length !== 1) {
      this.apiMessages.set(['اختر تخصصًا واحدًا على الأقل وحدد تخصصًا أساسيًا واحدًا فقط.']);
      return;
    }
    this.isSpecializationSubmitting.set(true);
    this.apiMessages.set([]);
    try {
      const openRequest = this.openRequest();
      const response =
        openRequest?.status === 'ModificationRequested'
          ? await firstValueFrom(
              this.api.resubmitSpecializations({
                specializations: this.selected(),
                rowVersion: openRequest.rowVersion,
              }),
            )
          : await firstValueFrom(
              this.api.submitSpecializations({ specializations: this.selected() }),
            );
      this.openRequest.set(response);
      await this.loadSpecializationHistory();
    } catch (error) {
      this.handleError(error);
      if (error instanceof HttpErrorResponse && error.status === 409)
        await this.loadSpecializations();
    } finally {
      this.isSpecializationSubmitting.set(false);
    }
  }

  protected async governorateChanged(event: Event): Promise<void> {
    const governorateId = (event.currentTarget as HTMLSelectElement).value;
    this.locationModel.update((value) => ({ ...value, governorateId, cityId: '', areaId: '' }));
    this.cities.set([]);
    this.areas.set([]);
    if (governorateId) await this.loadCities(Number(governorateId));
  }

  protected async cityChanged(event: Event): Promise<void> {
    const cityId = (event.currentTarget as HTMLSelectElement).value;
    this.locationModel.update((value) => ({ ...value, cityId, areaId: '' }));
    this.areas.set([]);
    if (cityId) await this.loadAreas(Number(cityId));
  }

  protected async saveLocation(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.locationForm, async () => {
      if (!this.canManageLocation || this.isLocationSubmitting()) return;
      this.isLocationSubmitting.set(true);
      this.apiMessages.set([]);
      try {
        const response = await firstValueFrom(
          this.api.upsertPracticeLocation({
            governorateId: Number(this.locationModel().governorateId),
            cityId: Number(this.locationModel().cityId),
            areaId: Number(this.locationModel().areaId),
            detailedAddress: this.locationModel().detailedAddress.trim(),
            latitude: this.locationModel().latitude,
            longitude: this.locationModel().longitude,
            rowVersion: this.location()?.rowVersion ?? null,
          }),
        );
        this.location.set(response);
        this.populateLocation(response);
      } catch (error) {
        this.handleError(error);
        if (error instanceof HttpErrorResponse && error.status === 409) await this.loadLocation();
      } finally {
        this.isLocationSubmitting.set(false);
      }
    });
  }

  protected useCurrentLocation(): void {
    if (!this.canManageLocation || this.isLocating()) return;
    if (!navigator.geolocation) {
      this.apiMessages.set(['المتصفح الحالي لا يدعم تحديد الموقع.']);
      return;
    }
    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.locationModel.update((value) => ({
          ...value,
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        }));
        this.isLocating.set(false);
      },
      () => {
        this.apiMessages.set(['تعذر قراءة موقعك الحالي. يمكنك إدخال الإحداثيات يدويًا.']);
        this.isLocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  private async loadSpecializations(): Promise<void> {
    try {
      const [options, current] = await Promise.all([
        firstValueFrom(this.api.specializationOptions()),
        firstValueFrom(this.api.currentSpecializations()),
      ]);
      this.options.set(options);
      this.current.set(current);
      try {
        const request = await firstValueFrom(this.api.openSpecializationRequest());
        this.openRequest.set(request);
        this.selected.set(
          request.latestRevision.map(({ medicalSpecializationId, isPrimary }) => ({
            medicalSpecializationId,
            isPrimary,
          })),
        );
        await this.loadSpecializationHistory();
      } catch (error) {
        if (!this.isNotFound(error)) throw error;
        this.openRequest.set(null);
        this.history.set([]);
        this.selected.set(
          current.items.map(({ medicalSpecializationId, isPrimary }) => ({
            medicalSpecializationId,
            isPrimary,
          })),
        );
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private async loadSpecializationHistory(): Promise<void> {
    try {
      this.history.set(await firstValueFrom(this.api.specializationHistory()));
    } catch (error) {
      if (!this.isNotFound(error)) this.handleError(error);
    }
  }

  private async loadLocation(): Promise<void> {
    try {
      this.governorates.set(await firstValueFrom(this.api.governorates()));
      try {
        const location = await firstValueFrom(this.api.practiceLocation());
        this.location.set(location);
        this.populateLocation(location);
        await this.loadCities(location.governorate.id);
        await this.loadAreas(location.city.id);
      } catch (error) {
        if (!this.isNotFound(error)) throw error;
        this.location.set(null);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private async loadCities(governorateId: number): Promise<void> {
    this.citiesLoading.set(true);
    try {
      this.cities.set(await firstValueFrom(this.api.cities(governorateId)));
    } catch (error) {
      this.handleError(error);
    } finally {
      this.citiesLoading.set(false);
    }
  }

  private async loadAreas(cityId: number): Promise<void> {
    this.areasLoading.set(true);
    try {
      this.areas.set(await firstValueFrom(this.api.areas(cityId)));
    } catch (error) {
      this.handleError(error);
    } finally {
      this.areasLoading.set(false);
    }
  }

  private populateLocation(location: DoctorPracticeLocation): void {
    this.locationModel.set({
      governorateId: String(location.governorate.id),
      cityId: String(location.city.id),
      areaId: String(location.area.id),
      detailedAddress: location.detailedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    this.locationForm().reset();
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  private handleError(error: unknown): void {
    const parsed = parseApiErrors(error);
    this.apiMessages.update((messages) => [
      ...messages,
      ...parsed.messages,
      ...Object.values(parsed.fields).flat(),
    ]);
  }
}
