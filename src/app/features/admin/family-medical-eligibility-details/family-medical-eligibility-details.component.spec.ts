import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

    expect(mockApi.approveMedicalEligibility).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
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
