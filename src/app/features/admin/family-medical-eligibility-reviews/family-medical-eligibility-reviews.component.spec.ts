import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamiliesApi, FamilyMedicalEligibilityReview } from '../../../domains/families';
import { FamilyMedicalEligibilityReviewsComponent } from './family-medical-eligibility-reviews.component';

describe('FamilyMedicalEligibilityReviewsComponent', () => {
  let component: FamilyMedicalEligibilityReviewsComponent;
  let fixture: ComponentFixture<FamilyMedicalEligibilityReviewsComponent>;

  const mockReview: FamilyMedicalEligibilityReview = {
    reviewId: 'rev-1',
    eligibilityId: 'elig-1',
    familyId: 'fam-1',
    childPatientId: 'child-1',
    affectedAdultPatientId: 'adult-1',
    status: 'Pending',
    eligibilityStatus: 'Restricted',
    reason: 'Parent request',
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
    medicalEligibilityReviews: vi.fn(() =>
      of({ items: [mockReview], pageNumber: 1, pageSize: 20, totalCount: 1 }),
    ),
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
    mockApi.medicalEligibilityReviews.mockReturnValue(
      of({ items: [mockReview], pageNumber: 1, pageSize: 20, totalCount: 1 }),
    );
    mockApi.medicalEligibilityReview.mockReturnValue(of(mockReview));

    await TestBed.configureTestingModule({
      imports: [FamilyMedicalEligibilityReviewsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
        { provide: AuthSession, useValue: mockSession },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyMedicalEligibilityReviewsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load reviews on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockApi.medicalEligibilityReviews).toHaveBeenCalled();
    expect(component['result']()?.items.length).toBe(1);
  });

  it('should open and close review drawer', () => {
    component['openReviewDrawer']('rev-1', 'Review rev-1');
    expect(component['selectedReviewId']()).toBe('rev-1');
    expect(component['selectedReviewTitle']()).toBe('Review rev-1');

    component['closeReviewDrawer']();
    expect(component['selectedReviewId']()).toBeNull();
  });
});
