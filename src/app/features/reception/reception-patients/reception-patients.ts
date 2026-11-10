import { ReceptionRegistrationHandoff } from '../../../domains/patients';
import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  email,
  form,
  max,
  maxLength,
  min,
  required,
  readonly as readonlyField,
  submit,
  validate,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import {
  PagedResponse,
  PatientRelationshipType,
  PatientSearchItem,
  RegistrationSearchResponse,
  RegistrationCandidate,
} from '../../../domains/patients';
import { PatientsApi } from '../../../domains/patients';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { hasReceptionPatientSearchCriteria } from '../patient-search-criteria';
import { PatientPicker } from '../components/patient-picker/patient-picker';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';

@Component({
  selector: 'app-reception-patients',
  imports: [FormField, TranslatePipe, PageHeader, SideDrawer, NgTemplateOutlet, PatientPicker],
  templateUrl: './reception-patients.html',
  styleUrl: './reception-patients.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionPatients {
  private readonly toast = inject(ToastService);
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(PatientsApi);
  private readonly authApi = inject(AuthApi);
  private readonly practiceContext = inject(ReceptionPracticeContext);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly registrationHandoff = inject(ReceptionRegistrationHandoff);
  private readonly route = inject(ActivatedRoute);
  protected readonly returnToQueue = this.route.snapshot.queryParamMap.get('returnTo') === 'queue';

  protected readonly createModel = signal({
    nameAr: '',
    nameEn: '',
    dateOfBirth: '',
    gender: '' as 'Male' | 'Female' | '',
    phoneNumber: '',
    email: '',
    primaryContactNameAr: '',
    primaryContactPhoneNumber: '',
    primaryContactRelationshipType: 'Guardian' as PatientRelationshipType,
    primaryContactLinkedPatientId: '',
  });
  protected readonly createForm = form(this.createModel, (field) => {
    readonlyField(field.primaryContactNameAr, () => !!this.linkedContact());
    readonlyField(field.primaryContactPhoneNumber, () => !!this.linkedContact());
    required(field.nameAr, { message: 'validation.nameArRequired' });
    maxLength(field.nameAr, 200, { message: 'validation.nameLength' });
    maxLength(field.nameEn, 200, { message: 'validation.nameLength' });
    required(field.dateOfBirth, { message: 'ui.full.757' });
    validate(field.dateOfBirth, ({ value }) => {
      if (!value()) return undefined;
      return new Date(`${value()}T00:00:00`) > today()
        ? { kind: 'futureDate', message: 'validation.birthFuture' }
        : undefined;
    });
    required(field.gender, { message: 'ui.full.758' });
    email(field.email, { message: 'validation.emailFormat' });
    required(field.primaryContactNameAr, {
      message: 'ui.full.759',
      when: ({ valueOf }) => !valueOf(field.phoneNumber).trim(),
    });
    required(field.primaryContactPhoneNumber, {
      message: 'ui.full.760',
      when: ({ valueOf }) => !valueOf(field.phoneNumber).trim(),
    });
  });
  protected readonly searchModel = signal({
    phoneNumber: '',
    name: '',
    dateOfBirth: '',
    pageSize: 10,
  });
  protected readonly searchForm = form(this.searchModel, (field) => {
    min(field.pageSize, 1);
    max(field.pageSize, 100);
  });
  protected readonly pageSizeOptions = [10, 15, 20] as const;
  protected readonly profileImage = signal<File | undefined>(undefined);
  protected readonly results = signal<PagedResponse<PatientSearchItem> | null>(null);
  protected readonly selectedPatientId = signal('');
  protected readonly selectedPatient = signal<PatientSearchItem | null>(null);
  protected readonly createdPatientId = signal('');
  protected readonly messages = signal<string[]>([]);
  protected readonly isCreating = signal(false);
  protected readonly isSearching = signal(false);
  protected readonly pageNumber = signal(1);
  protected readonly practices = this.practiceContext.practices;
  protected readonly selectedPracticeId = this.practiceContext.currentPracticeId;
  protected readonly currentPractice = this.practiceContext.currentPractice;

  protected readonly totalPages = computed(() => {
    const res = this.results();
    if (!res || !res.totalCount) return 1;
    if (res.totalPages && res.totalPages > 0) return res.totalPages;
    const size = res.pageSize || this.searchModel().pageSize || 10;
    return Math.ceil(res.totalCount / size) || 1;
  });

  protected readonly startIndex = computed(() => {
    const res = this.results();
    if (!res || res.items.length === 0) return 0;
    const size = res.pageSize || this.searchModel().pageSize || 10;
    return (this.pageNumber() - 1) * size + 1;
  });

  protected readonly endIndex = computed(() => {
    const res = this.results();
    if (!res || res.items.length === 0) return 0;
    return Math.min(this.startIndex() + res.items.length - 1, res.totalCount);
  });

  protected readonly canSearch = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientsSearchBasic),
  );
  protected readonly canRegisterBasic = computed(() => this.session.hasPermission(PERMISSIONS.patientsRegister) && this.selectedPracticeAllows(PERMISSIONS.patientsRegister));
  protected readonly canRegister = computed(() => this.canRegisterBasic() || this.canRegisterFull());
  protected readonly canVerifyClaimIdentity = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientsRegistrationMatch),
  );
  protected readonly registrationOpen = signal(false);
  protected readonly registrationAccountMode = signal<'basic' | 'full'>('basic');
  protected readonly fullRegistrationBasis = signal<'GovernmentIdSeen' | 'ApprovedAlternateEvidence'>('GovernmentIdSeen');
  protected readonly fullRegistrationVerifiedInPerson = signal(false);
  protected readonly fullRegistrationNote = signal('');
  protected readonly identityMatches = signal<RegistrationSearchResponse | null>(null);
  protected readonly distinctPersonConfirmed = signal(false);
  protected readonly matchReviewReason = signal('');
  protected readonly reusedPatient = signal<RegistrationCandidate | null>(null);
  protected readonly linkedContact = signal<PatientSearchItem | null>(null);
  protected readonly contactPickerOpen = signal(false);
  protected readonly canRegisterFull = computed(() => this.session.hasPermission('Patients.RegisterFull') && this.selectedPracticeAllows('Patients.RegisterFull'));
  protected readonly canDistinguish = computed(() => {
    const result = this.identityMatches();
    return !!result && ['PossibleMatch', 'MultipleMatches'].includes(result.matchOutcome ?? '') &&
      !result.requiresClaimForAccount && (this.registrationAccountMode() === 'full' ? result.canCreateFull : result.canCreateBasic);
  });
  private matchSignature = '';
  private identitySequence = 0;
  private mutationIntent: { signature: string; key: string } | null = null;
  protected readonly personalIdFrontImage = signal<File | undefined>(undefined);
  protected readonly personalIdBackImage = signal<File | undefined>(undefined);
  protected readonly fullAccountActivationInfo = signal<{
    activationEmailMasked: string;
    invitationExpiresOnUtc: string;
  } | null>(null);

  protected readonly attestationDrawerOpen = signal(false);
  protected readonly isSubmittingAttestation = signal(false);
  protected readonly generatedAttestationId = signal('');
  protected readonly attestationModel = signal({
    claimantEmail: '',
    verificationBasis: 'GovernmentIdSeen',
    verifiedInPerson: true,
    reason: '',
  });
  protected readonly canBook = computed(
    () =>
      this.session.hasPermission(PERMISSIONS.practiceReservationsCreate) &&
      this.practiceContext.allows(PERMISSIONS.practiceReservationsCreate),
  );
  private contextGeneration = 0;
  private searchSequence = 0;

  constructor() {
    if (!this.practices().length) void this.loadPractices();
    effect(() => {
      const practiceId = this.selectedPracticeId();
      this.contextGeneration++;
      this.searchSequence++;
      this.results.set(null);
      this.selectedPatientId.set('');
      this.selectedPatient.set(null);
      this.createdPatientId.set('');
      this.reusedPatient.set(null);
      this.linkedContact.set(null);
      this.contactPickerOpen.set(false);
      this.createModel.update(value => ({ ...value, primaryContactLinkedPatientId: '' }));
      this.messages.set([]);
      this.isSearching.set(false);
      if (
        practiceId &&
        this.canSearch() &&
        this.selectedPracticeAllows(PERMISSIONS.patientsSearchBasic)
      )
        untracked(() => void this.search());
    });

    effect(() => {
      this.registrationSignature();
      untracked(() => {
        this.identitySequence++;
        this.matchSignature = '';
        this.identityMatches.set(null);
        this.distinctPersonConfirmed.set(false);
        this.matchReviewReason.set('');
        this.fullRegistrationVerifiedInPerson.set(false);
      });
    });

    const params = this.route.snapshot.queryParamMap;
    const action = params.get('action');
    if (action === 'new' || params.get('register') === 'true') {
      this.registrationOpen.set(true);
    }
    const phone = params.get('phone');
    if (phone) {
      this.searchModel.update((m) => ({ ...m, phoneNumber: phone }));
      this.createModel.update((m) => ({ ...m, phoneNumber: phone }));
    }
    const name = params.get('name');
    if (name) {
      this.searchModel.update((m) => ({ ...m, name }));
      this.createModel.update((m) => ({ ...m, nameAr: name }));
    }
  }

  protected onPracticeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select?.value) {
      this.practiceContext.select(select.value);
    }
  }

  protected resetSearch(): void {
    this.searchModel.set({
      phoneNumber: '',
      name: '',
      dateOfBirth: '',
      pageSize: 10,
    });
    this.pageNumber.set(1);
    this.results.set(null);
    this.clearFeedback();
  }

  protected hasValidSearchCriteria(): boolean {
    return hasReceptionPatientSearchCriteria(this.searchModel());
  }

  protected setPageSize(size: number): void {
    if (this.searchModel().pageSize === size && this.pageNumber() === 1) return;
    this.searchModel.update((m) => ({ ...m, pageSize: size }));
    this.pageNumber.set(1);
    this.isSearching.set(false);
    void this.search(1);
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = Number(select?.value);
    if (size && size !== this.searchModel().pageSize) {
      this.setPageSize(size);
    }
  }

  protected goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total || page === this.pageNumber() || this.isSearching()) return;
    this.pageNumber.set(page);
    void this.search(page);
  }

  protected clearSelection(): void {
    this.selectedPatient.set(null);
    this.selectedPatientId.set('');
    this.createdPatientId.set('');
  }

  protected selectAndBook(patient: PatientSearchItem): void {
    this.selectedPatientId.set(patient.patientId);
    this.selectedPatient.set(patient);
    this.createdPatientId.set('');
    this.book();
  }

  protected calculateAge(dob?: string | null): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const diffMs = Date.now() - birth.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  private registrationSignature(): string {
    const value = this.createModel();
    return JSON.stringify([this.selectedPracticeId(), this.registrationAccountMode(), value.nameAr.trim(), value.dateOfBirth, value.gender, value.phoneNumber.trim(), value.email.trim().toLowerCase()]);
  }
  private mutationKey(request: object): string {
    const signature = JSON.stringify(request);
    if (this.mutationIntent?.signature !== signature) this.mutationIntent = { signature, key: createIdempotencyKey() };
    return this.mutationIntent.key;
  }

  private async reviewIdentity(): Promise<boolean> {
    const signature = this.registrationSignature();
    if (this.matchSignature !== signature) {
      const value = this.createModel(), sequence = ++this.identitySequence;
      const result = await firstValueFrom(this.api.registrationMatches({
        mode: 'Search', doctorPracticeId: this.selectedPracticeId(),
        email: value.email.trim() || undefined, phoneNumber: value.phoneNumber.trim() || undefined,
        nameAr: value.nameAr.trim(), dateOfBirth: value.dateOfBirth,
        gender: value.gender as 'Male' | 'Female', pageSize: 20,
      }));
      if (sequence !== this.identitySequence || signature !== this.registrationSignature()) return false;
      this.matchSignature = signature;
      this.identityMatches.set(result);
    }
    const result = this.identityMatches();
    const allowed = this.registrationAccountMode() === 'full' ? result?.canCreateFull : result?.canCreateBasic;
    if (allowed !== true || result?.requiresClaimForAccount) {
      this.toast.error(this.uiLanguage.t('identityReview.existingRecord'));
      return false;
    }
    if (result?.matchOutcome === 'NoMatch' && !result.candidates?.length) return true;
    if (!this.canDistinguish() || !this.distinctPersonConfirmed() || !this.fullRegistrationVerifiedInPerson() || this.matchReviewReason().trim().length < 10 || this.matchReviewReason().trim().length > 500) {
      this.toast.error(this.uiLanguage.t('identityReview.reviewRequired'));
      return false;
    }
    return true;
  }

  protected updateRegistrationText(kind: 'reason' | 'note', event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    (kind === 'reason' ? this.matchReviewReason : this.fullRegistrationNote).set(value);
  }
  protected updateRegistrationBasis(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'GovernmentIdSeen' || value === 'ApprovedAlternateEvidence') this.fullRegistrationBasis.set(value);
  }
  protected toggleIdentityReview(kind: 'verified' | 'distinct', event: Event): void {
    (kind === 'verified' ? this.fullRegistrationVerifiedInPerson : this.distinctPersonConfirmed).set((event.target as HTMLInputElement).checked);
  }

  protected chooseLinkedContact(patient: PatientSearchItem): void {
    this.linkedContact.set(patient);
    this.createModel.update(value => ({ ...value, primaryContactLinkedPatientId: patient.patientId, primaryContactNameAr: patient.nameAr, primaryContactPhoneNumber: patient.phoneNumber ?? '' }));
    this.contactPickerOpen.set(false);
  }
  protected clearLinkedContact(): void {
    this.linkedContact.set(null);
    this.createModel.update(value => ({ ...value, primaryContactLinkedPatientId: '' }));
  }
  protected openContactPicker(): void {
    if (this.canSearch() && this.selectedPracticeAllows(PERMISSIONS.patientsSearchBasic)) this.contactPickerOpen.set(true);
  }

  protected async reuseCandidate(candidate: RegistrationCandidate): Promise<void> {
    if (this.isCreating() || !this.canVerifyClaimIdentity() || !this.selectedPracticeAllows(PERMISSIONS.patientsRegistrationMatch) || !this.fullRegistrationVerifiedInPerson() || !this.identityMatches()?.candidates?.some(item => item.patientId === candidate.patientId)) return;
    const generation = this.contextGeneration, signature = this.registrationSignature();
    this.isCreating.set(true);
    try {
      const request = { mode: 'ConfirmReuse' as const, doctorPracticeId: this.selectedPracticeId(), patientId: candidate.patientId, verifiedInPerson: true, verificationBasis: this.fullRegistrationBasis(), reason: this.matchReviewReason().trim() || undefined };
      const response = await firstValueFrom(this.api.registrationMatches(request, this.mutationKey(request)));
      if (generation !== this.contextGeneration || signature !== this.registrationSignature()) return;
      if (response.patientId !== candidate.patientId) throw new Error('Invalid reuse response');
      this.reusedPatient.set(candidate);
      this.selectedPatient.set(null);
      this.selectedPatientId.set('');
      this.registrationOpen.set(false);
      this.toast.success(this.uiLanguage.t('identityReview.reuseSuccess'));
      this.mutationIntent = null;
      if (this.returnToQueue) await this.continueWalkIn();
    } catch (error) {
      if (generation === this.contextGeneration) this.toast.error(flattenErrors(error).join(' ') || this.uiLanguage.t('common.requestFailed'));
    } finally { this.isCreating.set(false); }
  }

  protected async continueWalkIn(): Promise<void> {
    const practiceId = this.selectedPracticeId();
    const generation = this.contextGeneration;
    if (!practiceId || !this.returnToQueue || !this.canSearch()) return;
    let patient = this.selectedPatient();
    const reused = this.reusedPatient();
    if (!patient && reused) {
      const model = this.createModel();
      const result = await firstValueFrom(this.api.search({ doctorPracticeId: practiceId,
        name: model.nameAr.trim() || reused.nameAr || undefined, phoneNumber: model.phoneNumber.trim() || undefined,
        dateOfBirth: model.dateOfBirth || undefined, pageNumber: 1, pageSize: 20 }));
      patient = result.items.find(item => item.patientId === reused.patientId) ?? null;
    }
    if (!patient || generation !== this.contextGeneration || practiceId !== this.selectedPracticeId()) return;
    this.registrationHandoff.stage(practiceId, patient);
    await this.router.navigate(['/reception/queue'], { queryParams: { practiceId } });
  }

  protected bookReusedPatient(): void {
    if (this.returnToQueue) { void this.continueWalkIn(); return; }
    const patient = this.reusedPatient();
    if (!patient || !this.selectedPracticeId() || !this.canBook()) return;
    void this.router.navigate(['/reception/reservations'], { queryParams: { practiceId: this.selectedPracticeId(), patientId: patient.patientId } });
  }

  protected async createPatient(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canRegister()) return;
    if (this.registrationAccountMode() === 'basic' && !this.canRegisterBasic()) return;
    await submit(this.createForm, async () => {
      if (this.isCreating()) return;
      this.isCreating.set(true);
      this.clearFeedback();
      const generation = this.contextGeneration;
      try {
        const value = this.createModel();
        const practiceId = this.selectedPracticeId();
        if (!practiceId || !this.canVerifyClaimIdentity() || !this.selectedPracticeAllows(PERMISSIONS.patientsRegistrationMatch)) {
          this.toast.error(this.uiLanguage.t('identityReview.permissionRequired'));
          return;
        }
        if (this.registrationAccountMode() === 'full' && !this.canRegisterFull()) return;
        if (!await this.reviewIdentity()) return;
        if (generation !== this.contextGeneration) return;
        const distinct = this.canDistinguish();
        const reason = this.matchReviewReason().trim();
        let responsePatientId = '';
        if (this.registrationAccountMode() === 'full') {
          if (!value.email.trim()) {
            this.messages.set(['validation.emailRequired']);
            this.toast.error(this.uiLanguage.t('validation.emailRequired'));
            return;
          }
          if (!this.fullRegistrationVerifiedInPerson()) {
            this.toast.error(this.uiLanguage.t('identityReview.verifyRequired'));
            return;
          }
          const request = {
              doctorPracticeId: this.selectedPracticeId(),
              nameAr: value.nameAr,
              nameEn: value.nameEn || undefined,
              dateOfBirth: value.dateOfBirth,
              gender: value.gender as 'Male' | 'Female',
              phoneNumber: value.phoneNumber,
              email: value.email.trim(),
              verifiedInPerson: this.fullRegistrationVerifiedInPerson(),
              identityVerificationBasis: this.fullRegistrationBasis(),
              verificationNote: this.fullRegistrationNote().trim() || undefined,
              ...(distinct ? { matchReviewOutcome: 'DistinctPerson' as const, matchReviewReason: reason } : {}),
              profileImage: this.profileImage(),
              personalIdFrontImage: this.personalIdFrontImage(),
              personalIdBackImage: this.personalIdBackImage(),
          };
          const fullRes = await firstValueFrom(this.api.registerFull(request, this.mutationKey(request)));
          responsePatientId = fullRes.patientId;
          this.fullAccountActivationInfo.set({
            activationEmailMasked: fullRes.activationEmailMasked,
            invitationExpiresOnUtc: fullRes.invitationExpiresOnUtc,
          });
        } else {
          const request = {
              ...value,
              doctorPracticeId: this.selectedPracticeId(),
              gender: value.gender as 'Male' | 'Female',
              primaryContactIsPrimary: true,
              profileImage: this.profileImage(),
              ...(distinct ? { matchReviewOutcome: 'DistinctPerson' as const, matchReviewReason: reason, matchingAttestationBasis: this.fullRegistrationBasis() } : {}),
          };
          const response = await firstValueFrom(this.api.create(request, this.mutationKey(request)));
          responsePatientId = response.patientId;
        }
        this.toast.success(this.uiLanguage.t('patient.registered'));
        this.mutationIntent = null;
        if (generation !== this.contextGeneration) return;
        if (generation === this.contextGeneration) {
          this.createdPatientId.set(responsePatientId);
          this.selectedPatientId.set(responsePatientId);
          this.selectedPatient.set({
            patientId: responsePatientId,
            nameAr: value.nameAr,
            nameEn: value.nameEn || null,
            dateOfBirth: value.dateOfBirth,
            gender: value.gender as 'Male' | 'Female',
            phoneNumber: value.phoneNumber || null,
            hasContactPhone: !!value.primaryContactPhoneNumber,
          });
        }
        this.registrationOpen.set(false);
        if (this.returnToQueue) await this.continueWalkIn();
        this.createModel.set({
          nameAr: '',
          nameEn: '',
          dateOfBirth: '',
          gender: '',
          phoneNumber: '',
          email: '',
          primaryContactNameAr: '',
          primaryContactPhoneNumber: '',
          primaryContactRelationshipType: 'Guardian',
          primaryContactLinkedPatientId: '',
        });
        this.profileImage.set(undefined);
        this.linkedContact.set(null);
        this.personalIdFrontImage.set(undefined);
        this.personalIdBackImage.set(undefined);
        this.createForm().reset();
      } catch (error) {
        this.messages.set(flattenErrors(error));
        this.toast.error(this.messages().join(' ') || this.uiLanguage.t('common.requestFailed'));
      } finally {
        this.isCreating.set(false);
      }
    });
  }

  protected async search(pageNumber = 1, event?: Event): Promise<void> {
    event?.preventDefault();
    if (
      !this.canSearch() ||
      !this.selectedPracticeId() ||
      !this.selectedPracticeAllows(PERMISSIONS.patientsSearchBasic)
    ) {
      this.messages.set([this.uiLanguage.t('ui.full.761')]);
      return;
    }
    if (!this.hasValidSearchCriteria()) {
      if (!event) return;
      const msg = this.uiLanguage.t('reception.patients.searchRuleHelp');
      this.toast.error(msg);
      this.messages.set([msg]);
      return;
    }
    this.clearFeedback();
    this.results.set(null);
    this.selectedPatient.set(null);
    this.selectedPatientId.set('');
    const sequence = ++this.searchSequence;
    const practiceId = this.selectedPracticeId();
    this.isSearching.set(true);
    try {
      this.pageNumber.set(pageNumber);
      const result = await firstValueFrom(
        this.api.search({
          ...this.searchModel(),
          doctorPracticeId: practiceId,
          pageNumber,
        }),
      );
      if (sequence === this.searchSequence && this.selectedPracticeId() === practiceId)
        this.results.set(result);
    } catch (error) {
      if (sequence !== this.searchSequence) return;
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 403) {
        await this.refreshAccessContext();
      }
      this.toast.error(this.messages().join(' ') || this.uiLanguage.t('common.requestFailed'));
    } finally {
      if (sequence === this.searchSequence && this.selectedPracticeId() === practiceId) {
        this.isSearching.set(false);
      }
    }
  }

  protected choose(patientId: string): void {
    const patient = this.results()?.items.find((item) => item.patientId === patientId);
    if (!patient) return;
    this.selectedPatientId.set(patientId);
    this.selectedPatient.set(patient);
    this.createdPatientId.set('');
  }

  protected book(): void {
    const patient = this.selectedPatient();
    const practiceId = this.selectedPracticeId();
    if (!patient || !practiceId || !this.canBook()) return;
    const date = new Date();
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    void this.router.navigate(['/reception/reservations'], {
      queryParams: { practiceId, patientId: patient.patientId, date: localDate },
      state: { receptionPatient: { ...patient, practiceId } },
    });
  }

  protected fileChanged(event: Event): void {
    this.mutationIntent = null;
    this.profileImage.set((event.currentTarget as HTMLInputElement).files?.[0]);
  }

  protected idFrontFileChanged(event: Event): void {
    this.mutationIntent = null;
    this.personalIdFrontImage.set((event.currentTarget as HTMLInputElement).files?.[0]);
  }

  protected idBackFileChanged(event: Event): void {
    this.mutationIntent = null;
    this.personalIdBackImage.set((event.currentTarget as HTMLInputElement).files?.[0]);
  }

  protected openAttestationDrawer(): void {
    if (!this.selectedPatient() || !this.canVerifyClaimIdentity()) return;
    this.generatedAttestationId.set('');
    this.attestationModel.set({
      claimantEmail: '',
      verificationBasis: 'GovernmentIdSeen',
      verifiedInPerson: true,
      reason: '',
    });
    this.attestationDrawerOpen.set(true);
  }

  protected updateAttestationField(
    field: 'claimantEmail' | 'verificationBasis' | 'reason',
    event: Event,
  ): void {
    const val = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.attestationModel.update((m) => ({ ...m, [field]: val }));
  }

  protected toggleAttestationInPerson(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.attestationModel.update((m) => ({ ...m, verifiedInPerson: checked }));
  }

  protected async submitClaimIdentityAttestation(event: Event): Promise<void> {
    event.preventDefault();
    const patient = this.selectedPatient();
    const practiceId = this.selectedPracticeId();
    if (!patient || !practiceId || !this.canVerifyClaimIdentity() || this.isSubmittingAttestation())
      return;

    const am = this.attestationModel();
    if (!am.claimantEmail.trim() || !am.claimantEmail.includes('@')) {
      this.toast.error(this.uiLanguage.t('validation.emailValid'));
      return;
    }
    if (!am.verifiedInPerson || !am.reason.trim()) {
      this.toast.error(this.uiLanguage.t('reception.patients.attestationFieldsRequired'));
      return;
    }

    this.isSubmittingAttestation.set(true);
    try {
      const request = {
          mode: 'ConfirmClaimIdentity' as const,
          doctorPracticeId: practiceId,
          patientId: patient.patientId,
          claimantEmail: am.claimantEmail.trim(),
          verifiedInPerson: am.verifiedInPerson,
          verificationBasis: am.verificationBasis,
          reason: am.reason.trim(),
        };
      const response = await firstValueFrom(this.api.registrationMatches(request, this.mutationKey(request)));
      this.generatedAttestationId.set(response.attestationId || '');
      this.toast.success(this.uiLanguage.t('reception.patients.attestationCreatedToast'));
      this.mutationIntent = null;
    } catch (error) {
      const errs = flattenErrors(error);
      this.toast.error(errs.join(' ') || this.uiLanguage.t('common.requestFailed'));
    } finally {
      this.isSubmittingAttestation.set(false);
    }
  }

  protected async copyAttestationId(): Promise<void> {
    const id = this.generatedAttestationId();
    if (!id) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(id);
      } else throw new Error('Clipboard unavailable');
      this.toast.success(this.uiLanguage.t('reception.patients.attestationCopied'));
    } catch {
      this.toast.error(this.uiLanguage.t('reception.audit.copyFailed'));
    }
  }

  protected selectedPracticeAllows(permission: string): boolean {
    return this.practiceContext.allows(permission);
  }

  protected displayName(patient: PatientSearchItem): string {
    return this.uiLanguage.currentLang() === 'en'
      ? patient.nameEn || patient.nameAr
      : patient.nameAr;
  }

  private clearFeedback(): void {
    this.messages.set([]);
    this.createdPatientId.set('');
  }

  private async loadPractices(): Promise<void> {
    await this.practiceContext.refresh();
    this.messages.set(this.practiceContext.messages());
  }

  private async refreshAccessContext(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authApi.currentUser());
      this.session.complete(user);
      if (!user.permissions.includes(PERMISSIONS.patientsSearchBasic)) {
        await this.router.navigate([this.session.destinationFor(user)]);
        return;
      }
    } catch {
      return;
    }
    await this.loadPractices();
  }
}

function today(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
