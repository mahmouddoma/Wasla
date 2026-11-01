export type DoctorReportCode =
  | 'overview'
  | 'reservations'
  | 'queue'
  | 'patients'
  | 'practice-comparison'
  | 'operating-finance'
  | 'expenses'
  | 'salary'
  | 'recurring-expenses';

export type VisualizationKind =
  | 'count-trend'
  | 'queue-trend'
  | 'financial-flow-trend'
  | 'duration-comparison'
  | 'cohort-funnel'
  | 'booking-pattern'
  | 'patient-summary'
  | 'practice-matrix'
  | 'obligations-summary'
  | 'retention-card'
  | 'priority-breakdown';

export type ReportCategory = 'operational' | 'patients' | 'comparison' | 'finance';

export interface DoctorReportPresentation {
  readonly reportCode: DoctorReportCode;
  readonly category: ReportCategory;
  readonly purposeKey: string;
  readonly kpiCodes: readonly string[];
  readonly primary?: VisualizationKind;
  readonly supporting: readonly VisualizationKind[];
  readonly detailGroups: readonly string[];
}

export const REPORT_PRESENTATIONS: Readonly<Record<DoctorReportCode, DoctorReportPresentation>> = {
  overview: {
    reportCode: 'overview',
    category: 'operational',
    purposeKey: 'doctorReports.purpose.overview',
    kpiCodes: [
      'AppointmentsScheduled',
      'CheckIns',
      'ReservationToTicketConversion',
      'CancellationRateScheduledCohort',
      'ReservationNoShowRate',
      'NetCollected',
    ],
    primary: 'count-trend',
    supporting: ['cohort-funnel', 'booking-pattern'],
    detailGroups: ['bookings', 'queue', 'capacity', 'care', 'finance'],
  },
  reservations: {
    reportCode: 'reservations',
    category: 'operational',
    purposeKey: 'doctorReports.purpose.reservations',
    kpiCodes: [
      'BookingsCreated',
      'AppointmentsScheduled',
      'CancellationsByEvent',
      'CancellationRateScheduledCohort',
      'ReservationNoShowRate',
      'ReservationToTicketConversion',
    ],
    primary: 'count-trend',
    supporting: ['cohort-funnel', 'booking-pattern'],
    detailGroups: ['bookings', 'capacity'],
  },
  queue: {
    reportCode: 'queue',
    category: 'operational',
    purposeKey: 'doctorReports.purpose.queue',
    kpiCodes: [
      'CheckIns',
      'TicketsCompleted',
      'TicketsCancelled',
      'TicketsNoShow',
      'WaitToFirstCall',
      'WaitToServiceStart',
    ],
    primary: 'queue-trend',
    supporting: ['duration-comparison', 'priority-breakdown'],
    detailGroups: ['queue', 'capacity'],
  },
  patients: {
    reportCode: 'patients',
    category: 'patients',
    purposeKey: 'doctorReports.purpose.patients',
    kpiCodes: [
      'UniqueDoctorPatients',
      'NewToDoctorPatients',
      'ReturningDoctorPatients',
      'PatientRetention90d',
      'FollowUpActivity',
      'ClinicalWorkflowCompleted',
    ],
    primary: 'patient-summary',
    supporting: ['retention-card'],
    detailGroups: ['care'],
  },
  'practice-comparison': {
    reportCode: 'practice-comparison',
    category: 'comparison',
    purposeKey: 'doctorReports.purpose.practiceComparison',
    kpiCodes: [
      'AppointmentsScheduled',
      'CheckIns',
      'TicketsCompleted',
      'WaitToFirstCall',
      'NetCollected',
    ],
    primary: 'practice-matrix',
    supporting: [],
    detailGroups: ['bookings', 'queue', 'finance'],
  },
  'operating-finance': {
    reportCode: 'operating-finance',
    category: 'finance',
    purposeKey: 'doctorReports.purpose.operatingFinance',
    kpiCodes: [
      'GrossCollected',
      'Refunds',
      'NetCollected',
      'PaidOperatingExpenses',
      'NetOperatingCashResult',
    ],
    primary: 'financial-flow-trend',
    supporting: ['obligations-summary'],
    detailGroups: ['finance'],
  },
  expenses: {
    reportCode: 'expenses',
    category: 'finance',
    purposeKey: 'doctorReports.purpose.expenses',
    kpiCodes: [
      'PaidOperatingExpenses',
      'OutstandingDueInPeriod',
      'AllOutstandingAsOf',
      'OverdueAsOf',
    ],
    primary: 'obligations-summary',
    supporting: ['financial-flow-trend'],
    detailGroups: ['finance'],
  },
  salary: {
    reportCode: 'salary',
    category: 'finance',
    purposeKey: 'doctorReports.purpose.salary',
    kpiCodes: [
      'PaidOperatingExpenses',
      'OutstandingDueInPeriod',
      'AllOutstandingAsOf',
      'OverdueAsOf',
    ],
    primary: 'obligations-summary',
    supporting: [],
    detailGroups: ['finance'],
  },
  'recurring-expenses': {
    reportCode: 'recurring-expenses',
    category: 'finance',
    purposeKey: 'doctorReports.purpose.recurringExpenses',
    kpiCodes: [
      'PaidOperatingExpenses',
      'OutstandingDueInPeriod',
      'AllOutstandingAsOf',
      'OverdueAsOf',
    ],
    primary: 'obligations-summary',
    supporting: [],
    detailGroups: ['finance'],
  },
};

export function getReportPresentation(
  reportCode: string | null | undefined,
): DoctorReportPresentation | undefined {
  if (!reportCode) return undefined;
  return REPORT_PRESENTATIONS[reportCode as DoctorReportCode];
}

