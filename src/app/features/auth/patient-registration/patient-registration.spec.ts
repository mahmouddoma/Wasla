import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PatientIdentityApi } from '../../../domains/patient-identity';
import { PatientRegistration } from './patient-registration';

describe('PatientRegistration', () => {
  let fixture: ComponentFixture<PatientRegistration>;
  let component: PatientRegistration;
  const api = {
    registerPatient: vi.fn(() => of(undefined)),
  };
  const identityApi = {
    startEmailVerification: vi.fn(() => of({ requestId: 'req-123', message: 'Accepted' })),
    verifyEmailOtp: vi.fn(() =>
      of({
        verificationToken: 'ver-tok-123',
        expiresOnUtc: '2026-10-28T12:00:00Z',
        nextAction: 'RegisterNew',
      }),
    ),
    registerVerifiedAccount: vi.fn(() =>
      of({
        patientId: 'pt-1',
        applicationUserId: 'usr-1',
        accountStatus: 'Active',
      }),
    ),
    submitClaim: vi.fn(() =>
      of({
        claimRequestId: 'claim-99',
        status: 'PendingReview',
        submittedOnUtc: '2026-10-28T10:00:00Z',
        canAccessMedicalRecord: false,
      }),
    ),
    trackClaim: vi.fn(() =>
      of({
        claimRequestId: 'claim-99',
        status: 'PendingReview',
        submittedOnUtc: '2026-10-28T10:00:00Z',
        lastActivityOnUtc: '2026-10-28T10:00:00Z',
        canResubmit: false,
        canActivate: false,
        activationInvitationSent: false,
        rowVersion: 'rv-1',
      }),
    ),
    resubmitClaim: vi.fn(() =>
      of({
        claimRequestId: 'claim-99',
        status: 'PendingReview',
        revisionNumber: 2,
        rowVersion: 'rv-2',
      }),
    ),
    activateAccount: vi.fn(() =>
      of({
        patientId: 'pt-1',
        applicationUserId: 'usr-1',
        accountStatus: 'Active',
        requiresLogin: true,
      }),
    ),
    resendActivation: vi.fn(() => of({ message: 'Accepted' })),
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
        { provide: PatientIdentityApi, useValue: identityApi },
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

    component['nextStep']();
    expect(component['currentStep']()).toBe(1);
    expect(component['step1Attempted']()).toBe(true);
    expect(component['stepNotice']()).not.toBe('');

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

    component['nextStep']();
    expect(component['currentStep']()).toBe(2);
    expect(component['step2Attempted']()).toBe(true);

    component['model'].update((m) => ({
      ...m,
      nameAr: 'مريم أحمد',
      dateOfBirth: '1995-02-14',
      gender: 'Female',
    }));
    fixture.detectChanges();

    component['nextStep']();
    expect(component['currentStep']()).toBe(3);

    component['prevStep']();
    expect(component['currentStep']()).toBe(2);
    component['prevStep']();
    expect(component['currentStep']()).toBe(1);

    component['goToStep'](2);
    expect(component['currentStep']()).toBe(2);
  });

  it('completes Email OTP verification and routes to ClaimExisting or RegisterNew based on server nextAction', async () => {
    expect(component.flowStage()).toBe('entry');
    component.selectPurpose('Claim');
    expect(component.flowStage()).toBe('email');

    component.emailStartModel.set({
      email: 'claimant@example.com',
      patientReference: 'pat-ref-1',
    });
    await component.submitStartEmailVerification();

    expect(identityApi.startEmailVerification).toHaveBeenCalledWith({
      email: 'claimant@example.com',
      purpose: 'Claim',
      patientReference: 'pat-ref-1',
    });
    expect(component.flowStage()).toBe('otp');

    identityApi.verifyEmailOtp.mockReturnValueOnce(
      of({
        verificationToken: 'ver-tok-claim',
        expiresOnUtc: '2026-10-28T12:00:00Z',
        nextAction: 'ClaimExisting',
      }),
    );
    component.otpModel.set({ otp: '654321' });
    await component.submitVerifyEmailOtp(new Event('submit'));

    expect(identityApi.verifyEmailOtp).toHaveBeenCalledWith({
      requestId: 'req-123',
      otp: '654321',
    });
    expect(component.flowStage()).toBe('claim');
    expect(component.emailVerificationToken()).toBe('ver-tok-claim');
  });

  it('submits ownership claim with in-person attestation and transitions to PendingReview status screen', async () => {
    component.emailVerificationToken.set('ver-tok-claim');
    component.flowStage.set('claim');
    component.claimEvidenceMode.set('inPerson');
    component.claimModel.set({
      nameAr: 'محمد أحمد',
      dateOfBirth: '1990-05-01',
      gender: 'Male',
      patientReference: '',
      phoneNumber: '01012345678',
      inPersonIdentityAttestationId: 'att-guid-1',
      verificationNote: 'توثيق بالعيادة',
    });

    await component.submitOwnershipClaim(new Event('submit'));

    expect(identityApi.submitClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationToken: 'ver-tok-claim',
        nameAr: 'محمد أحمد',
        evidenceType: ['InPersonIdentityAttestation'],
        inPersonIdentityAttestationId: 'att-guid-1',
      }),
      expect.any(String),
    );
    expect(component.flowStage()).toBe('claim-status');
    expect(component.activeClaimId()).toBe('claim-99');
  });

  it('activates account and redirects to login with patient-activated status', async () => {
    component.flowStage.set('activate');
    component.activationModel.set({
      invitationToken: 'inv-tok-99',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });

    await component.submitAccountActivation(new Event('submit'));

    expect(identityApi.activateAccount).toHaveBeenCalledWith({
      invitationToken: 'inv-tok-99',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });
    expect(toast.success).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { status: 'patient-activated' },
    });
  });
});
