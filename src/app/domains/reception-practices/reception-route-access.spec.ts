import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { ReceptionPracticeContext } from './reception-practice-context';
import { receptionPracticeGuard } from './reception-practice.guard';
import { ReceptionRouteAccess } from './reception-route-access';

describe('Reception access after navigation', () => {
  const context = {
    ensureLoaded: vi.fn<() => Promise<void>>(),
    hasAnyPracticeWithAnyPermission: vi.fn(() => true),
  };
  let identity: string;
  let router: Router;
  let stop: () => void;
  let finish: () => void;

  beforeEach(() => {
    vi.resetAllMocks();
    identity = 'reception-1';
    context.hasAnyPracticeWithAnyPermission.mockReturnValue(true);
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    context.ensureLoaded.mockReturnValue(pending);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...['reservations', 'queue', 'finance'].map((page) => ({
            path: `reception/${page}`,
            data: { practicePermission: ['Practice.View'] },
            children: [{ path: '', canActivate: [receptionPracticeGuard], children: [] }],
          })),
          { path: 'workspace/reception', children: [] },
          { path: 'change-password', children: [] },
        ]),
        {
          provide: AuthSession,
          useValue: {
            user: () => ({ userType: 'Reception', applicationUserId: identity }),
            isAuthenticated: () => true,
            requiresPasswordChange: () => false,
            destinationFor: () => '/workspace/reception',
          },
        },
        { provide: ReceptionPracticeContext, useValue: context },
      ],
    });
    router = TestBed.inject(Router);
    const watcher = TestBed.inject(ReceptionRouteAccess).watch().subscribe();
    stop = () => watcher.unsubscribe();
  });

  afterEach(() => stop());

  it('keeps the guard synchronous without fetching practices', () => {
    const result = TestBed.runInInjectionContext(() =>
      receptionPracticeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toBe(true);
    expect(context.ensureLoaded).not.toHaveBeenCalled();
  });

  it.each(['reservations', 'queue', 'finance'])(
    'opens %s while practice access is pending',
    async (page) => {
      expect(await router.navigateByUrl(`/reception/${page}`)).toBe(true);
      expect(router.url).toBe(`/reception/${page}`);
      expect(context.ensureLoaded).toHaveBeenCalledOnce();
      expect(context.hasAnyPracticeWithAnyPermission).not.toHaveBeenCalled();
      finish();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(context.hasAnyPracticeWithAnyPermission).toHaveBeenCalledWith(['Practice.View']);
      expect(router.url).toBe(`/reception/${page}`);
    },
  );

  it('redirects after loading when no practice grants the required permission', async () => {
    context.hasAnyPracticeWithAnyPermission.mockReturnValue(false);
    await router.navigateByUrl('/reception/queue');
    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.url).toBe('/workspace/reception');
  });

  it('ignores late results after leaving the route', async () => {
    context.hasAnyPracticeWithAnyPermission.mockReturnValue(false);
    await router.navigateByUrl('/reception/queue');
    await router.navigateByUrl('/change-password');
    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.url).toBe('/change-password');
    expect(context.hasAnyPracticeWithAnyPermission).not.toHaveBeenCalled();
  });

  it('ignores results belonging to an earlier account', async () => {
    await router.navigateByUrl('/reception/finance');
    identity = 'reception-2';
    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(context.hasAnyPracticeWithAnyPermission).not.toHaveBeenCalled();
  });
});
