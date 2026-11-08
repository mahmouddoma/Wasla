import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FamilyWorkspaceApi } from '../../../domains/families';
import { ToastService } from '../../../core/notifications/toast.service';
import { DependentDiagnosticsComponent } from './dependent-diagnostics.component';

describe('DependentDiagnosticsComponent', () => {
  const api = {
    diagnosticSubmissions: vi.fn(),
    submitDiagnostic: vi.fn(),
    withdrawDiagnostic: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    api.diagnosticSubmissions.mockReturnValue(of({ items: [], totalCount: 0 }));
    TestBed.configureTestingModule({
      imports: [DependentDiagnosticsComponent],
      providers: [
        { provide: FamilyWorkspaceApi, useValue: api },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(DependentDiagnosticsComponent);
    fixture.componentRef.setInput('childId', 'child');
    fixture.componentRef.setInput('requestId', 'request');
    fixture.componentRef.setInput('kind', 'lab');
    return fixture;
  }
  it('does not infer submission reads from write access', () => {
    const fixture = create();
    fixture.componentRef.setInput('canSubmit', true);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(api.diagnosticSubmissions).not.toHaveBeenCalled();
  });
  it('submits private files in the exact child and doctor request context', async () => {
    api.submitDiagnostic.mockReturnValue(
      of({ submissionId: 's', requestId: 'request', status: 'PendingReview', rowVersion: 'AAAA' }),
    );
    const fixture = create();
    fixture.componentRef.setInput('canSubmit', true);
    fixture.detectChanges();
    fixture.componentInstance.files = [
      new File(['report'], 'report.pdf', { type: 'application/pdf' }),
    ];
    await fixture.componentInstance.submit();
    expect(api.submitDiagnostic).toHaveBeenCalledWith(
      'child',
      'lab',
      'request',
      expect.any(Array),
      expect.any(Object),
      expect.any(String),
    );
    expect(fixture.componentInstance.receipt()?.status).toBe('PendingReview');
  });
  it('requires independent withdrawal capability and confirmation', async () => {
    const fixture = create();
    fixture.detectChanges();
    fixture.componentInstance.receipt.set({
      submissionId: 's',
      requestId: 'request',
      status: 'PendingReview',
      rowVersion: 'AAAA',
    });
    await fixture.componentInstance.withdraw();
    expect(api.withdrawDiagnostic).not.toHaveBeenCalled();
  });
  it('purges the previous child submission on subject change', () => {
    const fixture = create();
    fixture.detectChanges();
    fixture.componentInstance.receipt.set({
      submissionId: 's',
      requestId: 'request',
      status: 'PendingReview',
      rowVersion: 'AAAA',
    });
    fixture.componentInstance.patientNote = 'Previous child note';
    fixture.componentRef.setInput('childId', 'second');
    fixture.detectChanges();
    expect(fixture.componentInstance.receipt()).toBeNull();
    expect(fixture.componentInstance.patientNote).toBe('');
  });
});
