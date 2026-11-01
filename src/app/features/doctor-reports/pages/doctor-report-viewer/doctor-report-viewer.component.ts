import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';

import { Phase18Api } from '../../../../domains/phase18';
import type { components } from '../../../../domains/phase18';

import {
  type DoctorReportCode,
  type DoctorReportPresentation,
  getReportPresentation,
} from '../../presentation/doctor-report-presentations';
import {
  type Metric,
  type ReportModel,
  findMetric,
  getCohortFunnel,
  getFinancialObligations,
  getPatternPoints,
  getPracticeComparisonMatrix,
  getSeriesPoints,
  measuredValue,
  metricDrilldown,
  selectKpis,
} from '../../presentation/doctor-report-selectors';

type Schema = components['schemas'];
export type ReportCatalogItem = Schema['ReportCatalogEntry'];
export type ReportMetric = Schema['ReportMetric'];
export type ReportRecordReportPage = Schema['ReportRecordReportPage'];
export type ReportFilterOptions = Schema['ReportFilterOptions'];

@Component({
  selector: 'app-doctor-report-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, SideDrawer],
  templateUrl: './doctor-report-viewer.component.html',
  styleUrls: ['./doctor-report-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.dir]': 'language.dir()',
  },
})
export class DoctorReportViewerComponent implements OnInit, OnDestroy {
  private readonly api = inject(Phase18Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);

  // Core identifiers & state
  readonly reportCode = signal<DoctorReportCode | null>(null);
  readonly catalogEntry = signal<ReportCatalogItem | null>(null);
  readonly options = signal<ReportFilterOptions | null>(null);
  readonly model = signal<ReportModel | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly accessDenied = signal(false);
  readonly notFound = signal(false);
  readonly exportingPdf = signal(false);
  readonly exportingExcel = signal(false);

  // Metrics & presentations
  readonly config = computed<DoctorReportPresentation | undefined>(() =>
    getReportPresentation(this.reportCode()),
  );
  readonly kpis = computed<ReportMetric[]>(() =>
    selectKpis(this.model(), this.config()?.kpiCodes ?? []),
  );
  readonly allMetrics = computed<ReportMetric[]>(() => {
    const list = this.model()?.metrics ?? [];
    const query = this.metricSearch().trim().toLowerCase();
    if (!query) return list;
    return list.filter((m) => {
      const code = (m.metricCode ?? '').toLowerCase();
      const ar = (m.nameAr ?? '').toLowerCase();
      const en = (m.nameEn ?? '').toLowerCase();
      const label = this.metricLabel(m).toLowerCase();
      return code.includes(query) || ar.includes(query) || en.includes(query) || label.includes(query);
    });
  });
  readonly metricSearch = signal('');
  readonly activeExplorerGroup = signal('all');

  // Filter form
  readonly activePreset = signal<'today' | 'last7' | 'month' | null>(null);
  filters = {
    practiceId: '',
    fromDate: '',
    toDate: '',
    grouping: 'Day',
  };

  // Visualizations data
  readonly countTrend = computed(() => {
    const code = this.reportCode();
    if (code === 'queue') {
      return getSeriesPoints(this.model(), 'CheckIns', 'TicketsCompleted');
    }
    if (code === 'operating-finance') {
      return getSeriesPoints(
        this.model(),
        'NetCollected',
        'PaidOperatingExpenses',
        'NetOperatingCashResult',
      );
    }
    return getSeriesPoints(this.model(), 'BookingsCreated', 'AppointmentsScheduled');
  });

  readonly cohortFunnel = computed(() => getCohortFunnel(this.model()));
  readonly weekdayPatterns = computed(() => getPatternPoints(this.model(), 'weekday'));
  readonly hourPatterns = computed(() => getPatternPoints(this.model(), 'hour'));
  readonly patternViewKind = signal<'weekday' | 'hour'>('weekday');
  readonly practiceMatrix = computed(() => getPracticeComparisonMatrix(this.model()));
  readonly financialObligations = computed(() => getFinancialObligations(this.model()));

  readonly newPatientsMetric = computed(() => findMetric(this.model(), 'NewToDoctorPatients'));
  readonly returningPatientsMetric = computed(() =>
    findMetric(this.model(), 'ReturningDoctorPatients'),
  );
  readonly retentionMetric = computed(() => findMetric(this.model(), 'PatientRetention90d'));

  // Drilldown
  readonly drillMetric = signal<ReportMetric | null>(null);
  readonly drillRows = signal<ReportRecordReportPage | null>(null);
  readonly drillLoading = signal(false);
  readonly drillFailed = signal(false);
  readonly drillPageNumber = signal(1);

