import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
  ElementRef,
  DestroyRef,
  afterNextRender,
  effect,
} from '@angular/core';
import gsap from 'gsap';

import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

import { Phase18Api } from '../../../../domains/phase18';
import type { components } from '../../../../domains/phase18';

import { PortalNavigation } from '../../../../layout/navigation/portal-navigation';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { dashboardGroups, metricDrilldown } from './dashboard-presentation';
import {
  OVERVIEW_KPIS,
  FINANCE_CODES,
  TIMING_CODES,
  QUEUE_CODES,
  PATIENT_CODES,
  measuredValue,
  selectMetrics,
  activityTrend,
  bookingPatterns,
  reportingPreset,
} from './overview-presentation';
import { TRANSLATIONS } from '../../../../core/i18n/translations';

type ReportModel = components['schemas']['ReportModel'];
type ReportMetric = components['schemas']['ReportMetric'];
type ReportFilterOptions = components['schemas']['ReportFilterOptions'];
type BreakdownPoint = NonNullable<ReportModel['breakdowns']>[number];

interface DashboardFilters {
  practiceId: string;
  fromDate: string;
  toDate: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css'],
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
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly language = inject(LanguageService);

  constructor() {
    afterNextRender(() => {
      if (!this.prefersReducedMotion()) {
        const host = this.hostRef.nativeElement;
        const filterCard = host.querySelector('.dashboard-filters-card');
        if (filterCard) {
          gsap.fromTo(
            filterCard,
            { opacity: 0, y: -10 },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            },
          );
        }
      }
    });

