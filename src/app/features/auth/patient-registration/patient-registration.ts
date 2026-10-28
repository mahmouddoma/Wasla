import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormField,
  email,
  form,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { Gender } from '../../../core/auth/auth.models';
import {
  OnboardingPurpose,
  PatientIdentityApi,
  TrackPatientClaimResponse,
} from '../../../domains/patient-identity';
import { NoFutureDate } from '../../../shared/no-future-date/no-future-date';
import { FileUpload } from '../file-upload/file-upload';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export type PatientOnboardingStage =
  | 'entry'
  | 'email'
  | 'otp'
  | 'register'
  | 'claim'
  | 'claim-status'
  | 'resubmit'
  | 'activate'
  | 'login-recovery'
  | 'conflict';

@Component({
  selector: 'app-patient-registration',
  imports: [FormField, RouterLink, FileUpload, NoFutureDate, TranslatePipe],
  templateUrl: './patient-registration.html',
  styleUrls: ['../registration.css', './patient-registration.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientRegistration {
  private readonly toast = inject(ToastService);
  readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(AuthApi);
  private readonly identityApi = inject(PatientIdentityApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // === Flow Stage & Onboarding State (In-Memory Only — Never Persisted to localStorage) ===
  readonly flowStage = signal<PatientOnboardingStage>('entry');
  readonly purpose = signal<OnboardingPurpose>('Register');
  readonly pendingReturnStage = signal<'claim-status' | 'resubmit' | null>(null);

  readonly emailStartModel = signal({
    email: '',
    patientReference: '',
  });
  readonly otpModel = signal({
    otp: '',
  });
  readonly verificationRequestId = signal('');
  readonly emailVerificationToken = signal('');
  readonly verificationExpiresOnUtc = signal('');
  readonly resendCooldownSeconds = signal(0);
  private resendTimerId: ReturnType<typeof setInterval> | null = null;

  // === Step-by-Step New Registration State ===
  readonly currentStep = signal<1 | 2 | 3>(1);
  readonly step1Attempted = signal(false);
  readonly step2Attempted = signal(false);

  readonly model = signal({
    userName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    nameAr: '',
    nameEn: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
  });

  readonly registrationForm = form(this.model, (field) => {
    required(field.userName, { message: 'validation.usernameRequired' });
    maxLength(field.userName, 100, { message: 'validation.max100' });
    required(field.email, { message: 'validation.emailRequired' });
    email(field.email, { message: 'validation.emailValid' });
    maxLength(field.email, 200, { message: 'validation.emailLength' });
    required(field.phoneNumber, { message: 'validation.phoneRequired' });
    maxLength(field.phoneNumber, 30, { message: 'validation.phoneLength' });
    required(field.password, { message: 'validation.passwordRequired' });
    maxLength(field.password, 4096, { message: 'validation.passwordLength' });
    required(field.confirmPassword, { message: 'validation.confirmPasswordRequired' });
    maxLength(field.confirmPassword, 4096, { message: 'changePassword.confirmTooLong' });
    validate(field.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(field.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'changePassword.mismatch' },
    );
    required(field.nameAr, { message: 'validation.nameArEnter' });
    maxLength(field.nameAr, 200, { message: 'validation.nameLength' });
    maxLength(field.nameEn, 200, { message: 'validation.nameLength' });
    required(field.dateOfBirth, { message: 'validation.birthDateRequired' });
    validate(field.dateOfBirth, ({ value }) =>
      isFutureDate(value()) ? { kind: 'futureDate', message: 'validation.birthFuture' } : undefined,
    );
    required(field.gender, { message: 'validation.genderRequired' });
  });

  readonly profileImage = signal<File | undefined>(undefined);
  readonly personalIdFrontImage = signal<File | undefined>(undefined);
  readonly personalIdBackImage = signal<File | undefined>(undefined);

  // === Existing Profile Claim State ===
  readonly claimEvidenceMode = signal<'documents' | 'inPerson'>('documents');
  readonly claimModel = signal({
    nameAr: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
    patientReference: '',
    phoneNumber: '',
    inPersonIdentityAttestationId: '',
    verificationNote: '',
  });
  readonly claimIdentityFront = signal<File | undefined>(undefined);
  readonly claimIdentityBack = signal<File | undefined>(undefined);
  readonly claimBirthCertificate = signal<File | undefined>(undefined);
  readonly claimGuardianDoc = signal<File | undefined>(undefined);

  readonly computedClaimEvidenceTypes = computed<readonly string[]>(() => {
    if (this.claimEvidenceMode() === 'inPerson') {
      return this.claimModel().inPersonIdentityAttestationId.trim()
        ? ['InPersonIdentityAttestation']
        : [];
    }
    const types: string[] = [];
    if (this.claimIdentityFront()) types.push('GovernmentIdFront');
    if (this.claimIdentityBack()) types.push('GovernmentIdBack');
    if (this.claimBirthCertificate()) types.push('BirthCertificate');
    if (this.claimGuardianDoc()) types.push('GuardianRelationshipEvidence');
    return types;
  });

  // === Claim Status Tracking & Resubmission State ===
  readonly activeClaimId = signal('');
  readonly claimStatusData = signal<TrackPatientClaimResponse | null>(null);
  readonly isLoadingClaimStatus = signal(false);

  readonly resubmitEvidenceMode = signal<'documents' | 'inPerson'>('documents');
  readonly resubmitModel = signal({
    reasonResponse: '',
    inPersonIdentityAttestationId: '',
    nameAr: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
    phoneNumber: '',
  });
  readonly resubmitIdentityFront = signal<File | undefined>(undefined);
  readonly resubmitIdentityBack = signal<File | undefined>(undefined);
  readonly resubmitBirthCertificate = signal<File | undefined>(undefined);
  readonly resubmitGuardianDoc = signal<File | undefined>(undefined);

  readonly computedResubmitEvidenceTypes = computed<readonly string[]>(() => {
    if (this.resubmitEvidenceMode() === 'inPerson') {
      return this.resubmitModel().inPersonIdentityAttestationId.trim()
        ? ['InPersonIdentityAttestation']
        : [];
    }
    const types: string[] = [];
    if (this.resubmitIdentityFront()) types.push('GovernmentIdFront');
    if (this.resubmitIdentityBack()) types.push('GovernmentIdBack');
    if (this.resubmitBirthCertificate()) types.push('BirthCertificate');
    if (this.resubmitGuardianDoc()) types.push('GuardianRelationshipEvidence');
    return types;
  });

  // === Account Activation & Resend State ===
  readonly activationModel = signal({
    invitationToken: '',
    password: '',
    confirmPassword: '',
  });
  readonly showResendActivation = signal(false);
  readonly resendActivationEmail = signal('');
  readonly resendActivationSuccess = signal('');

  // === Shared UI Feedback State ===
  readonly isSubmitting = signal(false);
  readonly showPasswords = signal(false);
  readonly stepNotice = signal('');
  readonly neutralInfoBanner = signal('');
  readonly apiMessages = signal<string[]>([]);
  readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});

  private readonly idempotencyStore = new Map<string, { fingerprint: string; key: string }>();

  constructor() {
    this.destroyRef.onDestroy(() => this.clearResendTimer());
    this.initFromRoute();
  }

  private initFromRoute(): void {
    const dataStage = this.route.snapshot.data?.['initialStage'] as
      | PatientOnboardingStage
      | undefined;
    const params = this.route.snapshot.queryParamMap;
    const mode = params.get('mode');
    const invitationToken = params.get('invitationToken') || params.get('token') || '';
    const claimId = params.get('claimId') || '';

    if (invitationToken) {
      this.activationModel.update((m) => ({ ...m, invitationToken }));
      this.flowStage.set('activate');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { invitationToken: null, token: null, mode: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }

    if (claimId) {
      this.activeClaimId.set(claimId);
      this.flowStage.set('claim-status');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { claimId: null, mode: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }

    if (dataStage === 'activate' || mode === 'activate') {
      this.flowStage.set('activate');
    } else if (dataStage === 'claim-status' || mode === 'claim-status') {
      this.flowStage.set('claim-status');
    }
  }

  // === Entry & Stage Navigation ===

  selectPurpose(purpose: OnboardingPurpose): void {
    this.clearFeedback();
    this.purpose.set(purpose);
    this.pendingReturnStage.set(null);
    this.flowStage.set('email');
  }

  openTrackClaimStage(): void {
    this.clearFeedback();
    this.flowStage.set('claim-status');
  }

  openActivateStage(): void {
    this.clearFeedback();
    this.flowStage.set('activate');
  }

  backToEntry(): void {
    this.clearFeedback();
    this.pendingReturnStage.set(null);
    this.flowStage.set('entry');
  }

  updateEmailField(field: 'email' | 'patientReference', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.emailStartModel.update((m) => ({ ...m, [field]: val }));
  }

  updateOtpField(event: Event): void {
    const val = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
    this.otpModel.set({ otp: val });
  }

  updateClaimField(
    field:
      | 'nameAr'
      | 'dateOfBirth'
      | 'gender'
      | 'patientReference'
      | 'phoneNumber'
      | 'inPersonIdentityAttestationId'
      | 'verificationNote',
    event: Event,
  ): void {
    const val = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.claimModel.update((m) => ({ ...m, [field]: val }));
  }

  updateResubmitField(
    field:
      | 'reasonResponse'
      | 'inPersonIdentityAttestationId'
      | 'nameAr'
      | 'dateOfBirth'
      | 'gender'
      | 'phoneNumber',
    event: Event,
  ): void {
    const val = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.resubmitModel.update((m) => ({ ...m, [field]: val }));
  }

  updateActivationField(
    field: 'invitationToken' | 'password' | 'confirmPassword',
    event: Event,
  ): void {
    const val = (event.target as HTMLInputElement).value;
    this.activationModel.update((m) => ({ ...m, [field]: val }));
  }

  updateActiveClaimId(event: Event): void {
    this.activeClaimId.set((event.target as HTMLInputElement).value.trim());
  }

  updateResendActivationEmail(event: Event): void {
    this.resendActivationEmail.set((event.target as HTMLInputElement).value.trim());
  }

  // === Step 1: Start Email Verification ===

  async submitStartEmailVerification(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.isSubmitting()) return;
    this.clearFeedback();

    const rawEmail = this.emailStartModel().email.trim();
    if (!rawEmail || !rawEmail.includes('@')) {
      this.stepNotice.set(this.uiLanguage.t('validation.emailValid'));
      return;
    }

    const patientRef = this.emailStartModel().patientReference.trim();
    this.isSubmitting.set(true);
    try {
      const response = await firstValueFrom(
        this.identityApi.startEmailVerification({
          email: rawEmail,
          purpose: this.purpose(),
          patientReference:
            this.purpose() === 'Claim' && patientRef ? patientRef : undefined,
        }),
      );
      this.verificationRequestId.set(response.requestId);
      this.otpModel.set({ otp: '' });
      this.neutralInfoBanner.set(this.uiLanguage.t('onboarding.neutralOtpSentNotice'));
      this.startResendCooldown(60);
      this.flowStage.set('otp');
    } catch (error) {
      this.handleOnboardingError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async resendEmailOtp(): Promise<void> {
    if (this.resendCooldownSeconds() > 0 || this.isSubmitting()) return;
    await this.submitStartEmailVerification();
  }

  // === Step 2: Verify Email OTP ===

  async submitVerifyEmailOtp(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isSubmitting()) return;
    this.clearFeedback();

    const otp = this.otpModel().otp.trim();
    if (otp.length !== 6) {
      this.stepNotice.set(this.uiLanguage.t('onboarding.otpSixDigitsRequired'));
      return;
    }

    this.isSubmitting.set(true);
    try {
      const response = await firstValueFrom(
        this.identityApi.verifyEmailOtp({
          requestId: this.verificationRequestId(),
          otp,
        }),
      );
      this.emailVerificationToken.set(response.verificationToken);
      this.verificationExpiresOnUtc.set(response.expiresOnUtc);
      const verifiedEmail = this.emailStartModel().email.trim();
      const patientRef = this.emailStartModel().patientReference.trim();
      this.model.update((m) => ({ ...m, email: verifiedEmail }));
      if (patientRef) {
        this.claimModel.update((m) => ({ ...m, patientReference: patientRef }));
      }
      this.resendActivationEmail.set(verifiedEmail);

      // If user re-verified specifically to check or resubmit an existing claim
      const returnStage = this.pendingReturnStage();
      if (returnStage) {
        this.pendingReturnStage.set(null);
        this.flowStage.set(returnStage);
        if (this.activeClaimId()) {
          await this.trackClaimStatus();
        }
        return;
      }

      this.routeByNextAction(response.nextAction);
    } catch (error) {
      this.handleOnboardingError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private routeByNextAction(nextAction: string): void {
    switch (nextAction) {
      case 'RegisterNew':
      case 'Register':
        this.currentStep.set(1);
        this.flowStage.set('register');
        break;
      case 'ClaimExisting':
      case 'Claim':
        this.flowStage.set('claim');
        break;
      case 'LoginOrRecovery':
        this.flowStage.set('login-recovery');
        break;
      case 'IdentityConflict':
        this.flowStage.set('conflict');
        break;
      default:
        this.flowStage.set(this.purpose() === 'Claim' ? 'claim' : 'register');
        break;
    }
  }

  // === Step 3 (Flow A): Submit Ownership Claim ===

  async submitOwnershipClaim(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isSubmitting()) return;
    this.clearFeedback();

    if (!this.emailVerificationToken()) {
      this.stepNotice.set(this.uiLanguage.t('onboarding.errors.verificationRequired'));
      this.flowStage.set('email');
      return;
    }

    const cm = this.claimModel();
    if (!cm.nameAr.trim()) {
      this.stepNotice.set(this.uiLanguage.t('validation.nameArEnter'));
      return;
    }
    if (!cm.dateOfBirth || isFutureDate(cm.dateOfBirth)) {
      this.stepNotice.set(this.uiLanguage.t('validation.birthDateRequired'));
      return;
    }
    if (!cm.gender) {
      this.stepNotice.set(this.uiLanguage.t('validation.genderRequired'));
      return;
    }

    const evidenceTypes = this.computedClaimEvidenceTypes();
    if (!evidenceTypes.length) {
      this.stepNotice.set(
        this.claimEvidenceMode() === 'inPerson'
          ? this.uiLanguage.t('onboarding.attestationIdRequired')
          : this.uiLanguage.t('onboarding.evidenceFileRequired'),
      );
      return;
    }

    const fingerprint = JSON.stringify({
      emailVerificationToken: this.emailVerificationToken(),
      nameAr: cm.nameAr.trim(),
      dateOfBirth: cm.dateOfBirth,
      gender: cm.gender,
      patientReference: cm.patientReference.trim(),
      phoneNumber: cm.phoneNumber.trim(),
      evidenceTypes,
      attestationId: cm.inPersonIdentityAttestationId.trim(),
      front: this.claimIdentityFront()?.name,
      back: this.claimIdentityBack()?.name,
      birth: this.claimBirthCertificate()?.name,
      guardian: this.claimGuardianDoc()?.name,
    });
    const idempotencyKey = this.getOrCreateIdempotencyKey('submit-claim', fingerprint);

    this.isSubmitting.set(true);
    try {
      const response = await firstValueFrom(
        this.identityApi.submitClaim(
          {
            emailVerificationToken: this.emailVerificationToken(),
            nameAr: cm.nameAr.trim(),
            dateOfBirth: cm.dateOfBirth,
            gender: cm.gender as Gender,
            evidenceType: evidenceTypes,
            patientReference: cm.patientReference.trim() || undefined,
            phoneNumber: cm.phoneNumber.trim() || undefined,
            identityFront:
              this.claimEvidenceMode() === 'documents' ? this.claimIdentityFront() : undefined,
            identityBack:
              this.claimEvidenceMode() === 'documents' ? this.claimIdentityBack() : undefined,
            birthCertificate:
              this.claimEvidenceMode() === 'documents' ? this.claimBirthCertificate() : undefined,
            guardianRelationshipDocument:
              this.claimEvidenceMode() === 'documents' ? this.claimGuardianDoc() : undefined,
            inPersonIdentityAttestationId:
              this.claimEvidenceMode() === 'inPerson'
                ? cm.inPersonIdentityAttestationId.trim()
                : undefined,
            verificationNote: cm.verificationNote.trim() || undefined,
          },
          idempotencyKey,
        ),
      );

      this.activeClaimId.set(response.claimRequestId);
      this.claimStatusData.set({
        claimRequestId: response.claimRequestId,
        status: response.status || 'PendingReview',
        submittedOnUtc: response.submittedOnUtc,
        lastActivityOnUtc: response.submittedOnUtc,
        canResubmit: false,
        canActivate: false,
        activationInvitationSent: false,
        rowVersion: '',
      });
      this.toast.success(this.uiLanguage.t('onboarding.claimSubmittedToast'));
      this.flowStage.set('claim-status');
      await this.trackClaimStatus();
    } catch (error) {
      this.handleOnboardingError(error, 'submit-claim');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // === Step 4: Track Claim Status & Flow C: Resubmit ===

  async trackClaimStatus(event?: Event): Promise<void> {
    event?.preventDefault();
    const claimId = this.activeClaimId().trim();
    if (!claimId) {
      this.stepNotice.set(this.uiLanguage.t('onboarding.claimIdRequired'));
      return;
    }
    if (!this.emailVerificationToken()) {
      this.promptReverifyForClaim('claim-status');
      return;
    }

    this.clearFeedback();
    this.isLoadingClaimStatus.set(true);
    try {
      const details = await firstValueFrom(
        this.identityApi.trackClaim(claimId, this.emailVerificationToken()),
      );
      this.claimStatusData.set(details);
    } catch (error) {
      this.handleOnboardingError(error);
    } finally {
      this.isLoadingClaimStatus.set(false);
    }
  }

  openResubmitStage(): void {
    const status = this.claimStatusData();
    if (!status?.canResubmit) return;
    this.clearFeedback();
    this.resubmitModel.update((m) => ({
      ...m,
      nameAr: m.nameAr || this.claimModel().nameAr,
      dateOfBirth: m.dateOfBirth || this.claimModel().dateOfBirth,
      gender: m.gender || this.claimModel().gender,
      phoneNumber: m.phoneNumber || this.claimModel().phoneNumber,
    }));
    this.flowStage.set('resubmit');
  }

  promptReverifyForClaim(targetStage: 'claim-status' | 'resubmit'): void {
    this.clearFeedback();
    this.purpose.set('Claim');
    this.pendingReturnStage.set(targetStage);
    this.stepNotice.set(this.uiLanguage.t('onboarding.reverifyToContinueClaim'));
    this.flowStage.set('email');
  }

  async submitClaimResubmission(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isSubmitting()) return;
    this.clearFeedback();

    const claimId = this.activeClaimId().trim();
    const currentStatus = this.claimStatusData();
    if (!claimId || !currentStatus) return;

    if (!this.emailVerificationToken()) {
      this.promptReverifyForClaim('resubmit');
      return;
    }

    const rm = this.resubmitModel();
    if (!rm.reasonResponse.trim()) {
      this.stepNotice.set(this.uiLanguage.t('onboarding.reasonResponseRequired'));
      return;
    }

    const evidenceTypes = this.computedResubmitEvidenceTypes();
    if (!evidenceTypes.length) {
      this.stepNotice.set(
        this.resubmitEvidenceMode() === 'inPerson'
          ? this.uiLanguage.t('onboarding.attestationIdRequired')
          : this.uiLanguage.t('onboarding.evidenceFileRequired'),
      );
      return;
    }

    const fingerprint = JSON.stringify({
      claimId,
      rowVersion: currentStatus.rowVersion,
      reasonResponse: rm.reasonResponse.trim(),
      evidenceTypes,
      attestationId: rm.inPersonIdentityAttestationId.trim(),
      front: this.resubmitIdentityFront()?.name,
      back: this.resubmitIdentityBack()?.name,
      birth: this.resubmitBirthCertificate()?.name,
      guardian: this.resubmitGuardianDoc()?.name,
    });
    const idempotencyKey = this.getOrCreateIdempotencyKey('resubmit-claim', fingerprint);

    this.isSubmitting.set(true);
    try {
      const response = await firstValueFrom(
        this.identityApi.resubmitClaim(
          claimId,
          {
            rowVersion: currentStatus.rowVersion,
            reasonResponse: rm.reasonResponse.trim(),
            evidenceType: evidenceTypes,
            identityFront:
              this.resubmitEvidenceMode() === 'documents'
                ? this.resubmitIdentityFront()
                : undefined,
            identityBack:
              this.resubmitEvidenceMode() === 'documents'
                ? this.resubmitIdentityBack()
                : undefined,
            birthCertificate:
              this.resubmitEvidenceMode() === 'documents'
                ? this.resubmitBirthCertificate()
                : undefined,
            guardianRelationshipDocument:
              this.resubmitEvidenceMode() === 'documents' ? this.resubmitGuardianDoc() : undefined,
            inPersonIdentityAttestationId:
              this.resubmitEvidenceMode() === 'inPerson'
                ? rm.inPersonIdentityAttestationId.trim()
                : undefined,
            identityProfileCorrections:
              rm.nameAr.trim() || rm.dateOfBirth || rm.gender || rm.phoneNumber.trim()
                ? {
                    nameAr: rm.nameAr.trim() || undefined,
                    dateOfBirth: rm.dateOfBirth || undefined,
                    gender: (rm.gender as Gender) || undefined,
                    phoneNumber: rm.phoneNumber.trim() || undefined,
                  }
                : undefined,
          },
          this.emailVerificationToken(),
          idempotencyKey,
        ),
      );

      this.toast.success(this.uiLanguage.t('onboarding.claimResubmittedToast'));
      this.claimStatusData.update((prev) =>
        prev
          ? {
              ...prev,
              status: response.status,
              rowVersion: response.rowVersion,
              canResubmit: false,
            }
          : null,
      );
      this.flowStage.set('claim-status');
      await this.trackClaimStatus();
    } catch (error) {
      this.handleOnboardingError(error, 'resubmit-claim');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // === Flow D & E: Account Activation & Resend Invitation ===

  async submitAccountActivation(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isSubmitting()) return;
    this.clearFeedback();

    const am = this.activationModel();
    if (!am.invitationToken.trim()) {
      this.stepNotice.set(this.uiLanguage.t('onboarding.invitationTokenRequired'));
      return;
    }
    if (!am.password) {
      this.stepNotice.set(this.uiLanguage.t('validation.passwordRequired'));
      return;
    }
    if (am.password !== am.confirmPassword) {
      this.stepNotice.set(this.uiLanguage.t('changePassword.mismatch'));
      return;
    }

    this.isSubmitting.set(true);
    try {
      await firstValueFrom(
        this.identityApi.activateAccount({
          invitationToken: am.invitationToken.trim(),
          password: am.password,
          confirmPassword: am.confirmPassword,
        }),
      );
      this.toast.success(this.uiLanguage.t('onboarding.activatedSuccess'));
      await this.router.navigate(['/login'], { queryParams: { status: 'patient-activated' } });
    } catch (error) {
      this.handleOnboardingError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async submitResendActivation(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.isSubmitting()) return;
    this.clearFeedback();

    const emailAddr =
      this.resendActivationEmail().trim() || this.emailStartModel().email.trim();
    if (!emailAddr || !emailAddr.includes('@')) {
      this.stepNotice.set(this.uiLanguage.t('validation.emailValid'));
      return;
    }

    this.isSubmitting.set(true);
    try {
      await firstValueFrom(
        this.identityApi.resendActivation({
          email: emailAddr,
          claimRequestId: this.activeClaimId().trim() || undefined,
          verificationToken: this.emailVerificationToken() || undefined,
        }),
      );
      this.resendActivationSuccess.set(this.uiLanguage.t('onboarding.resendActivationNeutral'));
      this.toast.success(this.uiLanguage.t('onboarding.resendActivationNeutral'));
    } catch (error) {
      this.handleOnboardingError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // === Step 3 (Flow B): New Patient Registration Form ===

  isStep1Valid(): boolean {
    const m = this.model();
    const f = this.registrationForm;
    return !!(
      m.userName.trim() &&
      !f.userName().errors().length &&
      m.email.trim() &&
      !f.email().errors().length &&
      m.phoneNumber.trim() &&
      !f.phoneNumber().errors().length &&
      m.password &&
      !f.password().errors().length &&
      m.confirmPassword &&
      !f.confirmPassword().errors().length &&
      m.password === m.confirmPassword
    );
  }

  isStep2Valid(): boolean {
    const m = this.model();
    const f = this.registrationForm;
    return !!(
      m.nameAr.trim() &&
      !f.nameAr().errors().length &&
      m.dateOfBirth &&
      !f.dateOfBirth().errors().length &&
      m.gender &&
      !f.gender().errors().length
    );
  }

  nextStep(): void {
    this.stepNotice.set('');
    if (this.currentStep() === 1) {
      if (!this.isStep1Valid()) {
        this.step1Attempted.set(true);
        this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
        return;
      }
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      if (!this.isStep2Valid()) {
        this.step2Attempted.set(true);
        this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
        return;
      }
      this.currentStep.set(3);
    }
  }

  prevStep(): void {
    this.stepNotice.set('');
    if (this.currentStep() === 3) {
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      this.currentStep.set(1);
    }
  }

  goToStep(target: 1 | 2 | 3): void {
    if (target === this.currentStep()) return;
    this.stepNotice.set('');
    if (target < this.currentStep()) {
      this.currentStep.set(target);
      return;
    }
    if (target === 2 && this.isStep1Valid()) {
      this.currentStep.set(2);
    } else if (target === 3 && this.isStep1Valid() && this.isStep2Valid()) {
      this.currentStep.set(3);
    } else {
      if (!this.isStep1Valid()) {
        this.step1Attempted.set(true);
      } else if (!this.isStep2Valid()) {
        this.step2Attempted.set(true);
      }
      this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.stepNotice.set('');

    if (!this.isStep1Valid()) {
      this.step1Attempted.set(true);
      this.currentStep.set(1);
      this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
      return;
    }

    if (!this.isStep2Valid()) {
      this.step2Attempted.set(true);
      this.currentStep.set(2);
      this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
      return;
    }

    await submit(this.registrationForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.apiMessages.set([]);
      this.fieldErrors.set({});
      try {
        const token = this.emailVerificationToken();
        if (token) {
          const m = this.model();
          const fingerprint = JSON.stringify({
            token,
            userName: m.userName.trim(),
            email: m.email.trim(),
            phoneNumber: m.phoneNumber.trim(),
            nameAr: m.nameAr.trim(),
            dateOfBirth: m.dateOfBirth,
            gender: m.gender,
          });
          const idempotencyKey = this.getOrCreateIdempotencyKey('register', fingerprint);
          await firstValueFrom(
            this.identityApi.registerVerifiedAccount(
              {
                emailVerificationToken: token,
                userName: m.userName.trim(),
                email: m.email.trim(),
                phoneNumber: m.phoneNumber.trim(),
                password: m.password,
                confirmPassword: m.confirmPassword,
                nameAr: m.nameAr.trim(),
                nameEn: m.nameEn.trim() || undefined,
                dateOfBirth: m.dateOfBirth,
                gender: m.gender as Gender,
                profileImage: this.profileImage(),
                personalIdFrontImage: this.personalIdFrontImage(),
                personalIdBackImage: this.personalIdBackImage(),
              },
              idempotencyKey,
            ),
          );
        } else {
          await firstValueFrom(
            this.api.registerPatient({
              ...this.model(),
              gender: this.model().gender as Gender,
              profileImage: this.profileImage(),
              personalIdFrontImage: this.personalIdFrontImage(),
              personalIdBackImage: this.personalIdBackImage(),
            }),
          );
        }
        this.toast.success(this.uiLanguage.t('auth.patientRegistered'));
        await this.router.navigate(['/login'], { queryParams: { status: 'patient-registered' } });
      } catch (error) {
        const handled = this.handleOnboardingError(error, 'register');
        if (!handled) {
          if (
            this.serverError('UserName') ||
            this.serverError('Email') ||
            this.serverError('PhoneNumber') ||
            this.serverError('Password') ||
            this.serverError('ConfirmPassword')
          ) {
            this.currentStep.set(1);
          } else if (
            this.serverError('NameAr') ||
            this.serverError('NameEn') ||
            this.serverError('DateOfBirth') ||
            this.serverError('Gender')
          ) {
            this.currentStep.set(2);
          } else {
            this.currentStep.set(3);
          }
        }
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  togglePasswords(): void {
    this.showPasswords.update((visible) => !visible);
  }

  // === Error Code Mapping (Section 11) & Helpers ===

  private handleOnboardingError(error: unknown, idempotencyScope?: string): boolean {
    const parsed = parseApiErrors(error);
    this.fieldErrors.set(parsed.fields);

    if (error instanceof HttpErrorResponse && error.status === 429) {
      const retryHeader = Number(error.headers?.get('Retry-After'));
      this.startResendCooldown(Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : 60);
    }

    const code = parsed.codes[0] || this.extractErrorCode(error);
    if (code) {
      switch (code) {
        case 'PatientOnboarding.VerificationRequired':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.verificationRequired'));
          this.flowStage.set('email');
          return true;
        case 'PatientOnboarding.TokenInvalidOrExpired':
          this.emailVerificationToken.set('');
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.tokenInvalidOrExpired'));
          this.flowStage.set('email');
          return true;
        case 'PatientOnboarding.OtpInvalidOrExpired':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.otpInvalidOrExpired'));
          return true;
        case 'PatientOnboarding.TooManyAttempts':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.tooManyAttempts'));
          return true;
        case 'Patient.ClaimRequired': {
          const m = this.model();
          this.claimModel.update((cm) => ({
            ...cm,
            nameAr: cm.nameAr || m.nameAr,
            dateOfBirth: cm.dateOfBirth || m.dateOfBirth,
            gender: cm.gender || m.gender,
            phoneNumber: cm.phoneNumber || m.phoneNumber,
          }));
          this.purpose.set('Claim');
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.claimRequired'));
          this.flowStage.set('claim');
          return true;
        }
        case 'Patient.NoClaimableProfile':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.noClaimableProfile'));
          return true;
        case 'PatientClaims.ProofInsufficient':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.proofInsufficient'));
          return true;
        case 'PatientClaims.PendingAlreadyExists':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.pendingAlreadyExists'));
          return true;
        case 'PatientClaims.ConcurrencyConflict':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.concurrencyConflict'));
          if (this.activeClaimId()) {
            void this.trackClaimStatus();
          }
          return true;
        case 'Patient.AlreadyLinked':
        case 'Identity.AlreadyRegistered':
          this.flowStage.set('login-recovery');
          return true;
        case 'Identity.EmailOwnedByAnotherAccount':
        case 'Patient.IdentityConflict':
          this.flowStage.set('conflict');
          return true;
        case 'PatientActivation.InvalidOrExpired':
          this.showResendActivation.set(true);
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.activationInvalidOrExpired'));
          return true;
        case 'Patient.SelfRegistrationAgeRestricted':
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.ageRestricted'));
          return true;
        case 'PatientIdentity.IdempotencyKeyReused':
          if (idempotencyScope) {
            this.idempotencyStore.delete(idempotencyScope);
          }
          this.stepNotice.set(this.uiLanguage.t('onboarding.errors.idempotencyReused'));
          return true;
      }
    }

    this.apiMessages.set(parsed.messages);
    return false;
  }

  private extractErrorCode(error: unknown): string {
    if (!(error instanceof HttpErrorResponse) || !error.error) return '';
    const errObj = error.error as Record<string, unknown>;
    if (typeof errObj['code'] === 'string') return errObj['code'];
    if (typeof errObj['errorCode'] === 'string') return errObj['errorCode'];
    return '';
  }

  private getOrCreateIdempotencyKey(scope: string, fingerprint: string): string {
    const existing = this.idempotencyStore.get(scope);
    if (existing && existing.fingerprint === fingerprint) {
      return existing.key;
    }
    const key =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.idempotencyStore.set(scope, { fingerprint, key });
    return key;
  }

  private startResendCooldown(seconds: number): void {
    this.clearResendTimer();
    this.resendCooldownSeconds.set(seconds);
    this.resendTimerId = setInterval(() => {
      const next = this.resendCooldownSeconds() - 1;
      if (next <= 0) {
        this.resendCooldownSeconds.set(0);
        this.clearResendTimer();
      } else {
        this.resendCooldownSeconds.set(next);
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimerId !== null) {
      clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    }
  }

  private clearFeedback(): void {
    this.stepNotice.set('');
    this.neutralInfoBanner.set('');
    this.resendActivationSuccess.set('');
    this.apiMessages.set([]);
    this.fieldErrors.set({});
  }
}

function isFutureDate(value: string): boolean {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}
