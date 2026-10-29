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
