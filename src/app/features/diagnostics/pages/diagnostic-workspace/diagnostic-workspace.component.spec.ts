import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DiagnosticsApi } from '../../../../domains/diagnostics';
import {
  diagnosticRequest,
  diagnosticResult,
  diagnosticSubmission,
} from '../../diagnostic-test-fixtures';
import { DiagnosticWorkspaceComponent } from './diagnostic-workspace.component';

describe.each(['Doctor', 'Patient'] as const)('%s diagnostic workspace', (actor) => {
  const api = {
    requests: vi.fn(),
    request: vi.fn(),
    results: vi.fn(),
    result: vi.fn(),
    inbox: vi.fn(),
    submission: vi.fn(),
    submissions: vi.fn(),
    history: vi.fn(),
    versions: vi.fn(),
    version: vi.fn(),
    cancel: vi.fn(),
    upload: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
    withdraw: vi.fn(),
    voidResult: vi.fn(),
    download: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  let permissions = true;
  afterEach(() => localStorage.removeItem('wasla_lang'));
  beforeEach(() => {
    vi.resetAllMocks();
    permissions = true;
    const page = { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 };
    api.requests.mockReturnValue(
      of({
        ...page,
        items: [
          { requestId: 'request', status: 'Requested', requestedAtUtc: '2026-10-07T09:00:00Z' },
        ],
        totalCount: 1,
      }),
    );
    api.results.mockReturnValue(of({ ...page, items: [diagnosticResult], totalCount: 1 }));
    api.inbox.mockReturnValue(of(page));
    api.request.mockReturnValue(of(diagnosticRequest));
    api.result.mockReturnValue(of(diagnosticResult));
    api.submission.mockReturnValue(of(diagnosticSubmission));
    api.submissions.mockReturnValue(of(page));
    api.upload.mockReturnValue(
      of({
        request: diagnosticRequest,
        result: diagnosticResult,
        submission: diagnosticSubmission,
      }),
    );
    TestBed.configureTestingModule({
      imports: [DiagnosticWorkspaceComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { kind: 'radiology', actor },
              queryParamMap: convertToParamMap({ encounterId: 'encounter' }),
            },
          },
        },
        { provide: DiagnosticsApi, useValue: api },
        { provide: AuthApi, useValue: {} },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: actor }), hasPermission: () => permissions },
        },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
  });
  it('renders orders and keeps encounter-filtered server pagination', async () => {
    const f = TestBed.createComponent(DiagnosticWorkspaceComponent);
    await f.whenStable();
    expect(f.componentInstance).toBeTruthy();
    await f.componentInstance.load(2);
    expect(api.requests.mock.calls.at(-1)?.[2]).toEqual(
      expect.objectContaining({ EncounterId: 'encounter', PageNumber: 2 }),
    );
    expect(f.nativeElement.querySelector('tbody')).toBeTruthy();
  });
  it('protects patient views from internal clinical metadata and version history', async () => {
    const f = TestBed.createComponent(DiagnosticWorkspaceComponent);
    await f.whenStable();
    await f.componentInstance.inspect('request');
    f.detectChanges();
    if (actor === 'Patient') {
      expect(f.nativeElement.textContent).not.toContain('Internal doctor instructions');
      expect(f.nativeElement.textContent).not.toContain('Internal post-visit reason');
      await f.componentInstance.inspect('result', 'results');
      f.detectChanges();
      expect(f.nativeElement.textContent).not.toContain('Internal correction reason');
      await f.componentInstance.loadVersions();
      expect(api.versions).not.toHaveBeenCalled();
    } else expect(f.nativeElement.textContent).toContain('Internal doctor instructions');
  });
  it('keeps upload files/key unchanged on uncertain retry and excludes stale local state', async () => {
    const f = TestBed.createComponent(DiagnosticWorkspaceComponent);
    const c = f.componentInstance;
    await c.inspect('request');
    await c.openUpload();
    const files = [new File(['s'], 'report.pdf')];
    const upload = {
      attachments: files,
      attachmentKinds: ['Report' as const],
      coveredItemIds: actor === 'Doctor' ? ['item'] : [],
      rowVersion: 'request-rv',
      providerName: 'Synthetic provider',
      reportDate: '2026-10-07',
      patientNote: '',
      reason: '',
    };
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await c.upload(upload);
    await c.upload(upload);
    expect(api.upload.mock.calls[0][4]).toBe(api.upload.mock.calls[1][4]);
    expect(api.upload.mock.calls[0][3].attachments[0]).toBe(files[0]);
    expect(toast.error).toHaveBeenCalled();
  });
  it('requires capability and a patient-visible reason before cancellation', async () => {
    const c = TestBed.createComponent(DiagnosticWorkspaceComponent).componentInstance;
    await c.inspect('request');
    c.prepare('cancel', 'item');
    await c.execute();
    expect(api.cancel).not.toHaveBeenCalled();
    c.reason.set('Test no longer required');
    api.cancel.mockReturnValue(of({ ...diagnosticRequest, rowVersion: 'new-request-rv' }));
    await c.execute();
    if (actor === 'Doctor') {
      expect(api.cancel).toHaveBeenCalledWith('radiology', 'request', 'item', {
        rowVersion: 'request-rv',
        reason: 'Test no longer required',
        targetCatalogId: null,
      });
      expect(c.request()?.rowVersion).toBe('new-request-rv');
      expect(toast.success).toHaveBeenCalled();
    } else expect(api.cancel).not.toHaveBeenCalled();
  });
  it('uses the submission token and exact coverage when accepting a report', async () => {
    const c = TestBed.createComponent(DiagnosticWorkspaceComponent).componentInstance;
    await c.inspect('submission', 'submissions');
    c.prepare('accept');
    c.toggleCoverage('item');
    api.accept.mockReturnValue(
      of({
        request: diagnosticRequest,
        result: diagnosticResult,
        submission: { ...diagnosticSubmission, status: 'Accepted', rowVersion: 'accepted-rv' },
      }),
    );
    await c.execute();
    if (actor === 'Doctor') {
      expect(api.accept.mock.calls[0][2]).toEqual({
        coveredRadiologyRequestItemIds: ['item'],
        rowVersion: 'submission-rv',
      });
      expect(c.submission()?.rowVersion).toBe('accepted-rv');
    } else expect(api.accept).not.toHaveBeenCalled();
  });
  it('rebases after 409 and blocks duplicate mutation requests', async () => {
    const c = TestBed.createComponent(DiagnosticWorkspaceComponent).componentInstance;
    await c.inspect('request');
    await c.openUpload();
    const upload = {
      attachments: [new File(['s'], 'report.pdf')],
      attachmentKinds: ['Report' as const],
      coveredItemIds: ['item'],
      rowVersion: 'request-rv',
      providerName: '',
      reportDate: '',
      patientNote: '',
      reason: '',
    };
    const pending = new Subject<never>();
    api.upload.mockReturnValue(pending);
    const first = c.upload(upload);
    await c.upload(upload);
    expect(api.upload).toHaveBeenCalledTimes(1);
    api.request.mockReturnValue(of({ ...diagnosticRequest, rowVersion: 'fresh' }));
    pending.error(new HttpErrorResponse({ status: 409 }));
    await first;
    expect(c.request()?.rowVersion).toBe('fresh');
    expect(c.uploadOpen()).toBe(false);
  });
  it('renders illustrated empty states and respects missing permissions', async () => {
    api.requests.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const f = TestBed.createComponent(DiagnosticWorkspaceComponent);
    await f.whenStable();
    expect(f.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
    permissions = false;
    await f.componentInstance.inspect('request');
    expect(api.request).not.toHaveBeenCalled();
  });
});
