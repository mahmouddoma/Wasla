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
  FamilyMedicalEligibilityReview,
  FamilyMedicalPage,
} from '../../../domains/families';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { FamilyMedicalEligibilityDetailsComponent } from '../family-medical-eligibility-details/family-medical-eligibility-details.component';

@Component({
  selector: 'app-family-medical-eligibility-reviews',
  imports: [
    FormField,
    PageHeader,
    SideDrawer,
    FamilyMedicalEligibilityDetailsComponent,
    TranslatePipe,
  ],
  templateUrl: './family-medical-eligibility-reviews.component.html',
  styleUrls: ['../management-list.css', './family-medical-eligibility-reviews.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyMedicalEligibilityReviewsComponent {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(FamiliesApi);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly model = signal({ search: '' });
  protected readonly searchForm = form(this.model, (field) => {
    maxLength(field.search, 200, { message: 'validation.searchLength' });
  });

  protected readonly status = signal<string>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;

  protected readonly result = signal<FamilyMedicalPage<FamilyMedicalEligibilityReview> | null>(
    null,
  );
  protected readonly loading = signal(true);
  protected readonly messages = signal<string[]>([]);

  protected readonly selectedReviewId = signal<string | null>(null);
  protected readonly selectedReviewTitle = signal<string>('');

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.result()?.totalCount ?? 0) / this.pageSize)),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      const page = await firstValueFrom(
        this.api.medicalEligibilityReviews({
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

  protected openReviewDrawer(reviewId: string, title?: string): void {
    this.selectedReviewId.set(reviewId);
    this.selectedReviewTitle.set(title || this.uiLanguage.t('routes.medicalEligibilities'));
  }

  protected closeReviewDrawer(): void {
    this.selectedReviewId.set(null);
    this.selectedReviewTitle.set('');
  }

  protected handleReviewSaved(): void {
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

  protected setStatusFilter(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    this.status.set(value);
    this.pageNumber.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    void this.load();
  }
}
