import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import type { components } from '../../../../domains/phase18';

type Report = components['schemas']['ReportModel'];
type Metric = components['schemas']['ReportMetric'];
type DataGroup = NonNullable<Report['breakdowns']>[number];

@Component({
  selector: 'app-report-data-sections',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './report-data-sections.component.html',
  styleUrl: './report-data-sections.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.dir]': 'language.dir()' },
})
export class ReportDataSectionsComponent {
  readonly report = input.required<Report>();
  readonly expanded = signal(false);
  readonly selectedBreakdownIndex = signal(0);
  readonly showAllMetrics = signal(false);
  readonly searchQuery = signal('');

  readonly language = inject(LanguageService);

  readonly breakdowns = computed(() => this.report().breakdowns ?? []);
  readonly series = computed(() => this.report().series ?? []);

  readonly groups = computed(() => [
    { title: 'reportData.series', rows: this.series() },
    { title: 'reportData.breakdowns', rows: this.breakdowns() },
  ]);

  readonly activeBreakdown = computed<DataGroup | null>(() => {
    const list = this.breakdowns();
    if (!list.length) return null;
    const index = Math.min(Math.max(0, this.selectedBreakdownIndex()), list.length - 1);
    return list[index] ?? null;
  });

  toggle(event: Event): void {
    this.expanded.set((event.target as HTMLDetailsElement).open);
  }

  filteredBreakdownMetrics(metrics: Metric[] | null | undefined): Metric[] {
    if (!metrics) return [];
    const query = this.searchQuery().trim().toLowerCase();
    const showAll = this.showAllMetrics();

    return metrics.filter((m) => {
      if (!showAll && m.value == null) {
        return false;
      }
      if (!query) return true;
      const name = (this.label(m) || '').toLowerCase();
      const code = (m.metricCode || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }

  pointTitle(point: DataGroup): string {
    return (
      (this.language.isRtl()
        ? point.nameAr || point.nameEn
        : point.nameEn || point.nameAr) || point.key || ''
    );
  }

  formatDate(value: string | null | undefined, includeTime = true): string {
    if (!value) return this.language.t('doctorRemediation.unavailable');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.language.t('doctorRemediation.unavailable');
    return new Intl.DateTimeFormat(this.language.isRtl() ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      ...(includeTime ? { timeStyle: 'short' as const } : {}),
    }).format(date);
  }

  format(value: number | null | undefined): string {
    return value == null
      ? this.language.t('doctorRemediation.unavailable')
      : new Intl.NumberFormat(this.language.isRtl() ? 'ar-EG' : 'en-GB', {
          maximumFractionDigits: 2,
        }).format(value);
  }

  label(metric: Metric): string {
    return (
      (this.language.isRtl() ? metric.nameAr || metric.nameEn : metric.nameEn || metric.nameAr) ||
      metric.metricCode ||
      this.language.t('doctorRemediation.unavailable')
    );
  }

  metricName(code: string | null | undefined): string {
    const metric = this.report().metrics?.find((item) => item.metricCode === code);
    return metric ? this.label(metric) : code || this.language.t('doctorRemediation.unavailable');
  }

  unit(value: string | null | undefined): string {
    if (!value) return '';
    const keys: Readonly<Record<string, string>> = {
      count: 'doctorWorkspace.unit.count',
      percent: 'doctorWorkspace.unit.percent',
      minutes: 'doctorWorkspace.unit.minutes',
      hours: 'doctorWorkspace.unit.hours',
      egp: 'tickets.currency',
    };
    return this.language.t(keys[value.toLowerCase()] || value);
  }
}
