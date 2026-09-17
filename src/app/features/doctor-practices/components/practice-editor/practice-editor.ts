import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
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

  protected readonly governorates = signal<EgyptLocationOption[]>([]);
  protected readonly cities = signal<EgyptLocationOption[]>([]);
  protected readonly areas = signal<EgyptLocationOption[]>([]);
  protected readonly isLoadingLocations = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly messages = signal<string[]>([]);
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
    this.model.update((value) => ({ ...value, governorateId, cityId: '', areaId: '' }));
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

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
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
              this.api.update(current.id, { ...request, rowVersion: current.rowVersion }),
            )
          : await firstValueFrom(this.api.create(request));
        this.populate(response);
        this.saved.emit(response);
        this.toast.success(current ? this.uiLanguage.t('ui.full.304') : this.uiLanguage.t('ui.full.305'));
      } catch (error) {
        this.messages.set(flattenErrors(error));
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
      this.messages.set(flattenErrors(error));
      return null;
    }
  }

  private populate(practice: DoctorPractice): void {
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
