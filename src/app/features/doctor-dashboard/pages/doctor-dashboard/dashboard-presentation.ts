import type { components } from '../../../../domains/phase18';

type Metric = components['schemas']['ReportMetric'];

export const DASHBOARD_GROUPS = [
  {
    id: 'queue',
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
  {
    id: 'handovers',
    codes: ['OpenHandovers', 'HandoversCreated', 'HandoverAcknowledgements', 'HandoversClosed'],
  },
] as const;

export function dashboardGroups(metrics: readonly Metric[]) {
  const known = new Set<string>(DASHBOARD_GROUPS.flatMap((group) => [...group.codes]));
  return [
    ...DASHBOARD_GROUPS.map((group) => ({
      id: group.id as string,
      metrics: metrics.filter((metric) =>
        (group.codes as readonly string[]).includes(metric.metricCode ?? ''),
      ),
    })),
    { id: 'other', metrics: metrics.filter((metric) => !known.has(metric.metricCode ?? '')) },
  ].filter((group) => group.metrics.length);
}

/** API action URLs are data, never browser destinations or arbitrary HTTP targets. */
export function metricDrilldown(metric: Metric, reportCode: string) {
  const action = metric.availableActions?.find(
    (item) => item.code === 'Drilldown' && item.allowed === true,
  );
  if (!action?.route || !metric.metricCode) return null;
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
    'asOfUtc',
    'reportTimeZoneId',
    'grouping',
    'sortBy',
    'sortDirection',
    'expenseCategory',
    'receptionId',
    'planId',
    'comparePreviousPeriod',
  ];
  const query: Record<string, string> = {};
  for (const key of allowed) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  return { reportCode: match[1], query };
}
