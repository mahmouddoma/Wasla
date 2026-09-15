import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { DoctorSpecializationRequestsApi } from '../../../core/doctor-specialization-requests/doctor-specialization-requests-api';
import { DoctorSpecializationRequestsPage } from '../../../core/doctor-specialization-requests/doctor-specialization-requests.models';
import {
  DoctorSpecializationRequestStatus,
  DoctorSpecializationRequestType,
} from '../../../core/doctor-profile/doctor-profile.models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { SpecializationRequestDetailsPage } from '../specialization-request-details/specialization-request-details';

@Component({
  selector: 'app-specialization-requests-list',
  imports: [
    FormField,
    PageHeader,
    SideDrawer,
    SpecializationRequestDetailsPage,
  ],
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
  protected readonly selectedRequestId = signal<string | null>(null);
  protected readonly selectedDoctorName = signal<string>('');
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.result()?.totalCount ?? 0) / this.pageSize)),
  );

  protected readonly hasActiveFilter = computed(() =>
    Boolean(
      this.status() !== 'PendingReview' || this.type() !== '' || this.model().search.trim() !== '',
    ),
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

  protected clearSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.model.set({ search: '' });
    this.searchForm().reset();
    this.pageNumber.set(1);
    void this.load();
  }

  protected clearAllFilters(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.model.set({ search: '' });
    this.searchForm().reset();
    this.status.set('');
    this.type.set('');
    this.pageNumber.set(1);
    void this.load();
  }

  protected filterByStatus(status: DoctorSpecializationRequestStatus | ''): void {
    if (this.status() === status) return;
    this.status.set(status);
    this.pageNumber.set(1);
    void this.load();
  }

  protected setFilter(filter: 'status' | 'type', event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (filter === 'status') this.status.set(value as DoctorSpecializationRequestStatus | '');
    else this.type.set(value as DoctorSpecializationRequestType | '');
    this.pageNumber.set(1);
    void this.load();
  }

  protected doctorInitials(nameAr: string): string {
    if (!nameAr) return 'ط';
    const clean = nameAr.replace(/^(دكتور|د\.|أ\.د|أستاذ دكتور)\s+/i, '').trim();
    const parts = clean.split(/\s+/);
    if (!parts.length || !parts[0]) return 'ط';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  }

  protected openReviewDrawer(requestId: string, doctorName: string): void {
    this.selectedRequestId.set(requestId);
    this.selectedDoctorName.set(doctorName);
  }

  protected closeReviewDrawer(): void {
    this.selectedRequestId.set(null);
    this.selectedDoctorName.set('');
  }

  protected handleReviewSaved(): void {
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
