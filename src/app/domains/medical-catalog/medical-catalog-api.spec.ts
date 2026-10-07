import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalCatalogApi } from './medical-catalog-api';

describe.each(['lab', 'radiology'] as const)('%s reference-data API contracts', (kind) => {
  let api: MedicalCatalogApi;
  let http: HttpTestingController;
  const data = {
    displayNameEn: 'Synthetic test',
    displayNameAr: null,
    aliasesEn: null,
    aliasesAr: null,
    internalNote: null,
  };
  const action = { rowVersion: 'rv1', reason: 'Synthetic reason', targetCatalogId: 'target' };
  const missing =
    kind === 'lab'
      ? { testName: 'Synthetic test', specimen: null, catalogClarificationNote: null }
      : { procedureName: 'Synthetic procedure', specimen: null, catalogClarificationNote: null };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MedicalCatalogApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const cases: readonly {
    name: string;
    method: string;
    path: string;
    key?: boolean;
    call: () => Observable<unknown>;
  }[] = [
    {
      name: 'list catalog',
      method: 'GET',
      path: 'admin/K-catalog',
      call: () => api.list(kind, { pageNumber: 2, pageSize: 20, search: 'test', hasArabic: false }),
    },
    {
      name: 'read catalog',
      method: 'GET',
      path: 'admin/K-catalog/id',
      call: () => api.details(kind, 'id'),
    },
    {
      name: 'create catalog',
      method: 'POST',
      path: 'admin/K-catalog',
      call: () => api.create(kind, data),
    },
    {
      name: 'update presentation',
      method: 'PUT',
      path: 'admin/K-catalog/id',
      call: () => api.update(kind, 'id', { data, rowVersion: 'rv1' }),
    },
    ...(['activate', 'deactivate', 'merge'] as const).map((name) => ({
      name,
      method: 'POST',
      path: 'admin/K-catalog/id/' + name,
      key: name === 'merge',
      call: () => api.action(kind, 'id', name, action, name === 'merge' ? 'stable-key' : undefined),
    })),
    {
      name: 'preview import',
      method: 'POST',
      path: 'admin/K-catalog/imports/preview',
      key: true,
      call: () => api.preview(kind, new File(['{}'], 'catalog.json'), 'v1', 'stable-key'),
    },
    {
      name: 'list imports',
      method: 'GET',
      path: 'admin/K-catalog/imports',
      call: () => api.imports(kind, 2),
    },
    {
      name: 'read import',
      method: 'GET',
      path: 'admin/K-catalog/imports/batch',
      call: () => api.batch(kind, 'batch'),
    },
    {
      name: 'import changes',
      method: 'GET',
      path: 'admin/K-catalog/imports/batch/changes',
      call: () => api.changes(kind, 'batch', 2),
    },
    {
      name: 'apply import',
      method: 'POST',
      path: 'admin/K-catalog/imports/batch/apply',
      key: true,
      call: () =>
        api.apply(kind, 'batch', { rowVersion: 'rv1', skipPossibleConflicts: false }, 'stable-key'),
    },
    {
      name: 'discard import',
      method: 'POST',
      path: 'admin/K-catalog/imports/batch/discard',
      call: () => api.discard(kind, 'batch', action),
    },
    {
      name: 'review inbox',
      method: 'GET',
      path: 'admin/K-catalog-requests',
      call: () => api.requests(kind, 2, false, 'Pending'),
    },
    {
      name: 'review details',
      method: 'GET',
      path: 'admin/K-catalog-requests/request',
      call: () => api.request(kind, 'request', false),
    },
    ...(['request-more-info', 'approve', 'reject'] as const).map((name) => ({
      name,
      method: 'POST',
      path: 'admin/K-catalog-requests/request/' + name,
      key: name === 'approve',
      call: () =>
        api.review(
          kind,
          'request',
          name,
          { rowVersion: 'rv1', reason: 'review', canonicalCatalogId: 'target' },
          name === 'approve' ? 'stable-key' : undefined,
        ),
    })),
    {
      name: 'doctor active search',
      method: 'GET',
      path: 'doctors/me/K-catalog',
      call: () => api.list(kind, { pageNumber: 1, pageSize: 20, search: 'test' }, true),
    },
    {
      name: 'doctor requests',
      method: 'GET',
      path: 'doctors/me/K-catalog-requests',
      call: () => api.requests(kind, 2, true),
    },
    {
      name: 'doctor request details',
      method: 'GET',
      path: 'doctors/me/K-catalog-requests/request',
      call: () => api.request(kind, 'request', true),
    },
    {
      name: 'doctor missing request',
      method: 'POST',
      path: 'doctors/me/K-catalog-requests',
      call: () => api.createRequest(kind, missing, 'stable-key'),
    },
    {
      name: 'doctor clarification',
      method: 'PUT',
      path: 'doctors/me/K-catalog-requests/request',
      call: () => api.updateRequest(kind, 'request', { data: missing, rowVersion: 'rv1' }),
    },
  ];
  for (const c of cases)
    it(c.name + ' matches its exact server method/path and retry header', () => {
      c.call().subscribe();
      const req = http.expectOne(
        (r) => r.url === `${environment.apiBaseUrl}/api/v1/${c.path.replace('K', kind)}`,
      );
      expect(req.request.method).toBe(c.method);
      if (c.key) expect(req.request.headers.get('Idempotency-Key')).toBe('stable-key');
      if (c.name === 'list catalog') {
        expect(req.request.params.get('pageNumber')).toBe('2');
        expect(req.request.params.get('hasArabic')).toBe('false');
      }
      if (c.name === 'update presentation')
        expect(req.request.body).toEqual({ data, rowVersion: 'rv1' });
      if (c.name === 'preview import') {
        expect(req.request.body.get('File').name).toBe('catalog.json');
        expect(req.request.body.get('SourceVersion')).toBe('v1');
      }
      req.flush({});
    });
});
