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
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  FamiliesApi,
  FamilyMedicalAccessRequestStatus,
  FamilyMedicalAccessRequestType,
  FamilyMedicalAccessSummary,
  FamilyMedicalCase,
  FamilyMedicalPage,
} from '../../../domains/families';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { FamilyMedicalAccessDetailsComponent } from '../family-medical-access-details/family-medical-access-details.component';

@Component({
  selector: 'app-family-medical-access-requests',
  imports: [FormField, PageHeader, SideDrawer, FamilyMedicalAccessDetailsComponent, TranslatePipe],
  templateUrl: './family-medical-access-requests.component.html',
  styleUrls: ['../management-list.css', './family-medical-access-requests.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyMedicalAccessRequestsComponent {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(FamiliesApi);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly model = signal({ search: '' });
  protected readonly searchForm = form(this.model, (field) => {
    maxLength(field.search, 200, { message: 'validation.searchLength' });
  });

  protected readonly status = signal<FamilyMedicalAccessRequestStatus | ''>('Pending');
  protected readonly requestType = signal<FamilyMedicalAccessRequestType | ''>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;

  protected readonly summary = signal<FamilyMedicalAccessSummary | null>(null);
  protected readonly result = signal<FamilyMedicalPage<FamilyMedicalCase> | null>(null);
  protected readonly loading = signal(true);
  protected readonly messages = signal<string[]>([]);

  protected readonly selectedRequestId = signal<string | null>(null);
  protected readonly selectedRequestTitle = signal<string>('');

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.result()?.totalCount ?? 0) / this.pageSize)),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
    void this.loadAll();
  }

  protected async loadAll(): Promise<void> {
    await Promise.all([this.loadSummary(), this.load()]);
  }

  protected async loadSummary(): Promise<void> {
    try {
      const summaryData = await firstValueFrom(this.api.adminMedicalAccessSummary());
      this.summary.set(summaryData);
    } catch {
      // Non-blocking summary
      this.summary.set(null);
    }
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      const page = await firstValueFrom(
        this.api.adminMedicalAccessRequests({
          requestType: this.requestType() || undefined,
          status: this.status() || undefined,
          search: this.model().search.trim() || undefined,
          pageNumber: this.pageNumber(),
          pageSize: this.pageSize,
        }),
      );
      this.result.set(page);
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
      this.result.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected openReviewDrawer(requestId: string, title?: string): void {
    this.selectedRequestId.set(requestId);
    this.selectedRequestTitle.set(title || this.uiLanguage.t('review.medicalAccessRequests'));
  }

  protected closeReviewDrawer(): void {
    this.selectedRequestId.set(null);
    this.selectedRequestTitle.set('');
  }

  protected handleReviewSaved(): void {
    void this.loadAll();
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

  protected setFilter(filter: 'status' | 'requestType', event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (filter === 'status') {
      this.status.set(value as FamilyMedicalAccessRequestStatus | '');
    } else {
      this.requestType.set(value as FamilyMedicalAccessRequestType | '');
    }
    this.pageNumber.set(1);
    void this.load();
  }

  protected setQuickFilter(type: 'all' | 'pending' | 'restriction' | 'restoration'): void {
    if (type === 'all') {
      this.status.set('');
      this.requestType.set('');
    } else if (type === 'pending') {
      this.status.set('Pending');
      this.requestType.set('');
    } else if (type === 'restriction') {
      this.requestType.set('Restriction');
    } else if (type === 'restoration') {
      this.requestType.set('Restoration');
    }
    this.pageNumber.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    void this.load();
  }
}
