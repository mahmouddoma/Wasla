import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

import { Phase18Api } from '../../../../domains/phase18';
import type { components } from '../../../../domains/phase18';

import { PortalNavigation } from '../../../../layout/navigation/portal-navigation';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

type ReportModel = components['schemas']['ReportModel'];
type ReportMetric = components['schemas']['ReportMetric'];
type ReportFilterOptions = components['schemas']['ReportFilterOptions'];

interface DashboardFilters {
  practiceId: string;
  fromDate: string;
  toDate: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, PageHeader],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './doctor-dashboard.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.dir]': 'language.dir()',
  },
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(Phase18Api);
  private readonly session = inject(AuthSession);
  private readonly navigation = inject(PortalNavigation);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly language = inject(LanguageService);

  // ========================================
  // State
  // ========================================

  readonly model = signal<ReportModel | null>(null);

  readonly options = signal<ReportFilterOptions | null>(null);

  readonly loading = signal(false);

  readonly failed = signal(false);

  readonly messages = signal<readonly string[]>([]);

  readonly skeletonItems = [1, 2, 3, 4];

  // ========================================
  // Permissions & navigation
  // ========================================

  readonly canView = computed(() => this.session.hasPermission('Dashboards.Doctor.ViewOwn'));

  readonly actions = computed(() => {
    const actionIds = [
      'queue',
      'doctor-patients',
      'reservations',
      'encounters',
      'reports',
      'insights',
      'practices',
      'revenue',
    ];

    const navigationItems = this.navigation.items();

    return actionIds.flatMap((id) => navigationItems.filter((item) => item.id === id));
  });

  // ========================================
  // Filters
  // ========================================

  filters: DashboardFilters = {
    practiceId: '',
    fromDate: '',
    toDate: '',
  };

  readonly validDateRange = (): boolean => {
    const { fromDate, toDate } = this.filters;

    return !fromDate || !toDate || fromDate <= toDate;
  };

  // ========================================
  // Request lifecycle
  // ========================================

  private sequence = 0;
  private destroyed = false;

  // ========================================
  // Lifecycle
  // ========================================

  async ngOnInit(): Promise<void> {
    this.restoreFiltersFromUrl();

    if (!this.canView()) {
      return;
    }

    await this.initialize();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.sequence++;

    this.model.set(null);
  }

  // ========================================
  // Initialization
  // ========================================

  private async initialize(): Promise<void> {
    const seq = ++this.sequence;

    this.loading.set(true);
    this.failed.set(false);
    this.messages.set([]);

    try {
      const result = await firstValueFrom(this.api.call('P18-025', {}));

      if (!this.isCurrentRequest(seq)) {
        return;
      }

      this.options.set(result);

      await this.loadReport(seq);
    } catch (error) {
      this.handleError(error, seq);
    } finally {
      if (this.isCurrentRequest(seq)) {
        this.loading.set(false);
      }
    }
  }

  // ========================================
  // Refresh
  // ========================================

  async refresh(): Promise<void> {
    if (!this.canView() || this.loading() || !this.validDateRange() || this.destroyed) {
      return;
    }

    if (!this.options()) {
      await this.initialize();
      return;
    }

    const seq = ++this.sequence;

    this.loading.set(true);
    this.failed.set(false);
    this.messages.set([]);

    try {
      await this.loadReport(seq);
    } catch (error) {
      this.handleError(error, seq);
    } finally {
      if (this.isCurrentRequest(seq)) {
        this.loading.set(false);
      }
    }
  }

  async retry(): Promise<void> {
    if (this.loading() || this.destroyed) {
      return;
    }

    if (!this.options()) {
      await this.initialize();
      return;
    }

    await this.refresh();
  }

  // ========================================
  // API
  // ========================================

  private async loadReport(seq: number): Promise<void> {
    const requestedFilters = { ...this.filters };

    const result = await firstValueFrom(
      this.api.call('P18-026', {
        query: {
          ...requestedFilters,
          reportTimeZoneId: this.options()?.defaultReportTimeZoneId,
        },
      }),
    );

    if (!this.isCurrentRequest(seq)) {
      return;
    }

    this.model.set(result);
    this.failed.set(false);

    await this.syncFiltersToUrl(requestedFilters);
  }

  // ========================================
  // URL filters
  // ========================================

  private restoreFiltersFromUrl(): void {
    const query = this.route.snapshot.queryParamMap;

    this.filters = {
      practiceId: query.get('practiceId') ?? '',
      fromDate: query.get('fromDate') ?? '',
      toDate: query.get('toDate') ?? '',
    };
  }

  private async syncFiltersToUrl(filters: DashboardFilters): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        practiceId: filters.practiceId || null,
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // ========================================
  // Error handling
  // ========================================

  private handleError(error: unknown, seq: number): void {
    if (!this.isCurrentRequest(seq)) {
      return;
    }

    this.model.set(null);
    this.failed.set(true);

    this.messages.set(parseApiErrors(error).messages);
  }

  private isCurrentRequest(seq: number): boolean {
    return !this.destroyed && seq === this.sequence;
  }

  // ========================================
  // Formatting
  // ========================================

  text(ar: string | null | undefined, en: string | null | undefined): string {
    const value = this.language.isRtl() ? ar || en : en || ar;

    return value || this.language.t('doctorRemediation.unavailable');
  }

  format(metric: ReportMetric): string {
    if (metric.value == null) {
      return this.language.t('doctorRemediation.unavailable');
    }

    return this.formatNumber(metric.value);
  }

  formatNumber(value: number): string {
    const locale = this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB';

    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(value);
  }
}
