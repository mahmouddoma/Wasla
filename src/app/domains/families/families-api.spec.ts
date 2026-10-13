import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FamiliesApi } from './families-api';

function familyDetailsResponse(status = 'Pending', currentRevisionNumber = 1) {
  return {
    request: {
      requestId: 'request',
      requestType: 'CreateFamily',
      status,
      familyId: null,
      currentRevisionNumber,
      rowVersion: 'AQID',
    },
    requester: { patientId: 'requester', nameAr: 'أحمد محمود سالم' },
    target: { patientId: 'target', nameAr: 'يوسف أحمد سالم' },
    requesterClaimedRole: 'Father',
    targetClaimedRole: 'Child',
    modificationMessage: null,
    rejectionReason: null,
    familyMembers: [],
    documents: [
      {
        documentId: 'document',
        documentType: 'BirthCertificate',
        originalFileName: 'birth-certificate.pdf',
        revisionNumber: 1,
        uploadedOnUtc: '2026-09-15T09:44:10Z',
      },
    ],
    history: [
      {
        action: 'Submitted',
        performedOnUtc: '2026-09-15T09:44:10Z',
        messageOrReason: null,
        revisionNumber: 1,
      },
    ],
  };
}

describe('FamiliesApi', () => {
  let api: FamiliesApi;
  let http: HttpTestingController;
  const familiesUrl = `${environment.apiBaseUrl}/api/v1/families`;
  const requestsUrl = `${environment.apiBaseUrl}/api/v1/family-relationship-requests`;
  const assistedUrl = `${requestsUrl}/assisted`;
  const adminUrl = `${environment.apiBaseUrl}/api/v1/admin/family-relationship-requests`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FamiliesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the current family without sending a patient id', async () => {
    const result = firstValueFrom(api.mine());
    const request = http.expectOne(`${familiesUrl}/mine`);
    expect(request.request.method).toBe('GET');
    request.flush({ familyId: 'family', members: [] });
    await result;
  });

  it('submits evidence as matching multipart arrays', async () => {
    const file = new File(['evidence'], 'evidence.pdf');
    const result = firstValueFrom(
      api.submit({
        requestType: 'CreateFamily',
        familyId: '',
        targetPatientId: 'target',
        requesterClaimedRole: 'Father',
        targetClaimedRole: 'Child',
        evidenceFiles: [file],
        documentTypes: ['BirthCertificate'],
      }),
    );
    const request = http.expectOne(requestsUrl);
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body.get('TargetPatientId')).toBe('target');
    expect(body.getAll('EvidenceFiles')).toEqual([file]);
    expect(body.getAll('DocumentTypes')).toEqual(['BirthCertificate']);
    expect(body.has('RequesterPatientId')).toBe(false);
    request.flush(familyDetailsResponse());
    expect((await result).requestId).toBe('request');
  });

  it('lists own requests with server-side filters and pagination', async () => {
    const result = firstValueFrom(
      api.requests({
        status: 'ModificationRequested',
        requestType: 'AddFamilyMember',
        pageNumber: 2,
        pageSize: 20,
      }),
    );
    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${requestsUrl}/mine` && candidate.params.get('pageNumber') === '2',
    );
    expect(request.request.params.get('status')).toBe('ModificationRequested');
    request.flush({ items: [], pageNumber: 2, pageSize: 20, totalCount: 0 });
    await result;
  });

  it('loads request details and its secured document blob', async () => {
    const detailsResult = firstValueFrom(api.details('request'));
    http.expectOne(`${requestsUrl}/request`).flush(familyDetailsResponse());
    const details = await detailsResult;
    expect(details).toMatchObject({
      requestId: 'request',
      requestType: 'CreateFamily',
      status: 'Pending',
      requesterPatientId: 'requester',
      requesterNameAr: 'أحمد محمود سالم',
      targetPatientId: 'target',
      targetNameAr: 'يوسف أحمد سالم',
      currentRevisionNumber: 1,
      submittedOnUtc: '2026-09-15T09:44:10Z',
      rowVersion: 'AQID',
    });
    expect(details.documents[0].fileName).toBe('birth-certificate.pdf');
    expect(details.history[0]).toMatchObject({
      action: 'Submitted',
      occurredOnUtc: '2026-09-15T09:44:10Z',
      message: null,
    });

    const documentResult = firstValueFrom(api.document('request', 'document'));
    const documentRequest = http.expectOne(`${requestsUrl}/request/documents/document`);
    expect(documentRequest.request.responseType).toBe('blob');
    documentRequest.flush(new Blob());
    await documentResult;
  });

  it('resubmits a new revision with rowVersion and preserves old evidence server-side', async () => {
    const file = new File(['new'], 'new.pdf');
    const result = firstValueFrom(
      api.resubmit('request', {
        evidenceFiles: [file],
        documentTypes: ['NationalId'],
        rowVersion: 'AQID',
      }),
    );
    const request = http.expectOne(`${requestsUrl}/request/resubmit`);
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body.get('RowVersion')).toBe('AQID');
    expect(body.getAll('EvidenceFiles')).toEqual([file]);
    request.flush(familyDetailsResponse('Pending', 2));
    await result;
  });

  it('submits an assisted request with two selected patient identities', async () => {
    const file = new File(['evidence'], 'family.pdf');
    const result = firstValueFrom(
      api.submitAssisted({
        requestType: 'CreateFamily',
        familyId: '',
        requesterPatientId: 'requester',
        targetPatientId: 'target',
        requesterClaimedRole: 'Father',
        targetClaimedRole: 'Child',
        evidenceFiles: [file],
        documentTypes: ['BirthCertificate'],
      }),
    );
    const request = http.expectOne(assistedUrl);
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body.get('RequesterPatientId')).toBe('requester');
    expect(body.get('TargetPatientId')).toBe('target');
    expect(body.has('UserName')).toBe(false);
    request.flush(familyDetailsResponse());
    await result;
  });

  it('uses the submitter-scoped assisted list, details and document endpoints', async () => {
    const listResult = firstValueFrom(
      api.assistedRequests({
        status: 'Pending',
        requestType: '',
        search: 'أحمد',
        pageNumber: 1,
        pageSize: 20,
      }),
    );
    const list = http.expectOne(
      (candidate) => candidate.url === assistedUrl && candidate.params.get('search') === 'أحمد',
    );
    list.flush({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
    await listResult;

    const detailsResult = firstValueFrom(api.assistedDetails('request'));
    http.expectOne(`${assistedUrl}/request`).flush(familyDetailsResponse());
    await detailsResult;

    const documentResult = firstValueFrom(api.assistedDocument('request', 'document'));
    const documentRequest = http.expectOne(`${assistedUrl}/request/documents/document`);
    expect(documentRequest.request.responseType).toBe('blob');
    documentRequest.flush(new Blob());
    await documentResult;
  });

  it('resubmits assisted evidence with the latest rowVersion', async () => {
    const result = firstValueFrom(
      api.resubmitAssisted('request', {
        evidenceFiles: [new File(['new'], 'new.pdf')],
        documentTypes: ['NationalId'],
        rowVersion: 'AQID',
      }),
    );
    const request = http.expectOne(`${assistedUrl}/request/resubmit`);
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('RowVersion')).toBe('AQID');
    request.flush(familyDetailsResponse('Pending', 2));
    await result;
  });

  it('uses the admin review queue, details and private document endpoints', async () => {
    const listResult = firstValueFrom(
      api.adminRequests({
        status: 'Pending',
        requestType: 'CreateFamily',
        search: 'target',
        pageNumber: 2,
        pageSize: 20,
      }),
    );
    const list = http.expectOne(
      (candidate) => candidate.url === adminUrl && candidate.params.get('pageNumber') === '2',
    );
    expect(list.request.params.get('search')).toBe('target');
    list.flush({ items: [], pageNumber: 2, pageSize: 20, totalCount: 0 });
    await listResult;

    const detailsResult = firstValueFrom(api.adminDetails('request'));
    http.expectOne(`${adminUrl}/request`).flush(familyDetailsResponse());
    await detailsResult;

    const documentResult = firstValueFrom(api.adminDocument('request', 'document'));
    const documentRequest = http.expectOne(`${adminUrl}/request/documents/document`);
    expect(documentRequest.request.responseType).toBe('blob');
    documentRequest.flush(new Blob());
    await documentResult;
  });

  it('accepts empty success responses and sends the latest rowVersion for admin review actions', async () => {
    const modificationResult = firstValueFrom(
      api.requestModification('request', { message: 'صورة أوضح', rowVersion: 'AQID' }),
    );
    const modification = http.expectOne(`${adminUrl}/request/request-modification`);
    expect(modification.request.body).toEqual({ message: 'صورة أوضح', rowVersion: 'AQID' });
    modification.flush(null, { status: 204, statusText: 'No Content' });
    await modificationResult;

    const approveResult = firstValueFrom(api.approve('request', { rowVersion: 'BAUG' }));
    const approve = http.expectOne(`${adminUrl}/request/approve`);
    expect(approve.request.body).toEqual({ rowVersion: 'BAUG' });
    approve.flush(null, { status: 204, statusText: 'No Content' });
    await approveResult;

    const rejectResult = firstValueFrom(
      api.reject('request', { reason: 'الدليل غير كافٍ', rowVersion: 'BwgJ' }),
    );
    const reject = http.expectOne(`${adminUrl}/request/reject`);
    expect(reject.request.body).toEqual({ reason: 'الدليل غير كافٍ', rowVersion: 'BwgJ' });
    reject.flush(null, { status: 204, statusText: 'No Content' });
    await rejectResult;
  });

  it('wires family medical access requests with multipart evidence and idempotency protection', async () => {
    const result = firstValueFrom(
      api.createMedicalAccessRequest({
        requestType: 'Restriction',
        childPatientId: 'child',
        affectedAdultPatientId: 'adult',
        reason: 'Consent was withdrawn.',
        evidenceFiles: [new File(['proof'], 'proof.pdf')],
        documentTypes: ['ConsentWithdrawal'],
        idempotencyKey: 'create-key',
      }),
    );
    const request = http.expectOne(`${familiesUrl}/mine/medical-access-requests`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('create-key');
    expect((request.request.body as FormData).get('ChildPatientId')).toBe('child');
    request.flush({ requestId: 'case-1' });
    await result;
  });

  it('wires own medical access list, details, history, document and mutation routes', async () => {
    const baseUrl = `${familiesUrl}/mine/medical-access-requests`;
    const listResult = firstValueFrom(
      api.myMedicalAccessRequests({ requestType: 'Restriction', status: 'Pending', pageNumber: 1, pageSize: 20 }),
    );
    const list = http.expectOne((candidate) => candidate.url === `${baseUrl}/mine`);
    expect(list.request.params.get('requestType')).toBe('Restriction');
    list.flush({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
    await listResult;

    const detailsResult = firstValueFrom(api.myMedicalAccessRequest('case'));
    http.expectOne(`${baseUrl}/case`).flush({ requestId: 'case' });
    await detailsResult;

    const historyResult = firstValueFrom(api.myMedicalAccessHistory('case'));
    http.expectOne(`${baseUrl}/case/history?pageNumber=1&pageSize=20`).flush({ items: [] });
    await historyResult;

    const documentResult = firstValueFrom(api.myMedicalAccessDocument('case', 'document'));
    http.expectOne(`${baseUrl}/case/documents/document/content`).flush(new Blob());
    await documentResult;

    const withdrawal = firstValueFrom(api.withdrawMedicalAccessRequest('case', 'version', 'withdraw-key'));
    const withdrawalRequest = http.expectOne(`${baseUrl}/case/withdraw`);
    expect(withdrawalRequest.request.headers.get('Idempotency-Key')).toBe('withdraw-key');
    expect(withdrawalRequest.request.body).toEqual({ rowVersion: 'version' });
    withdrawalRequest.flush({ requestId: 'case' });
    await withdrawal;

    const resubmission = firstValueFrom(api.resubmitMedicalAccessRequest('case', {
      rowVersion: 'version', reason: 'Updated proof', evidenceFiles: [], documentTypes: [], idempotencyKey: 'resubmit-key',
    }));
    const resubmitRequest = http.expectOne(`${baseUrl}/case/resubmit`);
    expect(resubmitRequest.request.headers.get('Idempotency-Key')).toBe('resubmit-key');
    expect((resubmitRequest.request.body as FormData).get('RowVersion')).toBe('version');
    resubmitRequest.flush({ requestId: 'case' });
    await resubmission;
  });

  it('wires patient-safe dependent medical record routes without public media URLs', async () => {
    const dependentUrl = `${familiesUrl}/mine/dependents/child`;
    const statusResult = firstValueFrom(api.childMedicalAccess('child'));
    http.expectOne(`${dependentUrl}/medical-access`).flush({ status: 'Allowed', canView: true });
    await statusResult;

    const dependentsResult = firstValueFrom(api.medicalRecordDependents());
    http.expectOne(`${familiesUrl}/mine/medical-record-dependents`).flush({ items: [], nextCursor: null, hasMore: false });
    await dependentsResult;

    const overviewResult = firstValueFrom(api.dependentMedicalRecordOverview('child', { pageSize: 20, types: ['prescription'] }));
    const overview = http.expectOne((candidate) => candidate.url === `${dependentUrl}/medical-record/overview`);
    expect(overview.request.params.getAll('types')).toEqual(['prescription']);
    overview.flush({});
    await overviewResult;

    const timelineResult = firstValueFrom(api.dependentMedicalRecordTimeline('child', { cursor: 'safe-cursor' }));
    const timeline = http.expectOne((candidate) => candidate.url === `${dependentUrl}/medical-record/timeline`);
    expect(timeline.request.params.get('cursor')).toBe('safe-cursor');
    timeline.flush({ items: [], nextCursor: null, hasMore: false });
    await timelineResult;

    const encounterResult = firstValueFrom(api.dependentMedicalRecordEncounter('child', 'encounter'));
    http.expectOne(`${dependentUrl}/medical-record/encounters/encounter`).flush({});
    await encounterResult;

    const itemResult = firstValueFrom(api.dependentMedicalRecordItem('child', 'prescription', 'item'));
    http.expectOne(`${dependentUrl}/medical-record/items/prescription/item`).flush({});
    await itemResult;

    const attachmentResult = firstValueFrom(api.dependentMedicalRecordAttachment('child', 'prescription', 'item', 'attachment'));
    const attachment = http.expectOne(`${dependentUrl}/medical-record/items/prescription/item/attachments/attachment/content`);
    expect(attachment.request.responseType).toBe('blob');
    attachment.flush(new Blob());
    await attachmentResult;
  });

  it('wires SuperAdmin review, decisions, and eligibility review routes', async () => {
    const medicalAccessAdminUrl = `${environment.apiBaseUrl}/api/v1/admin/family-medical-access-requests`;
    const eligibilityUrl = `${environment.apiBaseUrl}/api/v1/admin/family-medical-eligibilities/reviews`;
    const summaryResult = firstValueFrom(api.adminMedicalAccessSummary());
    http.expectOne(`${medicalAccessAdminUrl}/summary`).flush({});
    await summaryResult;

    const queueResult = firstValueFrom(api.adminMedicalAccessRequests({ pageNumber: 1, pageSize: 20 }));
    http.expectOne(`${medicalAccessAdminUrl}?pageNumber=1&pageSize=20`).flush({ items: [] });
    await queueResult;

    const detailsResult = firstValueFrom(api.adminMedicalAccessRequest('case'));
    http.expectOne(`${medicalAccessAdminUrl}/case`).flush({ requestId: 'case' });
    await detailsResult;

    const documentResult = firstValueFrom(api.adminMedicalAccessDocument('case', 'document'));
    http.expectOne(`${medicalAccessAdminUrl}/case/documents/document/content`).flush(new Blob());
    await documentResult;

    const historyResult = firstValueFrom(api.adminMedicalAccessHistory('case'));
    http.expectOne(`${medicalAccessAdminUrl}/case/history?pageNumber=1&pageSize=20`).flush({ items: [] });
    await historyResult;

    for (const action of ['approve', 'reject', 'request-modification'] as const) {
      const decision = action === 'approve'
        ? api.approveMedicalAccessRequest('case', { rowVersion: 'version' })
        : action === 'reject'
          ? api.rejectMedicalAccessRequest('case', { rowVersion: 'version', reason: 'Reason' })
          : api.requestMedicalAccessModification('case', { rowVersion: 'version', message: 'Message' });
      const result = firstValueFrom(decision);
      const request = http.expectOne(`${medicalAccessAdminUrl}/case/${action}`);
      expect(request.request.body).toHaveProperty('rowVersion', 'version');
      request.flush({ requestId: 'case' });
      await result;
    }

    const eligibilityList = firstValueFrom(api.medicalEligibilityReviews({ pageNumber: 1, pageSize: 20 }));
    http.expectOne(`${eligibilityUrl}?pageNumber=1&pageSize=20`).flush({ items: [] });
    await eligibilityList;

    const eligibilityDetails = firstValueFrom(api.medicalEligibilityReview('review'));
    http.expectOne(`${eligibilityUrl}/review`).flush({ reviewId: 'review' });
    await eligibilityDetails;

    for (const action of ['approve', 'reject', 'revoke'] as const) {
      const decision = action === 'approve'
        ? api.approveMedicalEligibility('review', { rowVersion: 'version' })
        : action === 'reject'
          ? api.rejectMedicalEligibility('review', { rowVersion: 'version', reason: 'Reason' })
          : api.revokeMedicalEligibility('review', { rowVersion: 'version' });
      const result = firstValueFrom(decision);
      http.expectOne(`${eligibilityUrl}/review/${action}`).flush({ reviewId: 'review' });
      await result;
    }
  });
});
