import { ReportDataSectionsComponent } from '../../../reporting';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';

import { Phase18Api, Phase18Query } from '../../../../domains/phase18';
import type { components } from '../../../../domains/phase18';

import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';

type Schema = components['schemas'];

export type DoctorInsightDisplay = Schema['DoctorInsightResponse'];
export type ReportCatalogItem = Schema['ReportCatalogEntry'];

@Component({
  selector: 'app-doctor-reports',
  standalone: true,
  imports: [ReportDataSectionsComponent, FormsModule, TranslatePipe, PageHeader, SideDrawer, RouterLink],
  templateUrl: './doctor-reports.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './doctor-reports.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.dir]': 'language.dir()',
  },
})
export class DoctorReportsComponent implements OnInit, OnDestroy {
  // Dependencies
  private readonly api = inject(Phase18Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);

  // Page state
  readonly activeTab = signal<'insights' | 'reports'>('insights');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly exporting = signal(false);
  readonly submitting = signal(false);
  readonly detailLoading = signal(false);
  readonly retryBlocked = signal(false);

  readonly messages = signal<readonly string[]>([]);

  // Reports and insights
  readonly insights = signal<DoctorInsightDisplay[]>([]);
  readonly reports = signal<ReportCatalogItem[]>([]);

  // Selected details
  readonly selectedInsight = signal<DoctorInsightDisplay | null>(null);
  readonly selectedReport = signal<ReportCatalogItem | null>(null);

  readonly history = signal<Schema['DoctorInsightHistoryResponse'][]>([]);

  readonly preview = signal<Schema['ReportModel'] | null>(null);

  readonly drillMetric = signal<Schema['ReportMetric'] | null>(null);

  readonly drilldown = signal<Schema['ReportRecordReportPage'] | null>(null);

  readonly options = signal<Schema['ReportFilterOptions'] | null>(null);

  // Pagination
  readonly pageNumber = signal(1);
  readonly totalCount = signal(0);

  // Forms and filters
  dismissReason = '';

  filters = {
    practiceId: '',
    fromDate: '',
    toDate: '',
  };

  private appliedFilters: Phase18Query = {};

  // Request lifecycle
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private sequence = 0;
  private detailSequence = 0;
  private destroyed = false;

  // Lifecycle
  ngOnInit(): void {
    this.activeTab.set(this.route.snapshot.data['tab'] === 'reports' ? 'reports' : 'insights');

    void this.refresh();

    if (this.can('Dashboards.Doctor.ViewOwn')) {
      this.api.call('P18-025', {}).subscribe({
        next: (value) => {
          if (!this.destroyed) {
            this.options.set(value);
          }
        },
        error: () => {},
      });
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.retryTimer);

    this.destroyed = true;
    this.sequence++;
    this.detailSequence++;
  }

  // Helpers
  can(permission: string): boolean {
    return this.session.hasPermission(permission);
  }

  text(ar: string | null | undefined, en: string | null | undefined): string {
    return (
      (this.language.isRtl() ? ar || en : en || ar) ||
      this.language.t('doctorRemediation.unavailable')
    );
  }

  stateLabel(state: string | undefined): string {
    const key = 'doctorRemediation.state.' + state;
    const value = this.language.t(key);

    return value === key ? this.language.t('doctorRemediation.unavailable') : value;
  }

  setTab(tab: 'insights' | 'reports'): void {
    void this.router.navigate(['/doctor', tab]);
  }

