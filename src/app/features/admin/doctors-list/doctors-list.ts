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
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { AdminDoctorsApi } from '../../../core/admin-doctors/admin-doctors-api';
import {
  AdminDoctorListItem,
  AdminDoctorsPage,
} from '../../../core/admin-doctors/admin-doctors.models';
import { DoctorApprovalStatus } from '../../../core/doctors/doctor.models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { firstValueFrom } from 'rxjs';

export interface StatusOption {
  value: DoctorApprovalStatus | '';
  label: string;
}

export interface DoctorsMetrics {
  total: number;
  approved: number;
  pending: number;
  needsAction: number;
  loaded: boolean;
}

@Component({
  selector: 'app-doctors-list',
  imports: [FormField, RouterLink, PageHeader],
  templateUrl: './doctors-list.html',
  styleUrls: ['../management-list.css', './doctors-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorsList {
  private readonly api = inject(AdminDoctorsApi);
  private readonly session = inject(AuthSession);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSequence = 0;

  protected readonly statusOptions: readonly StatusOption[] = [
    { value: '', label: 'الكل' },
    { value: 'Approved', label: 'معتمد' },
    { value: 'Pending', label: 'قيد المراجعة' },
    { value: 'Rejected', label: 'مرفوض' },
    { value: 'Suspended', label: 'معلّق' },
  ];

  protected readonly filterModel = signal({ searchText: '' });
  protected readonly filterForm = form(this.filterModel, (field) => {
    maxLength(field.searchText, 200, { message: 'الحد الأقصى للبحث 200 حرف.' });
  });

  protected readonly selectedStatus = signal<DoctorApprovalStatus | ''>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 50];
  protected readonly result = signal<AdminDoctorsPage | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isMetricsLoading = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly canViewDetails = this.session.hasPermission(PERMISSIONS.doctorsViewDetails);

  protected readonly sortBy = signal<'newest' | 'oldest' | 'name'>('newest');
  protected readonly viewMode = signal<'table' | 'grid'>('table');

  protected readonly metrics = signal<DoctorsMetrics>({
    total: 0,
    approved: 0,
    pending: 0,
    needsAction: 0,
    loaded: false,
  });

  protected readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil((this.result()?.totalCount ?? 0) / (this.result()?.pageSize ?? this.pageSize())),
    ),
  );

  protected readonly sortedItems = computed<AdminDoctorListItem[]>(() => {
    const items = this.result()?.items ?? [];
    const sort = this.sortBy();
    if (sort === 'name') {
      return [...items].sort((a, b) => (a.nameAr || '').localeCompare(b.nameAr || '', 'ar'));
    }
    if (sort === 'oldest') {
      return [...items].sort(
        (a, b) => new Date(a.createdOnUtc).getTime() - new Date(b.createdOnUtc).getTime(),
      );
    }
    return [...items].sort(
      (a, b) => new Date(b.createdOnUtc).getTime() - new Date(a.createdOnUtc).getTime(),
    );
  });

  protected readonly visiblePages = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    const current = this.pageNumber();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  protected readonly pageItemRange = computed(() => {
    const res = this.result();
    if (!res || res.totalCount === 0) return { start: 0, end: 0, total: 0 };
    const start = (res.pageNumber - 1) * res.pageSize + 1;
    const end = Math.min(res.totalCount, res.pageNumber * res.pageSize);
    return { start, end, total: res.totalCount };
  });

  protected readonly hasActiveFilter = computed(() => {
    return Boolean(this.filterModel().searchText.trim() || this.selectedStatus());
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
    void this.load();
    void this.loadMetrics();
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
    this.filterModel.set({ searchText: '' });
    this.filterForm().reset();
    this.pageNumber.set(1);
    void this.load();
  }

  protected clearAllFilters(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.filterModel.set({ searchText: '' });
    this.filterForm().reset();
    this.selectedStatus.set('');
    this.pageNumber.set(1);
    void this.load();
  }

  protected doctorInitials(doctor: AdminDoctorListItem): string {
    const name = doctor.nameAr?.trim() || doctor.nameEn?.trim() || '';
    if (!name) return 'د';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return parts[0].charAt(0) + ' ' + parts[1].charAt(0);
    }
    return parts[0].substring(0, 2);
  }

  protected doctorCode(doctor: AdminDoctorListItem): string {
    const cleanId = (doctor.doctorId || '').replace(/-/g, '').toUpperCase();
    return `#DR-${cleanId.slice(0, 4) || '0000'}`;
  }

  protected completionPercentage(doctor: AdminDoctorListItem): number {
    const count = this.availableDocuments(doctor);
    return Math.round((count / 5) * 100);
  }

  protected filterBy(status: DoctorApprovalStatus | ''): void {
    if (status === this.selectedStatus()) return;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.selectedStatus.set(status);
    this.pageNumber.set(1);
    void this.load();
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    if (newSize && newSize !== this.pageSize()) {
      this.pageSize.set(newSize);
      this.pageNumber.set(1);
      void this.load();
    }
  }

  protected onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value as 'newest' | 'oldest' | 'name');
  }

  protected toggleViewMode(mode: 'table' | 'grid'): void {
    this.viewMode.set(mode);
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.pageNumber.set(page);
    void this.load();
  }

  protected async load(): Promise<void> {
    if (this.filterForm().invalid()) return;
    const sequence = ++this.loadSequence;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    this.fieldErrors.set({});
    try {
      const searchText = this.filterModel().searchText.trim();
      const response = await firstValueFrom(
        this.api.list({
          approvalStatus: this.selectedStatus() || undefined,
          searchText: searchText || undefined,
          pageNumber: this.pageNumber(),
          pageSize: this.pageSize(),
        }),
      );
      if (sequence !== this.loadSequence) return;
      this.result.set(response);
      this.pageNumber.set(response.pageNumber);
      // If total was loaded without filter, update metrics total
      if (!this.selectedStatus() && !searchText) {
        this.metrics.update((m) => ({ ...m, total: response.totalCount }));
      }
    } catch (error) {
      if (sequence !== this.loadSequence) return;
      const parsed = parseApiErrors(error);
      this.apiMessages.set([
        ...parsed.messages,
        ...Object.entries(parsed.fields)
          .filter(([field]) => field !== 'searchtext')
          .flatMap(([, messages]) => messages),
      ]);
      this.fieldErrors.set(parsed.fields);
    } finally {
      if (sequence === this.loadSequence) this.isLoading.set(false);
    }
  }

  protected async loadMetrics(): Promise<void> {
    this.isMetricsLoading.set(true);
    try {
      const [totalRes, approvedRes, pendingRes, rejectedRes, suspendedRes] =
        await Promise.allSettled([
          firstValueFrom(this.api.list({ pageSize: 1, pageNumber: 1 })),
          firstValueFrom(this.api.list({ pageSize: 1, pageNumber: 1, approvalStatus: 'Approved' })),
          firstValueFrom(this.api.list({ pageSize: 1, pageNumber: 1, approvalStatus: 'Pending' })),
          firstValueFrom(this.api.list({ pageSize: 1, pageNumber: 1, approvalStatus: 'Rejected' })),
          firstValueFrom(
            this.api.list({ pageSize: 1, pageNumber: 1, approvalStatus: 'Suspended' }),
          ),
        ]);

      const total = totalRes.status === 'fulfilled' ? totalRes.value.totalCount : 0;
      const approved = approvedRes.status === 'fulfilled' ? approvedRes.value.totalCount : 0;
      const pending = pendingRes.status === 'fulfilled' ? pendingRes.value.totalCount : 0;
      const rejected = rejectedRes.status === 'fulfilled' ? rejectedRes.value.totalCount : 0;
      const suspended = suspendedRes.status === 'fulfilled' ? suspendedRes.value.totalCount : 0;

      this.metrics.set({
        total,
        approved,
        pending,
        needsAction: rejected + suspended,
        loaded: true,
      });
    } catch {
      // Metrics are supplementary; do not block user
    } finally {
      this.isMetricsLoading.set(false);
    }
  }

  protected statusLabel(status: DoctorApprovalStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en' : 'ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
  }

  protected availableDocuments(doctor: AdminDoctorListItem): number {
    return [
      doctor.hasProfileImage,
      doctor.hasPersonalIdFront,
      doctor.hasPersonalIdBack,
      doctor.hasSyndicateFront,
      doctor.hasSyndicateBack,
    ].filter(Boolean).length;
  }

  protected searchError(): string {
    return this.fieldErrors()['searchtext']?.[0] ?? '';
  }
}
