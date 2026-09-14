import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthSession } from '../../core/auth/auth-session';
import { CurrentUser } from '../../core/auth/auth.models';
import { PERMISSIONS } from '../../core/auth/permissions';
import { routes } from '../../app.routes';

describe('admin navigation', () => {
  const user: CurrentUser = {
    applicationUserId: 'admin-user',
    userName: 'Master',
    email: 'master@example.com',
    phoneNumber: '',
    userType: 'SuperAdmin',
    roles: ['SuperAdmin'],
    permissions: [PERMISSIONS.doctorsViewAll, PERMISSIONS.superAdminsViewAll],
    isFirstLogin: false,
    doctorId: null,
    patientId: null,
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });

    const session = TestBed.inject(AuthSession);
    session.begin({
      accessToken: 'token',
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      passwordChangeRequired: false,
    });
    session.complete(user);
  });

  it('navigates between doctors and super administrators', async () => {
    const harness = await RouterTestingHarness.create('/admin/doctors');
    const router = TestBed.inject(Router);

    expect(router.url).toBe('/admin/doctors');

    await harness.navigateByUrl('/admin/superadmins');

    expect(router.url).toBe('/admin/superadmins');
  });
});