  // Load reports / insights
  async refresh(page = 1): Promise<void> {
    if (this.retryBlocked()) return;

    const seq = ++this.sequence;

    this.loading.set(true);
    this.failed.set(false);
    this.messages.set([]);

    this.insights.set([]);
    this.reports.set([]);
    this.pageNumber.set(page);

    try {
      if (this.activeTab() === 'reports') {
        if (!this.can('Reports.Doctor.ViewOwn')) return;

        const result = await firstValueFrom(this.api.call('P18-076', {}));

        if (seq === this.sequence && !this.destroyed) {
          this.reports.set((result || []).filter((report) => !!report.reportCode));
        }
      } else {
        if (!this.can('Insights.Doctor.ViewOwn')) return;

        const result = await firstValueFrom(
          this.api.call('P18-047', {
            query: {
              ...this.filters,
              pageNumber: page,
              pageSize: 20,
            },
          }),
        );

        if (seq === this.sequence && !this.destroyed) {
          this.insights.set((result.items || []).filter((insight) => !!insight.insightId));

          this.totalCount.set(result.totalCount ?? 0);
        }
      }
    } catch (error) {
      if (seq === this.sequence && !this.destroyed) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (seq === this.sequence) {
        this.loading.set(false);
      }
    }
  }

  // Insight details
  async openInsight(insight: DoctorInsightDisplay): Promise<void> {
    if (!insight.insightId || !this.can('Insights.Doctor.ViewOwn')) {
      return;
    }

    const seq = ++this.detailSequence;

    this.selectedReport.set(null);
    this.selectedInsight.set(null);
    this.preview.set(null);
    this.drilldown.set(null);
    this.history.set([]);

    this.detailLoading.set(true);
    this.dismissReason = '';

    try {
      const [detail, history] = await Promise.all([
        firstValueFrom(
          this.api.call('P18-048', {
            path: {
              insightId: insight.insightId,
            },
          }),
        ),
        firstValueFrom(
          this.api.call('P18-051', {
            path: {
              insightId: insight.insightId,
            },
            query: {
              pageNumber: 1,
              pageSize: 20,
            },
          }),
        ),
      ]);

      if (seq === this.detailSequence && !this.destroyed) {
        this.selectedInsight.set(detail);
        this.history.set(history.items || []);
      }
    } catch (error) {
      if (seq === this.detailSequence) {
        this.failure(error);
      }
    } finally {
      if (seq === this.detailSequence) {
        this.detailLoading.set(false);
      }
    }
  }

  // Insight permissions and actions
  canTransition(
    insight: DoctorInsightDisplay,
    operation: 'acknowledge' | 'resolve' | 'dismiss',
  ): boolean {
    return (
      !this.submitting() &&
      this.can('Insights.Doctor.TrackOwn') &&
      !!insight.insightId &&
      !!insight.rowVersion &&
      insight.isPersisted === true &&
      (insight.availableActions || []).some(
        (action) =>
          action.allowed === true &&
          (action.code === operation.charAt(0).toUpperCase() + operation.slice(1) ||
            action.route?.endsWith('/' + operation)),
      )
    );
  }

  acknowledgeInsight(insight: DoctorInsightDisplay): Promise<void> {
    return this.transition(insight, 'acknowledge');
  }

  resolveInsight(insight: DoctorInsightDisplay): Promise<void> {
    return this.transition(insight, 'resolve');
  }

  submitDismiss(): Promise<void> | undefined {
    const insight = this.selectedInsight();

    if (insight && this.dismissReason.trim()) {
      return this.transition(insight, 'dismiss');
    }

    return undefined;
  }

  private async transition(
    insight: DoctorInsightDisplay,
    operation: 'acknowledge' | 'resolve' | 'dismiss',
  ): Promise<void> {
    if (this.retryBlocked() || !this.canTransition(insight, operation) || !insight.insightId) {
      return;
    }

    this.submitting.set(true);

    try {
      const updated = await firstValueFrom(
        this.api.call(
          operation === 'acknowledge' ? 'P18-049' : operation === 'dismiss' ? 'P18-050' : 'P18-052',
          {
            path: {
              insightId: insight.insightId,
            },
            body: {
              rowVersion: insight.rowVersion,
              reason: operation === 'dismiss' ? this.dismissReason.trim() : undefined,
            },
          },
        ),
      );

      if (this.destroyed) return;

      if (updated.insightId !== insight.insightId || !updated.state) {
        throw new Error('Invalid insight response');
      }

      this.selectedInsight.set(updated);
      this.toast.success(this.language.t('doctorRemediation.saved'));

      await this.refresh(this.pageNumber());
      await this.openInsight(updated);
    } catch (error) {
      this.failure(error);

      if (parseApiErrors(error).status === 409) {
        const reason = this.dismissReason;

        await this.openInsight(insight);
        this.dismissReason = reason;
      }
    } finally {
      this.submitting.set(false);
    }
  }

