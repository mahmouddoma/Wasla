import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DrugCatalogApi } from './drug-catalog-api';
import { DrugData } from './drug-catalog.models';

export const drugData: DrugData = {
  commercialNameEn: 'Synthetic medication',
  commercialNameAr: null,
  scientificName: 'Synthetic ingredient',
  manufacturer: null,
  drugClass: null,
  route: null,
  strengthText: null,
  dosageForm: null,
  priceEgp: 0,
};
describe('Phase 14 drug catalog HTTP contracts', () => {
  let api: DrugCatalogApi, http: HttpTestingController;
  const root = environment.apiBaseUrl + '/api/v1';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DrugCatalogApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends server paging, trimmed search and manager status filter', () => {
    api
      .list({ search: '  synthetic ', status: 'NeedsReview', pageNumber: 2, pageSize: 20 })
      .subscribe();
    const request = http.expectOne((r) => r.url === root + '/admin/drug-catalog');
    expect(request.request.params.get('search')).toBe('synthetic');
    expect(request.request.params.get('status')).toBe('NeedsReview');
    expect(request.request.params.get('pageNumber')).toBe('2');
    request.flush({ items: [], totalCount: 0, pageNumber: 2, pageSize: 20 });
  });
  it('uses the doctor active-only search endpoint without an admin status filter', () => {
    api.searchActive({ search: 'drug', pageNumber: 1, pageSize: 20 }).subscribe();
    const request = http.expectOne((r) => r.url === root + '/doctors/me/drug-catalog');
    expect(request.request.params.has('status')).toBe(false);
    request.flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
  });
  it('creates the exact DrugData body and updates with independent version and reason', () => {
    api.create(drugData).subscribe();
    const create = http.expectOne(root + '/admin/drug-catalog');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(drugData);
    create.flush({});
    api.update('d1', drugData, { rowVersion: 'dv2', reason: 'Correction' }).subscribe();
    const update = http.expectOne(root + '/admin/drug-catalog/d1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({
      data: drugData,
      rowVersion: 'dv2',
      reason: 'Correction',
    });
    update.flush({});
  });
  it('reads details with encoded identifiers', () => {
    api.details('drug/1').subscribe();
    http.expectOne(root + '/admin/drug-catalog/drug%2F1').flush({});
  });
  it.each(['activate', 'deactivate'] as const)(
    'sends latest version and reason for %s',
    (action) => {
      api[action]('d1', { rowVersion: 'dv3', reason: 'Review' }).subscribe();
      const request = http.expectOne(root + '/admin/drug-catalog/d1/' + action);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ rowVersion: 'dv3', reason: 'Review' });
      request.flush({});
    },
  );
  it('merges source into target using the caller stable intent key', () => {
    api
      .merge('source', 'target', { rowVersion: 'dv4', reason: 'Duplicate' }, 'stable-key')
      .subscribe();
    const request = http.expectOne(root + '/admin/drug-catalog/source/merge');
    expect(request.request.body).toEqual({
      targetDrugCatalogId: 'target',
      rowVersion: 'dv4',
      reason: 'Duplicate',
    });
    expect(request.request.headers.get('Idempotency-Key')).toBe('stable-key');
    request.flush({});
  });
});