  private destroyed = false;
  private loadSequence = 0;
  private drillSequence = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const code = params.get('reportCode') as DoctorReportCode;
      if (!code || !getReportPresentation(code)) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      this.reportCode.set(code);

      // Read query params
      const q = this.route.snapshot.queryParams;
      if (q['practiceId']) this.filters.practiceId = q['practiceId'];
      if (q['fromDate']) this.filters.fromDate = q['fromDate'];
      if (q['toDate']) this.filters.toDate = q['toDate'];
      if (q['grouping']) this.filters.grouping = q['grouping'];

      this.initReport(code);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  async initReport(code: DoctorReportCode): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    this.accessDenied.set(false);
    this.notFound.set(false);

    try {
      // 1. Fetch catalog to verify permission & allowed filters
      const catalog = await firstValueFrom(this.api.call('P18-076', {}));
      const entry = (catalog as ReportCatalogItem[]).find((r) => r.reportCode === code);

      if (!entry) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }

      this.catalogEntry.set(entry);

      // Security check
      if (
        entry.canPreview !== true ||
        !this.session.hasPermission('Reports.Doctor.ViewOwn') ||
        entry.requiredPermissions?.some((p) => !this.session.hasPermission(p))
      ) {
        this.accessDenied.set(true);
        this.loading.set(false);
        return;
      }

      // Optional filter options
      try {
        const options = await firstValueFrom(this.api.call('P18-025', {}));
        this.options.set(options as ReportFilterOptions);
      } catch {
        // Options non-blocking
      }