  // Report preview
  async openReport(report: ReportCatalogItem): Promise<void> {
    if (
      !report.reportCode ||
      report.canPreview !== true ||
      !this.can('Reports.Doctor.ViewOwn') ||
      report.requiredPermissions?.some((permission) => !this.can(permission))
    ) {
      return;
    }

    const seq = ++this.detailSequence;

    this.selectedInsight.set(null);
    this.selectedReport.set(report);

    this.preview.set(null);
    this.drillMetric.set(null);
    this.drilldown.set(null);

    this.detailLoading.set(true);

    this.appliedFilters = Object.fromEntries(
      Object.entries(this.filters).filter(([key]) =>
        (report.allowedFilters || []).some((filter) => filter.toLowerCase() === key.toLowerCase()),
      ),
    );

    try {
      const model = await firstValueFrom(
        this.api.call('P18-073', {
          path: {
            reportCode: report.reportCode,
          },
          query: this.appliedFilters,
        }),
      );

      if (seq === this.detailSequence && !this.destroyed) {
        this.preview.set(model);
      }
    } catch (error) {
      if (seq === this.detailSequence) {
        this.failure(error);
      }
    } finally {
      if (seq === this.detailSequence) {
        this.detailLoading.set(false);
      }
    }
  }

  // Metric drilldown
  async openDrilldown(metric: Schema['ReportMetric'], page = 1): Promise<void> {
    const report = this.selectedReport();

    if (
      !report?.reportCode ||
      report.canDrillDown !== true ||
      !metric.metricCode ||
      !this.can('Reports.Doctor.ViewOwn')
    ) {
      return;
    }

    const seq = ++this.detailSequence;

    this.drillMetric.set(metric);
    this.detailLoading.set(true);
    this.drilldown.set(null);

    try {
      const result = await firstValueFrom(
        this.api.call('P18-074', {
          path: {
            reportCode: report.reportCode,
          },
          query: {
            ...this.appliedFilters,
            metricCode: metric.metricCode,
            pageNumber: page,
            pageSize: 20,
          },
        }),
      );

      if (seq === this.detailSequence && !this.destroyed) {
        this.drilldown.set(result);
      }
    } catch (error) {
      if (seq === this.detailSequence) {
        this.failure(error);
      }
    } finally {
      if (seq === this.detailSequence) {
        this.detailLoading.set(false);
      }
    }
  }

  // PDF / Excel permissions
  canExport(report: ReportCatalogItem, format: 'pdf' | 'xlsx'): boolean {
    return (
      this.can('Reports.Doctor.ViewOwn') &&
      !report.requiredPermissions?.some((permission) => !this.can(permission)) &&
      (format === 'pdf' ? report.canExportPdf === true : report.canExportExcel === true) &&
      !!report.exportRequiredPermissions?.length &&
      report.exportRequiredPermissions.every((permission) => this.can(permission))
    );
  }

