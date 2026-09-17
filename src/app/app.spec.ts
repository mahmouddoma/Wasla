import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthSession } from './core/auth/auth-session';
import { environment } from '../environments/environment';
import { ReceptionPracticeContext } from './domains/reception-practices';

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads practices after the reception user is established and preserves the token on selection', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
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
