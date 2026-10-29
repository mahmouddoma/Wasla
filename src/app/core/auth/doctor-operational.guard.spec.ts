import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  provideRouter,
  UrlTree,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { doctorOperationalGuard } from './auth.guards';
import { AuthSession } from './auth-session';
import { DoctorApi } from '../../domains/doctors';
describe('Doctor operational approval gate', () => {
  const api = { onboardingStatus: vi.fn() };
  let actor = 'Doctor';
  beforeEach(() => {
    vi.resetAllMocks();
    actor = 'Doctor';
    api.onboardingStatus.mockReturnValue(of({ approvalStatus: 'Approved' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: { user: () => ({ userType: actor }) } },
        { provide: DoctorApi, useValue: api },
      ],
    });
  });
  const check = (url = '/doctor/queue') =>
    TestBed.runInInjectionContext(() =>
      doctorOperationalGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  it('accepts an approved doctor from the authoritative status endpoint', async () => {
    expect(await check()).toBe(true);
    expect(api.onboardingStatus).toHaveBeenCalledOnce();
  });
  it.each(['Pending', 'Rejected', 'Suspended'])(
    'blocks operational deep links while %s',
    async (status) => {
      api.onboardingStatus.mockReturnValue(of({ approvalStatus: status }));
      expect(await check()).toBeInstanceOf(UrlTree);
    },
  );
  it('blocks access when approval cannot be confirmed', async () => {
    api.onboardingStatus.mockReturnValue(throwError(() => new Error('offline')));
    expect(await check('/diagnostics/doctor/lab')).toBeInstanceOf(UrlTree);
  });
  it('leaves onboarding and other actors accessible', async () => {
    expect(await check('/doctor/onboarding')).toBe(true);
    actor = 'Reception';
    expect(await check('/reception/queue')).toBe(true);
    expect(api.onboardingStatus).not.toHaveBeenCalled();
  });
});
