import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientDiagnosticsTabComponent } from './patient-diagnostics-tab.component';
import { DiagnosticsApi } from '../../../../domains/diagnostics';
import type { DiagnosticSubmissionSummary } from '../../../../domains/diagnostics/contracts';
import { ToastService } from '../../../../core/notifications/toast.service';
import { of, throwError } from 'rxjs';

describe('PatientDiagnosticsTabComponent', () => {
  let component: PatientDiagnosticsTabComponent;
  let fixture: ComponentFixture<PatientDiagnosticsTabComponent>;
  let diagnosticsApi: {
    requests: ReturnType<typeof vi.fn>;
    results: ReturnType<typeof vi.fn>;
    inbox: ReturnType<typeof vi.fn>;
    submission: ReturnType<typeof vi.fn>;
    accept: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
  };
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  const mockRequest = {
    requestId: 'req-1',
    medicalEncounterId: 'enc-1',
    patientId: 'pat-1',
    practiceId: 'prac-1',
    origin: 'DuringEncounter' as const,
    status: 'Requested' as const,
    requestedAtUtc: '2026-10-28T08:00:00Z',
    rowVersion: 'AAAA==',
  };

  const mockSubmission = {
    submissionId: 'sub-1',
    requestId: 'req-1',
    status: 'PendingReview' as const,
    submittedAtUtc: '2026-10-28T09:00:00Z',
  };

  beforeEach(async () => {
    diagnosticsApi = {
      requests: vi.fn().mockReturnValue(of({ items: [mockRequest], totalCount: 1, pageNumber: 1, pageSize: 20 })),
      results: vi.fn().mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 })),
      inbox: vi.fn().mockReturnValue(of({ items: [mockSubmission], totalCount: 1, pageNumber: 1, pageSize: 20 })),
      submission: vi.fn().mockReturnValue(of({
        submissionId: 'sub-1',
        requestId: 'req-1',
        status: 'PendingReview',
        rowVersion: 'AAAA==',
      })),
      accept: vi.fn().mockReturnValue(of({})),
      reject: vi.fn().mockReturnValue(of({})),
    };
    toast = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PatientDiagnosticsTabComponent],
      providers: [
        { provide: DiagnosticsApi, useValue: diagnosticsApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientDiagnosticsTabComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'pat-1');
    fixture.detectChanges();
  });

  it('creates component and loads lab requests by default', () => {
    expect(component).toBeTruthy();
    expect(diagnosticsApi.requests).toHaveBeenCalledWith('lab', 'Doctor', {
      PatientId: 'pat-1',
      PageNumber: 1,
      PageSize: 20,
    });
    expect(component.requests().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('switches to radiology', () => {
    component.setKind('radiology');
    expect(component.currentKind()).toBe('radiology');
    expect(diagnosticsApi.requests).toHaveBeenCalledWith('radiology', 'Doctor', expect.any(Object));
  });

  it('switches to submissions tab and accepts submission', () => {
    component.setTab('submissions');
    expect(component.currentTab()).toBe('submissions');
    expect(diagnosticsApi.inbox).toHaveBeenCalledWith('lab', expect.any(Object));
    expect(component.submissions().length).toBe(1);

    component.openReview(mockSubmission as unknown as DiagnosticSubmissionSummary, 'accept');
    expect(component.reviewingSubmission()?.submissionId).toBe('sub-1');

    component.submitReview();
    expect(diagnosticsApi.accept).toHaveBeenCalledWith(
      'lab',
      'sub-1',
      { coveredLabRequestItemIds: null, rowVersion: 'AAAA==' },
      expect.any(String),
    );
    expect(toast.success).toHaveBeenCalledWith('تم اعتماد نتيجة الفحص بنجاح');
  });

  it('rejects submission with reason', () => {
    component.setTab('submissions');
    component.openReview(mockSubmission as unknown as DiagnosticSubmissionSummary, 'reject');
    component.reviewReason.set('الملف غير واضح');

    component.submitReview();
    expect(diagnosticsApi.reject).toHaveBeenCalledWith(
      'lab',
      'sub-1',
      { patientVisibleReason: 'الملف غير واضح', rowVersion: 'AAAA==' },
    );
    expect(toast.success).toHaveBeenCalledWith('تم رفض الملف المرفوع بنجاح');
  });

  it('handles load error', () => {
    diagnosticsApi.requests.mockReturnValue(throwError(() => new Error('Error')));
    component.loadData();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});
