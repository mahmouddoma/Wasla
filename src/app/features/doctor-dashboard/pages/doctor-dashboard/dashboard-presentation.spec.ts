import { dashboardGroups, metricDrilldown } from './dashboard-presentation';

describe('Dashboard presentation boundaries', () => {
  it('groups every metric exactly once and preserves future unknown metrics', () => {
    const metrics = [
      'Waiting',
      'NetCollected',
      'BookingsCreated',
      'NewToDoctorPatients',
      'FutureMetric',
    ].map((metricCode) => ({ metricCode }));
    const groups = dashboardGroups(metrics);
    expect(groups.flatMap((group) => group.metrics)).toHaveLength(metrics.length);
    expect(groups.find((group) => group.id === 'queue')?.metrics[0].metricCode).toBe('Waiting');
    expect(groups.find((group) => group.id === 'other')?.metrics[0].metricCode).toBe(
      'FutureMetric',
    );
  });
  it('accepts only an authorized metric route for the current doctor report', () => {
    const metric = (route: string, allowed = true) => ({
      metricCode: 'CheckIns',
      availableActions: [{ code: 'Drilldown', allowed, route }],
    });
    const path = '/api/v1/doctors/me/reports/overview/drilldown?metricCode=CheckIns';
    expect(metricDrilldown(metric(path), 'overview')?.query['metricCode']).toBe('CheckIns');
    for (const route of [
      'https://example.com' + path,
      '//example.com' + path,
      path.replace('/doctors/me/', '/admin/'),
      path.replace('CheckIns', 'GrossCollected'),
      path.replace('overview', 'finance'),
    ]) {
      expect(metricDrilldown(metric(route), 'overview')).toBeNull();
    }
    expect(metricDrilldown(metric(path, false), 'overview')).toBeNull();
    expect(
      metricDrilldown(metric(path + '&unexpected=ignored'), 'overview')?.query,
    ).not.toHaveProperty('unexpected');
  });
});
