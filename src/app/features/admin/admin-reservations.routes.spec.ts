import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { CurrentUser } from '../../core/auth/auth.models';
import { permissionGuard } from '../../core/auth/auth.guards';
import { ADMIN_ROUTES } from './admin.routes';
import { reservationGuard } from '../reservations';

describe('Administrative reservations route access', () => {
  const data = ADMIN_ROUTES.find((route) => route.path === 'reservations')!.data!;
  const route = { data } as ActivatedRouteSnapshot;
  const state = { url: '/admin/reservations' } as RouterStateSnapshot;
  let session: AuthSession;
  const user: CurrentUser = {
    applicationUserId: 'synthetic-admin',
    userName: 'Synthetic admin',
    email: '',
    phoneNumber: '',
    userType: 'SuperAdmin',
    roles: ['SuperAdmin'],
    permissions: ['Reservations.ViewAdministrative'],
    isFirstLogin: false,
    doctorId: null,
    patientId: null,
  };
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(AuthSession);
    session.begin({
      accessToken: 'synthetic',
      expiresOnUtc: '2099-01-01T00:00:00Z',
      passwordChangeRequired: false,
    });
    session.complete(user);
  });
  afterEach(() => sessionStorage.clear());
  it('allows the actual SuperAdmin through both guards while retaining the administrative API scope', () => {
    expect(data['reservationActor']).toBe('Admin');
    expect(TestBed.runInInjectionContext(() => permissionGuard(route, state))).toBe(true);
    expect(TestBed.runInInjectionContext(() => reservationGuard(route, state))).toBe(true);
  });
  it('denies an administrator without administrative reservation permission', () => {
    session.complete({ ...user, permissions: ['Doctors.ViewAll'] });
    expect(TestBed.runInInjectionContext(() => permissionGuard(route, state))).toBeInstanceOf(
      UrlTree,
    );
    expect(TestBed.runInInjectionContext(() => reservationGuard(route, state))).toBeInstanceOf(
      UrlTree,
    );
  });
  it('denies other account types even when they carry an administrative reservation permission', () => {
    session.complete({ ...user, userType: 'Patient', roles: ['Patient'] });
    expect(TestBed.runInInjectionContext(() => permissionGuard(route, state))).toBeInstanceOf(
      UrlTree,
    );
    expect(TestBed.runInInjectionContext(() => reservationGuard(route, state))).toBeInstanceOf(
      UrlTree,
    );
  });
  it('keeps the first-login password gate ahead of the reservation workspace', () => {
    session.complete({ ...user, isFirstLogin: true });
    expect(
      (TestBed.runInInjectionContext(() => reservationGuard(route, state)) as UrlTree).toString(),
    ).toBe('/change-password');
  });
});
