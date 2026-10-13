import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamiliesApi, FamilyMedicalCase } from '../../../domains/families';
import { FamilyMedicalAccessRequestsComponent } from './family-medical-access-requests.component';

describe('FamilyMedicalAccessRequestsComponent', () => {
  let component: FamilyMedicalAccessRequestsComponent;
  let fixture: ComponentFixture<FamilyMedicalAccessRequestsComponent>;

  const mockCase: FamilyMedicalCase = {
    requestId: 'req-1',
    familyId: 'fam-1',
    childPatientId: 'child-1',
    affectedAdultPatientId: 'adult-1',
    requestType: 'Restriction',
    status: 'Pending',
    revision: 1,
    reason: 'Parent request',
    submittedAtUtc: '2026-10-10T12:00:00Z',
    rowVersion: 'ver-1',
    reviewMessage: null,
    restrictionStatus: 'Allowed',
    capabilities: {
      canWithdraw: false,
      canResubmit: false,
      canApprove: true,
      canReject: true,
      canRequestModification: true,
    },
    documents: [],
  };

  const mockApi = {
    adminMedicalAccessSummary: vi.fn(() =>
      of({ totalCount: 1, pendingCount: 1, restrictionCount: 1, restorationCount: 0 }),
    ),
    adminMedicalAccessRequests: vi.fn(() =>
      of({ items: [mockCase], pageNumber: 1, pageSize: 20, totalCount: 1 }),
    ),
    adminMedicalAccessRequest: vi.fn(() => of(mockCase)),
    adminMedicalAccessHistory: vi.fn(() =>
      of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }),
    ),
    adminMedicalAccessDocument: vi.fn(),
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
    mockApi.adminMedicalAccessSummary.mockReturnValue(
      of({ totalCount: 1, pendingCount: 1, restrictionCount: 1, restorationCount: 0 }),
    );
    mockApi.adminMedicalAccessRequests.mockReturnValue(
      of({ items: [mockCase], pageNumber: 1, pageSize: 20, totalCount: 1 }),
    );
    mockApi.adminMedicalAccessRequest.mockReturnValue(of(mockCase));
    mockApi.adminMedicalAccessHistory.mockReturnValue(
      of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }),
    );

    await TestBed.configureTestingModule({
      imports: [FamilyMedicalAccessRequestsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
        { provide: AuthSession, useValue: mockSession },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyMedicalAccessRequestsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load summary and requests on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockApi.adminMedicalAccessSummary).toHaveBeenCalled();
    expect(mockApi.adminMedicalAccessRequests).toHaveBeenCalled();
    expect(component['result']()?.items.length).toBe(1);
  });

  it('should open and close review drawer', () => {
    component['openReviewDrawer']('req-1', 'Review req-1');
    expect(component['selectedRequestId']()).toBe('req-1');
    expect(component['selectedRequestTitle']()).toBe('Review req-1');

    component['closeReviewDrawer']();
    expect(component['selectedRequestId']()).toBeNull();
  });

  it('should filter by quick filter chips', async () => {
    component['setQuickFilter']('restriction');
    expect(component['requestType']()).toBe('Restriction');
    expect(component['pageNumber']()).toBe(1);

    component['setQuickFilter']('all');
    expect(component['status']()).toBe('');
    expect(component['requestType']()).toBe('');
  });
});
