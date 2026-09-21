import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import {
  DoctorPracticeLocation,
  DoctorSpecializationHistoryItem,
  DoctorSpecializationRequest,
  DoctorSpecializationSelection,
  DoctorSpecializationsResponse,
  EgyptLocationOption,
  MedicalSpecializationOption,
  SpecializationSelector,
} from '../../../../domains/doctor-profile';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TRANSLATIONS } from '../../../../core/i18n/translations';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PublicProfileManager } from '../../components/public-profile-manager/public-profile-manager';

@Component({
  selector: 'app-doctor-profile',
  imports: [
    FormField,
    SpecializationSelector,
    TranslatePipe,
    PublicProfileManager,
  ],
  templateUrl: './doctor-profile.html',
  styleUrl: './doctor-profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorProfile {
  readonly langService = inject(LanguageService);
  private readonly api = inject(DoctorProfileApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);

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
    required(field.governorateId, { message: 'practice.governorateRequired' });
    required(field.cityId, { message: 'practice.cityRequired' });
    required(field.areaId, { message: 'practice.areaRequired' });
    required(field.detailedAddress, { message: 'practice.addressRequired' });
    maxLength(field.detailedAddress, 500, { message: 'ui.full.540' });
    required(field.latitude, { message: 'practice.latitudeRequired' });
    min(field.latitude, -90, { message: 'validation.latitude' });
    max(field.latitude, 90, { message: 'validation.latitude' });
    required(field.longitude, { message: 'practice.longitudeRequired' });
    min(field.longitude, -180, { message: 'validation.longitude' });
    max(field.longitude, 180, { message: 'validation.longitude' });
  });
  protected readonly isLoading = signal(true);
  protected readonly activeSection = signal<'specialties' | 'location' | 'bio' | 'all'>(
    'specialties',
  );

  protected setSection(section: 'specialties' | 'location' | 'bio' | 'all'): void {
    this.activeSection.set(section);
  }

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
      const message = this.langService.t('doctor.specializationsInvalid');
      this.apiMessages.set([message]);
      this.toast.error(message);
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
      this.toast.success(
        this.langService.t(
          openRequest?.status === 'ModificationRequested'
            ? 'doctor.specializationsResubmitted'
            : 'doctor.specializationsSubmitted',
        ),
      );
      await this.loadSpecializationHistory();
    } catch (error) {
      this.handleError(error);
      this.toast.error(this.langService.t('doctor.specializationsFailed'));
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
        const isUpdate = this.location() !== null;
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
        this.toast.success(
          isUpdate ? this.langService.t('ui.full.541') : this.langService.t('ui.full.542'),
        );
      } catch (error) {
        this.handleError(error);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          await this.loadLocation();
          this.toast.error(this.langService.t('ui.full.543'));
        }
      } finally {
        this.isLocationSubmitting.set(false);
      }
    });
  }

  protected async resolveAddressFromCoordinates(): Promise<void> {
    const lat = Number(this.locationModel().latitude);
    const lng = Number(this.locationModel().longitude);
    if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) {
      this.toast.error(this.langService.t('ui.full.544'));
      return;
    }
    this.isLocating.set(true);
    try {
      await this.reverseGeocodeAndPopulate(lat, lng);
    } catch {
      this.toast.error(this.langService.t('ui.full.545'));
    } finally {
      this.isLocating.set(false);
    }
  }

  protected useCurrentLocation(): void {
    if (!this.canManageLocation || this.isLocating()) return;
    if (!navigator.geolocation) {
      this.apiMessages.set([this.langService.t('ui.full.546')]);
      return;
    }
    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = Number(coords.latitude.toFixed(6));
        const lng = Number(coords.longitude.toFixed(6));
        this.locationModel.update((value) => ({
          ...value,
          latitude: lat,
          longitude: lng,
        }));
        try {
          await this.reverseGeocodeAndPopulate(lat, lng);
        } catch {
          this.toast.success(this.langService.t('ui.full.547'));
        } finally {
          this.isLocating.set(false);
        }
      },
      () => {
        this.apiMessages.set([this.langService.t('ui.full.548')]);
        this.isLocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(this.langService.currentLang() === 'en' ? 'en' : 'ar-EG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  protected readonly approvedCount = computed(() => this.current().items.length);

  protected readonly hasValidCoordinates = computed(() => {
    const lat = Number(this.locationModel().latitude);
    const lng = Number(this.locationModel().longitude);
    return Boolean(
      lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0,
    );
  });

  protected readonly mapEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const lat = Number(this.locationModel().latitude);
    const lng = Number(this.locationModel().longitude);
    if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) {
      // Default overview of Egypt / Cairo (30.0444, 31.2357)
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        'https://www.openstreetmap.org/export/embed.html?bbox=31.18%2C29.98%2C31.32%2C30.10&layer=mapnik&marker=30.0444%2C31.2357',
      );
    }
    const delta = 0.007;
    const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
    const marker = `${lat}%2C${lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`,
    );
  });

  protected readonly googleMapsDirectUrl = computed<string>(() => {
    const lat = Number(this.locationModel().latitude);
    const lng = Number(this.locationModel().longitude);
    if (!lat || !lng) return 'https://maps.google.com';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  });

  protected readonly requestStatusMeta = computed(() => {
    const req = this.openRequest();
    if (!req) return null;
    const isAr = this.langService.currentLang() === 'ar';
    switch (req.status) {
      case 'PendingReview':
        return {
          label: isAr ? this.langService.t('ui.full.549') : 'Pending Review',
          className: 'status-pending',
          desc: isAr
            ? this.langService.t('ui.full.550')
            : 'Your proposal is currently under review by the administration.',
        };
      case 'ModificationRequested':
        return {
          label: isAr ? this.langService.t('ui.full.551') : 'Modification Requested',
          className: 'status-mod',
          desc:
            req.latestModificationMessage ||
            (isAr ? this.langService.t('ui.full.552') : 'Please update requirements and resubmit.'),
        };
      default:
        return {
          label: req.status,
          className: 'status-default',
          desc: '',
        };
    }
  });

  private async loadSpecializations(): Promise<void> {
    try {
      let options: MedicalSpecializationOption[] = [];
      try {
        options = await firstValueFrom(this.api.specializationOptions());
      } catch (error) {
        if (!this.isNotFound(error)) this.handleError(error);
      }
      this.options.set(options);

      let current: DoctorSpecializationsResponse = { items: [] };
      try {
        current = await firstValueFrom(this.api.currentSpecializations());
      } catch (error) {
        if (!this.isNotFound(error)) this.handleError(error);
      }
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
        if (!this.isNotFound(error)) this.handleError(error);
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
      if (!this.isNotFound(error)) this.handleError(error);
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
      try {
        this.governorates.set(await firstValueFrom(this.api.governorates()));
      } catch (error) {
        if (!this.isNotFound(error)) this.handleError(error);
      }

      try {
        const location = await firstValueFrom(this.api.practiceLocation());
        this.location.set(location);
        this.populateLocation(location);
        await this.loadCities(location.governorate.id);
        await this.loadAreas(location.city.id);
      } catch (error) {
        if (this.isNotFound(error)) {
          this.location.set(null);
          this.locationModel.set({
            governorateId: '',
            cityId: '',
            areaId: '',
            detailedAddress: '',
            latitude: 0,
            longitude: 0,
          });
          this.cities.set([]);
          this.areas.set([]);
          this.locationForm().reset();
        } else {
          this.handleError(error);
        }
      }
    } catch (error) {
      if (!this.isNotFound(error)) this.handleError(error);
    }
  }

  private async loadCities(governorateId: number): Promise<void> {
    this.citiesLoading.set(true);
    try {
      this.cities.set(await firstValueFrom(this.api.cities(governorateId)));
    } catch (error) {
      if (!this.isNotFound(error)) this.handleError(error);
    } finally {
      this.citiesLoading.set(false);
    }
  }

  private async loadAreas(cityId: number): Promise<void> {
    this.areasLoading.set(true);
    try {
      this.areas.set(await firstValueFrom(this.api.areas(cityId)));
    } catch (error) {
      if (!this.isNotFound(error)) this.handleError(error);
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

  private cleanLocationText(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(
        /(محافظة|محافظه|مدينة|مدينه|مركز|قسم|حي|منطقة|منطقه|governorate|gov|city|district|qism|markaz)/gi,
        '',
      )
      .replace(/^ال/g, '')
      .replace(/[\s\-_,.\'\"]/g, '');
  }

  private findBestLocationMatch(
    candidates: (string | null | undefined)[],
    options: EgyptLocationOption[],
  ): EgyptLocationOption | null {
    const validCandidates = candidates.filter((c): c is string => Boolean(c && c.trim()));
    if (!validCandidates.length || !options.length) return null;

    // Pass 1: Exact matches
    for (const cand of validCandidates) {
      const cleanCand = this.cleanLocationText(cand);
      if (!cleanCand) continue;
      for (const opt of options) {
        const ar = this.cleanLocationText(opt.nameAr);
        const en = this.cleanLocationText(opt.nameEn);
        if ((ar && cleanCand === ar) || (en && cleanCand === en)) {
          return opt;
        }
      }
    }

    // Pass 2: Substring inclusion (length >= 3)
    for (const cand of validCandidates) {
      const cleanCand = this.cleanLocationText(cand);
      if (!cleanCand || cleanCand.length < 3) continue;
      for (const opt of options) {
        const ar = this.cleanLocationText(opt.nameAr);
        const en = this.cleanLocationText(opt.nameEn);
        if (ar && ar.length >= 3 && (cleanCand.includes(ar) || ar.includes(cleanCand))) {
          return opt;
        }
        if (en && en.length >= 3 && (cleanCand.includes(en) || en.includes(cleanCand))) {
          return opt;
        }
      }
    }

    return null;
  }

  private async reverseGeocodeAndPopulate(lat: number, lng: number): Promise<void> {
    const govCandidates: string[] = [];
    const cityCandidates: string[] = [];
    const areaCandidates: string[] = [];
    let placeName: string | null = null;
    let streetName: string | null = null;
    let fallbackFullAddress: string | null = null;

    // 1. Try Nominatim (OpenStreetMap)
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar,en&addressdetails=1`;
      const res = await fetch(osmUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        govCandidates.push(a.state, a.province, a.governorate, a.region, a.county, a.city);
        cityCandidates.push(
          a.quarter,
          a.suburb,
          a.city_district,
          a.town,
          a.city,
          a.county,
          a.borough,
          a.municipality,
        );
        areaCandidates.push(
          a.hamlet,
          a.neighbourhood,
          a.suburb,
          a.quarter,
          a.village,
          a.residential,
          a.district,
        );
        placeName = a.shop || a.building || a.amenity || null;
        streetName = a.road || null;
        fallbackFullAddress = data.display_name || null;
      }
    } catch {
      // Continue to fallback
    }

    // 2. If sparse, fallback with BigDataCloud
    if (!govCandidates.filter(Boolean).length || !cityCandidates.filter(Boolean).length) {
      try {
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`;
        const res = await fetch(bdcUrl);
        if (res.ok) {
          const data = await res.json();
          govCandidates.push(data.principalSubdivision, data.city);
          cityCandidates.push(data.locality);
          if (Array.isArray(data.localityInfo?.informative)) {
            for (const item of data.localityInfo.informative) {
              if (item?.name) {
                cityCandidates.push(item.name);
                areaCandidates.push(item.name);
              }
            }
          }
          if (Array.isArray(data.localityInfo?.administrative)) {
            for (const item of data.localityInfo.administrative) {
              if (item?.name) {
                govCandidates.push(item.name);
              }
            }
          }
        }
      } catch {
        // Ignore fallback error
      }
    }

    // 3. Ensure governorates are loaded
    if (!this.governorates().length) {
      try {
        this.governorates.set(await firstValueFrom(this.api.governorates()));
      } catch (err) {
        if (!this.isNotFound(err)) this.handleError(err);
      }
    }

    // 4. Match Governorate
    const matchedGov = this.findBestLocationMatch(govCandidates, this.governorates());
    if (matchedGov) {
      this.locationModel.update((v) => ({
        ...v,
        governorateId: String(matchedGov.id),
        cityId: '',
        areaId: '',
      }));

      // Load Cities for this governorate
      await this.loadCities(matchedGov.id);

      // 5. Match City
      const matchedCity = this.findBestLocationMatch(cityCandidates, this.cities());
      if (matchedCity) {
        this.locationModel.update((v) => ({
          ...v,
          cityId: String(matchedCity.id),
          areaId: '',
        }));

        // Load Areas for this city
        await this.loadAreas(matchedCity.id);

        // 6. Match Area
        const matchedArea = this.findBestLocationMatch(areaCandidates, this.areas());
        if (matchedArea) {
          this.locationModel.update((v) => ({
            ...v,
            areaId: String(matchedArea.id),
          }));
        }
      }
    }

    // 7. Auto-populate Detailed Address if empty
    const currentAddress = this.locationModel().detailedAddress.trim();
    if (!currentAddress) {
      const addressParts: string[] = [];
      if (placeName) addressParts.push(placeName);
      if (streetName && !addressParts.includes(streetName)) addressParts.push(streetName);
      const autoDetailed =
        addressParts.join(this.langService.t('ui.full.0')) ||
        (fallbackFullAddress
          ? fallbackFullAddress.split(/[,،]/).slice(0, 3).join(this.langService.t('ui.full.0'))
          : '');
      if (autoDetailed) {
        this.locationModel.update((v) => ({ ...v, detailedAddress: autoDetailed }));
      }
    }

    this.locationForm().reset();

    if (matchedGov) {
      this.toast.success(this.langService.t('ui.full.556'));
    } else {
      this.toast.success(this.langService.t('ui.full.557'));
    }
  }

  private isNotFound(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    if (error.status === 404) return true;
    const parsed = parseApiErrors(error);
    return parsed.messages.some(
      (m) =>
        m.includes(TRANSLATIONS['ui.full.558'].ar) ||
        m.toLowerCase().includes('not found') ||
        m.includes(TRANSLATIONS['ui.full.559'].ar),
    );
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
