import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PatientRegistration } from './patient-registration';

describe('PatientRegistration', () => {
  let fixture: ComponentFixture<PatientRegistration>;
  let component: PatientRegistration;
  const api = {
    registerPatient: vi.fn(() => of(undefined)),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    api.registerPatient.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      imports: [PatientRegistration],
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PatientRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('creates component and renders all patient registration fields', () => {
    expect(component).toBeTruthy();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('form')).not.toBeNull();
    expect(element.querySelectorAll('app-file-upload').length).toBe(3);
  });

  it('submits patient registration successfully, shows toast, and navigates to login', async () => {
    component['model'].set({
      userName: 'patient_jane',
      email: 'jane@example.com',
      phoneNumber: '01098765432',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      nameAr: 'جين دو',
      nameEn: 'Jane Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Female',
    });
    fixture.detectChanges();

    await component['onSubmit'](new Event('submit', { cancelable: true }));

    expect(api.registerPatient).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { status: 'patient-registered' },
    });
  });

  it('handles server errors and maps validation errors correctly', async () => {
    component['model'].set({
      userName: 'patient_jane',
      email: 'jane@example.com',
      phoneNumber: '01098765432',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      nameAr: 'جين دو',
      nameEn: 'Jane Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Female',
    });
    fixture.detectChanges();

    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Email is already in use.',
        errors: {
          Email: ['Email is already in use.'],
        },
      },
    });
    api.registerPatient.mockReturnValue(throwError(() => errorResponse));

    await component['onSubmit'](new Event('submit', { cancelable: true }));

    expect(component['fieldErrors']()['email']).toEqual(['Email is already in use.']);
    expect(component['serverError']('email')).toBe('Email is already in use.');
  });

  it('toggles password visibility', () => {
    expect(component['showPasswords']()).toBe(false);
    component['togglePasswords']();
    expect(component['showPasswords']()).toBe(true);
  });

  it('navigates through steps when valid and blocks when invalid', () => {
    expect(component['currentStep']()).toBe(1);

    // Attempting next without filling step 1 should block
    component['nextStep']();
    expect(component['currentStep']()).toBe(1);
    expect(component['step1Attempted']()).toBe(true);
    expect(component['stepNotice']()).not.toBe('');

    // Fill valid step 1 data
    component['model'].update((m) => ({
      ...m,
      userName: 'patient_mary',
      email: 'mary@example.com',
      phoneNumber: '01099887766',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    }));
    fixture.detectChanges();

    component['nextStep']();
    expect(component['currentStep']()).toBe(2);

    // Attempting next without filling step 2 should block
    component['nextStep']();
    expect(component['currentStep']()).toBe(2);
    expect(component['step2Attempted']()).toBe(true);

    // Fill valid step 2 data
    component['model'].update((m) => ({
      ...m,
      nameAr: 'مريم أحمد',
      dateOfBirth: '1995-02-14',
      gender: 'Female',
    }));
    fixture.detectChanges();

    component['nextStep']();
    expect(component['currentStep']()).toBe(3);

    // Prev step navigates backwards
    component['prevStep']();
    expect(component['currentStep']()).toBe(2);
    component['prevStep']();
    expect(component['currentStep']()).toBe(1);

    // Can jump directly to step 2 because step 1 is valid
    component['goToStep'](2);
    expect(component['currentStep']()).toBe(2);
  });
});

