import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MedicalRecordsApi } from './medical-records-api';
import { environment } from '../../../environments/environment';

describe('MedicalRecordsApi', () => {
  let api: MedicalRecordsApi;
  let http: HttpTestingController;
  const baseUrl = environment.apiBaseUrl;
  const patientUrl = `${baseUrl}/api/v1/patients/me/medical-record`;
  const doctorUrl = `${baseUrl}/api/v1/doctors/me`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MedicalRecordsApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MedicalRecordsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // WAS-588
  it('WAS-588: patientOverview fetches overview', () => {
    api.patientOverview().subscribe((res) => {
      expect(res.patientId).toBe('p1');
    });
    const req = http.expectOne(`${patientUrl}/overview`);
    expect(req.request.method).toBe('GET');
    req.flush({ patientId: 'p1', name: 'Patient One', visitsCount: 2, diagnosesCount: 1, prescriptionsCount: 1, labOrdersCount: 0, radiologyOrdersCount: 0, availableFilters: [], safeMode: true });
  });

  // WAS-589
  it('WAS-589: patientTimeline fetches timeline page', () => {
    api.patientTimeline('visits', '2026-01-01', '2026-12-31', 'c1', 10).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne(
      (r) =>
        r.url === `${patientUrl}/timeline` &&
        r.params.get('types') === 'visits' &&
        r.params.get('cursor') === 'c1' &&
        r.params.get('pageSize') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'e1', itemType: 'Encounter', title: 'Visit', isHidden: false }], hasMore: false });
  });

  // WAS-590
  it('WAS-590: patientEncounter fetches encounter detail', () => {
    api.patientEncounter('e1').subscribe((res) => {
      expect(res.encounterId).toBe('e1');
    });
    const req = http.expectOne(`${patientUrl}/encounters/e1`);
    expect(req.request.method).toBe('GET');
    req.flush({ encounterId: 'e1', dateUtc: '2026-10-01', doctorName: 'Dr A', practiceName: 'Clinic A', diagnoses: [], prescriptions: [], labOrders: [], radiologyOrders: [], visibility: 'Visible', rowVersion: 'v1' });
  });

  // WAS-591
  it('WAS-591: patientItem fetches item detail', () => {
    api.patientItem('prescriptions', 'item1').subscribe((res) => {
      expect(res.sourceId).toBe('item1');
    });
    const req = http.expectOne(`${patientUrl}/items/prescriptions/item1`);
    expect(req.request.method).toBe('GET');
    req.flush({ resourceType: 'prescriptions', sourceId: 'item1', title: 'Med', dateUtc: '2026-10-01', status: 'Active', doctorName: 'Dr A', details: {}, attachments: [] });
  });

  // WAS-592
  it('WAS-592: patientAttachment downloads attachment blob', () => {
    api.patientAttachment('prescriptions', 'item1', 'att1').subscribe((res) => {
      expect(res.status).toBe(200);
    });
    const req = http.expectOne(`${patientUrl}/items/prescriptions/item1/attachments/att1/content`);
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['content']), { status: 200, statusText: 'OK' });
  });

  // WAS-593
  it('WAS-593: patientAccessLog fetches access log', () => {
    api.patientAccessLog().subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne((r) => r.url === `${patientUrl}/access-log`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'l1', actorName: 'Dr A', actorRole: 'Doctor', action: 'View', resource: 'Record', timestampUtc: '2026-10-01' }], hasMore: false });
  });

  // WAS-594
  it('WAS-594: doctorTreatingOverview fetches treating overview', () => {
    api.doctorTreatingOverview('pr1', 'tk1').subscribe((res) => {
      expect(res.ticketId).toBe('tk1');
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/tickets/tk1/medical-record/overview`);
    expect(req.request.method).toBe('GET');
    req.flush({ patientId: 'p1', patientName: 'P1', ticketId: 'tk1', encounterId: 'e1', visitsCount: 1, diagnosesCount: 0, prescriptionsCount: 0, labOrdersCount: 0, radiologyOrdersCount: 0, hiddenEncountersCount: 0 });
  });

  // WAS-595
  it('WAS-595: doctorTreatingTimeline fetches treating timeline', () => {
    api.doctorTreatingTimeline('pr1', 'tk1').subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne((r) => r.url === `${doctorUrl}/practices/pr1/tickets/tk1/medical-record/timeline`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'e1', itemType: 'Encounter', title: 'Visit', isHidden: false }], hasMore: false });
  });

  // WAS-596
  it('WAS-596: doctorTreatingEncounter fetches treating encounter details', () => {
    api.doctorTreatingEncounter('pr1', 'tk1', 'e1').subscribe((res) => {
      expect(res.encounterId).toBe('e1');
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/tickets/tk1/medical-record/encounters/e1`);
    expect(req.request.method).toBe('GET');
    req.flush({ encounterId: 'e1', dateUtc: '2026-10-01', doctorName: 'Dr A', practiceName: 'Clinic A', diagnoses: [], prescriptions: [], labOrders: [], radiologyOrders: [], visibility: 'Visible', rowVersion: 'v1' });
  });

  // WAS-597
  it('WAS-597: doctorTreatingItem fetches treating item details', () => {
    api.doctorTreatingItem('pr1', 'tk1', 'prescriptions', 'i1').subscribe((res) => {
      expect(res.sourceId).toBe('i1');
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/tickets/tk1/medical-record/items/prescriptions/i1`);
    expect(req.request.method).toBe('GET');
    req.flush({ resourceType: 'prescriptions', sourceId: 'i1', title: 'Item', dateUtc: '2026-10-01', status: 'Active', doctorName: 'Dr A', details: {}, attachments: [] });
  });

  // WAS-598
  it('WAS-598: doctorTreatingAttachment downloads treating attachment', () => {
    api.doctorTreatingAttachment('pr1', 'tk1', 'prescriptions', 'i1', 'att1').subscribe((res) => {
      expect(res.status).toBe(200);
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/tickets/tk1/medical-record/items/prescriptions/i1/attachments/att1/content`);
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['data']), { status: 200, statusText: 'OK' });
  });

  // WAS-599
  it('WAS-599: doctorTreatingAccessRequests lists access requests for ticket', () => {
    api.doctorTreatingAccessRequests('pr1', 'tk1').subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/tickets/tk1/medical-record/access-requests`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ requestId: 'rq1', sourceEncounterId: 'e2', visitDateUtc: '2026-09-01', status: 'Pending', requestedAtUtc: '2026-10-01', rowVersion: 'v1' }] });
  });

  // WAS-600
  it('WAS-600: doctorTreatingAccessRequestDetails gets details for request', () => {
    api.doctorTreatingAccessRequestDetails('pr1', 'tk1', 'rq1').subscribe((res) => {
      expect(res.requestId).toBe('rq1');
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/tickets/tk1/medical-record/access-requests/rq1`);
    expect(req.request.method).toBe('GET');
    req.flush({ requestId: 'rq1', sourceEncounterId: 'e2', visitDateUtc: '2026-09-01', status: 'Pending', requestedAtUtc: '2026-10-01', rowVersion: 'v1' });
  });

  // WAS-601
  it('WAS-601: doctorCreateAccessRequest submits new access request', () => {
    const payload = { hiddenEncounterPlaceholderToken: 'tok123', reason: 'Review required' };
    api.doctorCreateAccessRequest('pr1', 'tk1', payload).subscribe((res) => {
      expect(res.requestId).toBe('rq1');
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/tickets/tk1/medical-record/access-requests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ requestId: 'rq1', sourceEncounterId: 'e2', visitDateUtc: '2026-09-01', status: 'Pending', requestedAtUtc: '2026-10-01', rowVersion: 'v1' }, { status: 201, statusText: 'Created' });
  });

  // WAS-602
  it('WAS-602: doctorAccessInboxSummary gets pending summary', () => {
    api.doctorAccessInboxSummary().subscribe((res) => {
      expect(res.pendingCount).toBe(3);
    });
    const req = http.expectOne(`${doctorUrl}/medical-record-access-requests/inbox/summary`);
    expect(req.request.method).toBe('GET');
    req.flush({ pendingCount: 3 });
  });

  // WAS-603
  it('WAS-603: doctorAccessInbox lists incoming requests page', () => {
    api.doctorAccessInbox('Pending', 1, 10).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne((r) => r.url === `${doctorUrl}/medical-record-access-requests/inbox` && r.params.get('status') === 'Pending');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ requestId: 'rq1', status: 'Pending', canApprove: true, canReject: true, canRevoke: false, rowVersion: 'v1' }], pageNumber: 1, pageSize: 10, totalCount: 1 });
  });

  // WAS-604
  it('WAS-604: doctorAccessRequestDetails gets details of incoming request', () => {
    api.doctorAccessRequestDetails('rq1').subscribe((res) => {
      expect(res.requestId).toBe('rq1');
    });
    const req = http.expectOne(`${doctorUrl}/medical-record-access-requests/rq1`);
    expect(req.request.method).toBe('GET');
    req.flush({ requestId: 'rq1', status: 'Pending', canApprove: true, canReject: true, canRevoke: false, rowVersion: 'v1' });
  });

  // WAS-605
  it('WAS-605: doctorApproveAccessRequest approves request', () => {
    const payload = { rowVersion: 'v1', note: 'Approved' };
    api.doctorApproveAccessRequest('rq1', payload).subscribe((res) => {
      expect(res.status).toBe('Approved');
    });
    const req = http.expectOne(`${doctorUrl}/medical-record-access-requests/rq1/approve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ requestId: 'rq1', status: 'Approved', rowVersion: 'v2' });
  });

  // WAS-606
  it('WAS-606: doctorRejectAccessRequest rejects request', () => {
    const payload = { rowVersion: 'v1', reason: 'Insufficient basis' };
    api.doctorRejectAccessRequest('rq1', payload).subscribe((res) => {
      expect(res.status).toBe('Rejected');
    });
    const req = http.expectOne(`${doctorUrl}/medical-record-access-requests/rq1/reject`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ requestId: 'rq1', status: 'Rejected', rowVersion: 'v2' });
  });

  // WAS-607
  it('WAS-607: doctorRevokeAccessGrant revokes request', () => {
    const payload = { rowVersion: 'v2', reason: 'Consultation ended' };
    api.doctorRevokeAccessGrant('rq1', payload).subscribe((res) => {
      expect(res.status).toBe('Revoked');
    });
    const req = http.expectOne(`${doctorUrl}/medical-record-access-requests/rq1/revoke`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ requestId: 'rq1', status: 'Revoked', rowVersion: 'v3' });
  });

  // WAS-608
  it('WAS-608: doctorAccessRequestHistory gets history entries', () => {
    api.doctorAccessRequestHistory('rq1').subscribe((res) => {
      expect(res.length).toBe(1);
    });
    const req = http.expectOne(`${doctorUrl}/medical-record-access-requests/rq1/history`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'h1', action: 'Approved', actorName: 'Dr A', timestampUtc: '2026-10-01' }]);
  });

  // WAS-609
  it('WAS-609: doctorUpdateEncounterVisibility patches visibility', () => {
    const payload = { visibility: 'Hidden' as const, reason: 'Sensitive', rowVersion: 'v1' };
    api.doctorUpdateEncounterVisibility('pr1', 'e1', payload).subscribe((res) => {
      expect(res.visibility).toBe('Hidden');
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/encounters/e1/visibility`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush({ encounterId: 'e1', visibility: 'Hidden', rowVersion: 'v2' });
  });

  // WAS-610
  it('WAS-610: doctorEncounterVisibilityHistory gets visibility history', () => {
    api.doctorEncounterVisibilityHistory('pr1', 'e1').subscribe((res) => {
      expect(res.length).toBe(1);
    });
    const req = http.expectOne(`${doctorUrl}/practices/pr1/encounters/e1/visibility/history`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'vh1', previousVisibility: 'Visible', newVisibility: 'Hidden', changedByDoctorName: 'Dr A', changedAtUtc: '2026-10-01', reason: 'Sensitive' }]);
  });
});
