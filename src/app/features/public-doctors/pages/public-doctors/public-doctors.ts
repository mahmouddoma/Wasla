import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import { EgyptLocationOption } from '../../../../domains/doctor-profile';
import { PublicDiscoveryApi } from '../../../../domains/public-discovery';
import {
  PublicDoctorSearchResponse,
  PublicSpecialization,
} from '../../../../domains/public-discovery';

@Component({
  selector: 'app-public-doctors',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './public-doctors.html',
  styleUrl: './public-doctors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctors {
  protected readonly language = inject(LanguageService);
  protected readonly authSession = inject(AuthSession);
  private readonly api = inject(PublicDiscoveryApi);
  private readonly locationsApi = inject(DoctorProfileApi);

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

  constructor() {
    void this.initialize();
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
      const parsed = parseApiErrors(error);
      this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected imageFailed(doctorId: string): void {
    this.brokenImages.update((ids) => [...new Set([...ids, doctorId])]);
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
