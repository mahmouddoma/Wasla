import { ReportDataSectionsComponent } from '../../../reporting';
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
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { dashboardGroups, metricDrilldown } from './dashboard-presentation';

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
  imports: [ReportDataSectionsComponent, FormsModule, RouterLink, TranslatePipe, PageHeader, SideDrawer],
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

  readonly selectedGroup = signal('queue');
  readonly groups = computed(() => dashboardGroups(this.model()?.metrics ?? []));
  readonly activeGroup = computed<{ id: string; metrics: ReportMetric[] } | null>(
    () => this.groups().find((group) => group.id === this.selectedGroup()) ?? this.groups()[0],
  );
  readonly highlights = computed(() => {
    const metrics = this.model()?.metrics ?? [];
    const codes = [
      'AppointmentsScheduled',
      'CheckIns',
      'ClinicalWorkflowCompleted',
      'NetCollected',
    ];
    const chosen = codes.flatMap((code) => metrics.filter((metric) => metric.metricCode === code));
    return chosen.length ? chosen : metrics.slice(0, 4);
  });
  readonly chartCode = signal('CheckIns');
  readonly chartOptions = ['CheckIns', 'AppointmentsScheduled', 'TicketsCompleted'] as const;
  readonly chartPoints = computed(() => {
    const points = (this.model()?.series ?? []).map((point) => ({
      key: point.key ?? '',
      label: this.text(point.nameAr, point.nameEn),
      value: point.metrics?.find((metric) => metric.metricCode === this.chartCode())?.value ?? null,
    }));
    const maximum = Math.max(1, ...points.map((point) => point.value ?? 0));
    return points.map((point) => ({
      ...point,
      height: point.value == null ? 0 : (Math.max(0, point.value) / maximum) * 100,
    }));
  });
  readonly drillMetric = signal<ReportMetric | null>(null);
  readonly drillRows = signal<components['schemas']['ReportRecordReportPage'] | null>(null);
  readonly detailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly hasRecordLinks = computed(() =>
    (this.drillRows()?.items ?? []).some((row) => this.sourceLink(row) !== null),
  );
  private detailSequence = 0;

  canDrilldown(metric: ReportMetric): boolean {
    return (
      this.session.hasPermission('Reports.Doctor.ViewOwn') &&
      !!metricDrilldown(metric, this.model()?.reportCode ?? '')
    );
  }

  async openDrilldown(metric: ReportMetric, page = 1): Promise<void> {
    const target = metricDrilldown(metric, this.model()?.reportCode ?? '');
    if (!target || !this.canDrilldown(metric) || this.destroyed) return;
    const sequence = ++this.detailSequence;
    this.drillMetric.set(metric);
    this.drillRows.set(null);
    this.detailLoading.set(true);
    this.detailFailed.set(false);
    try {
      const rows = await firstValueFrom(
        this.api.call('P18-074', {
          path: { reportCode: target.reportCode },
          query: { ...target.query, pageNumber: Math.max(1, page), pageSize: 20 },
        }),
      );
      if (sequence === this.detailSequence && !this.destroyed) this.drillRows.set(rows);
    } catch {
      if (sequence === this.detailSequence && !this.destroyed) this.detailFailed.set(true);
    } finally {
      if (sequence === this.detailSequence && !this.destroyed) this.detailLoading.set(false);
    }
  }

  closeDrilldown(): void {
    this.detailSequence++;
    this.drillMetric.set(null);
    this.drillRows.set(null);
    this.detailLoading.set(false);
    this.detailFailed.set(false);
  }

  sourceLink(
    row: components['schemas']['ReportRecord'],
  ): { route: string; query: Record<string, string> } | null {
    if (!row.detailRoute || !row.availableActions?.some((action) => action.allowed === true))
      return null;
    const patient = row.detailRoute.match(/^\/api\/v1\/doctors\/me\/patients\/([A-Za-z0-9-]+)$/);
    if (patient && this.session.hasPermission('DoctorPatients.ViewOwn')) {
      return { route: '/doctor/patients', query: { patientId: patient[1], tab: 'overview' } };
    }
    const resource = row.detailRoute.match(
      /^\/api\/v1\/doctors\/me\/practices\/([A-Za-z0-9-]+)\/(reservations|encounters)\/([A-Za-z0-9-]+)$/,
    );
    if (!resource) return null;
    const permission =
      resource[2] === 'reservations'
        ? 'DoctorPracticeReservations.ViewOwn'
        : 'MedicalEncounters.ViewOwn';
    if (!this.session.hasPermission(permission)) return null;
    return {
      route: '/doctor/' + resource[2],
      query: {
        practiceId: resource[1],
        [resource[2] === 'reservations' ? 'reservationId' : 'encounterId']: resource[3],
      },
    };
  }

  formatDay(value: string | null | undefined): string {
    if (!value) return this.language.t('doctorRemediation.unavailable');
    const date = new Date(value.slice(0, 10) + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime())) return value;
    return new Intl.DateTimeFormat(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  formatRecordDate(value: string | null | undefined): string {
    if (!value) return this.language.t('doctorRemediation.unavailable');
    const date = new Date(value.slice(0, 10) + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime())) return this.language.t('doctorRemediation.unavailable');
    return new Intl.DateTimeFormat(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  // ========================================
  // Permissions & navigation
  // ========================================

  readonly canView = computed(() => this.session.hasPermission('Dashboards.Doctor.ViewOwn'));

  readonly actions = computed(() => {
    const actionIds = [
      'queue',
      'encounters',
      'doctor-patients',
      'reservations',
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
    this.closeDrilldown();
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
    this.closeDrilldown();
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
    // Surface the server's default reporting window instead of displaying blank dates.
    this.filters = {
      ...requestedFilters,
      fromDate:
        requestedFilters.fromDate ||
        result.window?.fromDate ||
        result.appliedFilters?.fromDate ||
        '',
      toDate:
        requestedFilters.toDate || result.window?.toDate || result.appliedFilters?.toDate || '',
    };
    await this.syncFiltersToUrl(this.filters);
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

  metricUnit(unit: string): string {
    const keys: Record<string, string> = {
      count: 'doctorWorkspace.unit.count',
      percent: 'doctorWorkspace.unit.percent',
      minutes: 'doctorWorkspace.unit.minutes',
      hours: 'doctorWorkspace.unit.hours',
      egp: 'doctorDashboard.egp',
    };
    return keys[unit.toLowerCase()] ? this.language.t(keys[unit.toLowerCase()]) : unit;
  }

  formatUpdated(value: string | null | undefined): string {
    if (!value || !Number.isFinite(Date.parse(value)))
      return this.language.t('doctorRemediation.unavailable');
    return new Intl.DateTimeFormat(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  formatNumber(value: number): string {
    const locale = this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB';

    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(value);
  }
}
