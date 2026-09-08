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
import { firstValueFrom } from 'rxjs';

interface StatusOption {
  value: DoctorApprovalStatus | '';
  label: string;
}

@Component({
  selector: 'app-doctors-list',
  imports: [FormField, RouterLink],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorsList {
  private readonly api = inject(AdminDoctorsApi);
  private readonly session = inject(AuthSession);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSequence = 0;

  protected readonly statusOptions: readonly StatusOption[] = [
    { value: '', label: 'الكل' },
    { value: 'Pending', label: 'قيد المراجعة' },
    { value: 'Approved', label: 'معتمد' },
    { value: 'Rejected', label: 'مرفوض' },
    { value: 'Suspended', label: 'معلّق' },
  ];
  protected readonly filterModel = signal({ searchText: '' });
  protected readonly filterForm = form(this.filterModel, (field) => {
    maxLength(field.searchText, 200, { message: 'الحد الأقصى للبحث 200 حرف.' });
  });
  protected readonly selectedStatus = signal<DoctorApprovalStatus | ''>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;
  protected readonly result = signal<AdminDoctorsPage | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly canViewDetails = this.session.hasPermission(PERMISSIONS.doctorsViewDetails);
  protected readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil((this.result()?.totalCount ?? 0) / (this.result()?.pageSize ?? this.pageSize)),
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
    this.filterModel.set({ searchText: '' });
    this.filterForm().reset();
    this.pageNumber.set(1);
    void this.load();
  }

  protected filterBy(status: DoctorApprovalStatus | ''): void {
    if (status === this.selectedStatus()) return;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.selectedStatus.set(status);
    this.pageNumber.set(1);
    void this.load();
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
          pageSize: this.pageSize,
        }),
      );
      if (sequence !== this.loadSequence) return;
      this.result.set(response);
      this.pageNumber.set(response.pageNumber);
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

  protected statusLabel(status: DoctorApprovalStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected statusClass(status: DoctorApprovalStatus): string {
    return `doctor-status ${status.toLowerCase()}`;
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en' : 'ar-EG', {
          dateStyle: 'medium',
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
