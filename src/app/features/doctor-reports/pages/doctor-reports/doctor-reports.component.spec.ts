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
});
