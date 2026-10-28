import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivatePatientAccountRequest,
  ActivatePatientAccountResponse,
  AdminClaimDetails,
  AdminPatientClaimsPage,
  ApprovePatientClaimRequest,
  ApprovePatientClaimResponse,
  ClaimHistoryItem,
  PatientDuplicateDetails,
  PatientDuplicatesPage,
  RegisterVerifiedPatientAccountRequest,
  RegisterVerifiedPatientAccountResponse,
  RejectPatientClaimRequest,
  RejectPatientClaimResponse,
  RequestClaimModificationRequest,
  RequestClaimModificationResponse,
  ResendActivationRequest,
  ResendActivationResponse,
  ResolvePatientDuplicateRequest,
  ResolvePatientDuplicateResponse,
  ResubmitPatientClaimRequest,
  ResubmitPatientClaimResponse,
  StartEmailVerificationRequest,
  StartEmailVerificationResponse,
  SubmitPatientClaimRequest,
  SubmitPatientClaimResponse,
  TrackPatientClaimResponse,
  VerifyEmailOtpRequest,
  VerifyEmailOtpResponse,
} from './patient-identity.models';

@Injectable({ providedIn: 'root' })
export class PatientIdentityApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly onboardingUrl = `${this.baseUrl}/api/v1/patient-onboarding`;
  private readonly adminClaimsUrl = `${this.baseUrl}/api/v1/admin/patient-claims`;
  private readonly adminDuplicatesUrl = `${this.baseUrl}/api/v1/admin/patient-duplicates`;

  // === Patient Onboarding Flow (WAS-613 .. WAS-620) ===

  startEmailVerification(
    request: StartEmailVerificationRequest,
  ): Observable<StartEmailVerificationResponse> {
    return this.http.post<StartEmailVerificationResponse>(`${this.onboardingUrl}/start`, request);
  }

  verifyEmailOtp(request: VerifyEmailOtpRequest): Observable<VerifyEmailOtpResponse> {
    return this.http.post<VerifyEmailOtpResponse>(`${this.onboardingUrl}/verify-email`, request);
  }

  registerVerifiedAccount(
    request: RegisterVerifiedPatientAccountRequest,
    idempotencyKey?: string,
  ): Observable<RegisterVerifiedPatientAccountResponse> {
    const formData = new FormData();
    formData.append('emailVerificationToken', request.emailVerificationToken);
    formData.append('userName', request.userName);
    formData.append('email', request.email);
    formData.append('phoneNumber', request.phoneNumber);
    formData.append('password', request.password);
    formData.append('confirmPassword', request.confirmPassword);
    formData.append('nameAr', request.nameAr);
    formData.append('dateOfBirth', request.dateOfBirth);
    formData.append('gender', request.gender);
    if (request.nameEn) formData.append('nameEn', request.nameEn);
    if (request.profileImage) formData.append('profileImage', request.profileImage);
    if (request.personalIdFrontImage) {
      formData.append('personalIdFrontImage', request.personalIdFrontImage);
    }
    if (request.personalIdBackImage) {
      formData.append('personalIdBackImage', request.personalIdBackImage);
    }

    let headers = new HttpHeaders();
    if (idempotencyKey) headers = headers.set('Idempotency-Key', idempotencyKey);

    return this.http.post<RegisterVerifiedPatientAccountResponse>(
      `${this.onboardingUrl}/register`,
      formData,
      idempotencyKey ? { headers } : undefined,
    );
  }

  submitClaim(
    request: SubmitPatientClaimRequest,
    idempotencyKey?: string,
  ): Observable<SubmitPatientClaimResponse> {
    const formData = new FormData();
    formData.append('emailVerificationToken', request.emailVerificationToken);
    formData.append('nameAr', request.nameAr);
    formData.append('dateOfBirth', request.dateOfBirth);
    formData.append('gender', request.gender);
    for (const type of request.evidenceType) {
      formData.append('evidenceType', type);
    }
    if (request.patientReference) formData.append('patientReference', request.patientReference);
    if (request.phoneNumber) formData.append('phoneNumber', request.phoneNumber);
    if (request.identityFront) formData.append('identityFront', request.identityFront);
    if (request.identityBack) formData.append('identityBack', request.identityBack);
    if (request.birthCertificate) formData.append('birthCertificate', request.birthCertificate);
    if (request.guardianRelationshipDocument) {
      formData.append('guardianRelationshipDocument', request.guardianRelationshipDocument);
    }
    if (request.inPersonIdentityAttestationId) {
      formData.append('inPersonIdentityAttestationId', request.inPersonIdentityAttestationId);
    }
    if (request.verificationNote) formData.append('verificationNote', request.verificationNote);

    let headers = new HttpHeaders();
    if (idempotencyKey) headers = headers.set('Idempotency-Key', idempotencyKey);

    return this.http.post<SubmitPatientClaimResponse>(
      `${this.onboardingUrl}/claims`,
      formData,
      idempotencyKey ? { headers } : undefined,
    );
  }

  trackClaim(claimId: string, onboardingToken?: string): Observable<TrackPatientClaimResponse> {
    let headers = new HttpHeaders();
    if (onboardingToken) headers = headers.set('X-Onboarding-Token', onboardingToken);

    return this.http.get<TrackPatientClaimResponse>(`${this.onboardingUrl}/claims/${claimId}`, {
      headers,
    });
  }

  resubmitClaim(
    claimId: string,
    request: ResubmitPatientClaimRequest,
    onboardingToken?: string,
    idempotencyKey?: string,
  ): Observable<ResubmitPatientClaimResponse> {
    let headers = new HttpHeaders();
    if (onboardingToken) headers = headers.set('X-Onboarding-Token', onboardingToken);
    if (idempotencyKey) headers = headers.set('Idempotency-Key', idempotencyKey);

    const formData = new FormData();
    formData.append('rowVersion', request.rowVersion);
    formData.append('reasonResponse', request.reasonResponse);
    for (const type of request.evidenceType) {
      formData.append('evidenceType', type);
    }
    if (request.identityFront) formData.append('identityFront', request.identityFront);
    if (request.identityBack) formData.append('identityBack', request.identityBack);
    if (request.birthCertificate) formData.append('birthCertificate', request.birthCertificate);
    if (request.guardianRelationshipDocument) {
      formData.append('guardianRelationshipDocument', request.guardianRelationshipDocument);
    }
    if (request.inPersonIdentityAttestationId) {
      formData.append('inPersonIdentityAttestationId', request.inPersonIdentityAttestationId);
    }
    if (request.identityProfileCorrections) {
      const c = request.identityProfileCorrections;
      if (c.nameAr) formData.append('identityProfileCorrections.nameAr', c.nameAr);
      if (c.dateOfBirth) formData.append('identityProfileCorrections.dateOfBirth', c.dateOfBirth);
      if (c.gender) formData.append('identityProfileCorrections.gender', c.gender);
      if (c.phoneNumber) formData.append('identityProfileCorrections.phoneNumber', c.phoneNumber);
    }

    return this.http.post<ResubmitPatientClaimResponse>(
      `${this.onboardingUrl}/claims/${claimId}/resubmit`,
      formData,
      { headers },
    );
  }

  activateAccount(request: ActivatePatientAccountRequest): Observable<ActivatePatientAccountResponse> {
    return this.http.post<ActivatePatientAccountResponse>(
      `${this.onboardingUrl}/activate`,
      request,
    );
  }

  resendActivation(request: ResendActivationRequest): Observable<ResendActivationResponse> {
    return this.http.post<ResendActivationResponse>(
      `${this.onboardingUrl}/activation/resend`,
      request,
    );
  }

  // === SuperAdmin Patient Claims (WAS-621 .. WAS-627) ===

  adminClaims(
    status?: string,
    pageNumber = 1,
    pageSize = 20,
    emailSearch?: string,
  ): Observable<AdminPatientClaimsPage> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    if (status) params = params.set('status', status);
    if (emailSearch) params = params.set('emailSearch', emailSearch);

    return this.http.get<AdminPatientClaimsPage>(this.adminClaimsUrl, { params });
  }

  adminClaimDetails(claimId: string): Observable<AdminClaimDetails> {
    return this.http.get<AdminClaimDetails>(`${this.adminClaimsUrl}/${claimId}`);
  }

  adminClaimEvidence(claimId: string, evidenceId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.adminClaimsUrl}/${claimId}/evidence/${evidenceId}`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  approveClaim(
    claimId: string,
    request: ApprovePatientClaimRequest,
    idempotencyKey?: string,
  ): Observable<ApprovePatientClaimResponse> {
    let headers = new HttpHeaders();
    if (idempotencyKey) headers = headers.set('Idempotency-Key', idempotencyKey);

    return this.http.post<ApprovePatientClaimResponse>(
      `${this.adminClaimsUrl}/${claimId}/approve`,
      request,
      idempotencyKey ? { headers } : undefined,
    );
  }

  rejectClaim(
    claimId: string,
    request: RejectPatientClaimRequest,
    idempotencyKey?: string,
  ): Observable<RejectPatientClaimResponse> {
    let headers = new HttpHeaders();
    if (idempotencyKey) headers = headers.set('Idempotency-Key', idempotencyKey);

    return this.http.post<RejectPatientClaimResponse>(
      `${this.adminClaimsUrl}/${claimId}/reject`,
      request,
      idempotencyKey ? { headers } : undefined,
    );
  }

  requestClaimModification(
    claimId: string,
    request: RequestClaimModificationRequest,
    idempotencyKey?: string,
  ): Observable<RequestClaimModificationResponse> {
    let headers = new HttpHeaders();
    if (idempotencyKey) headers = headers.set('Idempotency-Key', idempotencyKey);

    return this.http.post<RequestClaimModificationResponse>(
      `${this.adminClaimsUrl}/${claimId}/request-modification`,
      request,
      idempotencyKey ? { headers } : undefined,
    );
  }

  claimHistory(claimId: string): Observable<readonly ClaimHistoryItem[]> {
    return this.http.get<readonly ClaimHistoryItem[]>(`${this.adminClaimsUrl}/${claimId}/history`);
  }

  // === SuperAdmin Patient Duplicates (WAS-628 .. WAS-630) ===

  adminDuplicates(pageNumber = 1, pageSize = 20): Observable<PatientDuplicatesPage> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PatientDuplicatesPage>(this.adminDuplicatesUrl, { params });
  }

  adminDuplicateDetails(duplicateId: string): Observable<PatientDuplicateDetails> {
    return this.http.get<PatientDuplicateDetails>(`${this.adminDuplicatesUrl}/${duplicateId}`);
  }

  resolveDuplicate(
    duplicateId: string,
    request: ResolvePatientDuplicateRequest,
  ): Observable<ResolvePatientDuplicateResponse> {
    return this.http.post<ResolvePatientDuplicateResponse>(
      `${this.adminDuplicatesUrl}/${duplicateId}/resolve`,
      request,
    );
  }
}
