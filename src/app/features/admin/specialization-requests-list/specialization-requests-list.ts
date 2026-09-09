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
import { DoctorSpecializationRequestsApi } from '../../../core/doctor-specialization-requests/doctor-specialization-requests-api';
import { DoctorSpecializationRequestsPage } from '../../../core/doctor-specialization-requests/doctor-specialization-requests.models';
import {
  DoctorSpecializationRequestStatus,
  DoctorSpecializationRequestType,
} from '../../../core/doctor-profile/doctor-profile.models';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-specialization-requests-list',
  imports: [FormField, RouterLink, PageHeader],
  templateUrl: './specialization-requests-list.html',
  styleUrls: ['../management-list.css', './specialization-requests-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecializationRequestsList {
  private readonly api = inject(DoctorSpecializationRequestsApi);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSequence = 0;
  protected readonly model = signal({ search: '' });
  protected readonly searchForm = form(this.model, (field) => {
    maxLength(field.search, 200, { message: 'الحد الأقصى للبحث 200 حرف.' });
  });
  protected readonly status = signal<DoctorSpecializationRequestStatus | ''>('PendingReview');
  protected readonly type = signal<DoctorSpecializationRequestType | ''>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;
  protected readonly result = signal<DoctorSpecializationRequestsPage | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
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

  protected setFilter(filter: 'status' | 'type', event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (filter === 'status') this.status.set(value as DoctorSpecializationRequestStatus | '');
    else this.type.set(value as DoctorSpecializationRequestType | '');
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
          status: this.status() || undefined,
          type: this.type() || undefined,
          search: this.model().search.trim() || undefined,
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

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(date);
  }

  protected statusLabel(value: DoctorSpecializationRequestStatus): string {
    return {
      PendingReview: 'قيد المراجعة',
      ModificationRequested: 'مطلوب تعديل',
      Approved: 'معتمد',
      Rejected: 'مرفوض',
    }[value];
  }

  protected typeLabel(value: DoctorSpecializationRequestType): string {
    return value === 'Initial' ? 'طلب أول' : 'تغيير';
  }
}
