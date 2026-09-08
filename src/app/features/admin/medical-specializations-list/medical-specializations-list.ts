import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { MedicalSpecializationsApi } from '../../../core/medical-specializations/medical-specializations-api';
import { MedicalSpecializationsPage } from '../../../core/medical-specializations/medical-specializations.models';

type BooleanFilter = '' | 'true' | 'false';

@Component({
  selector: 'app-medical-specializations-list',
  imports: [FormField, RouterLink],
  templateUrl: './medical-specializations-list.html',
  styleUrls: ['../management-list.css', './medical-specializations-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedicalSpecializationsList {
  private readonly api = inject(MedicalSpecializationsApi);
  private readonly session = inject(AuthSession);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSequence = 0;

  protected readonly model = signal({ search: '' });
  protected readonly searchForm = form(this.model, (field) => {
    maxLength(field.search, 200, { message: 'الحد الأقصى للبحث 200 حرف.' });
  });
  protected readonly activeFilter = signal<BooleanFilter>('');
  protected readonly deletedFilter = signal<BooleanFilter>('false');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;
  protected readonly result = signal<MedicalSpecializationsPage | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly canCreate = this.session.hasPermission(PERMISSIONS.specializationsCreate);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.result()?.totalCount ?? 0) / this.pageSize)),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
    void this.load();
  }

  protected scheduleSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.pageNumber.set(1);
      void this.load();
    }, 350);
  }

  protected setFilter(filter: 'active' | 'deleted', event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value as BooleanFilter;
    (filter === 'active' ? this.activeFilter : this.deletedFilter).set(value);
    this.pageNumber.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    void this.load();
  }

  protected async load(): Promise<void> {
    if (this.searchForm().invalid()) return;
    const sequence = ++this.loadSequence;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      const response = await firstValueFrom(
        this.api.list({
          search: this.model().search.trim() || undefined,
          isActive: this.toBoolean(this.activeFilter()),
          isDeleted: this.toBoolean(this.deletedFilter()),
          pageNumber: this.pageNumber(),
          pageSize: this.pageSize,
        }),
      );
      if (sequence !== this.loadSequence) return;
      this.result.set(response);
      this.pageNumber.set(response.pageNumber);
    } catch (error) {
      if (sequence !== this.loadSequence) return;
      const parsed = parseApiErrors(error);
      this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      if (sequence === this.loadSequence) this.isLoading.set(false);
    }
  }

  private toBoolean(value: BooleanFilter): boolean | undefined {
    return value === '' ? undefined : value === 'true';
  }
}
