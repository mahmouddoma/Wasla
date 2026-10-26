import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PatientIdentityApi } from './patient-identity-api';
import { environment } from '../../../environments/environment';

describe('PatientIdentityApi', () => {
  let api: PatientIdentityApi;
  let http: HttpTestingController;
  const baseUrl = environment.apiBaseUrl;
  const onboardingUrl = `${baseUrl}/api/v1/patient-onboarding`;
  const adminClaimsUrl = `${baseUrl}/api/v1/admin/patient-claims`;
  const adminDuplicatesUrl = `${baseUrl}/api/v1/admin/patient-duplicates`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PatientIdentityApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PatientIdentityApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // WAS-613
  it('WAS-613: startEmailVerification posts request', () => {
    api.startEmailVerification({ email: 'test@example.com', purpose: 'Register' }).subscribe((res) => {
      expect(res.requestId).toBe('req1');
    });
    const req = http.expectOne(`${onboardingUrl}/start`);
    expect(req.request.method).toBe('POST');
    req.flush({ requestId: 'req1', message: 'OTP sent' }, { status: 202, statusText: 'Accepted' });
  });

  // WAS-614
  it('WAS-614: verifyEmailOtp posts otp', () => {
    api.verifyEmailOtp({ requestId: 'req1', otp: '123456' }).subscribe((res) => {
      expect(res.verificationToken).toBe('tok1');
    });
    const req = http.expectOne(`${onboardingUrl}/verify-email`);
    expect(req.request.method).toBe('POST');
    req.flush({ verificationToken: 'tok1', expiresOnUtc: '2026-10-27', nextAction: 'Register' });
  });

  // WAS-615
  it('WAS-615: registerVerifiedAccount posts multipart registration', () => {
    api.registerVerifiedAccount({
      emailVerificationToken: 'tok1',
      userName: 'patient1',
      email: 'p@test.com',
      phoneNumber: '01000000000',
      password: 'Pass',
      confirmPassword: 'Pass',
      nameAr: 'مريض',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
    }).subscribe((res) => {
      expect(res.patientId).toBe('pt1');
    });
    const req = http.expectOne(`${onboardingUrl}/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ patientId: 'pt1', applicationUserId: 'u1', accountStatus: 'Active' }, { status: 201, statusText: 'Created' });
  });

  // WAS-616
  it('WAS-616: submitClaim posts multipart claim', () => {
    api.submitClaim({
      emailVerificationToken: 'tok1',
      nameAr: 'مريض',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      evidenceType: ['GovernmentIdFront'],
    }).subscribe((res) => {
      expect(res.claimRequestId).toBe('cl1');
    });
    const req = http.expectOne(`${onboardingUrl}/claims`);
    expect(req.request.method).toBe('POST');
    req.flush({ claimRequestId: 'cl1', status: 'PendingReview', submittedOnUtc: '2026-10-01', canAccessMedicalRecord: false }, { status: 201, statusText: 'Created' });
  });

  // WAS-617
  it('WAS-617: trackClaim gets claim status', () => {
    api.trackClaim('cl1', 'token123').subscribe((res) => {
      expect(res.claimRequestId).toBe('cl1');
    });
    const req = http.expectOne(`${onboardingUrl}/claims/cl1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Onboarding-Token')).toBe('token123');
    req.flush({ claimRequestId: 'cl1', status: 'PendingReview', submittedOnUtc: '2026-10-01', lastActivityOnUtc: '2026-10-01', canResubmit: false, canActivate: false, activationInvitationSent: false, rowVersion: 'v1' });
  });

  // WAS-618
  it('WAS-618: resubmitClaim posts updated evidence', () => {
    api.resubmitClaim('cl1', { rowVersion: 'v1', reasonResponse: 'Updated ID', evidenceType: ['GovernmentIdFront'] }, 'tok1').subscribe((res) => {
      expect(res.revisionNumber).toBe(2);
    });
    const req = http.expectOne(`${onboardingUrl}/claims/cl1/resubmit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Onboarding-Token')).toBe('tok1');
    req.flush({ claimRequestId: 'cl1', status: 'PendingReview', revisionNumber: 2, rowVersion: 'v2' });
  });

  // WAS-619
  it('WAS-619: activateAccount posts activation token and password', () => {
    api.activateAccount({ invitationToken: 'inv1', password: 'Pass', confirmPassword: 'Pass' }).subscribe((res) => {
      expect(res.accountStatus).toBe('Active');
    });
    const req = http.expectOne(`${onboardingUrl}/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({ patientId: 'pt1', applicationUserId: 'u1', accountStatus: 'Active', requiresLogin: true });
  });

  // WAS-620
  it('WAS-620: resendActivation posts resend request', () => {
    api.resendActivation({ email: 'test@example.com' }).subscribe((res) => {
      expect(res.message).toBe('Resent');
    });
    const req = http.expectOne(`${onboardingUrl}/activation/resend`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Resent' }, { status: 202, statusText: 'Accepted' });
  });

  // WAS-621
  it('WAS-621: adminClaims queries claims list', () => {
    api.adminClaims('PendingReview', 1, 20).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne(
      (r) =>
        r.url === adminClaimsUrl &&
        r.params.get('status') === 'PendingReview' &&
        r.params.get('pageNumber') === '1',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'cl1', status: 'PendingReview', claimantEmailMasked: 't***@test.com', submittedOnUtc: '2026-10-01', lastActivityOnUtc: '2026-10-01', evidenceCount: 1, rowVersion: 'v1' }], pageNumber: 1, pageSize: 20, totalCount: 1 });
  });

  // WAS-622
  it('WAS-622: adminClaimDetails gets claim details', () => {
    api.adminClaimDetails('cl1').subscribe((res) => {
      expect(res.claimRequestId).toBe('cl1');
    });
    const req = http.expectOne(`${adminClaimsUrl}/cl1`);
    expect(req.request.method).toBe('GET');
    req.flush({
      claimRequestId: 'cl1',
      status: 'PendingReview',
      claimant: { nameAr: 'مريض', dateOfBirth: '1990-01-01', gender: 'Male', email: 'p@test.com', phoneMasked: '010***' },
      candidatePatients: [],
      evidence: [],
      submittedOnUtc: '2026-10-01',
      lastActivityOnUtc: '2026-10-01',
      rowVersion: 'v1',
      reviewCapabilities: { canApprove: true, canReject: true, canRequestModification: true },
    });
  });

  // WAS-623
  it('WAS-623: adminClaimEvidence downloads evidence blob', () => {
    api.adminClaimEvidence('cl1', 'ev1').subscribe((res) => {
      expect(res.status).toBe(200);
    });
    const req = http.expectOne(`${adminClaimsUrl}/cl1/evidence/ev1`);
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['evidence']), { status: 200, statusText: 'OK' });
  });

  // WAS-624
  it('WAS-624: approveClaim posts approval', () => {
    const payload = { targetPatientId: 'pt1', rowVersion: 'v1', reviewedEvidenceIds: ['ev1'] };
    api.approveClaim('cl1', payload).subscribe((res) => {
      expect(res.status).toBe('ApprovedPendingActivation');
    });
    const req = http.expectOne(`${adminClaimsUrl}/cl1/approve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ claimRequestId: 'cl1', status: 'ApprovedPendingActivation', targetPatientId: 'pt1', rowVersion: 'v2', invitationExpiresOnUtc: '2026-10-27' });
  });

  // WAS-625
  it('WAS-625: rejectClaim posts rejection', () => {
    const payload = { rowVersion: 'v1', reason: 'Invalid identity' };
    api.rejectClaim('cl1', payload).subscribe((res) => {
      expect(res.status).toBe('Rejected');
    });
    const req = http.expectOne(`${adminClaimsUrl}/cl1/reject`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ claimRequestId: 'cl1', status: 'Rejected', closedOnUtc: '2026-10-01', rowVersion: 'v2', canResubmit: false });
  });

  // WAS-626
  it('WAS-626: requestClaimModification posts modification request', () => {
    const payload = { rowVersion: 'v1', reason: 'Better scan required' };
    api.requestClaimModification('cl1', payload).subscribe((res) => {
      expect(res.status).toBe('ModificationRequested');
    });
    const req = http.expectOne(`${adminClaimsUrl}/cl1/request-modification`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ claimRequestId: 'cl1', status: 'ModificationRequested', rowVersion: 'v2', canResubmit: true, closedOnUtc: null });
  });

  // WAS-627
  it('WAS-627: claimHistory gets history list', () => {
    api.claimHistory('cl1').subscribe((res) => {
      expect(res.length).toBe(1);
    });
    const req = http.expectOne(`${adminClaimsUrl}/cl1/history`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'h1', action: 'Approved', actorName: 'Admin', timestampUtc: '2026-10-01' }]);
  });

  // WAS-628
  it('WAS-628: adminDuplicates queries duplicate queue', () => {
    api.adminDuplicates(1, 20).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne(
      (r) =>
        r.url === adminDuplicatesUrl &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'dp1', primaryPatientId: 'pt1', duplicatePatientId: 'pt2', confidenceScore: 0.95, status: 'PendingReview', matchedCriteria: ['Phone', 'DOB'], detectedOnUtc: '2026-10-01', rowVersion: 'v1' }], pageNumber: 1, pageSize: 20, totalCount: 1 });
  });

  // WAS-629
  it('WAS-629: adminDuplicateDetails gets duplicate case detail', () => {
    api.adminDuplicateDetails('dp1').subscribe((res) => {
      expect(res.id).toBe('dp1');
    });
    const req = http.expectOne(`${adminDuplicatesUrl}/dp1`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'dp1',
      primaryPatient: { patientId: 'pt1', nameAr: 'مريض 1', dateOfBirth: '1990-01-01', gender: 'Male', emailMasked: 'p1@test.com' },
      duplicatePatient: { patientId: 'pt2', nameAr: 'مريض 2', dateOfBirth: '1990-01-01', gender: 'Male', emailMasked: 'p2@test.com' },
      confidenceScore: 0.95,
      status: 'PendingReview',
      matchedCriteria: ['Phone', 'DOB'],
      detectedOnUtc: '2026-10-01',
      rowVersion: 'v1',
    });
  });

  // WAS-630
  it('WAS-630: resolveDuplicate resolves case', () => {
    const payload = { resolutionAction: 'Merge' as const, targetPatientId: 'pt1', reason: 'Confirmed duplicate', rowVersion: 'v1' };
    api.resolveDuplicate('dp1', payload).subscribe((res) => {
      expect(res.status).toBe('Resolved');
    });
    const req = http.expectOne(`${adminDuplicatesUrl}/dp1/resolve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'dp1', status: 'Resolved', resolvedAtUtc: '2026-10-01', rowVersion: 'v2' });
  });
});
