import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import type { components } from '../../../../domains/phase18';

type Report = components['schemas']['ReportModel'];
type Metric = components['schemas']['ReportMetric'];

@Component({
  selector: 'app-report-data-sections',
  imports: [TranslatePipe],
  templateUrl: './report-data-sections.component.html',
  styleUrl: './report-data-sections.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.dir]': 'language.dir()' },
})
export class ReportDataSectionsComponent {
  readonly report = input.required<Report>();
  readonly expanded = signal(false);
  readonly language = inject(LanguageService);
  readonly groups = computed(() => [
    { title: 'reportData.series', rows: this.report().series ?? [] },
    { title: 'reportData.breakdowns', rows: this.report().breakdowns ?? [] },
  ]);
  toggle(event: Event): void {
    this.expanded.set((event.target as HTMLDetailsElement).open);
  }
  format(value: number | null | undefined): string {
    return value == null ? this.language.t('doctorRemediation.unavailable') :
      new Intl.NumberFormat(this.language.isRtl() ? 'ar-EG' : 'en-GB', { maximumFractionDigits: 2 }).format(value);
  }
  label(metric: Metric): string {
    return (this.language.isRtl() ? metric.nameAr || metric.nameEn : metric.nameEn || metric.nameAr) || metric.metricCode || this.language.t('doctorRemediation.unavailable');
  }
  metricName(code: string | null | undefined): string {
    const metric = this.report().metrics?.find((item) => item.metricCode === code);
    return metric ? this.label(metric) : code || this.language.t('doctorRemediation.unavailable');
  }
  unit(value: string | null | undefined): string {
    if (!value) return '';
    const keys: Readonly<Record<string, string>> = { count: 'doctorWorkspace.unit.count', percent: 'doctorWorkspace.unit.percent', minutes: 'doctorWorkspace.unit.minutes', hours: 'doctorWorkspace.unit.hours', egp: 'tickets.currency' };
    return this.language.t(keys[value.toLowerCase()] || value);
  }
}
