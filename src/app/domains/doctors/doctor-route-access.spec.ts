import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { SubscriptionState } from '../subscriptions';
import { DoctorApi } from './doctor-api';
import { DoctorOnboardingStatus } from './doctor.models';
import { DoctorRouteAccess } from './doctor-route-access';

describe('Doctor access after navigation', () => {
  const api = { onboardingStatus: vi.fn() };
  const subscription = { refresh: vi.fn(async () => null) };
  let actor: string;
  let router: Router;

  beforeEach(() => {
    vi.resetAllMocks();
    actor = 'Doctor';
    api.onboardingStatus.mockReturnValue(of({ approvalStatus: 'Approved' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          ['doctor/queue', 'doctor/onboarding', 'doctor/profile', 'reception/queue'].map(
            (path) => ({ path, children: [] }),
          ),
        ),
        { provide: AuthSession, useValue: { user: () => ({ userType: actor }) } },
        { provide: DoctorApi, useValue: api },
        { provide: SubscriptionState, useValue: subscription },
      ],
    });
    router = TestBed.inject(Router);
    const watcher = TestBed.inject(DoctorRouteAccess).watch().subscribe();
    watchers.push(() => watcher.unsubscribe());
  });

  const watchers: (() => void)[] = [];
  afterEach(() => watchers.splice(0).forEach((stop) => stop()));

  it('completes navigation while the approval endpoint is still pending', async () => {
    const response = new Subject<DoctorOnboardingStatus>();
    api.onboardingStatus.mockImplementation(() => {
      expect(router.url).toBe('/doctor/queue');
      return response;
    });
    expect(await router.navigateByUrl('/doctor/queue')).toBe(true);
    expect(api.onboardingStatus).toHaveBeenCalledOnce();
    expect(subscription.refresh).not.toHaveBeenCalled();
    expect(router.url).toBe('/doctor/queue');
  });

  it('does not wait for subscription data to open the route', async () => {
    subscription.refresh.mockReturnValue(new Promise(() => {}));
    expect(await router.navigateByUrl('/doctor/queue')).toBe(true);
    expect(subscription.refresh).toHaveBeenCalledWith(true);
  });

  it.each(['Pending', 'Rejected', 'Suspended'])(
    'redirects a %s doctor after activation',
    async (status) => {
      api.onboardingStatus.mockReturnValue(of({ approvalStatus: status }));
      await router.navigateByUrl('/doctor/queue');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(router.url).toBe('/doctor/onboarding');
    },
  );

  it('redirects when approval cannot be confirmed', async () => {
    api.onboardingStatus.mockReturnValue(throwError(() => new Error('offline')));
    await router.navigateByUrl('/doctor/queue');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.url).toBe('/doctor/onboarding');
  });

  it('cancels obsolete reads when the user leaves the page', async () => {
    const response = new Subject<DoctorOnboardingStatus>();
    api.onboardingStatus.mockReturnValue(response);
    await router.navigateByUrl('/doctor/queue');
    await router.navigateByUrl('/doctor/profile');
    expect(response.observed).toBe(false);
    response.error(new Error('late failure'));
    expect(router.url).toBe('/doctor/profile');
  });

  it('skips onboarding and other actors', async () => {
    await router.navigateByUrl('/doctor/onboarding');
    actor = 'Reception';
    await router.navigateByUrl('/reception/queue');
    expect(api.onboardingStatus).not.toHaveBeenCalled();
  });
});
