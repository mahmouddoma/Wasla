import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { HistoricalDocumentsApi } from './historical-documents-api';
import { HistoricalSubject, HistoricalUpload } from './historical-documents.models';

describe('Historical document private wire contracts', () => {
  let api: HistoricalDocumentsApi, http: HttpTestingController;
  const base = environment.apiBaseUrl + '/api/v1';
  const scopes: [HistoricalSubject, string][] = [
    [{ kind: 'own' }, '/patients/me/historical-documents'],
    [
      { kind: 'dependent', patientId: 'child' },
      '/families/mine/dependents/child/historical-documents',
    ],
  ];
  const upload: HistoricalUpload = {
    category: 'HistoricalLabReport',
    dateUnknown: true,
    documentDate: null,
    providerName: null,
    title: 'Previous report',
    patientNote: null,
    files: [new File(['pdf'], 'report.pdf', { type: 'application/pdf' })],
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HistoricalDocumentsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  describe.each(scopes)('%j', (subject, route) => {
    it('pages sources without crossing the own/dependent route boundary', () => {
      api.list(subject, 2, true).subscribe();
      const request = http.expectOne((r) => r.url === base + route);
      expect(request.request.params.get('pageNumber')).toBe('2');
      expect(request.request.params.has('includeWithdrawn')).toBe(subject.kind === 'own');
      request.flush({ items: [], totalCount: 0 });
    });
    it('reads exact private source details', () => {
      api.details(subject, 'doc').subscribe();
      const request = http.expectOne(base + route + '/doc');
      expect(request.request.method).toBe('GET');
      request.flush({});
    });
    it('uploads multipart files and preserves quarantined 202 receipts', () => {
      let state: string | undefined;
      api
        .upload(subject, upload, 'stable-key')
        .subscribe((receipt) => (state = receipt.validationState));
      const request = http.expectOne(base + route);
      expect(request.request.method).toBe('POST');
      expect(request.request.headers.get('Idempotency-Key')).toBe('stable-key');
      const body = request.request.body as FormData;
      expect(body.getAll('Files')).toEqual(upload.files);
      expect(body.get('dateUnknown')).toBe('true');
      expect(body.has('documentDate')).toBe(false);
      request.flush(
        {
          documentId: 'doc',
          versionNumber: 0,
          validationState: 'Quarantined',
          failureCode: 'ScannerUnavailable',
        },
        { status: 202, statusText: 'Accepted' },
      );
      expect(state).toBe('Quarantined');
    });
    it('revises with the existing source rowVersion and explicit reason', () => {
      api
        .upload(
          subject,
          { ...upload, rowVersion: 'AAAA', reason: 'New report' },
          'revision-key',
          'doc',
        )
        .subscribe();
      const request = http.expectOne(base + route + '/doc/versions');
      expect((request.request.body as FormData).get('rowVersion')).toBe('AAAA');
      expect((request.request.body as FormData).get('reason')).toBe('New report');
      request.flush({});
    });
    it('withdraws through the dedicated command without deleting history', () => {
      api.withdraw(subject, 'doc', 'AAAA', 'Uploaded in error', 'withdraw-key').subscribe();
      const request = http.expectOne(base + route + '/doc/withdraw');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ rowVersion: 'AAAA', reason: 'Uploaded in error' });
      request.flush({});
    });
    it('requests attachment bytes without public URLs', () => {
      api.attachment(subject, 'doc', 'attachment').subscribe();
      const request = http.expectOne(base + route + '/doc/attachments/attachment/content');
      expect(request.request.responseType).toBe('blob');
      expect(request.request.headers.has('Idempotency-Key')).toBe(false);
      request.flush(new Blob(['private']));
    });
  });
  it('uses the own-only immutable versions endpoint with server pagination', () => {
    api.versions('doc', 3).subscribe();
    const request = http.expectOne(
      (r) => r.url === base + '/patients/me/historical-documents/doc/versions',
    );
    expect(request.request.params.get('pageNumber')).toBe('3');
    request.flush([]);
  });
});
