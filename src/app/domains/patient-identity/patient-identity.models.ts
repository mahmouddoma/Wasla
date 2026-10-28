export type OnboardingPurpose = 'Register' | 'Claim' | 'EmailChange';

export interface StartEmailVerificationRequest {
  readonly email: string;
  readonly purpose: OnboardingPurpose;
  readonly patientReference?: string;
}

export interface StartEmailVerificationResponse {
  readonly requestId: string;
  readonly message: string;
}

export interface VerifyEmailOtpRequest {
  readonly requestId: string;
  readonly otp: string;
}

export interface VerifyEmailOtpResponse {
  readonly verificationToken: string;
  readonly expiresOnUtc: string;
  readonly nextAction: string;
}

export interface RegisterVerifiedPatientAccountRequest {
  readonly emailVerificationToken: string;
  readonly userName: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly nameAr: string;
  readonly dateOfBirth: string;
  readonly gender: 'Male' | 'Female';
  readonly nameEn?: string;
  readonly profileImage?: File;
  readonly personalIdFrontImage?: File;
  readonly personalIdBackImage?: File;
}

export interface RegisterVerifiedPatientAccountResponse {
  readonly patientId: string;
  readonly applicationUserId: string;
  readonly accountStatus: string;
}

export interface SubmitPatientClaimRequest {
  readonly emailVerificationToken: string;
  readonly nameAr: string;
  readonly dateOfBirth: string;
  readonly gender: 'Male' | 'Female';
  readonly evidenceType: readonly string[];
  readonly patientReference?: string;
  readonly phoneNumber?: string;
  readonly identityFront?: File;
  readonly identityBack?: File;
  readonly birthCertificate?: File;
  readonly guardianRelationshipDocument?: File;
  readonly inPersonIdentityAttestationId?: string;
  readonly verificationNote?: string;
}

export interface SubmitPatientClaimResponse {
  readonly claimRequestId: string;
  readonly status: string;
  readonly submittedOnUtc: string;
  readonly canAccessMedicalRecord: boolean;
}

export interface TrackPatientClaimResponse {
  readonly claimRequestId: string;
  readonly status: string;
  readonly submittedOnUtc: string;
  readonly lastActivityOnUtc: string;
  readonly reasonForApplicant?: string;
  readonly canResubmit: boolean;
  readonly canActivate: boolean;
  readonly activationInvitationSent: boolean;
  readonly closedOnUtc?: string | null;
  readonly rowVersion: string;
}

export interface ResubmitPatientClaimRequest {
  readonly rowVersion: string;
  readonly reasonResponse: string;
  readonly evidenceType: readonly string[];
  readonly identityFront?: File;
  readonly identityBack?: File;
  readonly birthCertificate?: File;
  readonly guardianRelationshipDocument?: File;
  readonly inPersonIdentityAttestationId?: string;
  readonly identityProfileCorrections?: {
    readonly nameAr?: string;
    readonly dateOfBirth?: string;
    readonly gender?: 'Male' | 'Female';
    readonly phoneNumber?: string;
  };
}

export interface ResubmitPatientClaimResponse {
  readonly claimRequestId: string;
  readonly status: string;
  readonly revisionNumber: number;
  readonly rowVersion: string;
}

