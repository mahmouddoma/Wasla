import type { components } from '../../../domains/phase18';

export type Metric = components['schemas']['ReportMetric'];
export type ReportModel = components['schemas']['ReportModel'];
export type SeriesPoint = components['schemas']['ReportSeriesPoint'];
export type BreakdownPoint = components['schemas']['ReportSeriesPoint'];

export interface TrendPoint {
  key: string;
  metricA?: Metric;
  metricB?: Metric;
  metricC?: Metric;
  valA: number | null;
  valB: number | null;
  valC: number | null;
  heightA: number;
  heightB: number;
  heightC: number;
}

export interface PracticeComparisonRow {
  metricCode: string;
  metricLabelKey: string;
  unit?: string | null;
  practices: {
    practiceId: string;
    practiceName: string;
    value: number | null;
    formatted: string;
    numerator?: number | null;
    denominator?: number | null;
  }[];
}

export function measuredValue(metric: Metric | undefined | null): number | null {
  if (
    !metric ||
    metric.value == null ||
    !Number.isFinite(metric.value) ||
    ['NotMeasured', 'NotAvailable', 'NotInstrumented'].includes(metric.dataStatus ?? '')
  ) {
    return null;
  }
  return metric.value;
}

export function findMetric(model: ReportModel | null | undefined, code: string): Metric | undefined {
  return model?.metrics?.find((m: Metric) => m.metricCode === code);
}

export function selectKpis(
  model: ReportModel | null | undefined,
  kpiCodes: readonly string[],
): Metric[] {
  if (!model?.metrics) return [];
  return kpiCodes
    .map((code: string) => model.metrics?.find((m: Metric) => m.metricCode === code))
    .filter((m): m is Metric => m !== undefined);
}

export function getSeriesPoints(
  model: ReportModel | null | undefined,
  codeA: string,
  codeB?: string,
  codeC?: string,
): { points: TrendPoint[]; maximum: number } {
  const points: TrendPoint[] = (model?.series ?? [])
    .filter((p: SeriesPoint) => /^\d{4}-\d{2}-\d{2}$/.test(p.key ?? ''))
    .map((p: SeriesPoint) => {
      const mA = p.metrics?.find((m: Metric) => m.metricCode === codeA);
      const mB = codeB ? p.metrics?.find((m: Metric) => m.metricCode === codeB) : undefined;
      const mC = codeC ? p.metrics?.find((m: Metric) => m.metricCode === codeC) : undefined;
      const valA = measuredValue(mA);
      const valB = measuredValue(mB);
      const valC = measuredValue(mC);
      return {
        key: p.key!,
        metricA: mA,
        metricB: mB,
        metricC: mC,
        valA,
        valB,
        valC,
        heightA: 0,
        heightB: 0,
        heightC: 0,
      };
    })
    .sort((a: TrendPoint, b: TrendPoint) => a.key.localeCompare(b.key));

  const allVals = points.flatMap((p: TrendPoint) => [
    p.valA !== null ? Math.max(0, p.valA) : 0,
    p.valB !== null ? Math.max(0, p.valB) : 0,
    p.valC !== null ? Math.max(0, p.valC) : 0,
  ]);
  const maximum = Math.max(1, ...allVals);

  const formattedPoints = points.map((p: TrendPoint) => ({
    ...p,
    heightA: p.valA !== null ? (Math.max(0, p.valA) / maximum) * 160 : 0,
    heightB: p.valB !== null ? (Math.max(0, p.valB) / maximum) * 160 : 0,
    heightC: p.valC !== null ? (Math.max(0, p.valC) / maximum) * 160 : 0,
  }));

  return { points: formattedPoints, maximum };
}

export function getCohortFunnel(model: ReportModel | null | undefined): {
  metrics: Metric[];
  maximum: number;
} {
  const funnelBreakdown = model?.breakdowns?.find(
    (p: BreakdownPoint) => p.key === 'BookingCreationCohortFunnel',
  );
  if (!funnelBreakdown?.metrics) return { metrics: [], maximum: 1 };

  const codes = ['BookingsCreated', 'CheckIns', 'TicketsCompleted'];
  const metrics = codes
    .map((code: string) => funnelBreakdown.metrics?.find((m: Metric) => m.metricCode === code))
    .filter((m): m is Metric => m !== undefined);

  const maximum = Math.max(1, ...metrics.map((m: Metric) => measuredValue(m) ?? 0));
  return { metrics, maximum };
}

