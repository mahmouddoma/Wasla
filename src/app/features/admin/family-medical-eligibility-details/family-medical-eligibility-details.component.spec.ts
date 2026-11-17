import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamiliesApi, FamilyMedicalEligibilityReview } from '../../../domains/families';
import { FamilyMedicalEligibilityDetailsComponent } from './family-medical-eligibility-details.component';

describe('FamilyMedicalEligibilityDetailsComponent', () => {
  let component: FamilyMedicalEligibilityDetailsComponent;
  let fixture: ComponentFixture<FamilyMedicalEligibilityDetailsComponent>;

  const mockReview: FamilyMedicalEligibilityReview = {
    reviewId: 'rev-123',
    eligibilityId: 'elig-456',
    familyId: 'fam-789',
    childPatientId: 'child-012',
    affectedAdultPatientId: 'adult-345',
    status: 'Pending',
    eligibilityStatus: 'Restricted',
    reason: 'Safety restriction eligibility review',
    reviewMessage: null,
    reviewedByUserId: null,
    reviewedAtUtc: null,
    createdAtUtc: '2026-10-10T12:00:00Z',
    rowVersion: 'ver-1',
    canApprove: true,
    policyVersion: 'test-policy',
    basisReference: 'test-basis',
    authorityRelationshipRequestId: 'test-authority',
    adultVerification: {
      familyMemberId: 'adult',
      relationshipRequestId: 'adult-proof',
      verifiedOnUtc: '2026-10-10T00:00:00Z',
    },
    childVerification: {
      familyMemberId: 'child',
      relationshipRequestId: 'child-proof',
      verifiedOnUtc: '2026-10-10T00:00:00Z',
    },
    capabilities: {
      canApprove: true,
      canReject: true,
      canRevoke: true,
    },
  };

  const mockApi = {
    medicalEligibilityReview: vi.fn(() => of(mockReview)),
    approveMedicalEligibility: vi.fn(() => of(mockReview)),
    rejectMedicalEligibility: vi.fn(() => of(mockReview)),
    revokeMedicalEligibility: vi.fn(() => of(mockReview)),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  const mockSession = {
    hasPermission: vi.fn(() => true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.medicalEligibilityReview.mockReturnValue(of(mockReview));

    await TestBed.configureTestingModule({
      imports: [FamilyMedicalEligibilityDetailsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
        { provide: AuthSession, useValue: mockSession },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyMedicalEligibilityDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load review details on input set', async () => {
    fixture.componentRef.setInput('reviewIdInput', 'rev-123');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockApi.medicalEligibilityReview).toHaveBeenCalledWith('rev-123');
  });

  it('should call approveMedicalEligibility and toast on approve', async () => {
    fixture.componentRef.setInput('reviewIdInput', 'rev-123');
    fixture.detectChanges();
    await fixture.whenStable();

    component['action'].set('approve');
    component['noteModel'].set({ text: 'Eligibility confirmed' });
    await component['submitAction']();

    expect(mockApi.approveMedicalEligibility).toHaveBeenCalledWith('rev-123', {
      rowVersion: 'ver-1',
      policyVersion: 'test-policy',
      basisReference: 'test-basis',
      authorityRelationshipRequestId: 'test-authority',
      reason: 'Eligibility confirmed',
      idempotencyKey: expect.any(String),
    });
    expect(mockToast.success).toHaveBeenCalled();
  });

  it.each([
    'policyVersion',
    'basisReference',
    'authorityRelationshipRequestId',
    'adultVerification',
    'childVerification',
  ] as const)('blocks approval without %s', async (field) => {
    mockApi.medicalEligibilityReview.mockReturnValueOnce(of({ ...mockReview, [field]: null }));
    fixture.componentRef.setInput('reviewIdInput', 'rev-123');
    fixture.detectChanges();
    await fixture.whenStable();
    await component['submitAction']();
    expect(mockApi.approveMedicalEligibility).not.toHaveBeenCalled();
    expect(component['messages']().length).toBeGreaterThan(0);
  });

  it.each([409, 422])('handles eligibility approval HTTP %s without retrying', async (status) => {
    mockApi.approveMedicalEligibility.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status, error: { detail: 'Policy unavailable' } })),
    );
    fixture.componentRef.setInput('reviewIdInput', 'rev-123');
    fixture.detectChanges();
    await fixture.whenStable();
    await component['submitAction']();
    expect(mockApi.approveMedicalEligibility).toHaveBeenCalledTimes(1);
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalled();
    if (status === 409) expect(mockApi.medicalEligibilityReview).toHaveBeenCalledTimes(2);
    else expect(component['messages']()).toContain('Policy unavailable');
  });

  it('should call rejectMedicalEligibility and toast on reject', async () => {
    fixture.componentRef.setInput('reviewIdInput', 'rev-123');
    fixture.detectChanges();
    await fixture.whenStable();

    component['action'].set('reject');
    component['noteModel'].set({ text: 'Eligibility rejected' });
    await component['submitAction']();

    expect(mockApi.rejectMedicalEligibility).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('should call revokeMedicalEligibility and toast on revoke', async () => {
    fixture.componentRef.setInput('reviewIdInput', 'rev-123');
    fixture.detectChanges();
    await fixture.whenStable();

    component['action'].set('revoke');
    component['noteModel'].set({ text: 'Eligibility revoked due to age' });
    await component['submitAction']();

    expect(mockApi.revokeMedicalEligibility).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });
});
