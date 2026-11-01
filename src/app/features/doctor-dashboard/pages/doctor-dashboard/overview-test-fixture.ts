import type { components } from '../../../../domains/phase18';
import { DASHBOARD_GROUPS } from './dashboard-presentation';
import { TRANSLATIONS } from '../../../../core/i18n/translations';

type Metric = components['schemas']['ReportMetric'];
const values: Readonly<Record<string, number>> = {
  AppointmentsScheduled: 155,
  CheckIns: 77,
  BookingsCreated: 144,
  ReservationToTicketConversion: 57.89,
  CancellationRateScheduledCohort: 14.19,
  ReservationNoShowRate: 16.54,
  CancellationsByEvent: 20,
  NetCollected: 33000,
  GrossCollected: 33000,
  NewToDoctorPatients: 77,
  UniqueDoctorPatients: 77,
  WaitToFirstCall: 10,
  WaitToServiceStart: 17,
  CallToStart: 7,
  ServiceDuration: 18,
  ClinicalWorkflowCompleted: 66,
};
const unmeasured = [
  'CapacityMinutes',
  'UnusedCapacityMinutes',
  'MaximumDailyPatientCapacity',
  'BookedUtilization',
  'ActualServiceUtilization',
  'SegmentQuotaUtilization',
];
const metric = (metricCode: string, value: number | null): Metric => ({
  metricCode,
  nameAr: TRANSLATIONS['doctorRemediation.sample'].ar,
  nameEn: 'Report measure',
  value,
  unit: /Rate|Conversion|Retention|Share|Utilization/.test(metricCode)
    ? 'percent'
    : /Collected|Refunds|Expenses|Result|Outstanding|Overdue|DueInPeriod/.test(metricCode)
      ? 'EGP'
      : /Wait|CallToStart|Duration|Minutes/.test(metricCode)
        ? 'minutes'
        : 'count',
  dataStatus: value === null ? 'NotMeasured' : 'Complete',
  ...(metricCode === 'ReservationToTicketConversion' ? { numerator: 77, denominator: 133 } : {}),
  ...(metricCode === 'CancellationRateScheduledCohort' ? { numerator: 22, denominator: 155 } : {}),
  ...(metricCode === 'ReservationNoShowRate' ? { numerator: 22, denominator: 133 } : {}),
  ...(metricCode === 'PatientRetention90d' ? { numerator: 0, denominator: 105 } : {}),
  ...(value === null ? { warningCode: 'Report.HistoricalCapacityNotRecorded' } : {}),
});

/** Synthetic aggregate snapshot. No patient identifiers or real records. */
export const overviewFixture: components['schemas']['ReportModel'] = {
  reportCode: 'overview',
  dataStatus: 'Partial',
  window: {
    fromDate: '2026-10-03',
    toDate: '2026-11-01',
    reportTimeZoneId: 'Africa/Cairo',
    asOfUtc: '2026-11-01T10:00:00Z',
  },
  dataFreshnessUtc: '2026-11-01T10:00:00Z',
  previousPeriodComparisons: [],
  warnings: ['Report.HistoricalCapacityNotRecorded', 'Report.HistoricalQuotaNotRecorded'],
  metrics: DASHBOARD_GROUPS.flatMap((group) => group.codes)
    .map((code) => metric(code, unmeasured.includes(code) ? null : (values[code] ?? 0)))
    .reverse(),
  series: Array.from({ length: 30 }, (_, index) => ({
    key: new Date(Date.UTC(2026, 9, 3 + index)).toISOString().slice(0, 10),
    metrics: [
      metric('AppointmentsScheduled', index % 8),
      metric('CheckIns', index === 2 ? null : index % 5),
    ],
  })),
  breakdowns: [
    {
      key: 'BookingCreationCohortFunnel',
      metrics: [
        metric('BookingsCreated', 144),
        metric('CheckIns', 63),
        metric('TicketsCompleted', 63),
      ],
    },
    ...[
      ['Sunday', 48],
      ['Tuesday', 24],
      ['Wednesday', 36],
      ['Friday', 36],
    ].map(([day, value]) => ({
      key: `BookingWeekday:${day}`,
      metrics: [metric('BookingsCreated', Number(value))],
    })),
    ...[
      [14, 30],
      [15, 30],
      [16, 54],
      [17, 30],
    ].map(([hour, value]) => ({
      key: `BookingHour:${hour}`,
      metrics: [metric('BookingsCreated', value)],
    })),
    {
      key: 'BookingCreator:Reception',
      nameEn: 'Created by reception',
      metrics: [metric('BookingsCreated', 144)],
    },
    {
      key: 'CancellationInitiator:Reception',
      nameEn: 'Cancelled by reception',
      metrics: [metric('CancellationsByEvent', 20)],
    },
    {
      key: 'CancellationReason:Other',
      nameEn: 'Other reasons',
      metrics: [metric('CancellationsByEvent', 20)],
    },
    { key: 'SegmentPriority:0', metrics: [metric('CheckIns', 70)] },
    { key: 'SegmentPriority:10', metrics: [metric('CheckIns', 7)] },
    { key: 'FutureCategory', metrics: [metric('FutureMeasure', null)] },
  ],
};
