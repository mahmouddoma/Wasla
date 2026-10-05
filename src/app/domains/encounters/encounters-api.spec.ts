import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { EncountersApi } from './encounters-api';

describe('Phase 13 clinical API contracts', () => {
  let api: EncountersApi, http: HttpTestingController;
  const root = environment.apiBaseUrl + '/api/v1';
  const encounter = '/doctors/me/practices/p/encounters/e';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(EncountersApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('WAS-195 sends all server pagination and filters', () => {
    api
      .list('p', {
        patientId: 'u',
        status: 'Completed',
        fromDate: '2026-10-01',
        toDate: '2026-10-05',
        search: 'Ali',
        pageNumber: 2,
        pageSize: 20,
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === root + '/doctors/me/practices/p/encounters');
    expect(req.request.params.keys()).toEqual([
      'patientId',
      'status',
      'fromDate',
      'toDate',
      'search',
      'pageNumber',
      'pageSize',
    ]);
    expect(req.request.params.get('pageNumber')).toBe('2');
    req.flush({});
  });
  it('WAS-196 and WAS-197 use owning practice detail and ticket recovery paths', () => {
    api.details('p', 'e').subscribe();
    http.expectOne(root + encounter).flush({});
    api.byTicket('p', 't').subscribe();
    http.expectOne(root + '/doctors/me/practices/p/tickets/t/encounter').flush({});
  });
  it('WAS-198 patches notes using latest encounter version', () => {
    api.updateNotes('p', 'e', 'Clinical findings', 'rv2').subscribe();
    const req = http.expectOne(root + encounter + '/clinical-notes');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ clinicalNotes: 'Clinical findings', rowVersion: 'rv2' });
    req.flush({});
  });
  it('WAS-199 and WAS-200 carry the encounter token rather than a child token', () => {
    const draft = { type: 'Primary' as const, displayText: 'Diagnosis', notes: null };
    api.addDiagnosis('p', 'e', draft, 'rv2').subscribe();
    const add = http.expectOne(root + encounter + '/diagnoses');
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ ...draft, encounterRowVersion: 'rv2' });
    add.flush({});
    api.updateDiagnosis('p', 'e', 'd', draft, 'rv3').subscribe();
    const update = http.expectOne(root + encounter + '/diagnoses/d');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.encounterRowVersion).toBe('rv3');
    update.flush({});
  });
  it('WAS-201 consumes the updated details returned by DELETE', () => {
    let version = '';
    api.removeDiagnosis('p', 'e', 'd', 'rv3').subscribe((detail) => (version = detail.rowVersion));
    const req = http.expectOne(root + encounter + '/diagnoses/d');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ rowVersion: 'rv3' });
    req.flush({ rowVersion: 'rv4' });
    expect(version).toBe('rv4');
  });
  it('WAS-202 posts encounter amendment with mandatory reason, version, and typed changes', () => {
    const reqBody = {
      reason: 'Clinical correction',
      encounterRowVersion: 'rv3',
      changes: [
        { type: 'ClinicalNotes' as const, clinicalNotes: 'Updated findings' },
        {
          type: 'Diagnosis' as const,
          action: 'Add' as const,
          diagnosisType: 'Secondary' as const,
          displayText: 'Asthma',
        },
        { type: 'Diagnosis' as const, action: 'Remove' as const, diagnosisId: 'd1' },
      ],
    };
    api.createAmendment('p', 'e', reqBody).subscribe();
    const req = http.expectOne(root + encounter + '/amendments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqBody);
    req.flush({ rowVersion: 'rv4' });
  });
  it('WAS-203 reads immutable history and WAS-204 sends only validity date', () => {
    api.amendments('p', 'e').subscribe();
    http.expectOne(root + encounter + '/amendments').flush([]);
    api.createFollowUp('p', 'e', '2026-10-30').subscribe();
    const req = http.expectOne(root + encounter + '/follow-up-eligibility');
    expect(req.request.body).toEqual({ validUntil: '2026-10-30' });
    req.flush({});
  });
  it('WAS-205 and WAS-206 use self-only patient endpoints', () => {
    api.mine(2, 20).subscribe();
    const list = http.expectOne((r) => r.url === root + '/encounters/mine');
    expect(list.request.params.get('pageNumber')).toBe('2');
    list.flush({});
    api.myDetails('e').subscribe();
    http.expectOne(root + '/encounters/mine/e').flush({});
  });
  it('encodes identifiers and rejects blank IDs before HTTP', () => {
    api.details('p/x', 'e/x').subscribe();
    http.expectOne(root + '/doctors/me/practices/p%2Fx/encounters/e%2Fx').flush({});
    expect(() => api.byTicket('p', '')).toThrow();
  });
});
