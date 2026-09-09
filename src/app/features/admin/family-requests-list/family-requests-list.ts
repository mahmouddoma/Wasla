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
import { FamiliesApi } from '../../../core/families/families-api';
import {
  FamilyRequestPage,
  FamilyRequestStatus,
  FamilyRequestType,
} from '../../../core/families/family.models';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-family-requests-list',
  imports: [FormField, RouterLink, PageHeader],
  templateUrl: './family-requests-list.html',
  styleUrls: ['../management-list.css', './family-requests-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyRequestsList {
  private readonly api = inject(FamiliesApi);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSequence = 0;
  protected readonly model = signal({ search: '' });
  protected readonly searchForm = form(this.model, (field) => {
    maxLength(field.search, 200, { message: 'الحد الأقصى للبحث 200 حرف.' });
  });
  protected readonly status = signal<FamilyRequestStatus | ''>('Pending');
  protected readonly requestType = signal<FamilyRequestType | ''>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;
  protected readonly result = signal<FamilyRequestPage | null>(null);
  protected readonly loading = signal(true);
  protected readonly messages = signal<string[]>([]);
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

  protected setFilter(filter: 'status' | 'requestType', event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (filter === 'status') this.status.set(value as FamilyRequestStatus | '');
    else this.requestType.set(value as FamilyRequestType | '');
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
    this.loading.set(true);
    this.messages.set([]);
    try {
      const response = await firstValueFrom(
        this.api.adminRequests({
          status: this.status(),
          requestType: this.requestType(),
          search: this.model().search,
          pageNumber: this.pageNumber(),
          pageSize: this.pageSize,
        }),
      );
      if (sequence !== this.loadSequence) return;
      this.result.set(response);
      this.pageNumber.set(response.pageNumber);
    } catch (error) {
      if (sequence !== this.loadSequence) return;
      this.messages.set(flattenErrors(error));
    } finally {
      if (sequence === this.loadSequence) this.loading.set(false);
    }
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(date);
  }
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
