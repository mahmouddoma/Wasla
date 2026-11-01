import {
  activityTrend,
  bookingPatterns,
  measuredValue,
  reportingPreset,
  selectMetrics,
  OVERVIEW_KPIS,
} from './overview-presentation';
import { overviewFixture } from './overview-test-fixture';

describe('Overview presentation', () => {
  it('selects semantic KPIs independently of response order', () => {
    expect(
      selectMetrics(overviewFixture.metrics ?? [], OVERVIEW_KPIS).map(
        (metric) => metric.metricCode,
      ),
    ).toEqual(OVERVIEW_KPIS);
    expect(selectMetrics(overviewFixture.metrics ?? [], OVERVIEW_KPIS)[2].value).toBe(57.89);
  });
  it('preserves measured zero and partial values but never converts missing data to zero', () => {
    expect(measuredValue({ value: 0 })).toBe(0);
    expect(measuredValue({ value: 12, dataStatus: 'Partial' })).toBe(12);
    for (const dataStatus of ['NotMeasured', 'NotAvailable', 'NotInstrumented'] as const)
      expect(measuredValue({ value: 0, dataStatus })).toBeNull();
    expect(measuredValue(undefined)).toBeNull();
    expect(measuredValue({ value: null })).toBeNull();
    expect(measuredValue({ value: NaN })).toBeNull();
  });
  it('compares daily counts with null gaps and zero retained', () => {
    const points = activityTrend(overviewFixture);
    expect(points).toHaveLength(30);
    expect(measuredValue(points[0].checkIns)).toBe(0);
    expect(measuredValue(points[2].checkIns)).toBeNull();
    expect(points[2].scheduled?.value).toBe(2);
    expect(points.every((point) => point.maximum === 7)).toBe(true);
    expect(points[7].scheduledHeight).toBe(180);
  });
  it('strictly parses and sorts creation categories without inventing omitted zeros', () => {
    expect(bookingPatterns(overviewFixture, 'weekday').map((point) => point.order)).toEqual([
      0, 2, 3, 5,
    ]);
    expect(
      bookingPatterns(overviewFixture, 'hour').find((point) => point.label === '16:00')?.metric
        ?.value,
    ).toBe(54);
    expect(
      bookingPatterns(
        {
          breakdowns: [
            { key: 'BookingHour:24' },
            { key: 'BookingHour:16junk' },
            { key: 'SegmentPriority:0' },
          ],
        },
        'hour',
      ),
    ).toEqual([]);
  });
  it('computes calendar presets in the reporting zone across midnight, month and DST boundaries', () => {
    expect(reportingPreset('today', 'Africa/Cairo', new Date('2026-10-31T23:30:00Z'))).toEqual({
      fromDate: '2026-11-01',
      toDate: '2026-11-01',
    });
    expect(reportingPreset('last7', 'Africa/Cairo', new Date('2026-10-31T23:30:00Z'))).toEqual({
      fromDate: '2026-10-26',
      toDate: '2026-11-01',
    });
    expect(reportingPreset('month', 'America/New_York', new Date('2026-11-01T00:30:00Z'))).toEqual({
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
    });
  });
});
