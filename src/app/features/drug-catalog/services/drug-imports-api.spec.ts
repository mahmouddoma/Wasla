import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DrugImportsApi } from './drug-imports-api';
describe('Medication import contracts', () => {
  let api: DrugImportsApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DrugImportsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('maps backend counters and timestamps for import preview', () => {
    let result: unknown;
    api.preview(new File(['[]'], 'drugs.json'), '', '').subscribe((value) => (result = value));
    http
      .expectOne((req) => req.url.endsWith('/imports/preview'))
      .flush({
        batchId: 'b',
        createdAtUtc: '2026-11-07T10:00:00Z',
        totalRecords: 12,
        newRecords: 4,
        unchangedRecords: 3,
        priceChanges: 5,
      });
    expect(result).toMatchObject({
      createdOnUtc: '2026-11-07T10:00:00Z',
      counts: { Total: 12, New: 4, Unchanged: 3, PriceChange: 5 },
    });
  });
  it('maps source data and record IDs for import changes', () => {
    let result: unknown;
    api.changes('b', undefined, 1).subscribe((value) => (result = value.items[0]));
    http
      .expectOne((req) => req.url.endsWith('/imports/b/changes'))
      .flush({
        items: [
          {
            id: 'record',
            data: { commercialNameEn: 'Drug' },
            matchedDrugCatalogId: 'drug',
            changeType: 'PriceChange',
          },
        ],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20,
      });
    expect(result).toMatchObject({
      recordId: 'record',
      sourceRow: { commercialNameEn: 'Drug' },
      drugCatalogId: 'drug',
    });
  });
  it('previews multipart data without forcing a JSON content type', () => {
    const file = new File(['[]'], 'drugs.json', { type: 'application/json' });
    api.preview(file, 'v1', 'commit').subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/imports/preview'));
    expect(request.request.body.get('file')).toBe(file);
    expect(request.request.body.get('sourceVersion')).toBe('v1');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({});
  });
  it('uses encoded batch IDs and server change filters and paging', () => {
    api.changes('b/1', 'PriceChange', 2).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/imports/b%2F1/changes'));
    expect(request.request.params.get('changeType')).toBe('PriceChange');
    expect(request.request.params.get('pageNumber')).toBe('2');
    request.flush({});
    api.list(2).subscribe();
    http.expectOne((req) => req.url.endsWith('/imports')).flush({});
    api.details('b/1').subscribe();
    http.expectOne((req) => req.url.endsWith('/imports/b%2F1')).flush({});
  });
  it('applies an explicit stable intent without reuploading the file', () => {
    api.apply('b/1', 'intent').subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/imports/b%2F1/apply'));
    expect(request.request.body).toBeNull();
    expect(request.request.headers.get('Idempotency-Key')).toBe('intent');
    request.flush({});
  });
});
