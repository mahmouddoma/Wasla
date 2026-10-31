import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Phase18Api, components } from '../../../domains/phase18';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { PageHeader } from '../../../shared/components/page-header/page-header';

type WorklistItem = components['schemas']['WorklistItem'];
type WorklistFilter = 'all' | 'waiting' | 'attention';

@Component({
  selector: 'app-reception-worklist',
  imports: [DatePipe, RouterLink, TranslatePipe, PageHeader],
  templateUrl: './reception-worklist.component.html',
  styleUrl: './reception-worklist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionWorklistComponent {
  private readonly api = inject(Phase18Api);
  private readonly context = inject(ReceptionPracticeContext);
  readonly language = inject(LanguageService);
  readonly practiceId = this.context.currentPracticeId;
  readonly canView = computed(() => this.context.allows('Dashboards.Reception.ViewAssigned'));
  readonly filters: readonly WorklistFilter[] = ['all', 'waiting', 'attention'];
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly selectedFilter = signal<WorklistFilter>('all');
  readonly worklistItems = signal<WorklistItem[]>([]);
  readonly pageNumber = signal(1);
  readonly totalCount = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / 50)));
  readonly filteredItems = computed(() =>
    this.worklistItems().filter(
      (item) =>
        this.selectedFilter() === 'all' ||
        (this.selectedFilter() === 'waiting'
          ? item.category === 'AwaitingCheckIn' || item.category === 'UpcomingBooking'
          : item.category !== 'AwaitingCheckIn' && item.category !== 'UpcomingBooking'),
    ),
  );
  private sequence = 0;

  constructor() {
    void this.context.ensureLoaded();
    effect(() => {
      this.practiceId();
      void this.loadData();
    });
  }

  async loadData(page = 1): Promise<void> {
    const practiceId = this.practiceId();
    const sequence = ++this.sequence;
    this.worklistItems.set([]);
    this.totalCount.set(0);
    this.error.set(false);
    this.pageNumber.set(page);
    this.loading.set(!!practiceId && this.canView());
    if (!practiceId || !this.canView()) return;
    try {
      const response = await firstValueFrom(
        this.api.call('P18-103', {
          path: { practiceId },
          query: { pageNumber: page, pageSize: 50 },
        }),
      );
      if (sequence !== this.sequence || practiceId !== this.practiceId()) return;
      this.worklistItems.set(response.items ?? []);
      this.totalCount.set(response.totalCount ?? response.items?.length ?? 0);
    } catch {
      if (sequence === this.sequence) this.error.set(true);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }

  setFilter(filter: WorklistFilter): void {
    this.selectedFilter.set(filter);
  }

  patientName(item: WorklistItem): string {
    return (
      (this.language.isRtl()
        ? item.patientNameAr || item.patientNameEn
        : item.patientNameEn || item.patientNameAr) ||
      this.language.t('reception.audit.unavailable')
    );
  }

  category(item: WorklistItem): string {
    return item.category
      ? this.language.t('worklist.category.' + item.category)
      : this.language.t('reception.audit.unavailable');
  }
}
