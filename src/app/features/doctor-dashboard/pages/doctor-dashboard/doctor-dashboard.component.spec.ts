import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { DoctorDashboardComponent } from './doctor-dashboard.component';
import { Phase18Api } from '../../../../domains/phase18';
import { AuthSession } from '../../../../core/auth/auth-session';
import { overviewFixture } from './overview-test-fixture';
import { OVERVIEW_KPIS } from './overview-presentation';
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

  it('renders semantic KPIs and keeps all official metrics under secondary disclosure', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.model.set(overviewFixture);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.metric-strip .metric-item')).toHaveLength(6);
    expect(component.highlights().map((metric) => metric.metricCode)).toEqual(OVERVIEW_KPIS);
    expect(
      element.querySelector('[data-metric="ReservationToTicketConversion"]')?.textContent,
    ).toContain(component.formatNumber(57.89));
    expect(element.querySelector('.metrics-details')).toBeTruthy();
    expect(element.querySelector('app-report-data-sections')).toBeNull();
    expect(element.querySelectorAll('.daily-table tbody tr')).toHaveLength(30);
    expect(component.cohort().map((metric) => metric.value)).toEqual([144, 63, 63]);
    expect(component.hourPatterns().find((point) => point.label === '16:00')?.metric?.value).toBe(
      54,
    );
    expect(element.querySelector('.metric-ratio-badge')).toBeNull();
    for (const lang of ['ar', 'en'] as const) {
      component.language.setLanguage(lang);
      await fixture.whenStable();
      const operations = element.querySelector('.overview-detail[open] .summary-list');
      expect(operations?.textContent).toContain(
        component.language.t('doctorOverview.metric.WaitToServiceStart'),
      );
      expect(operations?.textContent).toContain(component.formatNumber(17));
    }
    component.selectedGroup.set('other');
    component.model.set({
      metrics: [{ metricCode: 'future', nameEn: 'Future measure', value: 0 }],
    });
    await fixture.whenStable();
    expect(element.querySelectorAll('.metric-directory .metric-row')).toHaveLength(1);
  });

  it('gates finance in KPIs, supporting summaries, directory and breakdowns', async () => {
    TestBed.overrideProvider(AuthSession, {
      useValue: { hasPermission: (permission: string) => permission !== 'DoctorRevenue.ViewOwn' },
    });
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.model.set(overviewFixture);
    await fixture.whenStable();
    expect(component.highlights()).toHaveLength(5);
    expect(component.groups().some((group) => group.id === 'finance')).toBe(false);
    expect(component.modules().some((module) => module.id === 'finance')).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('33,000');
  });

  it('offers an illustrated empty state and a retry for aggregate errors', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.model.set({ metrics: [] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.dashboard-state img')).toBeTruthy();
    component.failed.set(true);
    await fixture.whenStable();
    const retry: HTMLButtonElement = fixture.nativeElement.querySelector('[role="alert"] button');
    expect(retry).toBeTruthy();
    api.call.mockReturnValue(of(overviewFixture));
    retry.click();
    await fixture.whenStable();
    expect(component.failed()).toBe(false);
    expect(component.model()?.reportCode).toBe('overview');
  });

  it('supports keyboard inspection of paired daily values without hiding the table alternative', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    fixture.componentInstance.model.set(overviewFixture);
    await fixture.whenStable();
    const point: SVGGElement = fixture.nativeElement.querySelector('.chart-point');
    point.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedDay()).toBe('2026-10-03');
    expect(fixture.nativeElement.querySelector('.selected-day')?.textContent).toContain(
      fixture.componentInstance.formatNumber(0),
    );
    expect(fixture.nativeElement.querySelectorAll('.daily-table tbody tr')).toHaveLength(30);
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
    expect(component.chartPoints()[0].checkIns?.value).toBe(7);
    expect(component.chartPoints()[0].scheduled?.value).toBe(12);
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
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });
  it('ignores reports from old practice filters and closes their drilldowns', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const old = new Subject<object>();
    api.call.mockReturnValueOnce(old).mockReturnValueOnce(of({ reportCode: 'latest' }));
    component.filters.practiceId = 'old-clinic';
    component.drillMetric.set({ metricCode: 'CheckIns' });
    const first = component.refresh();
    expect(component.drillMetric()).toBeNull();
    component.filters.practiceId = 'new-clinic';
    await component.refresh();
    old.next({ reportCode: 'old' });
    old.complete();
    await first;
    expect(component.model()?.reportCode).toBe('latest');
    expect(component.filters.practiceId).toBe('new-clinic');
  });

  it('reloads the selected practice and clears dependent inspection state immediately', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const pending = new Subject<object>();
    api.call.mockReturnValue(pending);
    component.drillMetric.set({ metricCode: 'CheckIns' });
    component.selectedDay.set('2026-10-03');
    component.changePractice('clinic-a');
    expect(component.drillMetric()).toBeNull();
    expect(component.selectedDay()).toBe('');
    expect(api.call).toHaveBeenLastCalledWith(
      'P18-026',
      expect.objectContaining({ query: expect.objectContaining({ practiceId: 'clinic-a' }) }),
    );
    pending.next(overviewFixture);
    pending.complete();
    await fixture.whenStable();
  });

  it('prefers a validated reservation route to the patient fallback and denies untrusted routes', async () => {
    const component = TestBed.createComponent(DoctorDashboardComponent).componentInstance;
    const row = {
      patientId: 'patient-a',
      resourceType: 'Reservation',
      availableActions: [{ allowed: true }],
      detailRoute: '/api/v1/doctors/me/practices/clinic-a/reservations/booking-a',
    };
    expect(component.sourceLink(row)).toEqual({
      route: '/doctor/reservations',
      query: { practiceId: 'clinic-a', reservationId: 'booking-a' },
    });
    expect(
      component.sourceLink({ ...row, patientId: null, detailRoute: 'https://evil.example' }),
    ).toBeNull();
    expect(component.sourceLink({ ...row, availableActions: [{ allowed: false }] })).toBeNull();
  });

  it('uses the reporting zone for instants and preserves independent business dates', () => {
    const component = TestBed.createComponent(DoctorDashboardComponent).componentInstance;
    component.language.setLanguage('en');
    component.model.set({ window: { reportTimeZoneId: 'Africa/Cairo' } });
    expect(component.formatRecordTime('2026-11-01T23:30:00Z')).toBe('01:30 am');
    expect(component.formatRecordDate('2026-11-01')).toBe('1 Nov 2026');
  });

  it('keeps useful report warnings translated in both languages', async () => {
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const warning = 'Report.HistoricalCapacityNotRecorded';
    component.model.set({
      metrics: [{ metricCode: 'CapacityMinutes', value: null }],
      warnings: [warning],
    });
    for (const lang of ['ar', 'en'] as const) {
      component.language.setLanguage(lang);
      await fixture.whenStable();
      const text = fixture.nativeElement.querySelector('.report-warning')?.textContent;
      expect(text).toContain(component.language.t(warning));
      expect(text).not.toContain(warning);
    }
  });

  it('shows subscription required state with CTA to /doctor/subscription when filter-options returns 403 Report.AccessDenied', async () => {
    api.call.mockImplementation(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: {
              type: 'about:blank#security',
              title: 'Security Error',
              status: 403,
              detail: 'ليس لديك صلاحية لتنفيذ العملية في النطاق المطلوب.',
              instance: '/api/v1/doctors/me/dashboard/filter-options',
              errors: [
                {
                  code: 'Report.AccessDenied',
                  message: 'ليس لديك صلاحية لتنفيذ العملية في النطاق المطلوب.',
                  type: 'Security',
                },
              ],
            },
          }),
      ),
    );
    const fixture = TestBed.createComponent(DoctorDashboardComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    expect(component.subscriptionRequired()).toBe(true);
    expect(component.failed()).toBe(false);
    const element: HTMLElement = fixture.nativeElement;
    const subscribeLink = element.querySelector('.dashboard-subscribe-btn');
    expect(subscribeLink?.getAttribute('href')).toBe('/doctor/subscription');
    expect(element.querySelector('.dashboard-state--subscription')?.textContent).toContain(
      component.language.t('doctorDashboard.subscriptionRequired.title'),
    );
  });
});