    effect(() => {
      const report = this.model();
      const loading = this.loading();
      if (report && !loading) {
        setTimeout(() => {
          if (!this.destroyed) {
            this.initScrollAnimations();
          }
        }, 50);
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.scrollObserver) {
        this.scrollObserver.disconnect();
      }
      this.killAllAnimations();
    });
  }

  // ========================================
  // State
  // ========================================

  readonly model = signal<ReportModel | null>(null);

  readonly options = signal<ReportFilterOptions | null>(null);

  readonly loading = signal(false);

  readonly failed = signal(false);

  readonly subscriptionRequired = signal(false);

  readonly activePreset = signal<'today' | 'last7' | 'month' | null>(null);
  readonly periodSelection = computed<'today' | 'last7' | 'month' | 'custom'>(() => {
    return this.activePreset() ?? 'custom';
  });

  readonly measuredValue = measuredValue;
  readonly financeCodes = FINANCE_CODES;
  readonly canViewFinance = computed(() => this.session.hasPermission('DoctorRevenue.ViewOwn'));
  readonly visibleMetrics = computed(() =>
    (this.model()?.metrics ?? []).filter(
      (metric) =>
        this.canViewFinance() ||
        (!FINANCE_CODES.includes(metric.metricCode ?? '') && metric.unit?.toLowerCase() !== 'egp'),
    ),
  );
  readonly highlights = computed(() => {
    const defaultCodes = [
      'AppointmentsScheduled',
      'CheckIns',
      'ReservationToTicketConversion',
      'ReservationNoShowRate',
      this.metricByCode('PatientRetention90d')
        ? 'PatientRetention90d'
        : this.metricByCode('ReturningDoctorPatients')
          ? 'ReturningDoctorPatients'
          : 'CancellationRateScheduledCohort',
    ];
    if (
      this.canViewFinance() &&
      this.visibleMetrics().some((m) => m.metricCode === 'NetCollected')
    ) {
      defaultCodes.push('NetCollected');
    }
    return defaultCodes.map(
      (code) =>
        this.visibleMetrics().find((metric) => metric.metricCode === code) ?? {
          metricCode: code,
          value: null,
        },
    );
  });
  readonly chartPoints = computed(() => activityTrend(this.model()));
  readonly chartMaximum = computed(() => this.chartPoints()[0]?.maximum ?? 1);
  readonly selectedDay = signal('');
  readonly selectedPoint = computed(() =>
    this.chartPoints().find((point) => point.key === this.selectedDay()),
  );
  readonly cohortMaximum = computed(() =>
    Math.max(1, ...this.cohort().map((metric) => measuredValue(metric) ?? 0)),
  );
  readonly selectedGroup = signal('queue');
  readonly metricSearch = signal('');
  readonly onlyActiveMetrics = signal(true);
  readonly groups = computed(() => dashboardGroups(this.visibleMetrics()));
  readonly activeGroup = computed<{ id: string; metrics: ReportMetric[] } | undefined>(
    () => this.groups().find((group) => group.id === this.selectedGroup()) ?? this.groups()[0],
  );
  readonly displayedGroupMetrics = computed(() => {
    const search = this.metricSearch().trim().toLocaleLowerCase();
    const groupMetrics = this.activeGroup()?.metrics ?? [];
    return groupMetrics.filter((metric) => {
      const labelMatch = this.metricLabel(metric)
        .toLocaleLowerCase()
        .includes(search);
      if (!labelMatch) return false;
      if (this.onlyActiveMetrics()) {
        const val = measuredValue(metric);
        return val !== null;
      }
      return true;
    });
  });
  readonly totalGroupMetricsCount = computed(
    () => this.activeGroup()?.metrics.length ?? 0,
  );
  readonly activeGroupMetricsCount = computed(
    () => (this.activeGroup()?.metrics ?? []).filter((m) => measuredValue(m) !== null).length,
  );
  readonly cohort = computed(() =>
    selectMetrics(
      this.model()?.breakdowns?.find((point) => point.key === 'BookingCreationCohortFunnel')
        ?.metrics ?? [],
      ['BookingsCreated', 'CheckIns', 'TicketsCompleted'],
    ),
  );
  readonly weekdayPatterns = computed(() => bookingPatterns(this.model(), 'weekday'));
  readonly hourPatterns = computed(() => bookingPatterns(this.model(), 'hour'));
  readonly practiceBreakdowns = computed(() =>
    (this.model()?.breakdowns ?? []).filter(
      (p) =>
        p.key?.startsWith('Practice:') ||
        (!p.key?.startsWith('BookingWeekday:') &&
          !p.key?.startsWith('BookingHour:') &&
          !p.key?.startsWith('SegmentPriority:') &&
          p.key !== 'BookingCreationCohortFunnel'),
    ),
  );
  readonly clinicBreakdowns = computed(() => {
    const list = (this.model()?.breakdowns ?? []).filter((p) => p.key?.startsWith('Practice:'));
    return list.length ? list : this.practiceBreakdowns();
  });
  readonly channelBreakdowns = computed(() => {
    const hasPractices = (this.model()?.breakdowns ?? []).some((p) => p.key?.startsWith('Practice:'));
    if (!hasPractices) return [];
    return (this.model()?.breakdowns ?? []).filter(
      (p) =>
        !p.key?.startsWith('Practice:') &&
        !p.key?.startsWith('BookingWeekday:') &&
        !p.key?.startsWith('BookingHour:') &&
        !p.key?.startsWith('SegmentPriority:') &&
        p.key !== 'BookingCreationCohortFunnel',
    );
  });
  readonly weekdayBreakdownPoints = computed(() => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return (this.model()?.breakdowns ?? [])
      .filter((p) => p.key?.startsWith('BookingWeekday:'))
      .map((p) => {
        const day = p.key?.replace('BookingWeekday:', '') ?? '';
        const order = weekdays.indexOf(day);
        const bookingsMetric = p.metrics?.find((m) => m.metricCode === 'BookingsCreated');
        return {
          point: p,
          day,
          arabicDay: this.dayArabicName(day),
          order: order >= 0 ? order : 99,
          bookingsCount: measuredValue(bookingsMetric) ?? 0,
        };
      })
      .sort((a, b) => a.order - b.order);
  });
  readonly weekdayBreakdownMax = computed(() =>
    Math.max(1, ...this.weekdayBreakdownPoints().map((d) => d.bookingsCount)),
  );
  readonly priorityBreakdownPoints = computed(() =>
    (this.model()?.breakdowns ?? []).filter((p) => p.key?.startsWith('SegmentPriority:')),
  );
  readonly modules = computed(() =>
    [
      { id: 'operations', codes: TIMING_CODES },
      { id: 'queue', codes: QUEUE_CODES },
      {
        id: 'exceptions',
        codes: [
          'CancellationRateScheduledCohort',
          'ReservationNoShowRate',
          'CancellationsByEvent',
          'TicketNoShowRate',
        ],
      },
      { id: 'patients', codes: PATIENT_CODES },
      { id: 'finance', codes: FINANCE_CODES },
    ]
      .map((module) => ({ ...module, metrics: selectMetrics(this.visibleMetrics(), module.codes) }))
      .filter((module) => module.metrics.length),
  );
  readonly timeZone = computed(
    () =>
      this.model()?.window?.reportTimeZoneId ||
      this.model()?.appliedFilters?.reportTimeZoneId ||
      this.options()?.defaultReportTimeZoneId ||
      'Africa/Cairo',
  );
  readonly warnings = computed(() => [
    ...new Set([
      ...(this.model()?.warnings ?? []),
      ...this.visibleMetrics().flatMap((metric) =>
        metric.warningCode ? [metric.warningCode] : [],
      ),
    ]),
  ]);

  readonly activePatternTab = signal<'weekday' | 'hour'>('weekday');

  setActivePatternTab(tab: 'weekday' | 'hour'): void {
    this.activePatternTab.set(tab);
    setTimeout(() => {
      const host = this.hostRef.nativeElement;
      this.animatePatternBarsInContainer(host);
    }, 30);
  }

  metricByCode(code: string): ReportMetric | undefined {
    return this.visibleMetrics().find((m) => m.metricCode === code);
  }

  metricValue(code: string): number | null {
    const metric = this.metricByCode(code);
    return metric ? measuredValue(metric) : null;
  }

  openDrilldownForCode(code: string): void {
    const metric = this.metricByCode(code);
    if (metric && this.canDrilldown(metric)) {
      void this.openDrilldown(metric);
    }
  }

  readonly doctorGreeting = computed(() => {
    const isAr = this.language.isRtl();
    const user = this.session.user();
    const rawName = user?.userName ?? '';
    let doctorName = '';
    if (rawName.includes('dr.')) {
      doctorName = rawName.split('dr.')[1]?.replace(/\./g, ' ');
    } else if (rawName.includes('dr_')) {
      doctorName = rawName.split('dr_')[1]?.replace(/_/g, ' ');
    } else {
      doctorName = rawName;
    }
    doctorName = doctorName ? doctorName.charAt(0).toUpperCase() + doctorName.slice(1).trim() : '';
    if (isAr) {
      const arNameMap: Record<string, string> = {
        Mona: 'منى',
        Ahmed: 'أحمد',
        Mohamed: 'محمد',
        Sara: 'سارة',
        Mahmoud: 'محمود',
      };
      const display = arNameMap[doctorName] || doctorName;
      return display ? `مرحباً د. ${display}` : this.language.t('doctorRemediation.dashboard');
    }
    return doctorName ? `Welcome Dr. ${doctorName}` : this.language.t('doctorRemediation.dashboard');
  });

  readonly ticketSummary = computed(() => {
    const completed = this.metricValue('TicketsCompleted') ?? 0;
    const inProgress = (this.metricValue('InProgress') ?? 0) + (this.metricValue('Called') ?? 0);
    const waiting = this.metricValue('Waiting') ?? 0;
    const cancelled =
      (this.metricValue('TicketsCancelled') ?? 0) + (this.metricValue('TicketsNoShow') ?? 0);
    const total = completed + inProgress + waiting + cancelled;
    const pct = (val: number) => (total > 0 ? Math.round((val / total) * 1000) / 10 : 0);
    return {
      total,
      completed,
      completedPct: pct(completed),
      inProgress,
      inProgressPct: pct(inProgress),
      waiting,
      waitingPct: pct(waiting),
      cancelled,
      cancelledPct: pct(cancelled),
    };
  });

  readonly cancellationSummary = computed(() => {
    const scheduled = this.metricValue('AppointmentsScheduled') ?? 0;
    const attended = this.metricValue('CheckIns') ?? 0;
    const round1 = (val: number) => Math.round(val * 10) / 10;
    const noShowRate = round1(this.metricValue('ReservationNoShowRate') ?? 0);
    const cancelRate = round1(this.metricValue('CancellationRateScheduledCohort') ?? 0);
    const noShowCount =
      this.metricValue('TicketsNoShow') ??
      (noShowRate > 0 && scheduled > 0 ? Math.round((scheduled * noShowRate) / 100) : 0);
    const cancelCount =
      this.metricValue('CancellationsByEvent') ??
      (cancelRate > 0 && scheduled > 0 ? Math.round((scheduled * cancelRate) / 100) : 0);
    const attendedPct = scheduled > 0 ? round1((attended / scheduled) * 100) : 0;
    return {
      attended,
      attendedPct,
      noShowCount,
      noShowRate,
      cancelCount,
      cancelRate,
    };
  });

  readonly topPriorities = computed(() => {
    const points = this.priorityBreakdownPoints();
    if (points.length) {
      const items = points
        .map((p) => {
          const metric = p.metrics?.find(
            (m) => m.metricCode === 'BookingsCreated' || m.metricCode === 'CheckIns',
          );
          const val = measuredValue(metric) ?? 0;
          return {
            key: p.key ?? '',
            title: this.breakdownTitle(p),
            count: val,
          };
        })
        .sort((a, b) => b.count - a.count);
      const maxVal = Math.max(1, ...items.map((i) => i.count));
      return items.slice(0, 5).map((item) => ({
        ...item,
        pct: Math.round((item.count / maxVal) * 100),
      }));
    }
    const weekdays = this.weekdayBreakdownPoints();
    const maxW = Math.max(1, ...weekdays.map((w) => w.bookingsCount));
    return weekdays.slice(0, 5).map((w) => ({
      key: w.day,
      title: w.arabicDay,
      count: w.bookingsCount,
      pct: Math.round((w.bookingsCount / maxW) * 100),
    }));
  });

  readonly performanceSummary = computed(() => {
    const round1 = (val: number | null) => (val !== null ? Math.round(val * 10) / 10 : null);
    const waitTime = round1(
      this.metricValue('WaitToServiceStart') ?? this.metricValue('WaitToFirstCall') ?? null,
    );
    const consultTime = round1(this.metricValue('ServiceDuration') ?? null);
    const utilization = round1(
      this.metricValue('ActualServiceUtilization') ?? this.metricValue('PunctualArrival') ?? null,
    );
    return {
      waitTime,
      consultTime,
      utilization,
    };
  });

  readonly cancellationDonutStyle = computed(() => {
    const summary = this.cancellationSummary();
    if (summary.attended === 0 && summary.noShowCount === 0 && summary.cancelCount === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }
    const attended = Math.min(100, Math.max(0, summary.attendedPct));
    const noShow = Math.min(100 - attended, Math.max(0, summary.noShowRate));

    const degAttended = Math.round((attended / 100) * 360);
    const degNoShow = Math.round(degAttended + (noShow / 100) * 360);

    return `conic-gradient(var(--wasla-teal-500, #0d9488) 0deg ${degAttended}deg, #f43f5e ${degAttended}deg ${degNoShow}deg, #94a3b8 ${degNoShow}deg 360deg)`;
  });

  readonly ticketDonutStyle = computed(() => {
    const summary = this.ticketSummary();
    const total = summary.total;
    if (total === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }
    const completed = summary.completedPct;
    const inProgress = summary.inProgressPct;
    const waiting = summary.waitingPct;

    const deg1 = Math.round((completed / 100) * 360);
    const deg2 = Math.round(deg1 + (inProgress / 100) * 360);
    const deg3 = Math.round(deg2 + (waiting / 100) * 360);

    return `conic-gradient(#0d9488 0deg ${deg1}deg, #0284c7 ${deg1}deg ${deg2}deg, #f59e0b ${deg2}deg ${deg3}deg, #f43f5e ${deg3}deg 360deg)`;
  });

  readonly searchQuery = signal('');

  onSearchSubmit(): void {
    const q = this.searchQuery().trim();
    if (q) {
      if (/\d/.test(q)) {
        void this.router.navigate(['/doctor/reservations'], { queryParams: { search: q } });
        return;
      }
      this.metricSearch.set(q);
    }
    void this.refresh();
  }

  metricLabel(metric: ReportMetric): string {
    const key = 'doctorOverview.metric.' + metric.metricCode;
    return TRANSLATIONS[key] ? this.language.t(key) : this.text(metric.nameAr, metric.nameEn);
  }

  metricIcon(code: string | null | undefined): string {
    switch (code) {
      case 'AppointmentsScheduled':
        return 'fa-regular fa-calendar-check';
      case 'CheckIns':
        return 'fa-solid fa-user-check';
      case 'ReservationToTicketConversion':
        return 'fa-solid fa-arrow-trend-up';
      case 'CancellationRateScheduledCohort':
        return 'fa-solid fa-calendar-xmark';
      case 'ReservationNoShowRate':
        return 'fa-solid fa-user-slash';
      case 'ReturningDoctorPatients':
      case 'PatientRetention90d':
        return 'fa-solid fa-arrows-rotate';
      case 'NetCollected':
        return 'fa-solid fa-wallet';
      case 'WaitToFirstCall':
      case 'WaitToServiceStart':
      case 'CallToStart':
      case 'ServiceDuration':
        return 'fa-solid fa-clock';
      default:
        return 'fa-solid fa-chart-simple';
    }
  }

  metricColorClass(code: string | null | undefined): string {
    switch (code) {
      case 'AppointmentsScheduled':
        return 'kpi-bubble--blue';
      case 'CheckIns':
        return 'kpi-bubble--teal';
      case 'ReservationToTicketConversion':
        return 'kpi-bubble--emerald';
      case 'CancellationRateScheduledCohort':
        return 'kpi-bubble--amber';
      case 'ReservationNoShowRate':
        return 'kpi-bubble--rose';
      case 'ReturningDoctorPatients':
      case 'PatientRetention90d':
        return 'kpi-bubble--teal';
      case 'NetCollected':
        return 'kpi-bubble--teal-dark';
      default:
        return 'kpi-bubble--slate';
    }
  }

  moduleIcon(id: string | null | undefined): string {
    switch (id) {
      case 'operations':
        return 'fa-solid fa-stopwatch';
      case 'queue':
        return 'fa-solid fa-users-line';
      case 'exceptions':
        return 'fa-solid fa-triangle-exclamation';
      case 'patients':
        return 'fa-solid fa-hospital-user';
      case 'finance':
        return 'fa-solid fa-file-invoice-dollar';
      case 'cohort':
        return 'fa-solid fa-diagram-project';
      case 'weekday':
        return 'fa-solid fa-calendar-week';
      case 'hour':
        return 'fa-solid fa-clock';
      default:
        return 'fa-solid fa-layer-group';
    }
  }

  actionIcon(id: string | null | undefined): string {
    switch (id) {
      case 'queue':
        return 'fa-solid fa-clipboard-list';
      case 'encounters':
        return 'fa-solid fa-stethoscope';
      case 'doctor-patients':
        return 'fa-solid fa-hospital-user';
      case 'reservations':
        return 'fa-solid fa-calendar-check';
      case 'reports':
        return 'fa-solid fa-chart-pie';
      case 'insights':
        return 'fa-solid fa-lightbulb';
      case 'practices':
        return 'fa-solid fa-hospital';
      case 'revenue':
        return 'fa-solid fa-coins';
      default:
        return 'fa-solid fa-arrow-up-right-from-square';
    }
  }

  groupIcon(groupId: string | null | undefined): string {
    switch (groupId) {
      case 'queue':
        return 'fa-solid fa-users-viewfinder';
      case 'bookings':
        return 'fa-regular fa-calendar-check';
      case 'care':
        return 'fa-solid fa-user-doctor';
      case 'capacity':
        return 'fa-solid fa-stopwatch';
      case 'finance':
        return 'fa-solid fa-receipt';
      case 'handovers':
        return 'fa-solid fa-arrows-rotate';
      default:
        return 'fa-solid fa-chart-pie';
    }
  }

  metricHelpText(metric: ReportMetric): string {
    const code = metric.metricCode ?? '';
    const key = 'doctorOverview.help.' + code;
    if (TRANSLATIONS[key]) {
      return this.language.t(key);
    }
    const isAr = this.language.isRtl();
    const arMap: Record<string, string> = {
      WalkIns: 'المرضى الذين حضروا مباشرة إلى العيادة دون حجز مسبق.',
      WalkInShare: 'نسبة المرضى القادمين دون حجز من إجمالي الحضور.',
      CallAttempts: 'إجمالي محاولات نداء المريض للدخول إلى غرفة الكشف.',
      Recalls: 'مرات إعادة نداء المريض بعد تخطيه أو تأخره عن دوره.',
      OperationalExceptions: 'الحالات الاستثنائية المسجلة أثناء سير العمل بالعيادة.',
      BookingsCreated: 'إجمالي المواعيد التي تم إنشاؤها وتسجيلها في جدول العيادة.',
      BookingLeadTimeMinutes: 'متوسط الوقت بالدقائق بين حجز الموعد وموعد الكشف الفعلي.',
      PunctualArrival: 'نسبة المرضى الذين حضروا في موعدهم المحدد بالضبط دون تأخير.',
      RescheduleEvents: 'مرات تعديل أو تغيير موعد الحجز إلى موعد آخر.',
      RescheduledReservations: 'عدد الحجوزات التي تم تغيير توقيتها.',
      CapacityMinutes: 'إجمالي الدقائق المتاحة في جدول الطبيب لاستقبال المرضى.',
      UnusedCapacityMinutes: 'الدقائق الشاغرة التي لم يتم حجزها أو استغلالها في الكشف.',
      MaximumDailyPatientCapacity: 'الحد الأقصى لعدد المرضى الممكن استقبالهم يومياً.',
      BookedUtilization: 'نسبة الحجوزات المجدولة من إجمالي الطاقة الاستيعابية للعيادة.',
      ActualServiceUtilization: 'نسبة الوقت المستغل فعلياً في الكشف من ساعات العمل المتاحة.',
      SegmentQuotaUtilization: 'نسبة استهلاك الحصص المخصصة لكل شريحة من المواعيد.',
      PaidOperatingExpenses: 'مصروفات التشغيل المعتمدة التي تم سدادها خلال الفترة.',
      OutstandingDueInPeriod: 'المستحقات المالية المؤكدة خلال الفترة ولم يتم تحصيلها بعد.',
      AllOutstandingAsOf: 'إجمالي المستحقات التراكمية غير المسددة حتى وقت هذا التقرير.',
      OverdueAsOf: 'المستحقات المالية المتأخرة التي تجاوزت مواعيد السداد المحددة.',
      GrossCollected: 'إجمالي المبالغ النقدية المحصلة بالعيادة قبل خصم أي مستردات.',
      Refunds: 'إجمالي المبالغ المستردة للمرضى لأي أسباب إلغاء.',
      NetCollected: 'صافي التحصيل الفعلي بعد خصم كافة المبالغ المستردة.',
      NetOperatingCashResult: 'صافي التدفق النقدي الناتج عن التشغيل (المحصل ناقص المصروفات).',
      ProjectedResultForPeriod: 'التقدير المالي المتوقع لنتائج أعمال الفترة الحالية.',
      OpenHandovers: 'نوبات العمل التي ما زالت قيد التشغيل ولم تُسلّم بعد.',
      HandoversCreated: 'جلسات تسليم العمل التي تم إنشاؤها بين أفراد فريق الاستقبال.',
      HandoverAcknowledgements: 'تأكيدات استلام نوبات العمل المعتمدة من الزملاء.',
      HandoversClosed: 'نوبات العمل التي تم إنهاؤها وتسليمها بالكامل.',
      Waiting: 'عدد المرضى المتواجدين حالياً في صالة الانتظار بانتظار النداء.',
      Called: 'المرضى الذين تم نداؤهم للتو وجارٍ دخولهم لغرفة الطبيب.',
      InProgress: 'المرضى المتواجدون حالياً داخل غرفة الكشف لتلقي الرعاية.',
      TicketsCompleted: 'إجمالي الكشوفات والزيارات التي اكتملت بنجاح خلال الفترة.',
      TicketsCancelled: 'التذاكر أو الكشوفات التي تم إلغاؤها بعد تسجيل حضورها.',
      TicketsNoShow: 'المرضى الذين لم يحضروا بعد استخراج تذكرة الانتظار.',
      UniqueDoctorPatients: 'عدد المرضى الفريدين الذين زاروا عيادتك دون تكرار.',
      NewToDoctorPatients: 'المرضى الذين يزورون عيادتك لأول مرة في تاريخهم الطبي.',
      ReturningDoctorPatients: 'المرضى الذين زاروا عيادتك سابقاً وعادوا لمتابعة حالتهم.',
      PatientRetention90d: 'نسبة المرضى الذين عادوا لمراجعة العيادة خلال ٩٠ يوماً.',
      FollowUpActivity: 'إجمالي أنشطة واستشارات المتابعة المسجلة مع المرضى.',
      ClinicalWorkflowCompleted: 'مسارات الكشف الطبي التي تم توثيقها وكتابة نتائجها بالكامل.',
    };
    const enMap: Record<string, string> = {
      WalkIns: 'Patients who arrived at the clinic directly without prior booking.',
      WalkInShare: 'Share of direct walk-in visits out of total clinic attendance.',
      CallAttempts: 'Number of times patient was called via queue screen or system.',
      Recalls: 'Instances where patient was recalled after missing their turn.',
      OperationalExceptions: 'Operational deviations recorded during clinic hours.',
      BookingsCreated: 'Total appointments created in clinic schedule.',
      BookingLeadTimeMinutes: 'Average minutes between booking creation and visit time.',
      PunctualArrival: 'Percentage of patients who arrived on their scheduled time.',
      RescheduleEvents: 'Number of times appointments were rescheduled.',
      RescheduledReservations: 'Number of reservations that had their time modified.',
      CapacityMinutes: 'Total capacity minutes available for clinic service.',
      UnusedCapacityMinutes: 'Available slot minutes not booked by patients.',
      MaximumDailyPatientCapacity: 'Maximum patient visits capacity per working day.',
      BookedUtilization: 'Percentage of capacity booked with appointments.',
      ActualServiceUtilization: 'Percentage of capacity spent in actual clinical consultation.',
      SegmentQuotaUtilization: 'Utilization rate of quotas allocated for patient segments.',
      PaidOperatingExpenses: 'Operating expenses paid during the period.',
      OutstandingDueInPeriod: 'Receivables due in period that remain uncollected.',
      AllOutstandingAsOf: 'Total cumulative receivables as of the reporting snapshot.',
      OverdueAsOf: 'Receivables that have passed their payment due date.',
      GrossCollected: 'Total cash collected before deductions and refunds.',
      Refunds: 'Total refunds returned to patients.',
      NetCollected: 'Net revenue collected after processing refunds.',
      NetOperatingCashResult: 'Net operating cash flow (Collections minus Expenses).',
      ProjectedResultForPeriod: 'Financial projection for the current reporting period.',
      OpenHandovers: 'Shifts that remain active and have not been handed over.',
      HandoversCreated: 'Work handovers created between reception staff.',
      HandoverAcknowledgements: 'Confirmed handover receipts from colleagues.',
      HandoversClosed: 'Staff shifts that were completely concluded.',
      Waiting: 'Patients currently waiting in the waiting area.',
      Called: 'Patients called and currently entering the consultation room.',
      InProgress: 'Patients currently receiving clinical care in consultation.',
      TicketsCompleted: 'Consultations successfully completed in this period.',
      TicketsCancelled: 'Tickets cancelled after registration.',
      TicketsNoShow: 'Patients who missed their ticket call.',
      UniqueDoctorPatients: 'Distinct individual patients seen during the period.',
      NewToDoctorPatients: 'Patients visiting this doctor for the very first time.',
      ReturningDoctorPatients: 'Patients returning for follow-up or recurring care.',
      PatientRetention90d: 'Patients returning to clinic within 90 days.',
      FollowUpActivity: 'Recorded clinical follow-ups and care interactions.',
      ClinicalWorkflowCompleted: 'Clinical encounters fully documented with findings.',
    };
    return (isAr ? arMap[code] : enMap[code]) || this.metricLabel(metric);
  }

  breakdownTitle(point: BreakdownPoint): string {
    const isAr = this.language.isRtl();
    let title = this.text(point.nameAr, point.nameEn);
    if (!title || title === point.key) {
      if (point.key?.startsWith('BookingWeekday:')) {
        const day = point.key.split(':')[1];
        const dayName = isAr ? this.dayArabicName(day) : day;
        return isAr ? `حجوزات يوم ${dayName}` : `Bookings on ${day}`;
      }
      if (point.key?.startsWith('BookingHour:')) {
        const hour = point.key.split(':')[1].padStart(2, '0');
        return isAr ? `حجوزات الساعة ${hour}:00` : `Bookings at ${hour}:00`;
      }
      if (point.key?.startsWith('SegmentPriority:')) {
        const p = point.key.split(':')[1];
        if (p === '0') return isAr ? 'المواعيد العادية / فحص روتيني' : 'Standard Routine Care';
        if (p === '10') return isAr ? 'الحالات العاجلة / ذات أولوية' : 'High Priority / Urgent Care';
        return isAr ? `شريحة الأولوية (${p})` : `Priority Segment (${p})`;
      }
      if (point.key === 'BookingCreationCohortFunnel') {
        return isAr ? 'مسار الحجوزات المكتملة' : 'Booking completion funnel';
      }
      if (point.key?.startsWith('BookingCreator:')) {
        const role = point.key.split(':')[1];
        return isAr ? `حجوزات منشأة عبر: ${role}` : `Bookings created by: ${role}`;
      }
      if (point.key?.startsWith('CancellationInitiator:')) {
        const role = point.key.split(':')[1];
        return isAr ? `إلغاءات بواسطة: ${role}` : `Cancellations initiated by: ${role}`;
      }
      if (point.key?.startsWith('CancellationReason:')) {
        const reason = point.key.split(':')[1];
        return isAr ? `أسباب الإلغاء: ${reason}` : `Cancellation reason: ${reason}`;
      }
    }
    if (isAr && title) {
      title = title
        .replace(/Sunday/gi, 'الأحد')
        .replace(/Monday/gi, 'الاثنين')
        .replace(/Tuesday/gi, 'الثلاثاء')
        .replace(/Wednesday/gi, 'الأربعاء')
        .replace(/Thursday/gi, 'الخميس')
        .replace(/Friday/gi, 'الجمعة')
        .replace(/Saturday/gi, 'السبت');
    }
    return title;
  }

  private dayArabicName(day: string): string {
    const map: Record<string, string> = {
      Sunday: 'الأحد',
      Monday: 'الاثنين',
      Tuesday: 'الثلاثاء',
      Wednesday: 'الأربعاء',
      Thursday: 'الخميس',
      Friday: 'الجمعة',
      Saturday: 'السبت',
    };
    return map[day] || day;
  }

  channelIcon(key: string | null | undefined): string {
    if (!key) return 'fa-solid fa-chart-pie';
    const lower = key.toLowerCase();
    if (lower.includes('creator') || lower.includes('creation') || lower.includes('منشئ')) {
      return 'fa-solid fa-user-pen';
    }
    if (lower.includes('cancel') || lower.includes('إلغاء')) {
      return 'fa-solid fa-calendar-xmark';
    }
    return 'fa-solid fa-sliders';
  }

  statusColorClass(status: string | null | undefined): string {
    if (!status) return 'status--unknown';
    return 'status--' + status.toLowerCase();
  }

  metricStatus(metric: ReportMetric): string {
    if (metric.dataStatus === 'NotMeasured' || metric.dataStatus === 'NotInstrumented')
      return this.language.t('doctorOverview.notMeasured');
    if (measuredValue(metric) === null) return this.language.t('doctorRemediation.unavailable');
    if (metric.dataStatus === 'Partial' || metric.dataStatus === 'Stale')
      return this.language.t('doctorOverview.partial');
    return '';
  }

  warningLabel(code: string): string {
    return this.language.t(TRANSLATIONS[code] ? code : 'doctorOverview.partial');
  }

  pointLabel(point: ReturnType<typeof activityTrend>[number]): string {
    return `${this.formatDay(point.key)}: ${this.language.t('doctorOverview.metric.AppointmentsScheduled')} ${this.format(point.scheduled)}, ${this.language.t('doctorOverview.metric.CheckIns')} ${this.format(point.checkIns)}`;
  }

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
      !this.loading() &&
      this.canView() &&
      (this.canViewFinance() ||
        (!FINANCE_CODES.includes(metric.metricCode ?? '') &&
          metric.unit?.toLowerCase() !== 'egp')) &&
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
    if (!row.availableActions?.some((action) => action.allowed === true)) return null;

    const detailRoute = row.detailRoute ?? '';
    const patient = detailRoute.match(/^\/api\/v1\/doctors\/me\/patients\/([A-Za-z0-9-]+)$/);
    if (patient && this.session.hasPermission('DoctorPatients.ViewOwn')) {
      return { route: '/doctor/patients', query: { patientId: patient[1], tab: 'overview' } };
    }
    const resource = detailRoute.match(
      /^\/api\/v1\/(?:doctors\/me\/)?practices\/([A-Za-z0-9-]+)\/(reservations|encounters)\/([A-Za-z0-9-]+)$/,
    );
    if (!resource) {
      if (
        row.patientId &&
        /^[A-Za-z0-9-]+$/.test(row.patientId) &&
        this.session.hasPermission('DoctorPatients.ViewOwn')
      ) {
        return {
          route: '/doctor/patients',
          query: { patientId: row.patientId, tab: 'attendance' },
        };
      }
      return null;
    }
    if (
      row.resourceType &&
      row.resourceType !== (resource[2] === 'reservations' ? 'Reservation' : 'Encounter')
    )
      return null;
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

  totalPages(totalCount: number, pageSize = 20): number {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }

  recordStatusLabel(status: string | null | undefined): string {
    if (!status) return '';
    const key = 'doctorOverview.status.' + status;
    return this.language.t(TRANSLATIONS[key] ? key : 'doctorRemediation.unavailable');
  }

  statusIcon(status: string | null | undefined): string {
    if (!status) return 'fa-solid fa-circle';
    const map: Record<string, string> = {
      Completed: 'fa-solid fa-circle-check',
      Cancelled: 'fa-solid fa-ban',
      InProgress: 'fa-solid fa-stethoscope',
      Called: 'fa-solid fa-bullhorn',
      Waiting: 'fa-solid fa-clock',
      NoShow: 'fa-solid fa-user-xmark',
      Scheduled: 'fa-solid fa-calendar',
    };
    return map[status] || 'fa-solid fa-circle-info';
  }

  recordTypeLabel(type: string | null | undefined): string {
    if (!type) return '';
    const key = 'doctorOverview.resource.' + type;
    return this.language.t(TRANSLATIONS[key] ? key : 'doctorDashboard.record');
  }

  formatRecordTime(value: string | null | undefined): string | null {
    if (!value || !Number.isFinite(Date.parse(value))) return null;
    return new Intl.DateTimeFormat(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: this.timeZone(),
    }).format(new Date(value));
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

  changePractice(practiceId: string): void {
    this.filters.practiceId = practiceId;
    void this.refresh();
  }

  setPreset(preset: 'today' | 'last7' | 'month'): void {
    this.activePreset.set(preset);
    Object.assign(this.filters, reportingPreset(preset, this.timeZone()));
    void this.refresh();
  }

  onPeriodSelectChange(val: string): void {
    if (val === 'today' || val === 'last7' || val === 'month') {
      this.setPreset(val);
    } else {
      this.activePreset.set(null);
    }
  }

  onDateChange(): void {
    this.activePreset.set(null);
  }

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
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
    this.killAllAnimations();
    this.closeDrilldown();
    this.destroyed = true;
    this.sequence++;

    this.model.set(null);
  }

  // ========================================
  // GSAP Scroll-Triggered Animations
  // ========================================

  private scrollObserver?: IntersectionObserver;

  private prefersReducedMotion(): boolean {
    return (
      typeof window === 'undefined' ||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    );
  }

  private killAllAnimations(): void {
    try {
      const host = this.hostRef.nativeElement;
      gsap.killTweensOf(host.querySelectorAll('*'));
    } catch {
      // Ignore if unmounted
    }
  }

  private parseLocaleNumber(str: string): number | null {
    if (!str || str === '—' || str === '-' || str.includes('—')) return null;
    const normalized = str
      .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
      .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
      .replace(/٫/g, '.')
      .replace(/٬/g, '');
    const match = normalized.match(/[\d.]+/);
    if (!match) return null;
    const val = parseFloat(match[0]);
    return isNaN(val) ? null : val;
  }

  private initScrollAnimations(): void {
    if (this.prefersReducedMotion() || this.destroyed) return;

    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }

    const host = this.hostRef.nativeElement;

    if (typeof IntersectionObserver === 'undefined') {
      const kpis = host.querySelector('.primary-kpi-strip') as HTMLElement | null;
      if (kpis) this.animatePrimaryKpis(kpis);
      const chart = host.querySelector('.activity-surface') as HTMLElement | null;
      if (chart) this.animateChartSurface(chart);
      const cards = host.querySelectorAll('.analytics-card');
      for (let i = 0; i < cards.length; i++) {
        this.animateAnalyticsCard(cards[i] as HTMLElement);
      }
      return;
    }

    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            this.scrollObserver?.unobserve(target);
            this.animateSectionOnScroll(target);
          }
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -30px 0px',
        threshold: 0.08,
      },
    );

    const sections = host.querySelectorAll('.primary-kpi-strip, .activity-surface, .analytics-card');
    for (let i = 0; i < sections.length; i++) {
      this.scrollObserver.observe(sections[i]);
    }
  }

  private animateSectionOnScroll(target: HTMLElement): void {
    if (this.destroyed) return;
    if (target.classList.contains('primary-kpi-strip')) {
      this.animatePrimaryKpis(target);
    } else if (target.classList.contains('activity-surface')) {
      this.animateChartSurface(target);
    } else if (target.classList.contains('analytics-card')) {
      this.animateAnalyticsCard(target);
    }
  }

  private animatePrimaryKpis(stripEl: HTMLElement): void {
    const cards = stripEl.querySelectorAll('.primary-kpi-card');
    if (cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 16, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          stagger: 0.07,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform,opacity',
        },
      );
    }
    this.animateCountUpInContainer(stripEl);
  }

  private animateChartSurface(surfaceEl: HTMLElement): void {
    gsap.fromTo(
      surfaceEl,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform,opacity',
      },
    );
    this.animateChartBars(surfaceEl);
  }

  private animateAnalyticsCard(cardEl: HTMLElement): void {
    gsap.fromTo(
      cardEl,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform,opacity',
      },
    );
    this.animateCountUpInContainer(cardEl);
    this.animateDonutsInContainer(cardEl);
    this.animatePatternBarsInContainer(cardEl);
  }

  private animateCountUpInContainer(container: HTMLElement): void {
    if (this.prefersReducedMotion()) return;
    const numberNodes = container.querySelectorAll(
      '.kpi-card-value:not(.kpi-card-value--empty), .sub-stat-value:not(.sub-stat-value--empty), .donut-value',
    );

    for (let i = 0; i < numberNodes.length; i++) {
      const node = numberNodes[i] as HTMLElement;
      const originalText = node.textContent?.trim() || '';
      const targetVal = this.parseLocaleNumber(originalText);
      if (targetVal === null || targetVal === 0) continue;

      const isPercent = originalText.includes('%') || originalText.includes('٪');
      const hasDecimal = originalText.includes('.') || originalText.includes('٫');
      const counter = { val: 0 };

      gsap.to(counter, {
        val: targetVal,
        duration: 1.15,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: () => {
          const formatted = this.formatNumber(
            hasDecimal ? Math.round(counter.val * 10) / 10 : Math.round(counter.val),
          );
          if (isPercent) {
            node.textContent =
              originalText.startsWith('%') || originalText.startsWith('٪')
                ? `${originalText[0]}${formatted}`
                : `${formatted}%`;
          } else {
            const parts = originalText.split(/\s+/);
            if (parts.length > 1) {
              node.textContent = `${formatted} ${parts.slice(1).join(' ')}`;
            } else {
              node.textContent = formatted;
            }
          }
        },
        onComplete: () => {
          node.textContent = originalText;
        },
      });
    }
  }

  private animateChartBars(container: HTMLElement): void {
    if (this.prefersReducedMotion()) return;
    const bars = container.querySelectorAll('.series-scheduled, .series-checkins');
    if (!bars.length) return;

    for (let idx = 0; idx < bars.length; idx++) {
      const bar = bars[idx] as SVGRectElement;
      const origHeight = parseFloat(bar.getAttribute('height') || '0');
      const origY = parseFloat(bar.getAttribute('y') || '0');
      if (origHeight <= 0) continue;

      const baseY = 200;
      bar.setAttribute('height', '0');
      bar.setAttribute('y', baseY.toString());

      const anim = { h: 0, y: baseY };
      gsap.to(anim, {
        h: origHeight,
        y: origY,
        duration: 0.8,
        delay: 0.1 + (idx % 15) * 0.02,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: () => {
          bar.setAttribute('height', anim.h.toFixed(1));
          bar.setAttribute('y', anim.y.toFixed(1));
        },
        onComplete: () => {
          bar.setAttribute('height', origHeight.toString());
          bar.setAttribute('y', origY.toString());
        },
      });
    }
  }

  private animateDonutsInContainer(container: HTMLElement): void {
    if (this.prefersReducedMotion()) return;
    const donuts = container.querySelectorAll('.donut-chart-container');
    if (donuts.length) {
      gsap.fromTo(
        donuts,
        { scale: 0.65, opacity: 0, rotate: -45 },
        {
          scale: 1,
          opacity: 1,
          rotate: 0,
          duration: 0.85,
          ease: 'back.out(1.4)',
          delay: 0.12,
          overwrite: 'auto',
          clearProps: 'transform,opacity',
        },
      );
    }
  }

  private animatePatternBarsInContainer(container: HTMLElement): void {
    if (this.prefersReducedMotion()) return;
    const fills = container.querySelectorAll('.pattern-bar-fill');
    for (let idx = 0; idx < fills.length; idx++) {
      const fill = fills[idx] as HTMLElement;
      const targetWidth = fill.style.width;
      if (!targetWidth) continue;
      gsap.fromTo(
        fill,
        { width: '0%' },
        {
          width: targetWidth,
          duration: 0.75,
          delay: 0.12 + idx * 0.035,
          ease: 'power2.out',
          overwrite: 'auto',
        },
      );
    }
  }

  // ========================================
  // Initialization
  // ========================================

  private async initialize(): Promise<void> {
    const seq = ++this.sequence;

    this.loading.set(true);
    this.failed.set(false);
    this.subscriptionRequired.set(false);

    try {
      const result = await firstValueFrom(this.api.call('P18-025', {}));

      if (!this.isCurrentRequest(seq)) {
        return;
      }

      this.options.set(result);

      await this.loadReport(seq);
    } catch (error) {
      this.handleError(seq, error);
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
    if (!this.canView() || !this.validDateRange() || this.destroyed) {
      return;
    }

    if (!this.options()) {
      await this.initialize();
      return;
    }

    const seq = ++this.sequence;

    this.loading.set(true);
    this.failed.set(false);
    this.subscriptionRequired.set(false);

    try {
      await this.loadReport(seq);
    } catch (error) {
      this.handleError(seq, error);
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
    this.selectedDay.set('');
    this.metricSearch.set('');
    this.selectedGroup.set('queue');
    const requestedFilters = { ...this.filters };

    const result = await firstValueFrom(
      this.api.call('P18-026', {
        query: {
          ...requestedFilters,
          reportTimeZoneId: this.timeZone(),
        },
      }),
    );

    if (!this.isCurrentRequest(seq)) {
      return;
    }

    this.model.set(result);
    this.failed.set(false);
    this.subscriptionRequired.set(false);
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

  private handleError(seq: number, error?: unknown): void {
    if (!this.isCurrentRequest(seq)) {
      return;
    }

    this.model.set(null);
    if (this.isSubscriptionAccessDenied(error)) {
      this.subscriptionRequired.set(true);
      this.failed.set(false);
      return;
    }
    this.subscriptionRequired.set(false);
    this.failed.set(true);
  }

  private isSubscriptionAccessDenied(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return true;
    }
    const parsed = parseApiErrors(error);
    if (parsed.status === 403 || parsed.codes.includes('Report.AccessDenied')) {
      return true;
    }
    if (error && typeof error === 'object') {
      const record = error as Record<string, unknown>;
      if (record['status'] === 403) {
        return true;
      }
      const errors = record['errors'];
      if (Array.isArray(errors)) {
        return errors.some(
          (item) =>
            Boolean(item) &&
            typeof item === 'object' &&
            (item as Record<string, unknown>)['code'] === 'Report.AccessDenied',
        );
      }
    }
    return false;
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

  format(metric: ReportMetric | undefined): string {
    const value = measuredValue(metric);
    return value === null
      ? this.language.t('doctorRemediation.unavailable')
      : this.formatNumber(value);
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
      timeZone: this.timeZone(),
    }).format(new Date(value));
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(value);
  }
}
