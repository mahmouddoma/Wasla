import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CurrentUser } from './auth.models';
import { AuthSession } from './auth-session';
import { SessionRevalidation } from './session-revalidation';
import { SKIP_ERROR_TOAST } from '../notifications/api-error-toast.interceptor';

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
  it('invalidates an expired stored session without sending a request', () => {
    vi.useFakeTimers();
    try {
      establish('expired');
      vi.advanceTimersByTime(60_001);
      const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      TestBed.inject(SessionRevalidation).refresh().subscribe();
      expect(session.session()).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/login');
      http.expectNone(url);
    } finally { vi.useRealTimers(); }
  });

  it.each([0, 429, 500, 502, 503])('keeps a valid restored session on transient status %s and supports explicit recovery', async (status) => {
    establish('original');
    const revalidation = TestBed.inject(SessionRevalidation);
    revalidation.refresh().subscribe();
    const request = http.expectOne(url);
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    if (status === 0) request.error(new ProgressEvent('error'));
    else request.flush({}, { status, statusText: 'Temporary failure' });
    expect(session.token()).toBe('original');
    expect(revalidation.unavailable()).toBe(true);
    expect(revalidation.checking()).toBe(false);
    expect(router.url).not.toBe('/login');
    revalidation.refresh().subscribe();
    expect(revalidation.checking()).toBe(true);
    http.expectOne(url).flush({ ...user, userName: 'recovered' });
    expect(revalidation.unavailable()).toBe(false);
    expect(session.user()?.userName).toBe('recovered');
  });

  it('shares concurrent revalidation requests and allows a new explicit retry afterward', () => {
    establish('original');
    const revalidation = TestBed.inject(SessionRevalidation);
    revalidation.refresh().subscribe();
    revalidation.refresh().subscribe();
    http.expectOne(url).flush(user);
    revalidation.refresh().subscribe();
    http.expectOne(url).flush(user);
    expect(revalidation.checking()).toBe(false);
  });

  it('times out a slow verification without discarding the valid token or retrying indefinitely', async () => {
    vi.useFakeTimers();
    try {
      establish('original');
      const revalidation = TestBed.inject(SessionRevalidation);
      revalidation.refresh().subscribe();
      const request = http.expectOne(url);
      await vi.advanceTimersByTimeAsync(10_001);
      expect(request.cancelled).toBe(true);
      expect(session.token()).toBe('original');
      expect(revalidation.unavailable()).toBe(true);
      http.expectNone(url);
    } finally { vi.useRealTimers(); }
  });

  it('does not report a stale transient failure against a replacement login', () => {
    establish('original');
    const revalidation = TestBed.inject(SessionRevalidation);
    revalidation.refresh().subscribe();
    const request = http.expectOne(url);
    establish('replacement');
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(session.token()).toBe('replacement');
    expect(revalidation.unavailable()).toBe(false);
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
