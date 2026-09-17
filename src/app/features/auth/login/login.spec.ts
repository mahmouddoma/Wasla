import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { CurrentUser, LoginResponse } from '../../../core/auth/auth.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  const sampleLoginResponse: LoginResponse = {
    accessToken: 'test-token',
    expiresOnUtc: '2026-09-17T00:00:00Z',
    passwordChangeRequired: false,
  };
  const sampleUser: CurrentUser = {
    applicationUserId: 'user-1',
    userName: 'doctor1',
    email: 'doctor1@example.com',
    phoneNumber: '01012345678',
    userType: 'Doctor',
    roles: ['Doctor'],
    permissions: [],
    isFirstLogin: false,
    doctorId: 'doc-1',
    patientId: null,
  };
  const api = {
    login: vi.fn(() => of(sampleLoginResponse)),
    currentUser: vi.fn(() => of(sampleUser)),
  };
  const session = {
    begin: vi.fn(() => true),
    complete: vi.fn(),
    requiresPasswordChange: vi.fn(() => false),
    destinationFor: vi.fn(() => '/workspace'),
    clear: vi.fn(),
  };
  const route = {
    snapshot: { queryParamMap: { get: vi.fn<(key: string) => string | null>(() => null) } },
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    route.snapshot.queryParamMap.get.mockReturnValue(null);
    api.login.mockReturnValue(of(sampleLoginResponse));
    api.currentUser.mockReturnValue(of(sampleUser));
    session.begin.mockReturnValue(true);
    session.requiresPasswordChange.mockReturnValue(false);
    session.destinationFor.mockReturnValue('/workspace');

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthApi, useValue: api },
        { provide: AuthSession, useValue: session },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('renders login form and toggles password visibility', async () => {
    expect(fixture.componentInstance).toBeTruthy();
    const element: HTMLElement = fixture.nativeElement;
    const pwdInput = element.querySelector<HTMLInputElement>('input[type="password"]');
    expect(pwdInput).not.toBeNull();

    const toggleBtn = element.querySelector<HTMLButtonElement>('.btn-toggle-pwd');
    toggleBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const textInput = element.querySelector<HTMLInputElement>('#login-password');
    expect(textInput?.type).toBe('text');
  });

  it('submits valid credentials, initializes session and navigates to user destination', async () => {
    fixture.componentInstance['model'].set({
      identifier: 'doctor1',
      password: 'StrongPassword123!',
    });
    fixture.detectChanges();

    await fixture.componentInstance['onSubmit'](new Event('submit', { cancelable: true }));

    expect(api.login).toHaveBeenCalledWith({
      identifier: 'doctor1',
      password: 'StrongPassword123!',
    });
    expect(session.begin).toHaveBeenCalledWith(sampleLoginResponse);
    expect(api.currentUser).toHaveBeenCalledOnce();
    expect(session.complete).toHaveBeenCalledWith(sampleUser);
    expect(navigate).toHaveBeenCalledWith(['/workspace']);
  });

  it('preserves a local reservation return URL after completing the session', async () => {
    const destination = '/doctor/reservations?practiceId=clinic';
    route.snapshot.queryParamMap.get.mockImplementation((key) =>
      key === 'returnUrl' ? destination : null,
    );
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance['model'].set({
      identifier: 'doctor1',
      password: 'StrongPassword123!',
    });
    fixture.detectChanges();
    await fixture.componentInstance['onSubmit'](new Event('submit', { cancelable: true }));
    expect(session.complete).toHaveBeenCalledWith(sampleUser);
    expect(navigateByUrl).toHaveBeenCalledWith(destination);
  });
  it('rejects an external return URL', async () => {
    route.snapshot.queryParamMap.get.mockImplementation((key) =>
      key === 'returnUrl' ? 'https://example.invalid/doctor/reservations' : null,
    );
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance['model'].set({
      identifier: 'doctor1',
      password: 'StrongPassword123!',
    });
    fixture.detectChanges();
    await fixture.componentInstance['onSubmit'](new Event('submit', { cancelable: true }));
    expect(navigate).toHaveBeenCalledWith(['/workspace']);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
  it('navigates to change-password when password change is required', async () => {
    session.requiresPasswordChange.mockReturnValue(true);
    fixture.componentInstance['model'].set({
      identifier: 'temp_user',
      password: 'InitialPassword123!',
    });
    fixture.detectChanges();

    await fixture.componentInstance['onSubmit'](new Event('submit', { cancelable: true }));

    expect(session.complete).toHaveBeenCalledWith(sampleUser);
    expect(navigate).toHaveBeenCalledWith(['/change-password']);
  });

  it('clears session and displays field errors on login failure', async () => {
    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: {
        errors: {
          Identifier: ['Invalid credentials.'],
        },
      },
    });
    api.login.mockReturnValue(throwError(() => errorResponse));
    fixture.componentInstance['model'].set({
      identifier: 'wrong_user',
      password: 'WrongPassword!',
    });
    fixture.detectChanges();

    await fixture.componentInstance['onSubmit'](new Event('submit', { cancelable: true }));

    expect(session.clear).toHaveBeenCalledOnce();
    expect(fixture.componentInstance['fieldErrors']()['identifier']).toEqual([
      'Invalid credentials.',
    ]);
    expect(navigate).not.toHaveBeenCalled();
  });
});
