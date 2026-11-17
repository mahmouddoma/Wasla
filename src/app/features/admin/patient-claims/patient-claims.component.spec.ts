import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
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

  const hasPermission = signal(true);
  const session = {
    hasPermission: vi.fn(() => hasPermission()),
  };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    identityApi.adminClaimDetails.mockReturnValue(of(sampleClaimDetails));
    hasPermission.set(true);
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:preview');
      static override revokeObjectURL = vi.fn();
    });

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

  afterEach(() => {
    localStorage.removeItem('wasla_lang');
    vi.unstubAllGlobals();
  });

  it('loads pending claims on initialization and renders claim rows', () => {
    expect(component).toBeTruthy();
    expect(identityApi.adminClaims).toHaveBeenCalledWith('PendingReview', 1, 20, undefined);
    expect(component.items().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('m***@example.com');
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
    expect(component.isEvidenceReviewed('ev-1')).toBe(false);
    component.onEvidencePreviewLoaded(component.previewBlobUrl());
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
    expect(component.isSubmittingDecision()).toBe(false);
    expect(identityApi.approveClaim).toHaveBeenCalledOnce();
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

  it('updates filter via setQuickFilter and resets all via clearAllFilters', () => {
    component.setQuickFilter('Rejected');
    expect(component.statusFilter()).toBe('Rejected');

    component.emailSearch.set('test@example.com');
    expect(component.hasActiveFilters()).toBe(true);

    component.clearAllFilters();
    expect(component.statusFilter()).toBe('');
    expect(component.emailSearch()).toBe('');
    expect(component.hasActiveFilters()).toBe(false);
  });

  it('translates status via getStatusLabel', () => {
    expect(component.getStatusLabel('PendingReview')).toBeTruthy();
    expect(component.getStatusLabel('Rejected')).toBeTruthy();
  });

  it('ignores claim A details after opening B, including errors and loading state', async () => {
    const pending = new Subject<AdminClaimDetails>();
    identityApi.adminClaimDetails.mockReturnValueOnce(pending);
    const openingA = component.openClaimDrawer('claim-A');
    const b = { ...sampleClaimDetails, claimRequestId: 'claim-B', patientReference: 'patient-B' };
    identityApi.adminClaimDetails.mockReturnValueOnce(of(b));
    await component.openClaimDrawer('claim-B');
    pending.next(sampleClaimDetails);
    await openingA;
    expect(component.claimDetails()).toBe(b);
    expect(component.selectedTargetPatientId()).toBe('patient-B');
  });

  it('ignores late history after closing the drawer', async () => {
    const history = new Subject<import('../../../domains/patient-identity').ClaimHistoryItem[]>();
    identityApi.claimHistory.mockReturnValueOnce(history);
    const opening = component.openClaimDrawer('claim-1');
    await Promise.resolve();
    component.closeDrawer();
    history.next([]);
    await opening;
    expect(component.claimDetails()).toBeNull();
    expect(component.claimHistory()).toEqual([]);
    expect(component.isLoadingDetails()).toBe(false);
  });

  it.each(['switch', 'close', 'destroy', 'permission'] as const)(
    'ignores pending evidence on %s without creating a blob URL or marking reviewed', async (action) => {
      await component.openClaimDrawer('claim-1');
      const evidence = new Subject<HttpResponse<Blob>>();
      identityApi.adminClaimEvidence.mockReturnValueOnce(evidence);
      const preview = component.previewEvidence('ev-1');
      if (action === 'switch') await component.openClaimDrawer('claim-2');
      if (action === 'close') component.closeDrawer();
      if (action === 'destroy') fixture.destroy();
      if (action === 'permission') hasPermission.set(false);
      evidence.next(new HttpResponse({ body: new Blob(['old']) }));
      await preview;
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(component.previewBlobUrl()).toBe('');
      expect(component.reviewedEvidenceIds()).toEqual([]);
    },
  );

  it('retains the newest evidence when an older response or load event arrives last', async () => {
    await component.openClaimDrawer('claim-1');
    const older = new Subject<HttpResponse<Blob>>();
    identityApi.adminClaimEvidence.mockReturnValueOnce(older);
    const oldPreview = component.previewEvidence('old');
    await component.previewEvidence('ev-1');
    const current = component.previewBlobUrl();
    component.onEvidencePreviewLoaded('blob:old');
    expect(component.reviewedEvidenceIds()).toEqual([]);
    component.onEvidencePreviewLoaded(current);
    older.next(new HttpResponse({ body: new Blob(['old']) }));
    await oldPreview;
    expect(component.previewBlobUrl()).toBe(current);
    expect(component.reviewedEvidenceIds()).toEqual(['ev-1']);
    component.closeDrawer();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(current);
  });

  it.each([403, 404])('reports a current evidence HTTP %s without marking reviewed', async (status) => {
    await component.openClaimDrawer('claim-1');
    identityApi.adminClaimEvidence.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status })));
    await component.previewEvidence('ev-1');
    expect(toast.error).toHaveBeenCalled();
    expect(component.reviewedEvidenceIds()).toEqual([]);
    expect(component.isLoadingEvidence()).toBe(false);
  });

  it('does not apply a decision response for A to the newly opened B drawer', async () => {
    await component.openClaimDrawer('claim-1');
    component.selectCandidatePatient('pat-101');
    component.reviewedEvidenceIds.set(['ev-1']);
    const response = new Subject<{
      claimRequestId: string; status: string; targetPatientId: string;
      rowVersion: string; invitationExpiresOnUtc: string;
    }>();
    identityApi.approveClaim.mockReturnValueOnce(response);
    const approving = component.approveClaim();
    const b = { ...sampleClaimDetails, claimRequestId: 'claim-2' };
    identityApi.adminClaimDetails.mockReturnValueOnce(of(b));
    await component.openClaimDrawer('claim-2');
    response.next({ claimRequestId: 'claim-1', status: 'ApprovedPendingActivation',
      targetPatientId: 'pat-101', rowVersion: 'old-decision', invitationExpiresOnUtc: '' });
    await approving;
    expect(component.claimDetails()).toBe(b);
    expect(component.isSubmittingDecision()).toBe(false);
  });

  it('ignores image load events from a replaced preview element', async () => {
    vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:old').mockReturnValueOnce('blob:new');
    await component.openClaimDrawer('claim-1');
    await component.previewEvidence('ev-1');
    fixture.detectChanges();
    const older = fixture.nativeElement.querySelector('.evidence-preview-img') as HTMLImageElement;
    await component.previewEvidence('ev-1');
    fixture.detectChanges();
    const current = fixture.nativeElement.querySelector('.evidence-preview-img') as HTMLImageElement;
    expect(current).not.toBe(older);
    older.dispatchEvent(new Event('load'));
    expect(component.reviewedEvidenceIds()).toEqual([]);
    current.dispatchEvent(new Event('load'));
    expect(component.reviewedEvidenceIds()).toEqual(['ev-1']);
  });
});

