import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DiagnosticsApi } from '../../../../domains/diagnostics';
import { MedicalCatalogApi } from '../../../../domains/medical-catalog';
import { diagnosticRequest } from '../../diagnostic-test-fixtures';
import { DiagnosticDraftComponent } from './diagnostic-draft.component';

describe.each(['lab', 'radiology'] as const)('%s encounter draft', (kind) => {
  const api = { draft: vi.fn(), add: vi.fn(), edit: vi.fn(), remove: vi.fn(), postVisit: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.draft.mockReturnValue(of({ ...diagnosticRequest, status: 'Draft' }));
    api.add.mockReturnValue(of({ ...diagnosticRequest, rowVersion: 'updated-rv' }));
    TestBed.configureTestingModule({
      imports: [DiagnosticDraftComponent],
      providers: [
        { provide: DiagnosticsApi, useValue: api },
        {
          provide: MedicalCatalogApi,
          useValue: {
            list: vi
              .fn()
              .mockReturnValue(of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 })),
          },
        },
        { provide: AuthApi, useValue: {} },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: 'Doctor' }), hasPermission: () => true },
        },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  function fixture() {
    const f = TestBed.createComponent(DiagnosticDraftComponent);
    f.componentRef.setInput('kind', kind);
    f.componentRef.setInput('practiceId', 'practice');
    f.componentRef.setInput('encounterId', 'encounter');
    f.componentRef.setInput('canManageEncounter', true);
    return f;
  }
  it('renders current draft items and respects the encounter capability', async () => {
    const f = fixture();
    await f.whenStable();
    expect(f.componentInstance).toBeTruthy();
    expect(f.nativeElement.textContent).toContain(diagnosticRequest.items![0].nameArSnapshot);
    f.componentRef.setInput('canManageEncounter', false);
    f.detectChanges();
    expect(f.componentInstance.canManage()).toBe(false);
  });
  it('adds an item with its independent diagnostic token and replaces the whole draft', async () => {
    const f = fixture();
    await f.whenStable();
    const c = f.componentInstance;
    c.catalogId.set('catalog');
    const changed = vi.fn();
    c.changed.subscribe(changed);
    await c.save();
    expect(
      api.add.mock.calls[0][3][
        kind === 'lab' ? 'labRequestRowVersion' : 'radiologyRequestRowVersion'
      ],
    ).toBe('request-rv');
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ rowVersion: 'updated-rv' }));
    expect(toast.success).toHaveBeenCalled();
  });
  it('keeps the key on uncertain retry and clears the root on last-item removal', async () => {
    const f = fixture();
    await f.whenStable();
    const c = f.componentInstance;
    c.catalogId.set('catalog');
    api.add.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await c.save();
    await c.save();
    expect(api.add.mock.calls[0][4]).toBe(api.add.mock.calls[1][4]);
    c.removingId.set('item');
    api.remove.mockReturnValue(
      of({ ...diagnosticRequest, requestId: null, rowVersion: null, items: [] }),
    );
    await c.remove();
    expect(c.state()?.rowVersion).toBeNull();
    expect(c.state()?.items).toEqual([]);
  });
  it('creates a post-visit order without editing the completed encounter', async () => {
    const f = fixture();
    f.componentRef.setInput('completed', true);
    f.componentRef.setInput('canPostVisit', true);
    await f.whenStable();
    const c = f.componentInstance;
    c.catalogId.set('catalog');
    c.postVisitReason.set('Additional assessment');
    api.postVisit.mockReturnValue(of({ ...diagnosticRequest, origin: 'PostVisit' }));
    await c.save();
    expect(api.postVisit).toHaveBeenCalled();
    expect(api.add).not.toHaveBeenCalled();
    expect(api.edit).not.toHaveBeenCalled();
  });
  it('blocks actions while a parent mutation is running', async () => {
    const f = fixture();
    await f.whenStable();
    f.componentRef.setInput('locked', true);
    const c = f.componentInstance;
    c.catalogId.set('catalog');
    await c.save();
    expect(api.add).not.toHaveBeenCalled();
  });
});
