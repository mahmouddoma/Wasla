import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FamilyWorkspaceApi } from './family-workspace-api';
import { ChildIntake } from './family-workspace.models';

describe('PR38 family self-service wire contracts', () => {
  let api: FamilyWorkspaceApi, http: HttpTestingController;
  const root = environment.apiBaseUrl + '/api/v1';
  const own = '/families/mine';
  const child = own + '/dependents/child';
  const evidence = {
    evidenceFiles: [new File(['proof'], 'birth.pdf', { type: 'application/pdf' })],
    documentTypes: ['BirthCertificate'],
  };
  const intake: ChildIntake = {
    nameAr: 'طفل',
    nameEn: null,
    dateOfBirth: '2020-01-01',
    gender: 'Male',
    phoneNumber: null,
    primaryContactNameAr: 'أب',
    primaryContactPhone: '01012345678',
    relationToChild: 'Father',
  };
  const contact = {
    nameAr: 'أب',
    nameEn: null,
    phoneNumber: '01012345678',
    relationshipType: 'Father' as const,
    linkedPatientId: null,
    isPrimary: true,
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FamilyWorkspaceApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const cases: [string, string, string, () => Observable<unknown>][] = [
    ['WAS-775', 'GET', own + '/workspace', () => api.workspace()],
    ['WAS-776', 'POST', '/families/patient-candidates/search', () => api.search(intake)],
    [
      'WAS-777',
      'POST',
      '/family-relationship-requests/from-candidate',
      () => api.submitCandidate('opaque', 'Father', evidence, 'intent'),
    ],
    ['WAS-778', 'POST', own + '/child-onboarding', () => api.onboard(intake, evidence, 'intent')],
    ['WAS-779', 'GET', own + '/child-onboarding-requests', () => api.onboardingRequests()],
    [
      'WAS-780',
      'GET',
      own + '/child-onboarding-requests/request',
      () => api.onboardingDetails('request'),
    ],
    [
      'WAS-781',
      'POST',
      own + '/child-onboarding-requests/request/resubmit',
      () => api.resubmitOnboarding('request', 'AAAA', evidence, 'intent', intake),
    ],
    ['WAS-782', 'GET', '/admin/child-onboarding-requests', () => api.adminOnboardingRequests()],
    [
      'WAS-783',
      'GET',
      '/admin/child-onboarding-requests/request',
      () => api.adminOnboardingDetails('request', 2),
    ],
    [
      'WAS-784',
      'GET',
      '/admin/child-onboarding-requests/request/evidence/document/content',
      () => api.onboardingEvidence('request', 'document'),
    ],
    [
      'WAS-785',
      'POST',
      '/admin/child-onboarding-requests/request/approve',
      () =>
        api.decideOnboarding(
          'request',
          'approve',
          { rowVersion: 'AAAA', confirmedExistingPatientId: 'patient', reason: null },
          'intent',
        ),
    ],
    [
      'WAS-786',
      'POST',
      '/admin/child-onboarding-requests/request/reject',
      () =>
        api.decideOnboarding(
          'request',
          'reject',
          { rowVersion: 'AAAA', confirmedExistingPatientId: null, reason: 'reason' },
          'intent',
        ),
    ],
    [
      'WAS-787',
      'POST',
      '/admin/child-onboarding-requests/request/request-modification',
      () =>
        api.decideOnboarding(
          'request',
          'request-modification',
          { rowVersion: 'AAAA', confirmedExistingPatientId: null, reason: 'reason' },
          'intent',
        ),
    ],
    [
      'WAS-788',
      'GET',
      '/admin/family-operational-authorities',
      () => api.authorities('relationship'),
    ],
    [
      'WAS-789',
      'POST',
      '/admin/family-operational-authorities/authority/revoke',
      () => api.revokeAuthority('authority', 'AAAA', 'reason', 'intent'),
    ],
    ['WAS-790', 'GET', child + '/profile', () => api.profile('child')],
    ['WAS-791', 'GET', '/tickets/dependents/child/active', () => api.activeTickets('child')],
    ['WAS-792', 'GET', '/tickets/dependents/child/ticket', () => api.ticket('child', 'ticket')],
    ['WAS-793', 'GET', child + '/contacts', () => api.contacts('child')],
    ['WAS-794', 'GET', child + '/profile-image', () => api.profileImage('child')],
    [
      'WAS-795',
      'POST',
      child + '/contacts',
      () => api.addContact('child', 'AAAA', contact, 'intent'),
    ],
    ['WAS-796', 'PATCH', child + '/phone', () => api.updatePhone('child', 'AAAA', null, 'intent')],
    [
      'WAS-797',
      'PUT',
      child + '/contacts/contact',
      () => api.updateContact('child', 'contact', 'AAAA', contact, 'intent'),
    ],
    [
      'WAS-798',
      'DELETE',
      child + '/contacts/contact',
      () => api.deleteContact('child', 'contact', 'AAAA', 'intent'),
    ],
    [
      'WAS-799',
      'PATCH',
      child + '/profile',
      () => api.updatePhoto('child', 'AAAA', evidence.evidenceFiles[0], 'intent'),
    ],
    [
      'WAS-800',
      'POST',
      child + '/identity-corrections',
      () => api.requestIdentityCorrection('child', intake, 'reason', evidence, 'intent'),
    ],
    [
      'WAS-801',
      'POST',
      own + '/governance-cases/case/resubmit-conflict',
      () => api.resubmitConflict('case', 'AAAA', evidence, 'intent'),
    ],
    ['WAS-802', 'GET', own + '/governance-cases', () => api.governanceCases()],
    ['WAS-803', 'GET', own + '/governance-cases/case', () => api.governanceDetails('case')],
    ['WAS-804', 'GET', '/admin/family-governance-cases', () => api.adminGovernanceCases()],
    [
      'WAS-805',
      'GET',
      '/admin/family-governance-cases/case',
      () => api.adminGovernanceDetails('case'),
    ],
    [
      'WAS-806',
      'GET',
      '/admin/family-governance-cases/case/evidence/document/content',
      () => api.governanceEvidence('case', 'document'),
    ],
    [
      'WAS-807',
      'POST',
      '/admin/family-governance-cases/case/approve',
      () => api.decideGovernance('case', 'approve', 'AAAA', 'reason', 'intent'),
    ],
    [
      'WAS-808',
      'POST',
      '/admin/family-governance-cases/case/reject',
      () => api.decideGovernance('case', 'reject', 'AAAA', 'reason', 'intent'),
    ],
    [
      'WAS-809',
      'POST',
      '/admin/family-governance-cases/case/request-modification',
      () => api.decideGovernance('case', 'request-modification', 'AAAA', 'reason', 'intent'),
    ],
    [
      'WAS-810',
      'POST',
      '/admin/family-governance-cases/case/refer-governance',
      () => api.decideGovernance('case', 'refer-governance', 'AAAA', 'reason', 'intent'),
    ],
    ['WAS-811', 'POST', own + '/join-invitations', () => api.invite('child', 'Mother', 'intent')],
    [
      'WAS-812',
      'POST',
      own + '/join-invitations/revoke',
      () => api.revokeInvitation('opaque', 'intent'),
    ],
    [
      'WAS-813',
      'POST',
      own + '/join-requests',
      () => api.redeemInvitation('opaque', 'Mother', evidence, 'intent'),
    ],
    [
      'WAS-814',
      'POST',
      child + '/lab-requests/request/submissions',
      () => api.submitDiagnostic('child', 'lab', 'request', evidence.evidenceFiles, {}, 'intent'),
    ],
    [
      'WAS-815',
      'POST',
      child + '/radiology-requests/request/submissions',
      () =>
        api.submitDiagnostic('child', 'radiology', 'request', evidence.evidenceFiles, {}, 'intent'),
    ],
    [
      'WAS-816',
      'GET',
      child + '/lab-requests/request/submissions',
      () => api.diagnosticSubmissions('child', 'lab', 'request'),
    ],
    [
      'WAS-817',
      'GET',
      child + '/radiology-requests/request/submissions',
      () => api.diagnosticSubmissions('child', 'radiology', 'request'),
    ],
    [
      'WAS-818',
      'POST',
      child + '/lab-requests/request/submissions/submission/withdraw',
      () => api.withdrawDiagnostic('child', 'lab', 'request', 'submission', 'AAAA', 'intent'),
    ],
    [
      'WAS-819',
      'POST',
      child + '/radiology-requests/request/submissions/submission/withdraw',
      () => api.withdrawDiagnostic('child', 'radiology', 'request', 'submission', 'AAAA', 'intent'),
    ],
  ];
  it.each(cases)('%s binds %s %s', (_ticket, method, path, run) => {
    run().subscribe();
    const request = http.expectOne((r) => r.url === root + path);
    expect(request.request.method).toBe(method);
    if (method === 'GET' || path.endsWith('/search'))
      expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    else expect(request.request.headers.get('Idempotency-Key')).toBe('intent');
    request.flush(request.request.responseType === 'blob' ? new Blob(['private']) : {});
  });
  it('submits the opaque selection with one evidence type per file and no target identity', () => {
    api.submitCandidate('opaque', 'Mother', evidence, 'stable-key').subscribe();
    const request = http.expectOne(root + '/family-relationship-requests/from-candidate');
    const body = request.request.body as FormData;
    expect(body.get('candidateReference')).toBe('opaque');
    expect(body.get('relationshipType')).toBe('Mother');
    expect(body.getAll('DocumentTypes')).toEqual(['BirthCertificate']);
    expect(body.getAll('EvidenceFiles')).toEqual(evidence.evidenceFiles);
    expect(body.has('targetPatientId')).toBe(false);
    request.flush({});
  });
  it('keeps phone and contact deletion optimistic concurrency in the request body', () => {
    api.updatePhone('child', 'AAAA', null, 'phone-key').subscribe();
    const phone = http.expectOne(root + child + '/phone');
    expect(phone.request.body).toEqual({ rowVersion: 'AAAA', phoneNumber: null });
    phone.flush({});
    api.deleteContact('child', 'contact', 'BBBB', 'delete-key').subscribe();
    const deletion = http.expectOne(root + child + '/contacts/contact');
    expect(deletion.request.body).toEqual({ rowVersion: 'BBBB' });
    deletion.flush({});
  });
  it('pages duplicate matching independently from queue pagination', () => {
    api.adminOnboardingDetails('request', 3).subscribe();
    const request = http.expectOne((r) =>
      r.url.endsWith('/admin/child-onboarding-requests/request'),
    );
    expect(request.request.params.get('matchPageNumber')).toBe('3');
    expect(request.request.params.get('matchPageSize')).toBe('20');
    request.flush([]);
  });
  it('rejects mismatched evidence before sending a mutation', () => {
    expect(() => api.onboard(intake, { ...evidence, documentTypes: [] }, 'key')).toThrow();
    http.expectNone(root + own + '/child-onboarding');
  });
  it('limits identity correction to reviewed identity fields rather than routine contact edits', () => {
    api.requestIdentityCorrection('child', intake, 'Correction', evidence, 'key').subscribe();
    const request = http.expectOne(root + child + '/identity-corrections');
    const form = request.request.body as FormData;
    expect(form.get('nameAr')).toBe(intake.nameAr);
    expect(form.has('phoneNumber')).toBe(false);
    expect(form.has('primaryContactPhone')).toBe(false);
    request.flush({});
  });
});
