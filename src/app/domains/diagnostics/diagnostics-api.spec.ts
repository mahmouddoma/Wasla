import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DiagnosticUpload, DiagnosticsApi } from './diagnostics-api';

describe.each(['lab', 'radiology'] as const)('%s diagnostic API contracts', (kind) => {
  let api: DiagnosticsApi;
  let http: HttpTestingController;
  const action = { rowVersion: 'request-rv', reason: 'Reason for patient', targetCatalogId: null };
  const query = { PageNumber: 2, PageSize: 20, EncounterId: 'encounter' };
  const item =
    kind === 'lab'
      ? {
          labTestCatalogId: 'catalog',
          newLabTest: null,
          doctorInstructions: 'instruction',
          labRequestRowVersion: 'lab-rv',
          patientInstructions: null,
        }
      : {
          radiologyProcedureCatalogId: 'catalog',
          newRadiologyProcedure: null,
          doctorInstructions: 'instruction',
          radiologyRequestRowVersion: 'radiology-rv',
          patientInstructions: null,
        };
  const upload: DiagnosticUpload = {
    attachments: [
      new File(['report'], 'report.pdf', { type: 'application/pdf' }),
      new File(['image'], 'image.png', { type: 'image/png' }),
    ],
    attachmentKinds: ['Report', 'Image'],
    coveredItemIds: ['item1', 'item2'],
    rowVersion: 'root-rv',
    providerName: 'Synthetic provider',
    reportDate: '2026-10-07',
    patientNote: 'Patient note',
    reason: 'Correction reason',
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DiagnosticsApi);
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
      name: 'draft',
      method: 'GET',
      path: 'doctors/me/practices/practice/encounters/encounter/K-request',
      call: () => api.draft(kind, 'practice', 'encounter'),
    },
    {
      name: 'add item',
      method: 'POST',
      path: 'doctors/me/practices/practice/encounters/encounter/K-request/items',
      key: true,
      call: () => api.add(kind, 'practice', 'encounter', item, 'stable-key'),
    },
    {
      name: 'edit instructions',
      method: 'PUT',
      path: 'doctors/me/practices/practice/encounters/encounter/K-request/items/item',
      call: () => api.edit(kind, 'practice', 'encounter', 'item', item),
    },
    {
      name: 'remove item',
      method: 'DELETE',
      path: 'doctors/me/practices/practice/encounters/encounter/K-request/items/item',
      call: () => api.remove(kind, 'practice', 'encounter', 'item', 'token+/='),
    },
    {
      name: 'post visit',
      method: 'POST',
      path: 'doctors/me/practices/practice/encounters/encounter/K-requests/post-visit',
      key: true,
      call: () =>
        api.postVisit(
          kind,
          'practice',
          'encounter',
          { postVisitReason: 'Additional assessment', patientInstructions: null, items: [item] },
          'stable-key',
        ),
    },
    {
      name: 'doctor orders',
      method: 'GET',
      path: 'doctors/me/K-requests',
      call: () => api.requests(kind, 'Doctor', query),
    },
    {
      name: 'doctor order',
      method: 'GET',
      path: 'doctors/me/K-requests/request',
      call: () => api.request(kind, 'Doctor', 'request'),
    },
    {
      name: 'history',
      method: 'GET',
      path: 'doctors/me/K-requests/request/history',
      call: () => api.history(kind, 'request'),
    },
    {
      name: 'cancel item',
      method: 'POST',
      path: 'doctors/me/K-requests/request/items/item/cancel',
      call: () => api.cancel(kind, 'request', 'item', action),
    },
    {
      name: 'cancel remaining',
      method: 'POST',
      path: 'doctors/me/K-requests/request/cancel-remaining',
      call: () => api.cancel(kind, 'request', null, action),
    },
    {
      name: 'official upload',
      method: 'POST',
      path: 'doctors/me/K-requests/request/results',
      key: true,
      call: () => api.upload(kind, 'Doctor', 'request', upload, 'stable-key'),
    },
    {
      name: 'doctor results',
      method: 'GET',
      path: 'doctors/me/K-results',
      call: () => api.results(kind, 'Doctor', query),
    },
    {
      name: 'doctor result',
      method: 'GET',
      path: 'doctors/me/K-results/result',
      call: () => api.result(kind, 'Doctor', 'result'),
    },
    {
      name: 'versions',
      method: 'GET',
      path: 'doctors/me/K-results/result/versions',
      call: () => api.versions(kind, 'result'),
    },
    {
      name: 'version details',
      method: 'GET',
      path: 'doctors/me/K-results/result/versions/2',
      call: () => api.version(kind, 'result', 2),
    },
    {
      name: 'correction',
      method: 'POST',
      path: 'doctors/me/K-results/result/corrections',
      key: true,
      call: () => api.upload(kind, 'Doctor', 'result', upload, 'stable-key', true),
    },
    {
      name: 'void',
      method: 'POST',
      path: 'doctors/me/K-results/result/void',
      key: true,
      call: () => api.voidResult(kind, 'result', action, 'stable-key'),
    },
    {
      name: 'inbox',
      method: 'GET',
      path: 'doctors/me/K-result-submissions',
      call: () => api.inbox(kind, query, 'PendingReview'),
    },
    {
      name: 'doctor submission',
      method: 'GET',
      path: 'doctors/me/K-result-submissions/submission',
      call: () => api.submission(kind, 'Doctor', 'submission'),
    },
    {
      name: 'accept',
      method: 'POST',
      path: 'doctors/me/K-result-submissions/submission/accept',
      key: true,
      call: () =>
        api.accept(
          kind,
          'submission',
          kind === 'lab'
            ? { coveredLabRequestItemIds: ['item'], rowVersion: 'submission-rv' }
            : { coveredRadiologyRequestItemIds: ['item'], rowVersion: 'submission-rv' },
          'stable-key',
        ),
    },
    {
      name: 'reject',
      method: 'POST',
      path: 'doctors/me/K-result-submissions/submission/reject',
      call: () =>
        api.reject(kind, 'submission', {
          patientVisibleReason: 'Please send a clearer report',
          rowVersion: 'submission-rv',
        }),
    },
    {
      name: 'doctor result download',
      method: 'GET',
      path: 'doctors/me/K-results/result/versions/2/attachments/attachment/content',
      call: () => api.download(kind, 'Doctor', 'results', 'result', 'attachment', 2),
    },
    {
      name: 'doctor submission download',
      method: 'GET',
      path: 'doctors/me/K-result-submissions/submission/attachments/attachment/content',
      call: () => api.download(kind, 'Doctor', 'result-submissions', 'submission', 'attachment'),
    },
    {
      name: 'patient orders',
      method: 'GET',
      path: 'K-requests/mine',
      call: () => api.requests(kind, 'Patient', query),
    },
    {
      name: 'patient order',
      method: 'GET',
      path: 'K-requests/mine/request',
      call: () => api.request(kind, 'Patient', 'request'),
    },
    {
      name: 'patient results',
      method: 'GET',
      path: 'K-results/mine',
      call: () => api.results(kind, 'Patient', query),
    },
    {
      name: 'patient result',
      method: 'GET',
      path: 'K-results/mine/result',
      call: () => api.result(kind, 'Patient', 'result'),
    },
    {
      name: 'patient upload',
      method: 'POST',
      path: 'K-requests/mine/request/submissions',
      key: true,
      call: () => api.upload(kind, 'Patient', 'request', upload, 'stable-key'),
    },
    {
      name: 'patient submissions',
      method: 'GET',
      path: 'K-requests/mine/request/submissions',
      call: () => api.submissions(kind, 'request', 2),
    },
    {
      name: 'patient submission',
      method: 'GET',
      path: 'K-result-submissions/mine/submission',
      call: () => api.submission(kind, 'Patient', 'submission'),
    },
    {
      name: 'withdraw',
      method: 'POST',
      path: 'K-result-submissions/mine/submission/withdraw',
      call: () => api.withdraw(kind, 'submission', action),
    },
    {
      name: 'patient submission download',
      method: 'GET',
      path: 'K-result-submissions/mine/submission/attachments/attachment/content',
      call: () => api.download(kind, 'Patient', 'result-submissions', 'submission', 'attachment'),
    },
    {
      name: 'patient result download',
      method: 'GET',
      path: 'K-results/mine/result/attachments/attachment/content',
      call: () => api.download(kind, 'Patient', 'results', 'result', 'attachment'),
    },
  ];
  for (const c of cases)
    it(c.name + ' uses the exact actor-scoped method/path and concurrency contract', () => {
      c.call().subscribe();
      const req = http.expectOne(
        (r) => r.url === `${environment.apiBaseUrl}/api/v1/${c.path.replace('K', kind)}`,
      );
      expect(req.request.method).toBe(c.method);
      if (c.key) expect(req.request.headers.get('Idempotency-Key')).toBe('stable-key');
      if (c.name === 'remove item') {
        expect(req.request.params.get('rowVersion')).toBe('token+/=');
        expect(req.request.body).toBeNull();
      }
      if (['official upload', 'correction', 'patient upload'].includes(c.name)) {
        const data = req.request.body as FormData;
        expect(data.getAll('Attachments')).toHaveLength(2);
        expect(data.getAll('AttachmentKinds')).toEqual(['Report', 'Image']);
        const coverage =
          kind === 'lab' ? 'CoveredLabRequestItemIds' : 'CoveredRadiologyRequestItemIds';
        expect(data.getAll(coverage)).toEqual(
          c.name === 'patient upload' ? [] : ['item1', 'item2'],
        );
        expect(data.get('RowVersion')).toBe(c.name === 'patient upload' ? null : 'root-rv');
        expect(
          data.get(kind === 'lab' ? 'ExternalLaboratoryName' : 'ExternalRadiologyCenterName'),
        ).toBe('Synthetic provider');
      }
      if (c.name.includes('download')) {
        expect(req.request.responseType).toBe('blob');
        req.flush(new Blob(['synthetic']));
      } else req.flush({});
    });
  it('rejects file/kind mismatches before an HTTP upload can happen', () => {
    expect(() =>
      api.upload(kind, 'Patient', 'request', { ...upload, attachmentKinds: ['Report'] }, 'key'),
    ).toThrow();
    http.expectNone(() => true);
  });
});
