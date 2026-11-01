import { describe, expect, it } from 'vitest';
import {
  findMetric,
  getCohortFunnel,
  getFinancialObligations,
  getPatternPoints,
  getPracticeComparisonMatrix,
  getQueueDurations,
  getPriorityBreakdown,
  getSeriesPoints,
  measuredValue,
  metricDrilldown,
  selectKpis,
  type ReportModel,
} from './doctor-report-selectors';

describe('doctor-report-selectors', () => {
  const p1Guid = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  const p2Guid = 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e';
  const unauthorizedGuid = '99999999-9999-9999-9999-999999999999';

  const sampleModel: ReportModel = {
    reportCode: 'reservations',
    scope: {
      practiceIds: [p1Guid, p2Guid],
    },
    metrics: [
      { metricCode: 'BookingsCreated', value: 144, unit: 'count' },
      { metricCode: 'AppointmentsScheduled', value: 155, unit: 'count' },
      { metricCode: 'CancellationRateScheduledCohort', value: 14.19, unit: 'percentage' },
      { metricCode: 'NotAvailableMetric', value: 0, dataStatus: 'NotAvailable' },
      { metricCode: 'StaleMetric', value: 42, dataStatus: 'Stale' },
      { metricCode: 'ZeroMetric', value: 0, dataStatus: 'Complete' },
      { metricCode: 'NullMetric', value: null },
      { metricCode: 'WaitToFirstCall', value: 10, unit: 'minutes' },
      { metricCode: 'WaitToServiceStart', value: 15, unit: 'minutes' },
      { metricCode: 'ServiceDuration', value: 18, unit: 'minutes' },
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
        key: 'SegmentPriority:Urgent',
        nameAr: 'حالة عاجلة',
        nameEn: 'Urgent',
        metrics: [
          { metricCode: 'CheckIns', value: 12 },
          { metricCode: 'WaitToFirstCall', value: 3 },
        ],
      },
      {
        key: p1Guid,
        nameAr: 'عيادة المنوفية',
        nameEn: 'Menofia Clinic',
        metrics: [
          { metricCode: 'AppointmentsScheduled', value: 100, numerator: 100, denominator: 100 },
          { metricCode: 'CheckIns', value: 50, numerator: 50, denominator: 100 },
          { metricCode: 'NetCollected', value: 5000, unit: 'currency' },
        ],
      },
      {
        key: p2Guid,
        nameAr: 'عيادة القاهرة',
        nameEn: 'Cairo Clinic',
        metrics: [
          { metricCode: 'AppointmentsScheduled', value: 55, numerator: 55, denominator: 55 },
          { metricCode: 'CheckIns', value: 27, numerator: 27, denominator: 55 },
          { metricCode: 'NetCollected', value: 3000, unit: 'currency' },
        ],
      },
      {
        key: unauthorizedGuid,
        nameAr: 'عيادة غير مصرح بها',
        nameEn: 'Unauthorized Clinic',
        metrics: [{ metricCode: 'AppointmentsScheduled', value: 999 }],
      },
      {
        key: 'Practice:fake-clinic',
        metrics: [{ metricCode: 'AppointmentsScheduled', value: 888 }],
      },
    ],
  };

  it('measuredValue respects null, NotMeasured, NotAvailable, Stale, and preserves real zero', () => {
    expect(measuredValue(sampleModel.metrics![0])).toBe(144);
    expect(measuredValue(sampleModel.metrics![3])).toBeNull();
    expect(measuredValue(sampleModel.metrics![4])).toBeNull(); // Stale -> null
    expect(measuredValue(sampleModel.metrics![5])).toBe(0); // Complete zero -> 0
    expect(measuredValue(sampleModel.metrics![6])).toBeNull();
    expect(measuredValue(undefined)).toBeNull();
  });

  it('selectKpis returns metrics matching requested codes', () => {
    const kpis = selectKpis(sampleModel, ['BookingsCreated', 'NonExistent']);
    expect(kpis).toHaveLength(1);
    expect(kpis[0].metricCode).toBe('BookingsCreated');
  });

  it('getSeriesPoints extracts Day and labels them clearly across months', () => {
    const { points, maximum } = getSeriesPoints(
      sampleModel,
      'BookingsCreated',
      'AppointmentsScheduled',
      undefined,
      'Day',
    );
    expect(points).toHaveLength(2); // ignores invalid-date
    expect(maximum).toBe(18);
    expect(points[0].key).toBe('2026-10-01');
    expect(points[0].label).toBe('10/01');
    expect(points[0].valA).toBe(10);
    expect(points[0].valB).toBe(12);
  });

  it('getSeriesPoints supports Month, non-temporal groupings and signed financial series', () => {
    // Non-temporal grouping returns isNonTemporal
    const nonTemp = getSeriesPoints(sampleModel, 'BookingsCreated', undefined, undefined, 'Practice');
    expect(nonTemp.isNonTemporal).toBe(true);
    expect(nonTemp.points).toHaveLength(0);

    // Month grouping
    const monthModel: ReportModel = {
      series: [
        {
          key: '2026-10',
          metrics: [{ metricCode: 'NetOperatingCashResult', value: -250 }],
        },
        {
          key: '2026-11',
          metrics: [{ metricCode: 'NetOperatingCashResult', value: 500 }],
        },
      ],
    };
    const monthTrend = getSeriesPoints(
      monthModel,
      'NetOperatingCashResult',
      undefined,
      undefined,
      'Month',
    );
    expect(monthTrend.points).toHaveLength(2);
    expect(monthTrend.minimum).toBe(-250);
    expect(monthTrend.maximum).toBe(500);

    // Negative bar starts at zeroY and extends downwards
    expect(monthTrend.points[0].valA).toBe(-250);
    expect(monthTrend.points[0].yA).toBe(monthTrend.zeroY);
    expect(monthTrend.points[0].heightA).toBeGreaterThan(0);

    // Positive bar extends upwards: yA is above zeroY
    expect(monthTrend.points[1].valA).toBe(500);
    expect(monthTrend.points[1].yA).toBeLessThan(monthTrend.zeroY);
  });

  it('getCohortFunnel and getQueueDurations extract exact metrics without faking data', () => {
    const { metrics, maximum } = getCohortFunnel(sampleModel);
    expect(metrics).toHaveLength(3);
    expect(maximum).toBe(144);
    expect(metrics[0].metricCode).toBe('BookingsCreated');

    const durations = getQueueDurations(sampleModel);
    expect(durations).toHaveLength(3);
    expect(durations.map((d) => d.metricCode)).toEqual([
      'WaitToFirstCall',
      'WaitToServiceStart',
      'ServiceDuration',
    ]);

    const priorities = getPriorityBreakdown(sampleModel);
    expect(priorities).toHaveLength(1);
    expect(priorities[0].priority).toBe('Urgent');
    expect(priorities[0].checkIns).toBe(12);
  });

  it('getPracticeComparisonMatrix strictly includes only authorized scope GUIDs and formats locale', () => {
    const matrix = getPracticeComparisonMatrix(sampleModel, 'en-US');
    // Must include only p1Guid and p2Guid; excludes unauthorizedGuid and Practice:fake-clinic
    expect(matrix.practices).toHaveLength(2);
    expect(matrix.practices.map((p) => p.id)).toEqual([p1Guid, p2Guid]);

    const apptsRow = matrix.rows.find((r) => r.metricCode === 'AppointmentsScheduled');
    expect(apptsRow?.practices[0].value).toBe(100);
    expect(apptsRow?.practices[0].formatted).toBe('100');

    const netColRow = matrix.rows.find((r) => r.metricCode === 'NetCollected');
    expect(netColRow?.practices[0].formatted).toContain('5,000');
  });

  it('metricDrilldown preserves backend-supplied query filters matching ReportFilter', () => {
    const validMetric = {
      metricCode: 'BookingsCreated',
      availableActions: [
        {
          code: 'Drilldown',
          allowed: true,
          route:
            '/api/v1/doctors/me/reports/reservations/drilldown?metricCode=BookingsCreated&practiceId=' +
            p1Guid +
            '&fromDate=2026-10-01&toDate=2026-10-30&segmentId=seg-1&asOfUtc=2026-10-31T10%3A00%3A00Z',
        },
      ],
    };
    const action = metricDrilldown(validMetric, 'reservations');
    expect(action).not.toBeNull();
    expect(action?.reportCode).toBe('reservations');
    expect(action?.query['metricCode']).toBe('BookingsCreated');
    expect(action?.query['practiceId']).toBe(p1Guid);
    expect(action?.query['segmentId']).toBe('seg-1');
    expect(action?.query['asOfUtc']).toBe('2026-10-31T10:00:00Z');

    // Mismatched report code must return null
    expect(metricDrilldown(validMetric, 'overview')).toBeNull();
  });
});