  // Download report
  async exportReport(report: ReportCatalogItem, format: 'pdf' | 'xlsx'): Promise<void> {
    if (!report.reportCode || this.exporting() || !this.canExport(report, format)) {
      return;
    }

    this.exporting.set(true);

    try {
      const blob = await firstValueFrom(
        this.api.call('P18-075', {
          path: {
            reportCode: report.reportCode,
          },
          query: {
            ...this.appliedFilters,
            format,
            language: this.language.currentLang(),
          },
        }),
      );

      const mime =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (this.destroyed || !this.canExport(report, format)) {
        return;
      }

      if (!(blob instanceof Blob) || !blob.size || !blob.type.includes(mime)) {
        throw new Error('Invalid report file');
      }

      const url = URL.createObjectURL(blob);

      try {
        const link = document.createElement('a');

        link.href = url;
        link.download = `${report.reportCode}.${format}`;

        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(url);
      }

      this.toast.success(this.language.t('doctorRemediation.downloaded'));
    } catch (error) {
      this.failure(error);
    } finally {
      this.exporting.set(false);
    }
  }

  formatMetricValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return this.language.t('doctorRemediation.unavailable');
    }

    const numeric = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numeric)) {
      return String(value);
    }

    return new Intl.NumberFormat(this.language.isRtl() ? 'ar-EG' : 'en-GB', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(numeric);
  }

  metricUnit(unit: string): string {
    const keys: Readonly<Record<string, string>> = {
      count: 'doctorWorkspace.unit.count',
      percent: 'doctorWorkspace.unit.percent',
      minutes: 'doctorWorkspace.unit.minutes',
      hours: 'doctorWorkspace.unit.hours',
      egp: 'tickets.currency',
    };
    return this.language.t(keys[unit.toLowerCase()] || unit);
  }

  // Drilldown source navigation
  sourceLink(row: Schema['ReportRecord']): {
    route: string;
    query?: Record<string, string>;
  } | null {
    if (!row.detailRoute || !row.availableActions?.some((action) => action.allowed === true)) {
      return null;
    }

    const source = row.detailRoute.match(
      /^\/api\/v1\/doctors\/me\/practices\/([^/]+)\/(reservations|encounters)\/([^/?]+)$/,
    );

    if (source) {
      const permission =
        source[2] === 'reservations'
          ? 'DoctorPracticeReservations.ViewOwn'
          : 'MedicalEncounters.ViewOwn';

      if (!this.can(permission)) return null;

      return {
        route: '/doctor/' + source[2],
        query: {
          practiceId: source[1],
          [source[2] === 'reservations' ? 'reservationId' : 'encounterId']: source[3],
        },
      };
    }

    const patient = row.detailRoute.match(/^\/api\/v1\/doctors\/me\/patients\/([^/?]+)$/);

    return patient && this.can('DoctorPatients.ViewOwn')
      ? {
          route: '/doctor/patients/' + patient[1],
        }
      : null;
  }

  // Drawer close
  closeDrawer(): void {
    if (this.submitting()) return;

    this.detailSequence++;

    this.selectedInsight.set(null);
    this.selectedReport.set(null);

    this.preview.set(null);
    this.drillMetric.set(null);
    this.drilldown.set(null);
    this.history.set([]);

    this.detailLoading.set(false);
  }

  // API error handling
  private failure(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      const header = error.headers.get('Retry-After');

      const wait =
        header && Number.isFinite(Number(header))
          ? Number(header) * 1000
          : header
            ? Math.max(0, Date.parse(header) - Date.now())
            : 30000;

      this.retryBlocked.set(true);
      clearTimeout(this.retryTimer);

      this.retryTimer = setTimeout(
        () => this.retryBlocked.set(false),
        Number.isFinite(wait) ? wait : 30000,
      );
    }

    const parsed = parseApiErrors(error);

    this.messages.set(parsed.status === 409 ? ['doctorRemediation.conflict'] : parsed.messages);

    this.toast.error(this.language.t(this.messages()[0] || 'common.requestFailed'));

    if ([401, 403].includes(parsed.status)) {
      this.sequence++;
      this.detailSequence++;

      this.loading.set(false);
      this.detailLoading.set(false);

      this.insights.set([]);
      this.reports.set([]);

      this.selectedInsight.set(null);
      this.selectedReport.set(null);

      this.preview.set(null);
      this.drillMetric.set(null);
      this.drilldown.set(null);
      this.history.set([]);
    }
  }
}