export interface ActivatePatientAccountRequest {
  readonly invitationToken: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export interface ActivatePatientAccountResponse {
  readonly patientId: string;
  readonly applicationUserId: string;
  readonly accountStatus: string;
  readonly requiresLogin: boolean;
}

export interface ResendActivationRequest {
  readonly email: string;
  readonly claimRequestId?: string;
  readonly verificationToken?: string;
}

export interface ResendActivationResponse {
  readonly message: string;
}

export interface AdminPatientClaimSummaryItem {
  readonly id: string;
  readonly status: string;
  readonly claimantEmailMasked: string;
  readonly submittedOnUtc: string;
  readonly lastActivityOnUtc: string;
  readonly evidenceCount: number;
  readonly rowVersion: string;
}

export interface AdminPatientClaimsPage {
  readonly items: readonly AdminPatientClaimSummaryItem[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface AdminClaimantInfo {
  readonly nameAr: string;
  readonly dateOfBirth: string;
  readonly gender: string;
  readonly email: string;
  readonly phoneMasked: string;
}

export interface AdminCandidatePatient {
  readonly patientId: string;
  readonly nameAr: string;
  readonly dateOfBirth: string;
  readonly gender: string;
  readonly emailMasked: string;
}

export interface AdminClaimEvidenceItem {
  readonly evidenceId: string;
  readonly type: string;
  readonly revisionNumber: number;
  readonly uploadedOnUtc: string;
}

export interface AdminClaimDetails {
  readonly claimRequestId: string;
  readonly status: string;
  readonly claimant: AdminClaimantInfo;
  readonly patientReference?: string;
  readonly candidatePatients: readonly AdminCandidatePatient[];
  readonly evidence: readonly AdminClaimEvidenceItem[];
  readonly historySummary?: string;
  readonly submittedOnUtc: string;
  readonly lastActivityOnUtc: string;
  readonly rowVersion: string;
  readonly reviewCapabilities: {
    readonly canApprove: boolean;
    readonly canReject: boolean;
    readonly canRequestModification: boolean;
  };
}

export interface ApprovePatientClaimRequest {
  readonly targetPatientId: string;
  readonly rowVersion: string;
  readonly reviewedEvidenceIds: readonly string[];
  readonly reviewNote?: string;
}

export interface ApprovePatientClaimResponse {
  readonly claimRequestId: string;
  readonly status: string;
  readonly targetPatientId: string;
  readonly rowVersion: string;
  readonly invitationExpiresOnUtc: string;
}

export interface RejectPatientClaimRequest {
  readonly rowVersion: string;
  readonly reason: string;
}

export interface RejectPatientClaimResponse {
  readonly claimRequestId: string;
  readonly status: string;
  readonly closedOnUtc: string;
  readonly rowVersion: string;
  readonly canResubmit: boolean;
}

export interface RequestClaimModificationRequest {
  readonly rowVersion: string;
  readonly reason: string;
}

export interface RequestClaimModificationResponse {
  readonly claimRequestId: string;
  readonly status: string;
  readonly rowVersion: string;
  readonly canResubmit: boolean;
  readonly closedOnUtc: null;
}

export interface ClaimHistoryItem {
  readonly id: string;
  readonly action: string;
  readonly actorName: string;
  readonly timestampUtc: string;
  readonly note?: string;
}

export interface PatientDuplicateQueueItem {
  readonly id: string;
  readonly primaryPatientId: string;
  readonly duplicatePatientId: string;
  readonly confidenceScore: number;
  readonly status: 'PendingReview' | 'Resolved' | 'Dismissed';
  readonly matchedCriteria: readonly string[];
  readonly detectedOnUtc: string;
  readonly rowVersion: string;
}

export interface PatientDuplicatesPage {
  readonly items: readonly PatientDuplicateQueueItem[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface PatientDuplicateDetails {
  readonly id: string;
  readonly primaryPatient: AdminCandidatePatient;
  readonly duplicatePatient: AdminCandidatePatient;
  readonly confidenceScore: number;
  readonly status: string;
  readonly matchedCriteria: readonly string[];
  readonly detectedOnUtc: string;
  readonly rowVersion: string;
}

export interface ResolvePatientDuplicateRequest {
  readonly resolutionAction: 'Merge' | 'KeepSeparate';
  readonly targetPatientId: string;
  readonly reason: string;
  readonly rowVersion: string;
}

export interface ResolvePatientDuplicateResponse {
  readonly id: string;
  readonly status: string;
  readonly resolvedAtUtc: string;
  readonly rowVersion: string;
}
