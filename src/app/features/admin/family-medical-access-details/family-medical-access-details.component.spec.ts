import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamiliesApi, FamilyMedicalCase } from '../../../domains/families';
import { FamilyMedicalAccessDetailsComponent } from './family-medical-access-details.component';

describe('FamilyMedicalAccessDetailsComponent', () => {
  let component: FamilyMedicalAccessDetailsComponent;
  let fixture: ComponentFixture<FamilyMedicalAccessDetailsComponent>;

  const mockCase: FamilyMedicalCase = {
    requestId: 'req-123',
    familyId: 'fam-456',
    childPatientId: 'child-789',
    affectedAdultPatientId: 'adult-012',
    requestType: 'Restriction',
    status: 'Pending',
    revision: 1,
    reason: 'Safety concern regarding medical access',
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
    documents: [
      {
        documentId: 'doc-1',
        fileName: 'court-order.pdf',
        documentType: 'LegalDocument',
        canDownload: true,
      },
    ],
  };

  const mockApi = {
    adminMedicalAccessRequest: vi.fn(() => of(mockCase)),
    adminMedicalAccessHistory: vi.fn(() =>
      of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }),
    ),
    adminMedicalAccessDocument: vi.fn(),
    approveMedicalAccessRequest: vi.fn(() => of(mockCase)),
    rejectMedicalAccessRequest: vi.fn(() => of(mockCase)),
    requestMedicalAccessModification: vi.fn(() => of(mockCase)),
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
    mockApi.adminMedicalAccessRequest.mockReturnValue(of(mockCase));
    mockApi.adminMedicalAccessHistory.mockReturnValue(
      of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }),
    );

    await TestBed.configureTestingModule({
      imports: [FamilyMedicalAccessDetailsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
        { provide: AuthSession, useValue: mockSession },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyMedicalAccessDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load details when requestIdInput is set', async () => {
    fixture.componentRef.setInput('requestIdInput', 'req-123');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockApi.adminMedicalAccessRequest).toHaveBeenCalledWith('req-123');
    expect(mockApi.adminMedicalAccessHistory).toHaveBeenCalledWith('req-123');
  });

  it('should call approveMedicalAccessRequest and show toast on approve', async () => {
    fixture.componentRef.setInput('requestIdInput', 'req-123');
    fixture.detectChanges();
    await fixture.whenStable();

    component['action'].set('approve');
    component['reviewModel'].set({ text: 'Approved by admin' });
    await component['submitDecision']();

    expect(mockApi.approveMedicalAccessRequest).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('should call rejectMedicalAccessRequest and show toast on reject', async () => {
    fixture.componentRef.setInput('requestIdInput', 'req-123');
    fixture.detectChanges();
    await fixture.whenStable();

    component['action'].set('reject');
    component['reviewModel'].set({ text: 'Insufficient documentation' });
    await component['submitDecision']();

    expect(mockApi.rejectMedicalAccessRequest).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('should call requestMedicalAccessModification on modification request', async () => {
    fixture.componentRef.setInput('requestIdInput', 'req-123');
    fixture.detectChanges();
    await fixture.whenStable();

    component['action'].set('modification');
    component['reviewModel'].set({ text: 'Please provide stamped document' });
    await component['submitDecision']();

    expect(mockApi.requestMedicalAccessModification).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });
});
