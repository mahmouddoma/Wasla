import type { components } from '../../../../domains/phase18';

type Metric = components['schemas']['ReportMetric'];
type Report = components['schemas']['ReportModel'];

interface ActivityTrendPoint {
  key: string;
  scheduled: Metric | undefined;
  checkIns: Metric | undefined;
  maximum: number;
  scheduledHeight: number;
  checkInsHeight: number;
}

export const OVERVIEW_KPIS = [
  'AppointmentsScheduled',
  'CheckIns',
  'ReservationToTicketConversion',
  'CancellationRateScheduledCohort',
  'ReservationNoShowRate',
  'NetCollected',
] as const;
export const TIMING_CODES = [
  'WaitToFirstCall',
  'WaitToServiceStart',
  'CallToStart',
  'ServiceDuration',
];
export const QUEUE_CODES = [
  'Waiting',
  'Called',
  'InProgress',
  'TicketsCompleted',
  'TicketsCancelled',
  'TicketsNoShow',
];
export const PATIENT_CODES = [
  'NewToDoctorPatients',
  'ReturningDoctorPatients',
  'UniqueDoctorPatients',
  'PatientRetention90d',
  'FollowUpActivity',
  'ClinicalWorkflowCompleted',
];
export const FINANCE_CODES = [
  'GrossCollected',
  'Refunds',
  'NetCollected',
  'PaidOperatingExpenses',
  'NetOperatingCashResult',
  'OutstandingDueInPeriod',
  'AllOutstandingAsOf',
  'OverdueAsOf',
  'ProjectedResultForPeriod',
];

export function measuredValue(metric: Metric | undefined): number | null {
  if (
    !metric ||
    metric.value == null ||
    !Number.isFinite(metric.value) ||
    ['NotMeasured', 'NotAvailable', 'NotInstrumented'].includes(metric.dataStatus ?? '')
  )
    return null;
  return metric.value;
}

export function selectMetrics(metrics: readonly Metric[], codes: readonly string[]): Metric[] {
  return codes.flatMap((code) => metrics.filter((metric) => metric.metricCode === code));
}

export function activityTrend(report: Report | null): ActivityTrendPoint[] {
  const points = (report?.series ?? [])
    .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.key ?? ''))
    .map((point) => ({
      key: point.key!,
      scheduled: point.metrics?.find((metric) => metric.metricCode === 'AppointmentsScheduled'),
      checkIns: point.metrics?.find((metric) => metric.metricCode === 'CheckIns'),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
  const maximum = Math.max(
    1,
    ...points.flatMap((point) => [
      measuredValue(point.scheduled) ?? 0,
      measuredValue(point.checkIns) ?? 0,
    ]),
  );
  return points.map((point) => ({
    ...point,
    maximum,
    scheduledHeight: (Math.max(0, measuredValue(point.scheduled) ?? 0) / maximum) * 180,
    checkInsHeight: (Math.max(0, measuredValue(point.checkIns) ?? 0) / maximum) * 180,
  }));
}

export function bookingPatterns(report: Report | null, kind: 'weekday' | 'hour') {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pattern =
    kind === 'hour'
      ? /^BookingHour:([01]?\d|2[0-3])$/
      : /^BookingWeekday:(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/;
  const points = (report?.breakdowns ?? [])
    .flatMap((point) => {
      const match = point.key?.match(pattern);
      if (!match) return [];
      const metric = point.metrics?.find((item) => item.metricCode === 'BookingsCreated');
      return [
        {
          key: point.key!,
          label:
            kind === 'hour'
              ? `${match[1].padStart(2, '0')}:00`
              : `doctorOverview.weekday.${match[1]}`,
          order: kind === 'hour' ? Number(match[1]) : weekdays.indexOf(match[1]),
          metric,
        },
      ];
    })
    .sort((a, b) => a.order - b.order);
  const maximum = Math.max(1, ...points.map((point) => measuredValue(point.metric) ?? 0));
  return points.map((point) => ({
    ...point,
    width: (Math.max(0, measuredValue(point.metric) ?? 0) / maximum) * 100,
  }));
}

/** Calendar arithmetic uses UTC only as a date-only carrier, never the device's local zone. */
export function reportingPreset(
  preset: 'today' | 'last7' | 'month',
  timeZone: string,
  now = new Date(),
) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  const toDate = `${part('year')}-${part('month')}-${part('day')}`;
  const start = new Date(`${toDate}T12:00:00Z`);
  if (preset === 'last7') start.setUTCDate(start.getUTCDate() - 6);
  if (preset === 'month') start.setUTCDate(1);
  return { fromDate: start.toISOString().slice(0, 10), toDate };
}
