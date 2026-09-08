import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { anonymousGuard, authenticatedGuard, passwordChangeGuard } from './auth.guards';
import { AuthSession } from './auth-session';
import { CurrentUser } from './auth.models';

describe('first-login route enforcement', () => {
  let session: AuthSession;
  const user: CurrentUser = {
    applicationUserId: 'user',
    userName: 'admin',
    email: 'admin@example.com',
    phoneNumber: '',
    userType: 'SuperAdmin',
    roles: ['SuperAdmin'],
    permissions: [],
    isFirstLogin: true,
    doctorId: null,
    patientId: null,
  };
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(AuthSession);
    session.begin({
      accessToken: 'token',
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      passwordChangeRequired: true,
    });
    session.complete(user);
  });

  it('redirects every authenticated area to change password', () => {
    const result = TestBed.runInInjectionContext(() => authenticatedGuard(route, state));
    expect((result as UrlTree).toString()).toBe('/change-password');
  });

  it('allows the forced change-password route', () => {
    const result = TestBed.runInInjectionContext(() => passwordChangeGuard(route, state));
    expect(result).toBe(true);
  });

  it('redirects away from anonymous routes to change password', () => {
    const result = TestBed.runInInjectionContext(() => anonymousGuard(route, state));
    expect((result as UrlTree).toString()).toBe('/change-password');
  });
});
