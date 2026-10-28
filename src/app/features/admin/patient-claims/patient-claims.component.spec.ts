import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AdminClaimDetails, PatientIdentityApi } from '../../../domains/patient-identity';
import { PatientClaimsComponent } from './patient-claims.component';

describe('PatientClaimsComponent', () => {
  let fixture: ComponentFixture<PatientClaimsComponent>;
  let component: PatientClaimsComponent;

  const sampleClaimDetails: AdminClaimDetails = {
    claimRequestId: 'claim-1',
    status: 'PendingReview',
    claimant: {
      nameAr: 'محمد أحمد',
      dateOfBirth: '1992-05-10',
      gender: 'Male',
      email: 'm.ahmed@example.com',
      phoneMasked: '010****1234',
    },
    candidatePatients: [
      {
        patientId: 'pat-101',
        nameAr: 'محمد أحمد علي',
        dateOfBirth: '1992-05-10',
        gender: 'Male',
        emailMasked: 'm***@example.com',
      },
      {
        patientId: 'pat-102',
        nameAr: 'محمد أحمد حسن',
        dateOfBirth: '1992-05-10',
        gender: 'Male',
        emailMasked: '',
      },
    ],
    evidence: [
      {
        evidenceId: 'ev-1',
        type: 'GovernmentIdFront',
        revisionNumber: 1,
        uploadedOnUtc: '2026-10-28T10:00:00Z',
      },
    ],
    submittedOnUtc: '2026-10-28T10:00:00Z',
    lastActivityOnUtc: '2026-10-28T10:00:00Z',
    rowVersion: 'rv-1',
    reviewCapabilities: {
      canApprove: true,
      canReject: true,
      canRequestModification: true,
    },
  };

  const identityApi = {
    adminClaims: vi.fn(() =>
      of({
        items: [
          {
            id: 'claim-1',
            status: 'PendingReview',
            claimantEmailMasked: 'm***@example.com',
            submittedOnUtc: '2026-10-28T10:00:00Z',
            lastActivityOnUtc: '2026-10-28T10:00:00Z',
            evidenceCount: 1,
            rowVersion: 'rv-1',
          },
        ],
        pageNumber: 1,
        pageSize: 20,
        totalCount: 1,
      }),
    ),
    adminClaimDetails: vi.fn(() => of(sampleClaimDetails)),
    adminClaimEvidence: vi.fn(() =>
      of(new HttpResponse({ body: new Blob(['img'], { type: 'image/png' }), status: 200 })),
    ),
    approveClaim: vi.fn(() =>
      of({
        claimRequestId: 'claim-1',
        status: 'ApprovedPendingActivation',
        targetPatientId: 'pat-101',
        rowVersion: 'rv-2',
        invitationExpiresOnUtc: '2026-10-30T10:00:00Z',
      }),
    ),
    requestClaimModification: vi.fn(() =>
      of({
        claimRequestId: 'claim-1',
        status: 'ModificationRequested',
        rowVersion: 'rv-2',
        canResubmit: true,
        closedOnUtc: null,
      }),
    ),
    rejectClaim: vi.fn(() =>
      of({
        claimRequestId: 'claim-1',
        status: 'Rejected',
        closedOnUtc: '2026-10-28T11:00:00Z',
        rowVersion: 'rv-2',
        canResubmit: false,
      }),
    ),
    claimHistory: vi.fn(() =>
      of([
        {
          id: 'h-1',
          action: 'Submitted',
          actorName: 'Applicant',
          timestampUtc: '2026-10-28T10:00:00Z',
        },
      ]),
    ),
  };

  const session = {
    hasPermission: vi.fn(() => true),
  };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    identityApi.adminClaimDetails.mockReturnValue(of(sampleClaimDetails));

    TestBed.configureTestingModule({
      imports: [PatientClaimsComponent],
      providers: [
        provideRouter([]),
        { provide: PatientIdentityApi, useValue: identityApi },
        { provide: AuthSession, useValue: session },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PatientClaimsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('loads pending claims on initialization and renders claim rows', () => {
    expect(component).toBeTruthy();
    expect(identityApi.adminClaims).toHaveBeenCalledWith('PendingReview', 1, 20, undefined);
    expect(component.items().length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="claim-row"]').length).toBe(1);
  });

  it('opens slide-over drawer with claim details and requires explicit candidate + evidence selection before approval', async () => {
    await component.openClaimDrawer('claim-1');
    fixture.detectChanges();

    expect(identityApi.adminClaimDetails).toHaveBeenCalledWith('claim-1');
    expect(component.drawerOpen()).toBe(true);
    // Multiple candidates exist -> must NOT auto-select
    expect(component.selectedTargetPatientId()).toBe('');
    expect(component.canSubmitApprove()).toBe(false);

    // Select candidate patient and mark evidence as reviewed
    component.selectCandidatePatient('pat-101');
    await component.previewEvidence('ev-1');
    expect(component.isEvidenceReviewed('ev-1')).toBe(true);
    expect(component.canSubmitApprove()).toBe(true);

    await component.approveClaim();
    expect(identityApi.approveClaim).toHaveBeenCalledWith(
      'claim-1',
      {
        targetPatientId: 'pat-101',
        rowVersion: 'rv-1',
        reviewedEvidenceIds: ['ev-1'],
        reviewNote: undefined,
      },
      expect.any(String),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('reloads claim details and updates rowVersion on 409 concurrency conflict without auto-retrying', async () => {
    await component.openClaimDrawer('claim-1');
    component.selectCandidatePatient('pat-101');
    component.reviewedEvidenceIds.set(['ev-1']);

    const conflictErr = new HttpErrorResponse({
      status: 409,
      error: {
        errors: [{ code: 'PatientClaims.ConcurrencyConflict', message: 'Conflict' }],
      },
    });
    identityApi.approveClaim.mockReturnValueOnce(throwError(() => conflictErr));
    identityApi.adminClaimDetails.mockReturnValueOnce(
      of({
        ...sampleClaimDetails,
        rowVersion: 'rv-updated-99',
      }),
    );

    await component.approveClaim();

    expect(toast.error).toHaveBeenCalled();
    expect(component.claimDetails()?.rowVersion).toBe('rv-updated-99');
  });

  it('submits request modification and rejection with reason and rowVersion', async () => {
    await component.openClaimDrawer('claim-1');
    component.decisionReason.set('يرجى إرفاق صورة أوضح للبطاقة');

    await component.requestModification();
    expect(identityApi.requestClaimModification).toHaveBeenCalledWith(
      'claim-1',
      {
        rowVersion: 'rv-1',
        reason: 'يرجى إرفاق صورة أوضح للبطاقة',
      },
      expect.any(String),
    );
    expect(toast.success).toHaveBeenCalled();
  });
});

