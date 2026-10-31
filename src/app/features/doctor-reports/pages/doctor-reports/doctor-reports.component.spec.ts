import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { DoctorReportsComponent } from './doctor-reports.component';
import { Phase18Api } from '../../../../domains/phase18';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ToastService } from '../../../../core/notifications/toast.service';

const insight = {
  insightId: 'insight',
  titleEn: 'Attendance',
  state: 'New' as const,
  isPersisted: true,
  rowVersion: 'rv1',
  availableActions: [
    { allowed: true, route: '/insights/insight/dismiss' },
    { allowed: true, route: '/insights/insight/acknowledge' },
  ],
};
describe('Doctor reports and insights', () => {
  let component: DoctorReportsComponent;
  let grants: Set<string>;
  const api = { call: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    grants = new Set([
      'Reports.Doctor.ViewOwn',
      'Insights.Doctor.ViewOwn',
      'Insights.Doctor.TrackOwn',
    ]);
    api.call.mockImplementation((code: string) =>
      of(code === 'P18-076' ? [] : code === 'P18-048' ? insight : { items: [] }),
    );
    TestBed.configureTestingModule({
      imports: [DoctorReportsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { tab: 'insights' } } } },
        { provide: Phase18Api, useValue: api },
        { provide: AuthSession, useValue: { hasPermission: (p: string) => grants.has(p) } },
        { provide: ToastService, useValue: toast },
      ],
    });
    component = TestBed.createComponent(DoctorReportsComponent).componentInstance;
  });
  it('keeps an empty backend response empty', async () => {
    await component.refresh();
    expect(component.insights()).toEqual([]);
    expect(component.reports()).toEqual([]);
  });
  it('renders separate formatted comparison values and avoids repeating the insight explanation', async () => {
    const fixture = TestBed.createComponent(DoctorReportsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.selectedInsight.set({
      ...insight,
      currentValue: 31.818181818181817,
      previousValue: 70,
      sampleCount: 22,
      explanationAr: 'شرح الملاحظة',
      explanationEn: 'Insight explanation',
      evidenceSummaryAr: 'شرح الملاحظة',
      evidenceSummaryEn: 'Insight explanation',
      suggestedActionAr: 'راجع مواعيد العيادة',
      suggestedActionEn: 'Review clinic appointments',
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const values = Array.from(element.querySelectorAll('.insight-comparison dd'));
    expect(values.map((value) => value.textContent?.trim())).toEqual(
      [31.818181818181817, 70, 22].map((value) =>
        fixture.componentInstance.formatMetricValue(value),
      ),
    );
    expect(element.querySelector('.insight-detail__header h2')).toBeNull();
    expect(element.querySelector('.side-drawer-panel--wide')).toBeNull();
    expect(
      element
        .querySelector<HTMLElement>('.side-drawer-panel')
        ?.style.getPropertyValue('--drawer-width'),
    ).toBe('640px');
    expect(element.querySelectorAll('.insight-detail__description section')).toHaveLength(1);
    expect(element.querySelector('.insight-history__empty img')).not.toBeNull();
  });
  it('translates the clinic scope in both languages', () => {
    for (const lang of ['ar', 'en'] as const) {
      component.language.setLanguage(lang);
      expect(component.scopeLabel('Owned Practices')).toBe(
        component.language.t('doctorReports.ownedPractices'),
      );
      expect(component.scopeLabel('OwnedPractices')).toBe(
        component.language.t('doctorReports.ownedPractices'),
      );
      expect(component.scopeLabel(null)).toBe(
        component.language.t('doctorRemediation.unavailable'),
      );
    }
  });
  it('renders an illustrated empty directory and uses the selected report as the drawer title', async () => {
    TestBed.inject(ActivatedRoute).snapshot.data['tab'] = 'reports';
    const fixture = TestBed.createComponent(DoctorReportsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.reports-state--empty img')).not.toBeNull();
    fixture.componentInstance.selectedReport.set({
      reportCode: 'overview',
      titleAr: 'نظرة عامة',
      titleEn: 'Overview',
      scope: 'Owned Practices',
    });
    fixture.detectChanges();
    expect(element.querySelector('.drawer-titles h2')?.textContent?.trim()).toBe(
      fixture.componentInstance.text('نظرة عامة', 'Overview'),
    );
    expect(element.querySelector('.report-detail__scope')?.textContent?.trim()).toBe(
      fixture.componentInstance.scopeLabel('Owned Practices'),
    );
  });
  it('loads only the route-specific source on entry', async () => {
    component.ngOnInit();
    await Promise.resolve();
    expect(api.call).toHaveBeenCalledWith('P18-047', expect.anything());
    expect(api.call).not.toHaveBeenCalledWith('P18-076', expect.anything());
  });
  it('keeps the reason and server status after failed dismissal', async () => {
    component.selectedInsight.set(insight);
    component.insights.set([insight]);
    component.dismissReason = 'Review later';
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.submitDismiss();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(component.selectedInsight()?.state).toBe('New');
    expect(component.dismissReason).toBe('Review later');
    expect(component.submitting()).toBe(false);
  });
  it('blocks duplicate commands and revoked grants', async () => {
    const response = new Subject<typeof insight>();
    api.call.mockReturnValue(response);
    const pending = component.acknowledgeInsight(insight);
    void component.acknowledgeInsight(insight);
    expect(api.call).toHaveBeenCalledTimes(1);
    response.error(new HttpErrorResponse({ status: 503 }));
    await pending;
    grants.delete('Insights.Doctor.TrackOwn');
    await component.acknowledgeInsight(insight);
    expect(api.call).toHaveBeenCalledTimes(1);
  });
  it('does not write without a server revision or explicit action', async () => {
    await component.acknowledgeInsight({ ...insight, rowVersion: null });
    await component.acknowledgeInsight({ ...insight, availableActions: [] });
    expect(api.call).not.toHaveBeenCalled();
  });
  it('purges sensitive detail on forbidden response', async () => {
    component.selectedInsight.set(insight);
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await component.acknowledgeInsight(insight);
    expect(component.selectedInsight()).toBeNull();
    expect(component.insights()).toEqual([]);
  });
  it('translates units and formats unavailable and numeric values for each language', () => {
    for (const lang of ['ar', 'en'] as const) {
      component.language.setLanguage(lang);
      expect(component.metricUnit('count')).toBe(
        component.language.t('doctorWorkspace.unit.count'),
      );
      expect(component.metricUnit('minutes')).toBe(
        component.language.t('doctorWorkspace.unit.minutes'),
      );
      expect(component.formatMetricValue(null)).toBe(
        component.language.t('doctorRemediation.unavailable'),
      );
      expect(component.formatMetricValue(1234.5)).toBe(
        new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
          maximumFractionDigits: 1,
        }).format(1234.5),
      );
    }
  });
  it('keeps server feedback out of content and translates report data notes', async () => {
    const fixture = TestBed.createComponent(DoctorReportsComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.selectedReport.set({ reportCode: 'overview', canPreview: true });
    page.preview.set({
      metrics: [{ metricCode: 'CheckIns', nameEn: 'Attendance', value: 1, unit: 'count' }],
      warnings: ['Report.ExcludedInvalidSamples'],
    });
    page.messages.set(['Server-only response']);
    for (const lang of ['ar', 'en'] as const) {
      page.language.setLanguage(lang);
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).not.toContain('Server-only response');
      expect(
        fixture.nativeElement.querySelector('.report-warning, .report-warnings__list')?.textContent,
      ).toContain(page.language.t('Report.ExcludedInvalidSamples'));
      expect(fixture.nativeElement.textContent).not.toContain('Report.ExcludedInvalidSamples');
    }
  });
});

afterEach(() => localStorage.removeItem('wasla_lang'));
