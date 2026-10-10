import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { DoctorPractice } from '../../../../domains/doctor-practices';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import { EgyptLocationOption } from '../../../../domains/doctor-profile';
import { ToastService } from '../../../../core/notifications/toast.service';

@Component({
  selector: 'app-practice-editor',
  imports: [FormField, TranslatePipe],
  templateUrl: './practice-editor.html',
  styleUrl: './practice-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeEditor implements OnInit {
  protected readonly uiLanguage = inject(LanguageService);

  readonly practice = input<DoctorPractice | null>(null);
  readonly isDrawer = input(false);
  readonly saved = output<DoctorPractice>();
  readonly cancelled = output<void>();

  private readonly api = inject(DoctorPracticesApi);
  private readonly locationApi = inject(DoctorProfileApi);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly isLocating = signal(false);
  protected readonly governorates = signal<EgyptLocationOption[]>([]);
  protected readonly cities = signal<EgyptLocationOption[]>([]);
  protected readonly areas = signal<EgyptLocationOption[]>([]);
  protected readonly isLoadingLocations = signal(false);
  protected readonly isSubmitting = signal(false);

  protected readonly hasValidCoordinates = computed(() => {
    const lat = Number(this.model().latitude);
    const lng = Number(this.model().longitude);
    return Boolean(
      lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0,
    );
  });

  protected readonly mapEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const lat = Number(this.model().latitude);
    const lng = Number(this.model().longitude);
    if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) {
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
    const lat = Number(this.model().latitude);
    const lng = Number(this.model().longitude);
    if (!lat || !lng) return 'https://maps.google.com';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  });
  protected readonly messages = signal<string[]>([]);
  private rowVersion: string | null = null;
  protected readonly model = signal({
    nameAr: '',
    nameEn: '',
    governorateId: '',
    cityId: '',
    areaId: '',
    detailedAddress: '',
    latitude: 0,
    longitude: 0,
  });
  protected readonly editorForm = form(this.model, (field) => {
    required(field.nameAr, { message: 'ui.full.302' });
    maxLength(field.nameAr, 200, { message: 'validation.nameLength' });
    maxLength(field.nameEn, 200, { message: 'validation.nameLength' });
    required(field.governorateId, { message: 'practice.governorateRequired' });
    required(field.cityId, { message: 'practice.cityRequired' });
    required(field.areaId, { message: 'practice.areaRequired' });
    required(field.detailedAddress, { message: 'practice.addressRequired' });
    maxLength(field.detailedAddress, 500, { message: 'ui.full.303' });
    required(field.latitude, { message: 'practice.latitudeRequired' });
    min(field.latitude, -90, { message: 'validation.latitude' });
    max(field.latitude, 90, { message: 'validation.latitude' });
    required(field.longitude, { message: 'practice.longitudeRequired' });
    min(field.longitude, -180, { message: 'validation.longitude' });
    max(field.longitude, 180, { message: 'validation.longitude' });
  });

  async ngOnInit(): Promise<void> {
    const practice = this.practice();
    if (practice) this.populate(practice);
    await this.loadGovernorates();
    if (practice?.location.governorate) {
      await this.loadCities(practice.location.governorate.id);
    }
    if (practice?.location.city) await this.loadAreas(practice.location.city.id);
  }

  protected async governorateChanged(event: Event): Promise<void> {
    const governorateId = (event.currentTarget as HTMLSelectElement).value;
    this.model.update((value) => ({
      ...value,
      governorateId,
      cityId: '',
      areaId: '',
      ...(value.latitude === 0 && value.longitude === 0 && governorateId === '1'
        ? { latitude: 30.0444, longitude: 31.2357 }
        : {}),
    }));
    this.cities.set([]);
    this.areas.set([]);
    if (governorateId) await this.loadCities(Number(governorateId));
  }

  protected async cityChanged(event: Event): Promise<void> {
    const cityId = (event.currentTarget as HTMLSelectElement).value;
    this.model.update((value) => ({ ...value, cityId, areaId: '' }));
    this.areas.set([]);
    if (cityId) await this.loadAreas(Number(cityId));
  }

  protected useCurrentLocation(): void {
    if (this.isLocating()) return;
    if (!navigator.geolocation) {
      this.toast.error(this.uiLanguage.t('ui.full.546'));
      return;
    }
    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = Number(coords.latitude.toFixed(6));
        const lng = Number(coords.longitude.toFixed(6));
        this.model.update((value) => ({
          ...value,
          latitude: lat,
          longitude: lng,
        }));
        this.toast.success(this.uiLanguage.t('ui.full.547'));
        try {
          await this.autoFillLocationFromCoordinates(lat, lng);
        } catch {
          // ignore geocode fallback error
        } finally {
          this.isLocating.set(false);
        }
      },
      () => {
        this.toast.error(this.uiLanguage.t('ui.full.548'));
        this.isLocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  private async autoFillLocationFromCoordinates(lat: number, lng: number): Promise<void> {
    if (!this.governorates().length) {
      await this.loadGovernorates();
    }
    const govs = this.governorates();
    if (!govs.length) return;

    let stateName = '';
    let cityName = '';
    let localityName = '';
    let streetName = '';

    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
        { headers: { 'Accept-Language': 'ar' } },
      );
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        const addr = nomData.address || {};
        stateName = addr.state || addr.province || '';
        cityName = addr.city || addr.town || addr.suburb || addr.city_district || addr.county || '';
        localityName = addr.neighbourhood || addr.suburb || addr.quarter || '';
        streetName = [addr.road, addr.neighbourhood, addr.quarter].filter(Boolean).join('، ');
      }
    } catch {
      // Nominatim failed, try fallback
    }

    if (!stateName) {
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`,
        );
        if (bdcRes.ok) {
          const bdcData = await bdcRes.json();
          stateName = bdcData.principalSubdivision || '';
          cityName = bdcData.locality || bdcData.city || '';
          streetName = [bdcData.locality, bdcData.city, bdcData.principalSubdivision].filter(Boolean).join('، ');
        }
      } catch {
        // fallback
      }
    }

    if (!stateName) {
      if (lat >= 29.8 && lat <= 30.45 && lng >= 30.95 && lng <= 31.65) {
        stateName = lng < 31.22 ? 'الجيزة' : 'القاهرة';
      } else if (lat >= 31.0 && lat <= 31.4 && lng >= 29.7 && lng <= 30.2) {
        stateName = 'الإسكندرية';
      } else if (lat >= 30.9 && lat <= 31.25 && lng >= 31.2 && lng <= 31.6) {
        stateName = 'الدقهلية';
      }
    }

    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/محافظة\s*/g, '')
        .replace(/governorate\s*/g, '')
        .replace(/قسم\s*/g, '')
        .replace(/مركز\s*/g, '')
        .replace(/مدينة\s*/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .trim();

    const normState = normalize(stateName);
    const matchedGov = govs.find((g) => {
      const gAr = normalize(g.nameAr);
      const gEn = normalize(g.nameEn || '');
      return (
        (normState && (normState.includes(gAr) || gAr.includes(normState))) ||
        (gEn && normState && (normState.includes(gEn) || gEn.includes(normState)))
      );
    }) || (govs.find(g => normalize(g.nameAr).includes('قاهره')) ?? govs[0]);

    if (matchedGov) {
      this.model.update((val) => ({
        ...val,
        governorateId: String(matchedGov.id),
        cityId: '',
        areaId: '',
      }));
      await this.loadCities(matchedGov.id);

      const cities = this.cities();
      if (cities.length) {
        const normCity = normalize(cityName || localityName);
        let matchedCity = cities.find((c) => {
          const cAr = normalize(c.nameAr);
          const cEn = normalize(c.nameEn || '');
          return (
            (normCity && (normCity.includes(cAr) || cAr.includes(normCity))) ||
            (cEn && normCity && (normCity.includes(cEn) || cEn.includes(normCity)))
          );
        });

        if (!matchedCity && cities.length === 1) {
          matchedCity = cities[0];
        }

        if (matchedCity) {
          this.model.update((val) => ({
            ...val,
            cityId: String(matchedCity!.id),
            areaId: '',
          }));
          await this.loadAreas(matchedCity.id);

          const areas = this.areas();
          if (areas.length) {
            const normArea = normalize(localityName || cityName);
            const matchedArea = areas.find((a) => {
              const aAr = normalize(a.nameAr);
              const aEn = normalize(a.nameEn || '');
              return (
                (normArea && (normArea.includes(aAr) || aAr.includes(normArea))) ||
                (aEn && normArea && (normArea.includes(aEn) || aEn.includes(normArea)))
              );
            }) || (areas.length === 1 ? areas[0] : null);

            if (matchedArea) {
              this.model.update((val) => ({ ...val, areaId: String(matchedArea.id) }));
            }
          }
        }
      }
    }

    if (streetName && !this.model().detailedAddress) {
      this.model.update((val) => ({ ...val, detailedAddress: streetName }));
    }
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isSubmitting() || this.isLoadingLocations()) return;
    await submit(this.editorForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.messages.set([]);
      const value = this.model();
      const request = {
        nameAr: value.nameAr.trim(),
        nameEn: value.nameEn.trim() || null,
        governorateId: Number(value.governorateId),
        cityId: Number(value.cityId),
        areaId: Number(value.areaId),
        detailedAddress: value.detailedAddress.trim(),
        latitude: value.latitude,
        longitude: value.longitude,
      };

      try {
        const current = this.practice();
        const response = current
          ? await firstValueFrom(
              this.api.update(current.id, {
                ...request,
                rowVersion: this.rowVersion ?? current.rowVersion,
              }),
            )
          : await firstValueFrom(this.api.create(request));
        this.populate(response);
        this.saved.emit(response);
        this.toast.success(
          current ? this.uiLanguage.t('ui.full.304') : this.uiLanguage.t('ui.full.305'),
        );
      } catch (error) {
        const messages = flattenErrors(error);
        this.messages.set(messages);
        this.toast.error(messages[0] || 'common.requestFailed');
        if (error instanceof HttpErrorResponse && error.status === 409 && this.practice()) {
          const fresh = await this.reloadAfterConflict();
          if (fresh) this.saved.emit(fresh);
        }
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  private async reloadAfterConflict(): Promise<DoctorPractice | null> {
    try {
      const fresh = await firstValueFrom(this.api.details(this.practice()!.id));
      this.populate(fresh);
      this.toast.error(this.uiLanguage.t('ui.full.306'));
      return fresh;
    } catch (error) {
      const messages = flattenErrors(error);
      this.messages.set(messages);
      this.toast.error(messages[0] || 'common.requestFailed');
      return null;
    }
  }

  private populate(practice: DoctorPractice): void {
    this.rowVersion = practice.rowVersion;
    this.model.set({
      nameAr: practice.nameAr,
      nameEn: practice.nameEn ?? '',
      governorateId: String(practice.location.governorate?.id ?? ''),
      cityId: String(practice.location.city?.id ?? ''),
      areaId: String(practice.location.area?.id ?? ''),
      detailedAddress: practice.location.detailedAddress,
      latitude: practice.location.latitude ?? 0,
      longitude: practice.location.longitude ?? 0,
    });
    this.editorForm().reset();
  }

  private async loadGovernorates(): Promise<void> {
    this.isLoadingLocations.set(true);
    try {
      this.governorates.set(await firstValueFrom(this.locationApi.governorates()));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.isLoadingLocations.set(false);
    }
  }

  private async loadCities(governorateId: number): Promise<void> {
    this.isLoadingLocations.set(true);
    try {
      this.cities.set(await firstValueFrom(this.locationApi.cities(governorateId)));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.isLoadingLocations.set(false);
    }
  }

  private async loadAreas(cityId: number): Promise<void> {
    this.isLoadingLocations.set(true);
    try {
      this.areas.set(await firstValueFrom(this.locationApi.areas(cityId)));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.isLoadingLocations.set(false);
    }
  }
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
