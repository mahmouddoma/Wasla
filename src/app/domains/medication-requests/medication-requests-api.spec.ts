import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MedicationRequestsApi } from './medication-requests-api';
describe('Medication request scope and review contracts', () => {
  let api: MedicationRequestsApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MedicationRequestsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('keeps own list filters separate from manager search and doctor scope', () => {
    const query = {
      pageNumber: 2,
      pageSize: 20,
      status: 'Pending' as const,
      doctorId: 'foreign',
      search: 'Medication',
    };
    api.mine(query).subscribe();
    const own = http.expectOne((req) => req.url.endsWith('/doctors/me/drug-catalog-requests'));
    expect(own.request.params.has('doctorId')).toBe(false);
    expect(own.request.params.has('search')).toBe(false);
    own.flush({});
    api.list(query).subscribe();
    const manager = http.expectOne((req) => req.url.endsWith('/admin/drug-catalog-requests'));
    expect(manager.request.params.get('doctorId')).toBe('foreign');
    expect(manager.request.params.get('search')).toBe('Medication');
    manager.flush({});
  });
  it('encodes IDs, sends medication submission only, and uses latest update token', () => {
    api.create({ medicationName: 'Medicine' }).subscribe();
    const create = http.expectOne((req) => req.method === 'POST');
    expect(create.request.body).toEqual({ medicationName: 'Medicine' });
    create.flush({});
    api.update('r/1', { medicationName: 'Edited' }, 'v9').subscribe();
    const update = http.expectOne((req) => req.url.endsWith('/r%2F1'));
    expect(update.request.body).toEqual({ data: { medicationName: 'Edited' }, rowVersion: 'v9' });
    update.flush({});
    api.myDetails('r/1').subscribe();
    http.expectOne((req) => req.url.endsWith('/doctors/me/drug-catalog-requests/r%2F1')).flush({});
    api.details('r/1').subscribe();
    http.expectOne((req) => req.url.endsWith('/admin/drug-catalog-requests/r%2F1')).flush({});
  });
  it('sends normalized approval with one stable intent and explicit review reasons', () => {
    const data = {
      commercialNameEn: 'Medicine',
      commercialNameAr: null,
      scientificName: null,
      manufacturer: null,
      drugClass: null,
      route: null,
      strengthText: null,
      dosageForm: null,
      priceEgp: 0,
    };
    api
      .approve('r1', { rowVersion: 'v9', reason: 'Approved', approvedData: data }, 'intent')
      .subscribe();
    const approval = http.expectOne((req) => req.url.endsWith('/approve'));
    expect(approval.request.headers.get('Idempotency-Key')).toBe('intent');
    expect(approval.request.body.approvedData.priceEgp).toBe(0);
    approval.flush({});
    api.requestMoreInfo('r1', { rowVersion: 'v9', reason: 'Strength missing' }).subscribe();
    http.expectOne((req) => req.url.endsWith('/request-more-info')).flush({});
    api
      .reject('r1', { rowVersion: 'v9', reason: 'Duplicate', duplicateOfDrugCatalogId: 'd1' })
      .subscribe();
    const reject = http.expectOne((req) => req.url.endsWith('/reject'));
    expect(reject.request.body.duplicateOfDrugCatalogId).toBe('d1');
    reject.flush({});
  });
});