export function getPatternPoints(
  model: ReportModel | null | undefined,
  kind: 'weekday' | 'hour',
): { key: string; label: string; count: number; width: number }[] {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pattern =
    kind === 'hour'
      ? /^BookingHour:([01]?\d|2[0-3])$/
      : /^BookingWeekday:(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/;

  const raw = (model?.breakdowns ?? []).flatMap((point: BreakdownPoint) => {
    const match = point.key?.match(pattern);
    if (!match) return [];
    const metric = point.metrics?.find((m: Metric) => m.metricCode === 'BookingsCreated');
    const count = measuredValue(metric) ?? 0;
    return [
      {
        key: point.key!,
        label:
          kind === 'hour'
            ? `${match[1].padStart(2, '0')}:00`
            : `doctorOverview.weekday.${match[1]}`,
        order: kind === 'hour' ? Number(match[1]) : weekdays.indexOf(match[1]),
        count,
        width: 0,
      },
    ];
  });

  raw.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
  const max = Math.max(1, ...raw.map((r: { count: number }) => r.count));
  return raw.map((r: { key: string; label: string; order: number; count: number; width: number }) => ({
    ...r,
    width: (r.count / max) * 100,
  }));
}

export function getPracticeComparisonMatrix(model: ReportModel | null | undefined): {
  practices: { id: string; nameAr: string; nameEn: string }[];
  rows: PracticeComparisonRow[];
} {
  const practiceBreakdowns: BreakdownPoint[] = (model?.breakdowns ?? []).filter(
    (p: BreakdownPoint) =>
      p.key?.startsWith('Practice:') ||
      (!p.key?.startsWith('BookingWeekday:') &&
        !p.key?.startsWith('BookingHour:') &&
        !p.key?.startsWith('SegmentPriority:') &&
        p.key !== 'BookingCreationCohortFunnel'),
  );

  const practices = practiceBreakdowns.map((p: BreakdownPoint) => ({
    id: p.key ?? '',
    nameAr: p.nameAr || p.key || '',
    nameEn: p.nameEn || p.key || '',
  }));

  const allMetricCodes = Array.from(
    new Set(
      practiceBreakdowns.flatMap(
        (p: BreakdownPoint) =>
          p.metrics?.map((m: Metric) => m.metricCode).filter((c: string | null | undefined): c is string => !!c) ?? [],
      ),
    ),
  );

  const rows: PracticeComparisonRow[] = allMetricCodes.map((code: string) => {
    const sampleMetric = practiceBreakdowns
      .flatMap((p: BreakdownPoint) => p.metrics ?? [])
      .find((m: Metric) => m.metricCode === code);

    return {
      metricCode: code,
      metricLabelKey: 'doctorOverview.metric.' + code,
      unit: sampleMetric?.unit,
      practices: practiceBreakdowns.map((p: BreakdownPoint) => {
        const m = p.metrics?.find((item: Metric) => item.metricCode === code);
        const val = measuredValue(m);
        return {
          practiceId: p.key ?? '',
          practiceName: p.nameAr || p.key || '',
          value: val,
          formatted: val !== null ? val.toLocaleString('ar-EG') : '—',
          numerator: m?.numerator,
          denominator: m?.denominator,
        };
      }),
    };
  });

  return { practices, rows };
}

export function getFinancialObligations(model: ReportModel | null | undefined): Metric[] {
  const codes = ['OutstandingDueInPeriod', 'AllOutstandingAsOf', 'OverdueAsOf'];
  return selectKpis(model, codes);
}

export function metricDrilldown(
  metric: Metric | undefined,
  reportCode: string,
): { reportCode: string; query: Record<string, string> } | null {
  const action = metric?.availableActions?.find(
    (item: NonNullable<Metric['availableActions']>[number]) =>
      item.code === 'Drilldown' && item.allowed === true,
  );
  if (!action?.route || !metric?.metricCode) return null;
  const match = action.route.match(
    /^\/api\/v1\/doctors\/me\/reports\/([A-Za-z0-9_-]+)\/drilldown\?([^#]+)$/,
  );
  if (!match || match[1] !== reportCode) return null;
  const params = new URLSearchParams(match[2]);
  if (params.get('metricCode') !== metric.metricCode) return null;

  const allowed = [
    'metricCode',
    'fromDate',
    'toDate',
    'practiceId',
    'asOfUtc',
    'reportTimeZoneId',
    'grouping',
  ];
  const query: Record<string, string> = {};
  for (const key of allowed) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  return { reportCode: match[1], query };
}
