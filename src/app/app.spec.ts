import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { PortalLayout } from './layout/portal-layout/portal-layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthSession } from './core/auth/auth-session';
import { environment } from '../environments/environment';
import { ReceptionPracticeContext } from './domains/reception-practices';

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App, PortalLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows an accessible retry notice for unavailable session verification and recovers in place', async () => {
    const session = TestBed.inject(AuthSession);
    session.begin({ accessToken: 'synthetic-token', expiresOnUtc: new Date(Date.now() + 60_000).toISOString(), passwordChangeRequired: false });
    session.complete({ applicationUserId: 'patient', userName: 'patient', email: '', phoneNumber: '', userType: 'Patient', roles: ['Patient'], permissions: [], isFirstLogin: false, doctorId: null, patientId: 'patient' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const url = `${environment.apiBaseUrl}/api/v1/auth/me`;
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable(); fixture.detectChanges();
    const notice: HTMLElement = fixture.nativeElement.querySelector('.session-verification');
    expect(notice.getAttribute('role')).toBe('status');
    expect(session.isAuthenticated()).toBe(true);
    notice.querySelector('button')!.click();
    const request = http.expectOne(url);
    fixture.detectChanges();
    expect(notice.querySelector('button')!.disabled).toBe(true);
    request.flush(session.user());
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.session-verification')).toBeNull();
    http.verify();
  });

  it('renders the shell and opens a route while restored account data is pending', async () => {
    const session = TestBed.inject(AuthSession);
    session.begin({
      accessToken: 'restored-token',
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      passwordChangeRequired: false,
    });
    session.complete({
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
    });
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: 'workspace/patient', component: PortalLayout }]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(`${environment.apiBaseUrl}/api/v1/auth/me`);
    expect(await router.navigateByUrl('/workspace/patient')).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.portal-shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-platform-footer')).not.toBeNull();
    expect(router.url).toBe('/workspace/patient');
    request.flush(session.user());
    http.verify();
  });

  it('loads practices after the reception user is established and preserves the token on selection', async () => {
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: 'reception', component: PortalLayout }]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await router.navigateByUrl('/reception');
    const session = TestBed.inject(AuthSession);
    const http = TestBed.inject(HttpTestingController);
    session.begin({
      accessToken: 'reception-token',
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      passwordChangeRequired: false,
    });
    fixture.detectChanges();
    const url = `${environment.apiBaseUrl}/api/v1/reception/practices`;
    http.expectNone(url);
    session.complete({
      applicationUserId: 'reception-1',
      userName: 'reception',
      email: '',
      phoneNumber: '',
      userType: 'Reception',
      roles: ['Reception'],
      permissions: [],
      isFirstLogin: false,
      doctorId: null,
      patientId: null,
    });
    fixture.detectChanges();
    http.expectOne(url).flush([
      { doctorPracticeId: 'cairo', nameAr: 'Cairo', nameEn: 'Cairo', permissionCodes: ['Search'] },
      {
        doctorPracticeId: 'shebin',
        nameAr: 'Shebin',
        nameEn: 'Shebin',
        permissionCodes: ['CheckIn'],
      },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
    const before = sessionStorage.getItem('wasla.auth.session');
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'shebin';
    select.dispatchEvent(new Event('change'));
    expect(TestBed.inject(ReceptionPracticeContext).allows('CheckIn')).toBe(true);
    expect(TestBed.inject(ReceptionPracticeContext).allows('Search')).toBe(false);
    expect(session.token()).toBe('reception-token');
    expect(sessionStorage.getItem('wasla.auth.session')).toBe(before);
    session.clear();
    fixture.detectChanges();
    expect(TestBed.inject(ReceptionPracticeContext).practices()).toEqual([]);
    http.verify();
  });
});
