import { describe, expect, it } from 'vitest';
import {
  findMetric,
  getCohortFunnel,
  getFinancialObligations,
  getPatternPoints,
  getPracticeComparisonMatrix,
  getSeriesPoints,
  measuredValue,
  metricDrilldown,
  selectKpis,
  type ReportModel,
} from './doctor-report-selectors';

describe('doctor-report-selectors', () => {
  const sampleModel: ReportModel = {
    reportCode: 'reservations',
    metrics: [
      { metricCode: 'BookingsCreated', value: 144, unit: 'count' },
      { metricCode: 'AppointmentsScheduled', value: 155, unit: 'count' },
      { metricCode: 'CancellationRateScheduledCohort', value: 14.19, unit: 'percentage' },
      { metricCode: 'NotAvailableMetric', value: 0, dataStatus: 'NotAvailable' },
      { metricCode: 'NullMetric', value: null },
    ],
    series: [
      {
        key: '2026-10-01',
        metrics: [
          { metricCode: 'BookingsCreated', value: 10 },
          { metricCode: 'AppointmentsScheduled', value: 12 },
        ],
      },
      {
        key: '2026-10-02',
        metrics: [
          { metricCode: 'BookingsCreated', value: 15 },
          { metricCode: 'AppointmentsScheduled', value: 18 },
        ],
      },
      {
        key: 'invalid-date',
        metrics: [{ metricCode: 'BookingsCreated', value: 99 }],
      },
    ],
    breakdowns: [
      {
        key: 'BookingCreationCohortFunnel',
        metrics: [
          { metricCode: 'BookingsCreated', value: 144 },
          { metricCode: 'CheckIns', value: 63 },
          { metricCode: 'TicketsCompleted', value: 63 },
        ],
      },
      {
        key: 'BookingWeekday:Sunday',
        metrics: [{ metricCode: 'BookingsCreated', value: 48 }],
      },
      {
        key: 'BookingWeekday:Monday',
        metrics: [{ metricCode: 'BookingsCreated', value: 24 }],
      },
      {
        key: 'Practice:clinic-1',
        nameAr: 'عيادة المنوفية',
        nameEn: 'Menofia Clinic',
        metrics: [
          { metricCode: 'AppointmentsScheduled', value: 100, numerator: 100, denominator: 100 },
          { metricCode: 'CheckIns', value: 50, numerator: 50, denominator: 100 },
        ],
      },
      {
        key: 'Practice:clinic-2',
        nameAr: 'عيادة القاهرة',
        nameEn: 'Cairo Clinic',
        metrics: [
          { metricCode: 'AppointmentsScheduled', value: 55, numerator: 55, denominator: 55 },
          { metricCode: 'CheckIns', value: 27, numerator: 27, denominator: 55 },
        ],
      },
    ],
  };

  it('measuredValue respects null, NotMeasured, and NotAvailable', () => {
    expect(measuredValue(sampleModel.metrics![0])).toBe(144);
    expect(measuredValue(sampleModel.metrics![3])).toBeNull();
    expect(measuredValue(sampleModel.metrics![4])).toBeNull();
    expect(measuredValue(undefined)).toBeNull();
  });

  it('selectKpis returns metrics matching requested codes', () => {
    const kpis = selectKpis(sampleModel, ['BookingsCreated', 'NonExistent']);
    expect(kpis).toHaveLength(1);
    expect(kpis[0].metricCode).toBe('BookingsCreated');
  });

  it('getSeriesPoints extracts and scales valid date points', () => {
    const { points, maximum } = getSeriesPoints(
      sampleModel,
      'BookingsCreated',
      'AppointmentsScheduled',
    );
    expect(points).toHaveLength(2); // ignores invalid-date
    expect(maximum).toBe(18);
    expect(points[0].key).toBe('2026-10-01');
    expect(points[0].valA).toBe(10);
    expect(points[0].valB).toBe(12);
  });

  it('getCohortFunnel extracts exact funnel metrics without faking data', () => {
    const { metrics, maximum } = getCohortFunnel(sampleModel);
    expect(metrics).toHaveLength(3);
    expect(maximum).toBe(144);
    expect(metrics[0].metricCode).toBe('BookingsCreated');
    expect(metrics[1].metricCode).toBe('CheckIns');
    expect(metrics[2].metricCode).toBe('TicketsCompleted');
  });

  it('getPatternPoints extracts weekday booking distribution', () => {
    const patterns = getPatternPoints(sampleModel, 'weekday');
    expect(patterns).toHaveLength(2);
    expect(patterns[0].count).toBe(48); // Sunday
    expect(patterns[1].count).toBe(24); // Monday
  });

  it('getPracticeComparisonMatrix builds comparison matrix across practices', () => {
    const matrix = getPracticeComparisonMatrix(sampleModel);
    expect(matrix.practices).toHaveLength(2);
    expect(matrix.rows.length).toBeGreaterThanOrEqual(2);
    const apptsRow = matrix.rows.find((r) => r.metricCode === 'AppointmentsScheduled');
    expect(apptsRow?.practices[0].value).toBe(100);
    expect(apptsRow?.practices[1].value).toBe(55);
  });

  it('metricDrilldown validates API route and enforces same reportCode & metricCode', () => {
    const validMetric = {
      metricCode: 'BookingsCreated',
      availableActions: [
        {
          code: 'Drilldown',
          allowed: true,
          route:
            '/api/v1/doctors/me/reports/reservations/drilldown?metricCode=BookingsCreated&practiceId=clinic-1&fromDate=2026-10-01&toDate=2026-10-30',
        },
      ],
    };
    const action = metricDrilldown(validMetric, 'reservations');
    expect(action).not.toBeNull();
    expect(action?.reportCode).toBe('reservations');
    expect(action?.query['metricCode']).toBe('BookingsCreated');
    expect(action?.query['practiceId']).toBe('clinic-1');

    // Mismatched report code must return null
    expect(metricDrilldown(validMetric, 'overview')).toBeNull();
  });
});
