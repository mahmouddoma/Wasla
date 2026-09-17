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
});