      // 2. Fetch report preview
      await this.loadPreview();
    } catch (error) {
      if (this.destroyed) return;
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        this.accessDenied.set(true);
      } else {
        this.failed.set(true);
      }
      this.loading.set(false);
    }
  }

  async loadPreview(): Promise<void> {
    const code = this.reportCode();
    const entry = this.catalogEntry();
    if (!code || !entry || this.destroyed) return;

    const seq = ++this.loadSequence;
    this.loading.set(true);
    this.failed.set(false);

    // Close any previous drilldown when reloading preview
    this.closeDrilldown();

    const allowed = entry.allowedFilters ?? [];
    const query: Record<string, string> = {};

    if (allowed.includes('practiceId') && this.filters.practiceId) {
      query['practiceId'] = this.filters.practiceId;
    }
    if (allowed.includes('fromDate') && this.filters.fromDate) {
      query['fromDate'] = this.filters.fromDate;
    }
    if (allowed.includes('toDate') && this.filters.toDate) {
      query['toDate'] = this.filters.toDate;
    }
    if (
      entry.availableGroupings?.includes(this.filters.grouping as any) &&
      this.filters.grouping
    ) {
      query['grouping'] = this.filters.grouping;
    }

    try {
      const result = await firstValueFrom(
        this.api.call('P18-073', {
          path: { reportCode: code },
          query,
        }),
      );

      if (this.destroyed || seq !== this.loadSequence) return;
      this.model.set(result as ReportModel);

      // Update URL query params smoothly
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: query,
        replaceUrl: true,
      });
    } catch (error) {
      if (this.destroyed || seq !== this.loadSequence) return;
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        this.accessDenied.set(true);
      } else {
        this.failed.set(true);
      }
    } finally {
      if (!this.destroyed && seq === this.loadSequence) {
        this.loading.set(false);
      }
    }
  }

  applyFilters(): void {
    this.loadPreview();
  }

  // Pure selector passthrough for templates
  measuredValue(metric: ReportMetric | undefined | null): number | null {
    return measuredValue(metric);
  }

  // Drilldown
  canDrilldown(metric: ReportMetric): boolean {
    const val = measuredValue(metric);
    if (val === null || val === 0) return false;
    const action = metricDrilldown(metric, this.reportCode() ?? '');
    return !!action && this.session.hasPermission('Reports.Doctor.ViewOwn');
  }

  async openDrilldown(metric: ReportMetric, page = 1): Promise<void> {
    const target = metricDrilldown(metric, this.reportCode() ?? '');
    if (!target || !this.canDrilldown(metric) || this.destroyed) return;

    const seq = ++this.drillSequence;
    this.drillMetric.set(metric);
    this.drillRows.set(null);
    this.drillLoading.set(true);
    this.drillFailed.set(false);
    this.drillPageNumber.set(page);

    try {
      const rows = await firstValueFrom(
        this.api.call('P18-074', {
          path: { reportCode: target.reportCode },
          query: {
            ...target.query,
            pageNumber: Math.max(1, page),
            pageSize: 20,
          },
        }),
      );

      if (this.destroyed || seq !== this.drillSequence) return;
      this.drillRows.set(rows as ReportRecordReportPage);
    } catch {
      if (this.destroyed || seq !== this.drillSequence) return;
      this.drillFailed.set(true);
    } finally {
      if (!this.destroyed && seq === this.drillSequence) {
        this.drillLoading.set(false);
      }
    }
  }

  closeDrilldown(): void {
    this.drillMetric.set(null);
    this.drillRows.set(null);
    this.drillLoading.set(false);
    this.drillFailed.set(false);
  }

  // Exporting
  canExportPdf(): boolean {
    const entry = this.catalogEntry();
    return (
      entry?.canExportPdf === true &&
      this.session.hasPermission('Reports.Doctor.ViewOwn') &&
      (!entry.exportRequiredPermissions ||
        entry.exportRequiredPermissions.every((p) => this.session.hasPermission(p)))
    );
  }

  canExportExcel(): boolean {
    const entry = this.catalogEntry();
    return (
      entry?.canExportExcel === true &&
      this.session.hasPermission('Reports.Doctor.ViewOwn') &&
      (!entry.exportRequiredPermissions ||
        entry.exportRequiredPermissions.every((p) => this.session.hasPermission(p)))
    );
  }

  async exportReport(format: 'pdf' | 'excel'): Promise<void> {
    const code = this.reportCode();
    if (!code || this.destroyed) return;

    if (format === 'pdf') this.exportingPdf.set(true);
    else this.exportingExcel.set(true);

    try {
      const blob = await firstValueFrom(
        this.api.call('P18-075', {
          path: { reportCode: code },
          query: {
            format,
            ...(this.filters.practiceId ? { practiceId: this.filters.practiceId } : {}),
            ...(this.filters.fromDate ? { fromDate: this.filters.fromDate } : {}),
            ...(this.filters.toDate ? { toDate: this.filters.toDate } : {}),
          },
        }),
      );

      if (blob instanceof Blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${code}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      this.toast.success(this.language.t('common.exportSuccess'));
    } catch {
      this.toast.error(this.language.t('common.exportFailed'));
    } finally {
      if (format === 'pdf') this.exportingPdf.set(false);
      else this.exportingExcel.set(false);
    }
  }

  // Formatting helpers
  text(ar: string | null | undefined, en: string | null | undefined): string {
    return this.language.isRtl() ? ar || en || '' : en || ar || '';
  }

  setPreset(preset: 'today' | 'last7' | 'month'): void {
    this.activePreset.set(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const todayStr = toIso(now);
    if (preset === 'today') {
      this.filters.fromDate = todayStr;
      this.filters.toDate = todayStr;
    } else if (preset === 'last7') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      this.filters.fromDate = toIso(past);
      this.filters.toDate = todayStr;
    } else if (preset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      this.filters.fromDate = toIso(startOfMonth);
      this.filters.toDate = todayStr;
    }
    void this.applyFilters();
  }

  onDateChange(): void {
    this.activePreset.set(null);
  }

  reportIcon(code: string | null | undefined): string {
    switch (code) {
      case 'overview':
        return 'fa-solid fa-chart-pie';
      case 'reservations':
        return 'fa-solid fa-calendar-check';
      case 'queue':
        return 'fa-solid fa-users-line';
      case 'patients':
        return 'fa-solid fa-hospital-user';
      case 'practice-comparison':
        return 'fa-solid fa-code-compare';
      case 'operating-finance':
        return 'fa-solid fa-wallet';
      case 'expenses':
        return 'fa-solid fa-receipt';
      case 'salary':
        return 'fa-solid fa-money-bill-wave';
      case 'recurring-expenses':
        return 'fa-solid fa-calendar-days';
      default:
        return 'fa-solid fa-chart-column';
    }
  }

  metricIcon(code: string | null | undefined): string {
    switch (code) {
      case 'AppointmentsScheduled':
        return 'fa-regular fa-calendar-check';
      case 'BookingsCreated':
        return 'fa-solid fa-calendar-plus';
      case 'CheckIns':
        return 'fa-solid fa-user-check';
      case 'TicketsCompleted':
        return 'fa-solid fa-circle-check';
      case 'ReservationToTicketConversion':
        return 'fa-solid fa-arrow-trend-up';
      case 'CancellationRateScheduledCohort':
      case 'CancellationRate':
        return 'fa-solid fa-calendar-xmark';
      case 'ReservationNoShowRate':
      case 'NoShowRate':
        return 'fa-solid fa-user-slash';
      case 'NetCollected':
      case 'GrossCollected':
        return 'fa-solid fa-wallet';
      case 'PaidOperatingExpenses':
        return 'fa-solid fa-receipt';
      case 'NetOperatingCashResult':
        return 'fa-solid fa-scale-balanced';
      case 'NewToDoctorPatients':
        return 'fa-solid fa-user-plus';
      case 'ReturningDoctorPatients':
        return 'fa-solid fa-user-group';
      case 'PatientRetention90d':
        return 'fa-solid fa-arrows-rotate';
      case 'WalkIns':
      case 'WalkInShare':
        return 'fa-solid fa-person-walking';
      case 'WaitToFirstCall':
        return 'fa-regular fa-hourglass-half';
      case 'WaitToServiceStart':
        return 'fa-regular fa-clock';
      case 'ServiceDuration':
        return 'fa-solid fa-stopwatch';
      case 'OutstandingDueInPeriod':
      case 'AllOutstandingAsOf':
      case 'OverdueAsOf':
        return 'fa-solid fa-circle-exclamation';
      case 'Refunds':
        return 'fa-solid fa-rotate-left';
      default:
        return 'fa-solid fa-chart-simple';
    }
  }

  metricColorClass(code: string | null | undefined): string {
    switch (code) {
      case 'AppointmentsScheduled':
      case 'BookingsCreated':
        return 'kpi-bubble--blue';
      case 'CheckIns':
      case 'TicketsCompleted':
        return 'kpi-bubble--teal';
      case 'ReservationToTicketConversion':
      case 'NewToDoctorPatients':
      case 'ReturningDoctorPatients':
        return 'kpi-bubble--emerald';
      case 'CancellationRateScheduledCohort':
      case 'CancellationRate':
        return 'kpi-bubble--amber';
      case 'ReservationNoShowRate':
      case 'NoShowRate':
        return 'kpi-bubble--rose';
      case 'NetCollected':
      case 'GrossCollected':
      case 'NetOperatingCashResult':
        return 'kpi-bubble--teal-dark';
      case 'PaidOperatingExpenses':
      case 'Refunds':
      case 'OverdueAsOf':
        return 'kpi-bubble--amber';
      default:
        return 'kpi-bubble--slate';
    }
  }

  format(metric: ReportMetric | undefined): string {
    const val = measuredValue(metric);
    if (val === null) return this.language.t('doctorRemediation.unavailable');
    const u = metric?.unit?.toLowerCase();
    if (u === 'percentage' || u === 'percent') {
      return `${this.formatNumber(val)}%`;
    }
    return this.formatNumber(val);
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null) return '—';
    const locale = this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB';
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatRecordDate(dateStr: string | null | undefined): string {
    if (!dateStr) return this.language.t('doctorRemediation.unavailable');
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const locale = this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatUpdated(utcStr: string | null | undefined): string {
    if (!utcStr) return this.language.t('doctorRemediation.unavailable');
    const d = new Date(utcStr);
    if (Number.isNaN(d.getTime())) return utcStr;
    const locale = this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB';
    return d.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  metricLabel(metric: ReportMetric): string {
    const key = 'doctorOverview.metric.' + metric.metricCode;
    const translated = this.language.t(key);
    return translated !== key ? translated : this.text(metric.nameAr, metric.nameEn);
  }

  metricUnit(unit: string | null | undefined): string {
    if (!unit || unit === 'count') return '';
    const u = unit.toLowerCase();
    if (u === 'egp') return this.language.t('doctorDashboard.egp');
    if (u === 'minutes') return this.language.t('doctorOverview.unit.minutes');
    if (u === 'percentage' || u === 'percent') return '';
    return unit;
  }

  metricStatus(metric: ReportMetric): string {
    if (metric.dataStatus === 'NotMeasured' || metric.dataStatus === 'NotInstrumented') {
      return this.language.t('doctorOverview.notMeasured');
    }
    if (measuredValue(metric) === null) {
      return this.language.t('doctorRemediation.unavailable');
    }
    if (metric.dataStatus === 'Partial' || metric.dataStatus === 'Stale') {
      return this.language.t('doctorOverview.partial');
    }
    return '';
  }

  totalPages(totalCount: number, pageSize: number): number {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }
}
