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
