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
  getQueueDurations,
  getPriorityBreakdown,
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
  readonly metricSearch = signal('');
  readonly onlyActiveMetrics = signal(true);
  readonly selectedExplorerGroup = signal('all');

  readonly explorerGroups = computed(() => {
    const metrics = this.model()?.metrics ?? [];
    const groupDefs = [
      { id: 'all', labelKey: 'doctorDashboard.allMetrics', codes: [] },
      {
        id: 'queue',
        labelKey: 'doctorDashboard.group.queue',
        codes: [
          'CheckIns',
          'WalkIns',
          'WalkInShare',
          'Waiting',
          'Called',
          'InProgress',
          'TicketsCompleted',
          'TicketsCancelled',
          'TicketsNoShow',
          'CallAttempts',
          'Recalls',
          'OperationalExceptions',
        ],
      },
      {
        id: 'bookings',
        labelKey: 'doctorDashboard.group.bookings',
        codes: [
          'BookingsCreated',
          'AppointmentsScheduled',
          'CancellationsByEvent',
          'CancellationRateScheduledCohort',
          'ReservationNoShowRate',
          'TicketNoShowRate',
          'RescheduleEvents',
          'RescheduledReservations',
          'ReservationToTicketConversion',
          'BookingLeadTimeMinutes',
          'PunctualArrival',
        ],
      },
      {
        id: 'care',
        labelKey: 'doctorDashboard.group.care',
        codes: [
          'UniqueDoctorPatients',
          'NewToDoctorPatients',
          'ReturningDoctorPatients',
          'PatientRetention90d',
          'FollowUpActivity',
          'ClinicalWorkflowCompleted',
        ],
      },
      {
        id: 'capacity',
        labelKey: 'doctorDashboard.group.capacity',
        codes: [
          'WaitToFirstCall',
          'WaitToServiceStart',
          'CallToStart',
          'ServiceDuration',
          'CapacityMinutes',
          'UnusedCapacityMinutes',
          'MaximumDailyPatientCapacity',
          'BookedUtilization',
          'ActualServiceUtilization',
          'SegmentQuotaUtilization',
        ],
      },
      {
        id: 'finance',
        labelKey: 'doctorDashboard.group.finance',
        codes: [
          'PaidOperatingExpenses',
          'OutstandingDueInPeriod',
          'AllOutstandingAsOf',
          'OverdueAsOf',
          'GrossCollected',
          'Refunds',
          'NetCollected',
          'NetOperatingCashResult',
          'ProjectedResultForPeriod',
        ],
      },
    ];

    return groupDefs
      .map((def) => {
        const groupMetrics =
          def.id === 'all'
            ? metrics
            : metrics.filter((m) => (def.codes as string[]).includes(m.metricCode ?? ''));
        const activeCount = groupMetrics.filter((m) => measuredValue(m) !== null).length;
        return {
          id: def.id,
          labelKey: def.labelKey,
          metrics: groupMetrics,
          totalCount: groupMetrics.length,
          activeCount,
        };
      })
      .filter((g) => g.id === 'all' || g.totalCount > 0);
  });

  readonly displayedExplorerMetrics = computed<ReportMetric[]>(() => {
    const groupId = this.selectedExplorerGroup();
    const activeOnly = this.onlyActiveMetrics();
    const query = this.metricSearch().trim().toLowerCase();

    const group = this.explorerGroups().find((g) => g.id === groupId);
    let list = group ? group.metrics : this.model()?.metrics ?? [];

    if (activeOnly) {
      list = list.filter((m) => measuredValue(m) !== null);
    }

    if (query) {
      list = list.filter((m) => {
        const code = (m.metricCode ?? '').toLowerCase();
        const ar = (m.nameAr ?? '').toLowerCase();
        const en = (m.nameEn ?? '').toLowerCase();
        const label = this.metricLabel(m).toLowerCase();
        const help = this.metricHelpText(m).toLowerCase();
        return (
          code.includes(query) ||
          ar.includes(query) ||
          en.includes(query) ||
          label.includes(query) ||
          help.includes(query)
        );
      });
    }

    return list;
  });

  readonly totalExplorerMetricsCount = computed(() => {
    const groupId = this.selectedExplorerGroup();
    const group = this.explorerGroups().find((g) => g.id === groupId);
    return group?.totalCount ?? this.model()?.metrics?.length ?? 0;
  });

  readonly activeExplorerMetricsCount = computed(() => {
    const groupId = this.selectedExplorerGroup();
    const group = this.explorerGroups().find((g) => g.id === groupId);
    return group?.activeCount ?? 0;
  });

  // Filter form
  readonly activePreset = signal<'today' | 'last7' | 'month' | null>(null);
  filters = {
    practiceId: '',
    fromDate: '',
    toDate: '',
    grouping: 'Day',
  };
  private lastAppliedQuery: Record<string, string> = {};

  // Visualizations data
  readonly countTrend = computed(() => {
    const m = this.model();
    const code = this.reportCode();
    const kind = this.config()?.primary;
    const grouping = m?.appliedFilters?.grouping || this.filters.grouping;

    if (code === 'queue' || kind === 'queue-trend') {
      return getSeriesPoints(m, 'CheckIns', 'TicketsCompleted', undefined, grouping);
    }
    if (code === 'operating-finance' || kind === 'financial-flow-trend') {
      return getSeriesPoints(
        m,
        'NetCollected',
        'PaidOperatingExpenses',
        'NetOperatingCashResult',
        grouping,
      );
    }
    if (code === 'expenses') {
      return getSeriesPoints(m, 'PaidOperatingExpenses', undefined, undefined, grouping);
    }
    if (kind === 'count-trend' || code === 'overview' || code === 'reservations') {
      return getSeriesPoints(m, 'BookingsCreated', 'AppointmentsScheduled', undefined, grouping);
    }
    return { points: [], maximum: 1, minimum: 0, zeroY: 180 };
  });

  readonly trendLabelA = computed(() => {
    const code = this.reportCode();
    if (code === 'expenses') return 'doctorOverview.metric.PaidOperatingExpenses';
    if (code === 'operating-finance') return 'doctorOverview.metric.NetCollected';
    if (code === 'queue') return 'doctorOverview.metric.CheckIns';
    return 'doctorOverview.metric.BookingsCreated';
  });

  readonly trendLabelB = computed(() => {
    const code = this.reportCode();
    if (code === 'expenses') return '';
    if (code === 'operating-finance') return 'doctorOverview.metric.PaidOperatingExpenses';
    if (code === 'queue') return 'doctorOverview.metric.TicketsCompleted';
    return 'doctorOverview.metric.AppointmentsScheduled';
  });

  readonly trendLabelC = computed(() => {
    const code = this.reportCode();
    if (code === 'operating-finance') return 'doctorOverview.metric.NetOperatingCashResult';
    return '';
  });

  readonly queueDurations = computed(() => getQueueDurations(this.model()));
  readonly priorityBreakdown = computed(() => getPriorityBreakdown(this.model()));
  readonly practiceMatrix = computed(() =>
    getPracticeComparisonMatrix(this.model(), this.language.isRtl() ? 'ar-EG' : 'en-US'),
  );

  readonly cohortFunnel = computed(() => getCohortFunnel(this.model()));
  readonly weekdayPatterns = computed(() => getPatternPoints(this.model(), 'weekday'));
  readonly hourPatterns = computed(() => getPatternPoints(this.model(), 'hour'));
  readonly patternViewKind = signal<'weekday' | 'hour'>('weekday');
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
      this.loadSequence++;
      this.drillSequence++;
      this.model.set(null);
      this.catalogEntry.set(null);
      this.closeDrilldown();
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
      this.lastAppliedQuery = { ...query };

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
    if (val === null) return false;
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

  async exportReport(format: 'pdf' | 'xlsx'): Promise<void> {
    const code = this.reportCode();
    const entry = this.catalogEntry();
    if (!code || !entry || this.destroyed) return;

    const isPdf = format === 'pdf';
    if (isPdf) {
      if (entry.canExportPdf !== true) {
        this.toast.error(this.language.t('common.unauthorized'));
        return;
      }
    } else {
      if (entry.canExportExcel !== true) {
        this.toast.error(this.language.t('common.unauthorized'));
        return;
      }
    }

    const perms = entry.exportRequiredPermissions ?? entry.requiredPermissions ?? [];
    if (perms.some((p) => !this.session.hasPermission(p))) {
      this.toast.error(this.language.t('common.unauthorized'));
      return;
    }

    if (isPdf) this.exportingPdf.set(true);
    else this.exportingExcel.set(true);

    try {
      const exportQuery: Record<string, string> = {
        format,
        language: this.language.currentLang() || 'ar',
        ...this.lastAppliedQuery,
      };

      const blob = await firstValueFrom(
        this.api.call('P18-075', {
          path: { reportCode: code },
          query: exportQuery,
        }),
      );

      if (!(blob instanceof Blob) || blob.size === 0 || blob.type.includes('json')) {
        this.toast.error(this.language.t('common.exportFailed'));
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = isPdf ? 'pdf' : 'xlsx';
      const dateSuffix = this.lastAppliedQuery['fromDate'] ? `_${this.lastAppliedQuery['fromDate']}` : '';
      a.download = `${code}${dateSuffix}.${ext}`;
      document.body.appendChild(a);
      try {
        a.click();
      } finally {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      this.toast.success(this.language.t('common.exportSuccess'));
    } catch {
      if (!this.destroyed) {
        this.toast.error(this.language.t('common.exportFailed'));
      }
    } finally {
      if (!this.destroyed) {
        this.exportingPdf.set(false);
        this.exportingExcel.set(false);
      }
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

  groupIcon(id: string): string {
    switch (id) {
      case 'all':
        return 'fa-solid fa-layer-group';
      case 'queue':
        return 'fa-solid fa-users-line';
      case 'bookings':
        return 'fa-solid fa-calendar-check';
      case 'care':
        return 'fa-solid fa-hospital-user';
      case 'capacity':
        return 'fa-solid fa-stopwatch';
      case 'finance':
        return 'fa-solid fa-wallet';
      default:
        return 'fa-solid fa-folder-open';
    }
  }

  metricHelpText(metric: ReportMetric): string {
    const isAr = this.language.isRtl();
    const code = metric.metricCode ?? '';
    const arMap: Record<string, string> = {
      AppointmentsScheduled: 'إجمالي المواعيد المؤكدة والمحجوزة مسبقاً بجدول العيادة خلال الفترة المحددة.',
      BookingsCreated: 'كافة الحجوزات والمواعيد التي تم إنشاؤها عبر التطبيق أو الاستقبال.',
      CheckIns: 'المرضى الذين وصلوا العيادة بالفعل وتم تسجيل حضورهم في مكتب الاستقبال.',
      TicketsCompleted: 'الكشوفات الطبية التي أتمها الطبيب وتم إغلاق تذكرتها بنجاح.',
      ReservationToTicketConversion: 'معدل نجاح تحويل الحجز المسبق إلى حضور فعلي وكشف طبي بالعيادة.',
      CancellationRateScheduledCohort: 'نسبة المواعيد التي تم إلغاؤها من قبل المريض أو العيادة.',
      ReservationNoShowRate: 'نسبة المرضى الذين تخلفوا عن الحضور دون إشعار مسبق بالإلغاء.',
      PunctualArrival: 'نسبة المرضى الملتزمين بالحضور في موعدهم المحدد دون تأخير.',
      BookingLeadTimeMinutes: 'متوسط الفترة الزمنية بالدقائق بين وقت إنشاء الحجز وتاريخ الكشف.',
      WaitToFirstCall: 'متوسط زمن انتظار المريض بصالة الاستقبال حتى النداء الأول لدخوله.',
      WaitToServiceStart: 'الوقت الإجمالي من لحظة تسجيل الحضور وحتى بدء الفحص الطبي الفعلي.',
      ServiceDuration: 'متوسط زمن الكشف والفحص الطبي المستغرق داخل غرفة الطبيب لكل مريض.',
      CallToStart: 'الوقت الفاصل بين نداء المريض ودخوله الفعلي للعيادة لبدء الفحص.',
      GrossCollected: 'إجمالي المبالغ النقدية المحصلة بالعيادة قبل خصم أي مصروفات أو استردادات.',
      NetCollected: 'صافي المقبوضات النقدية الفعلية بعد تسوية المبالغ المستردة للمرضى.',
      PaidOperatingExpenses: 'إجمالي المصروفات التشغيلية التي تم سدادها خلال هذه الفترة.',
      NetOperatingCashResult: 'صافي التدفق النقدي التشغيلي (المحصلات النقدية ناقص المصروفات).',
      OutstandingDueInPeriod: 'مستحقات مالية واجبة التحصيل خلال الفترة ولم تُسدد بعد.',
      AllOutstandingAsOf: 'إجمالي المبالغ المستحقة التراكمية على المرضى أو الجهات حتى تاريخه.',
      OverdueAsOf: 'المستحقات المالية المتأخرة التي تجاوزت مواعيد سدادها المحددة.',
      UniqueDoctorPatients: 'عدد المرضى الفريدين الذين زاروا عيادتك دون تكرار.',
      NewToDoctorPatients: 'المرضى الذين يزورون عيادتك لأول مرة في تاريخهم الطبي.',
      ReturningDoctorPatients: 'المرضى المراجعون الذين زاروا عيادتك سابقاً وعادوا لمتابعة حالتهم.',
      PatientRetention90d: 'نسبة المرضى الذين عادوا لمراجعة العيادة واستكمال علاجهم خلال 90 يوماً.',
      RescheduleEvents: 'إجمالي عمليات تعديل المواعيد ونقلها إلى أوقات أخرى.',
      RescheduledReservations: 'عدد الحجوزات التي تم تغيير توقيتها أو تاريخها المحدد.',
      WalkIns: 'المرضى الذين حضروا مباشرة للعيادة دون حجز موعد مسبق.',
      WalkInShare: 'نسبة الزيارات المباشرة بدون حجز من إجمالي حضور العيادة.',
      CallAttempts: 'إجمالي محاولات النداء على المرضى للدخول إلى العيادة.',
      Recalls: 'مرات إعادة استدعاء المريض بعد عدم استجابته للنداء الأول.',
      OperationalExceptions: 'ملاحظات وانحرافات تشغيلية استثنائية مسجلة أثناء ساعات العمل.',
      Waiting: 'المرضى الموجودون حالياً في صالة الانتظار بانتظار دورهم.',
      Called: 'المرضى الذين تم مناداتهم ويتوجهون حالياً لغرفة الكشف.',
      InProgress: 'المرضى الذين يخضعون للفحص الطبي والاستشارة حالياً.',
      TicketsCancelled: 'تذاكر صالة تم إلغاؤها بعد تسجيل حضور المريض.',
      TicketsNoShow: 'مرضى سجلوا حضورهم بالاستقبال لكنهم غادروا قبل الكشف.',
      FollowUpActivity: 'استشارات وزيارات المتابعة المسجلة مع المرضى.',
      ClinicalWorkflowCompleted: 'الكشوفات المكتملة توثيقياً مع التشخيص وكتابة الوصفة الطبية.',
    };
    const enMap: Record<string, string> = {
      AppointmentsScheduled: 'Total confirmed appointments in schedule for this period.',
      BookingsCreated: 'All bookings created via app or reception.',
      CheckIns: 'Patients who arrived and were checked in at reception.',
      TicketsCompleted: 'Consultations completed and closed by doctor.',
      ReservationToTicketConversion: 'Share of scheduled bookings that attended for consultation.',
      CancellationRateScheduledCohort: 'Appointments cancelled by patient or clinic.',
      ReservationNoShowRate: 'Patients who booked but did not attend without cancelling.',
      PunctualArrival: 'Percentage of patients arriving exactly on time.',
      BookingLeadTimeMinutes: 'Average time between booking creation and visit date.',
      WaitToFirstCall: 'Average wait time in waiting area until first call.',
      WaitToServiceStart: 'Total wait time from arrival until consultation start.',
      ServiceDuration: 'Average clinical examination duration per patient.',
      CallToStart: 'Time between calling patient and entering consultation.',
      GrossCollected: 'Total collections received before any refunds.',
      NetCollected: 'Net revenue collected after processing refunds.',
      PaidOperatingExpenses: 'Operating expenses paid during this period.',
      NetOperatingCashResult: 'Net cash flow: collections minus expenses.',
      OutstandingDueInPeriod: 'Receivables due in period that remain uncollected.',
      AllOutstandingAsOf: 'Total cumulative receivables as of today.',
      OverdueAsOf: 'Receivables past their payment due date.',
      UniqueDoctorPatients: 'Distinct individual patients seen.',
      NewToDoctorPatients: 'First-time patients visiting this clinic.',
      ReturningDoctorPatients: 'Returning patients visiting for follow-up care.',
      PatientRetention90d: 'Patients returning to clinic within 90 days.',
      RescheduleEvents: 'Number of times appointments were rescheduled.',
      RescheduledReservations: 'Reservations that were moved to another date/time.',
      WalkIns: 'Patients who visited directly without prior booking.',
      WalkInShare: 'Share of direct walk-ins out of total attendance.',
      CallAttempts: 'Number of times patients were called to enter.',
      Recalls: 'Patient recall attempts after missing initial call.',
      OperationalExceptions: 'Operational deviations recorded during clinic hours.',
      Waiting: 'Patients currently waiting in waiting area.',
      Called: 'Patients currently called to enter.',
      InProgress: 'Consultations currently in progress.',
      TicketsCancelled: 'Tickets cancelled after registration.',
      TicketsNoShow: 'Patients registered who left before consultation.',
      FollowUpActivity: 'Recorded clinical follow-up interactions.',
      ClinicalWorkflowCompleted: 'Clinical encounters fully documented.',
    };
    return (isAr ? arMap[code] : enMap[code]) || this.metricLabel(metric);
  }

  friendlyReference(row: components['schemas']['ReportRecord']): {
    code: string;
    typeLabel: string;
    typeIcon: string;
    badgeClass: string;
    description: string;
  } {
    const isAr = this.language.isRtl();
    const type = (row.resourceType ?? '').toLowerCase();
    const raw = row.reference ?? '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(raw);
    const shortCode = isUuid ? '#' + raw.slice(0, 8).toUpperCase() : raw || '#—';

    if (type.includes('reservation')) {
      return {
        code: shortCode,
        typeLabel: isAr ? 'حجز موعد مسبق' : 'Reservation',
        typeIcon: 'fa-regular fa-calendar-check',
        badgeClass: 'badge-type--blue',
        description: isAr ? 'موعد مسجل للمريض بجدول العيادة' : 'Scheduled clinic appointment',
      };
    }
    if (type.includes('ticket')) {
      return {
        code: shortCode,
        typeLabel: isAr ? 'تذكرة انتظار صالة' : 'Queue Ticket',
        typeIcon: 'fa-solid fa-ticket',
        badgeClass: 'badge-type--teal',
        description: isAr ? 'تذكرة دور دخول لغرفة الكشف' : 'Queue waiting room ticket',
      };
    }
    if (type.includes('encounter')) {
      return {
        code: shortCode,
        typeLabel: isAr ? 'كشف وفحص طبي' : 'Consultation',
        typeIcon: 'fa-solid fa-user-doctor',
        badgeClass: 'badge-type--emerald',
        description: isAr ? 'جلسة فحص سريري معتمدة' : 'Clinical consultation record',
      };
    }
    if (
      type.includes('financial') ||
      type.includes('invoice') ||
      type.includes('payment') ||
      type.includes('collection')
    ) {
      return {
        code: shortCode,
        typeLabel: isAr ? 'سند تحصيل مالي' : 'Payment Receipt',
        typeIcon: 'fa-solid fa-receipt',
        badgeClass: 'badge-type--amber',
        description: isAr ? 'معاملة مالية مقيدة بإيرادات العيادة' : 'Financial collection transaction',
      };
    }
    return {
      code: shortCode,
      typeLabel: isAr ? 'سجل تشغيلي موثق' : 'Operational Record',
      typeIcon: 'fa-solid fa-clipboard-check',
      badgeClass: 'badge-type--slate',
      description: isAr ? 'حالة مسجلة وموثقة في سجلات النظام' : 'Logged system record',
    };
  }

  format(metric: ReportMetric | undefined): string {
    const val = measuredValue(metric);
    if (val === null) return this.language.t('doctorRemediation.unavailable');
    const u = metric?.unit?.toLowerCase();
    if (u === 'percentage' || u === 'percent') {
      return `${this.formatNumber(val)}%`;
    }
    if (u === 'minutes' && val >= 60) {
      const hours = val / 60;
      if (hours >= 24) {
        const days = (hours / 24).toFixed(1);
        return `${this.formatNumber(Math.round(val))} دقيقة (~${days} يوم)`;
      }
      return `${this.formatNumber(Math.round(val))} دقيقة (~${hours.toFixed(1)} ساعة)`;
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
