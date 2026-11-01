import type { components } from '../../../domains/phase18';

export type Metric = components['schemas']['ReportMetric'];
export type ReportModel = components['schemas']['ReportModel'];
export type SeriesPoint = components['schemas']['ReportSeriesPoint'];
export type BreakdownPoint = components['schemas']['ReportSeriesPoint'];

export interface TrendPoint {
  key: string;
  label: string;
  metricA?: Metric;
  metricB?: Metric;
  metricC?: Metric;
  valA: number | null;
  valB: number | null;
  valC: number | null;
  heightA: number;
  heightB: number;
  heightC: number;
  yA: number;
  yB: number;
  yC: number;
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
    ['NotMeasured', 'NotAvailable', 'NotInstrumented', 'Stale'].includes(metric.dataStatus ?? '')
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
  grouping?: string,
): {
  points: TrendPoint[];
  maximum: number;
  minimum: number;
  zeroY: number;
  isNonTemporal?: boolean;
} {
  const nonTemporal = ['Practice', 'Segment', 'VisitType', 'Source', 'Status'];
  if (grouping && nonTemporal.includes(grouping)) {
    return { points: [], maximum: 1, minimum: 0, zeroY: 180, isNonTemporal: true };
  }

  const rawSeries = model?.series ?? [];
  const points: {
    key: string;
    label: string;
    mA?: Metric;
    mB?: Metric;
    mC?: Metric;
    valA: number | null;
    valB: number | null;
    valC: number | null;
  }[] = [];

  for (const p of rawSeries) {
    const key = p.key ?? '';
    let isValid = false;
    let label = key;

    if (grouping === 'Month' || /^\d{4}-\d{2}$/.test(key)) {
      if (/^\d{4}-\d{2}$/.test(key)) {
        isValid = true;
        label = key;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      isValid = true;
      if (grouping === 'Week') {
        label = key;
      } else {
        // Day grouping: include month and day to avoid multi-month ambiguity
        label = key.slice(5).replace('-', '/');
      }
    }

    if (!isValid) continue;

    const mA = p.metrics?.find((m: Metric) => m.metricCode === codeA);
    const mB = codeB ? p.metrics?.find((m: Metric) => m.metricCode === codeB) : undefined;
    const mC = codeC ? p.metrics?.find((m: Metric) => m.metricCode === codeC) : undefined;

    points.push({
      key,
      label,
      mA,
      mB,
      mC,
      valA: measuredValue(mA),
      valB: measuredValue(mB),
      valC: measuredValue(mC),
    });
  }

  points.sort((a, b) => a.key.localeCompare(b.key));

  const validVals: number[] = [];
  for (const pt of points) {
    if (pt.valA !== null) validVals.push(pt.valA);
    if (pt.valB !== null) validVals.push(pt.valB);
    if (pt.valC !== null) validVals.push(pt.valC);
  }

  const maxMeasured = validVals.length ? Math.max(...validVals) : 0;
  const minMeasured = validVals.length ? Math.min(...validVals) : 0;
  const maximum = Math.max(0, maxMeasured);
  const minimum = Math.min(0, minMeasured);
  const range = Math.max(1, maximum - minimum);
  const plotHeight = 160;
  const topY = 20;
  const zeroY = topY + (maximum / range) * plotHeight;

  const formattedPoints: TrendPoint[] = points.map((p) => {
    const calc = (val: number | null) => {
      if (val === null) return { height: 0, y: zeroY };
      if (val >= 0) {
        const height = (val / range) * plotHeight;
        return { height, y: zeroY - height };
      } else {
        const height = (Math.abs(val) / range) * plotHeight;
        return { height, y: zeroY };
      }
    };

    const cA = calc(p.valA);
    const cB = calc(p.valB);
    const cC = calc(p.valC);

    return {
      key: p.key,
      label: p.label,
      metricA: p.mA,
      metricB: p.mB,
      metricC: p.mC,
      valA: p.valA,
      valB: p.valB,
      valC: p.valC,
      heightA: cA.height,
      heightB: cB.height,
      heightC: cC.height,
      yA: cA.y,
      yB: cB.y,
      yC: cC.y,
    };
  });

  return { points: formattedPoints, maximum, minimum, zeroY };
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

  const measuredVals = metrics
    .map((m: Metric) => measuredValue(m))
    .filter((v): v is number => v !== null);

  const maximum = Math.max(1, ...measuredVals);
  return { metrics, maximum };
}

export function getPatternPoints(
  model: ReportModel | null | undefined,
  kind: 'weekday' | 'hour',
): { key: string; label: string; count: number | null; width: number }[] {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pattern =
    kind === 'hour'
      ? /^BookingHour:([01]?\d|2[0-3])$/
      : /^BookingWeekday:(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/;

  const raw = (model?.breakdowns ?? []).flatMap((point: BreakdownPoint) => {
    const match = point.key?.match(pattern);
    if (!match) return [];
    const metric = point.metrics?.find((m: Metric) => m.metricCode === 'BookingsCreated');
    const count = measuredValue(metric);
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

  raw.sort((a, b) => a.order - b.order);
  const measuredCounts = raw
    .map((r) => r.count)
    .filter((c): c is number => c !== null);
  const max = Math.max(1, ...measuredCounts);
  return raw.map((r) => ({
    ...r,
    width: r.count !== null ? (r.count / max) * 100 : 0,
  }));
}

export function getPracticeComparisonMatrix(
  model: ReportModel | null | undefined,
  locale = 'ar-EG',
): {
  practices: { id: string; nameAr: string; nameEn: string }[];
  rows: PracticeComparisonRow[];
} {
  const isGuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const allowedPracticeIds = new Set(
    (model?.scope?.practiceIds ?? []).map((id: string) => id.toLowerCase()),
  );

  const practiceBreakdowns: BreakdownPoint[] = (model?.breakdowns ?? []).filter(
    (p: BreakdownPoint) => {
      if (!p.key) return false;
      const key = p.key.trim();
      if (!isGuid(key)) return false;
      if (allowedPracticeIds.size > 0 && !allowedPracticeIds.has(key.toLowerCase())) {
        return false;
      }
      return true;
    },
  );

  const practices = practiceBreakdowns.map((p: BreakdownPoint) => ({
    id: p.key ?? '',
    nameAr: p.nameAr || p.key || '',
    nameEn: p.nameEn || p.key || '',
  }));

  const allowedKpis = [
    'AppointmentsScheduled',
    'CheckIns',
    'TicketsCompleted',
    'WaitToFirstCall',
    'NetCollected',
  ];

  const presentCodes = new Set(
    practiceBreakdowns.flatMap(
      (p: BreakdownPoint) => p.metrics?.map((m: Metric) => m.metricCode) ?? [],
    ),
  );

  const activeCodes = allowedKpis.filter((c: string) => presentCodes.has(c));

  const rows: PracticeComparisonRow[] = activeCodes.map((code: string) => {
    const sampleMetric = practiceBreakdowns
      .flatMap((p: BreakdownPoint) => p.metrics ?? [])
      .find((m: Metric) => m.metricCode === code);

    const unit = sampleMetric?.unit;

    return {
      metricCode: code,
      metricLabelKey: 'doctorOverview.metric.' + code,
      unit,
      practices: practiceBreakdowns.map((p: BreakdownPoint) => {
        const m = p.metrics?.find((item: Metric) => item.metricCode === code);
        const val = measuredValue(m);
        let formatted = '—';
        if (val !== null) {
          const numStr = val.toLocaleString(locale);
          if (unit === 'percentage' || unit === 'percent') {
            formatted = `${numStr}%`;
          } else if (unit === 'minutes') {
            formatted = `${numStr} ${locale.startsWith('ar') ? 'دقيقة' : 'min'}`;
          } else if (code === 'NetCollected' || unit === 'currency' || unit === 'egp') {
            formatted = `${numStr} ${locale.startsWith('ar') ? 'ج.م' : 'EGP'}`;
          } else {
            formatted = numStr;
          }
        }
        return {
          practiceId: p.key ?? '',
          practiceName: p.nameAr || p.key || '',
          value: val,
          formatted,
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

export function getQueueDurations(model: ReportModel | null | undefined): Metric[] {
  const codes = ['WaitToFirstCall', 'WaitToServiceStart', 'ServiceDuration'];
  return selectKpis(model, codes);
}

export function getPriorityBreakdown(model: ReportModel | null | undefined): {
  priority: string;
  name: string;
  checkIns: number | null;
  waitTime: number | null;
}[] {
  return (model?.breakdowns ?? [])
    .filter((b: BreakdownPoint) => b.key?.startsWith('SegmentPriority:'))
    .map((b: BreakdownPoint) => {
      const code = b.key!.replace('SegmentPriority:', '');
      const checkInsMetric = b.metrics?.find((m: Metric) => m.metricCode === 'CheckIns');
      const waitMetric = b.metrics?.find((m: Metric) => m.metricCode === 'WaitToFirstCall');
      return {
        priority: code,
        name: b.nameAr || b.nameEn || code,
        checkIns: measuredValue(checkInsMetric),
        waitTime: measuredValue(waitMetric),
      };
    });
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
    'doctorId',
    'segmentId',
    'visitTypeId',
    'bookingSource',
    'reservationStatus',
    'ticketStatus',
    'expenseCategory',
    'receptionId',
    'planId',
    'asOfUtc',
    'reportTimeZoneId',
    'grouping',
    'sortBy',
    'sortDirection',
  ];
  const query: Record<string, string> = {};
  for (const key of allowed) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  return { reportCode: match[1], query };
}
