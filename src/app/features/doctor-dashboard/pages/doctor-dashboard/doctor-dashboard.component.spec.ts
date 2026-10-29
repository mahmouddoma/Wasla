import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { DoctorDashboardComponent } from './doctor-dashboard.component';
import { Phase18Api } from '../../../../domains/phase18';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PortalNavigation } from '../../../../layout/navigation/portal-navigation';

describe('Doctor dashboard', () => {
  const api = { call: vi.fn() };
  let allowed: boolean;
  beforeEach(() => {
    vi.resetAllMocks();
    allowed = true;
    api.call.mockImplementation((code: string) =>
      of(
        code === 'P18-025'
          ? { practices: [] }
          : { metrics: [{ metricCode: 'attendance', value: null }] },
      ),
    );
    TestBed.configureTestingModule({
      imports: [DoctorDashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: Phase18Api, useValue: api },
        { provide: AuthSession, useValue: { hasPermission: () => allowed } },
        { provide: PortalNavigation, useValue: { items: signal([]) } },
      ],
    });
  });
  it('loads real options and overview and preserves unavailable metrics', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    expect(api.call).toHaveBeenCalledWith('P18-025', {});
    expect(api.call).toHaveBeenCalledWith('P18-026', expect.anything());
    expect(fixture.componentInstance.model()?.metrics?.[0].value).toBeNull();
  });
  it('does not request protected aggregates without permission', async () => {
    allowed = false;
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    expect(api.call).not.toHaveBeenCalled();
  });

  it('shows a compact summary and a complete categorized directory without hiding metrics in a long accordion', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const metrics = Array.from({ length: 7 }, (_, index) => ({
      metricCode: `metric-${index}`,
      nameAr: `مؤشر ${index}`,
      nameEn: `Metric ${index}`,
      value: index,
      unit: 'count',
    }));
    fixture.componentInstance.model.set({ metrics });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.metric-strip .metric-item')).toHaveLength(4);
    expect(element.querySelectorAll('.metric-directory .metric-row')).toHaveLength(7);
    expect(element.querySelector('.metrics-details')).toBeNull();
    expect(element.querySelectorAll('.metric-card')).toHaveLength(0);
  });

  it('opens an allowed API action inside the drawer with its exact reporting snapshot and pagination', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const metric = {
      metricCode: 'CheckIns',
      value: 12,
      availableActions: [
        {
          code: 'Drilldown',
          allowed: true,
          route:
            '/api/v1/doctors/me/reports/overview/drilldown?metricCode=CheckIns&practiceId=clinic-a&fromDate=2026-10-01&toDate=2026-10-29&asOfUtc=2026-10-29T10%3A00%3A00Z&reportTimeZoneId=Africa%2FCairo',
        },
      ],
    };
    component.model.set({ reportCode: 'overview', metrics: [metric] });
    api.call.mockReturnValue(
      of({ items: [{ reference: 'Visit 42', metricValue: 1 }], totalCount: 30, pageNumber: 2 }),
    );
    await component.openDrilldown(metric, 2);
    await fixture.whenStable();
    expect(api.call).toHaveBeenLastCalledWith('P18-074', {
      path: { reportCode: 'overview' },
      query: {
        metricCode: 'CheckIns',
        practiceId: 'clinic-a',
        fromDate: '2026-10-01',
        toDate: '2026-10-29',
        asOfUtc: '2026-10-29T10:00:00Z',
        reportTimeZoneId: 'Africa/Cairo',
        pageNumber: 2,
        pageSize: 20,
      },
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.drill-record')?.textContent,
    ).toContain('Visit 42');
    component.closeDrilldown();
    expect(component.drillMetric()).toBeNull();
  });

  it('prevents denied metric actions and ignores detail responses after the drawer closes', async () => {
    const component = TestBed.createComponent(DoctorDashboardComponent).componentInstance;
    const metric = {
      metricCode: 'CheckIns',
      availableActions: [
        {
          code: 'Drilldown',
          allowed: false,
          route: '/api/v1/doctors/me/reports/overview/drilldown?metricCode=CheckIns',
        },
      ],
    };
    component.model.set({ reportCode: 'overview' });
    api.call.mockClear();
    await component.openDrilldown(metric);
    expect(api.call).not.toHaveBeenCalled();
    metric.availableActions[0].allowed = true;
    const response = new Subject<object>();
    api.call.mockReturnValue(response);
    const request = component.openDrilldown(metric);
    component.closeDrilldown();
    response.next({ items: [{ reference: 'Late result' }] });
    response.complete();
    await request;
    expect(component.drillRows()).toBeNull();
    expect(component.drillMetric()).toBeNull();
  });

  it('aligns record references, full dates and values in labeled columns without an empty actions column', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.drillMetric.set({ metricCode: 'CheckIns', value: 2 });
    component.drillRows.set({
      items: [
        { reference: '3', businessDate: '2026-10-27', metricValue: 1 },
        { reference: '4', businessDate: '2026-10-26', metricValue: 1 },
      ],
      totalCount: 2,
    });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.records-table thead th')).toHaveLength(3);
    expect(element.querySelectorAll('.drill-record')).toHaveLength(2);
    expect(element.querySelectorAll('.record-action-cell')).toHaveLength(0);
    expect(element.querySelector('.record-date')?.textContent).toBe(
      component.formatRecordDate('2026-10-27'),
    );
    expect(element.querySelector('.record-reference')?.getAttribute('scope')).toBe('row');
    expect(element.querySelector('.record-value')?.getAttribute('dir')).toBe('ltr');
  });

  it('renders drilldown errors with retry and switches chart series using the reported daily values', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.model.set({
      series: [
        {
          key: '2026-10-01',
          metrics: [
            { metricCode: 'CheckIns', value: 7 },
            { metricCode: 'AppointmentsScheduled', value: 12 },
          ],
        },
      ],
    });
    expect(component.chartPoints()[0].value).toBe(7);
    component.chartCode.set('AppointmentsScheduled');
    expect(component.chartPoints()[0].value).toBe(12);
    const metric = {
      metricCode: 'CheckIns',
      availableActions: [
        {
          code: 'Drilldown',
          allowed: true,
          route: '/api/v1/doctors/me/reports/overview/drilldown?metricCode=CheckIns',
        },
      ],
    };
    component.model.set({ reportCode: 'overview' });
    api.call.mockImplementation(() => {
      throw new Error('Unavailable');
    });
    await component.openDrilldown(metric);
    await fixture.whenStable();
    expect(component.detailFailed()).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"] button'),
    ).toBeTruthy();
  });

  it('formats unavailable dates and translates known measurement units', () => {
    const component = TestBed.createComponent(DoctorDashboardComponent).componentInstance;
    expect(component.formatUpdated('invalid')).toBe(
      component.language.t('doctorRemediation.unavailable'),
    );
    expect(component.metricUnit('minutes')).toBe(
      component.language.t('doctorWorkspace.unit.minutes'),
    );
    expect(component.formatUpdated('2026-10-29T12:30:00Z')).not.toContain('T12:30');
  });

  it('prioritizes the waiting queue and consultations ahead of other permitted shortcuts', async () => {
    TestBed.overrideProvider(PortalNavigation, {
      useValue: {
        items: signal([
          { id: 'reservations', route: '/doctor/reservations', labelKey: 'sidebar.reservations' },
          { id: 'doctor-patients', route: '/doctor/patients', labelKey: 'doctorPatients.title' },
          { id: 'encounters', route: '/doctor/encounters', labelKey: 'encounters.title' },
          { id: 'queue', route: '/doctor/queue', labelKey: 'sidebar.queue' },
        ]),
      },
    });
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(
      [...element.querySelectorAll('.quick-action--primary')].map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual(['/doctor/queue', '/doctor/encounters']);
    expect(
      element
        .querySelector('.quick-actions')!
        .compareDocumentPosition(element.querySelector('.filters-form')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it('ignores the old scope when filter responses arrive out of order', async () => {
    const component = TestBed.createComponent(DoctorDashboardComponent).componentInstance;
    const old = new Subject<object>();
    api.call.mockReturnValueOnce(old).mockReturnValueOnce(of({ reportCode: 'latest' }));
    const first = component.refresh();
    await component.refresh();
    old.next({ reportCode: 'old' });
    old.complete();
    await first;
    expect(component.model()?.reportCode).toBe('latest');
  });
});
