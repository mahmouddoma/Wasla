import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CurrentUser } from './auth.models';
import { AuthSession } from './auth-session';
import { SessionRevalidation } from './session-revalidation';

describe('Restored session revalidation', () => {
  const user: CurrentUser = {
    applicationUserId: 'patient-1',
    userName: 'patient',
    email: '',
    phoneNumber: '',
    userType: 'Patient',
    roles: ['Patient'],
    permissions: [],
    isFirstLogin: false,
    doctorId: null,
    patientId: 'patient-1',
  };
  const url = `${environment.apiBaseUrl}/api/v1/auth/me`;
  let session: AuthSession;
  let http: HttpTestingController;
  let router: Router;

  const establish = (token: string) => {
    session.begin({
      accessToken: token,
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      passwordChangeRequired: false,
    });
    session.complete(user);
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter(
          ['login', 'change-password', 'workspace/patient'].map((path) => ({ path, children: [] })),
        ),
      ],
    });
    session = TestBed.inject(AuthSession);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('does not request account data for an anonymous visitor', () => {
    TestBed.inject(SessionRevalidation).refresh().subscribe();
    http.expectNone(url);
  });

  it('keeps the restored session usable while refreshing account data', () => {
    establish('original');
    TestBed.inject(SessionRevalidation).refresh().subscribe();
    const request = http.expectOne(url);
    expect(session.isAuthenticated()).toBe(true);
    expect(session.user()?.userName).toBe('patient');
    request.flush({ ...user, userName: 'updated' });
    expect(session.user()?.userName).toBe('updated');
  });

  it('ignores a response for a session that has been replaced', () => {
    establish('original');
    TestBed.inject(SessionRevalidation).refresh().subscribe();
    const request = http.expectOne(url);
    establish('replacement');
    request.flush({ ...user, userName: 'obsolete' });
    expect(session.token()).toBe('replacement');
    expect(session.user()?.userName).toBe('patient');
  });

  it('does not clear a newer login when an older request fails', () => {
    establish('original');
    TestBed.inject(SessionRevalidation).refresh().subscribe();
    const request = http.expectOne(url);
    establish('replacement');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.token()).toBe('replacement');
  });

  it('redirects an invalid restored session to login', async () => {
    establish('original');
    TestBed.inject(SessionRevalidation).refresh().subscribe();
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(session.isAuthenticated()).toBe(false);
    expect(router.url).toBe('/login');
  });

  it('enforces an updated password change requirement after the response', async () => {
    establish('original');
    TestBed.inject(SessionRevalidation).refresh().subscribe();
    http.expectOne(url).flush({ ...user, isFirstLogin: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.url).toBe('/change-password');
  });
});
