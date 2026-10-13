import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  FamilyMedicalAccessStatus,
  FamilyMedicalCase,
  FamilyMedicalDocument,
} from '../../../domains/families';
import { PatientMedicalAccessComponent } from './patient-medical-access.component';

describe('PatientMedicalAccessComponent', () => {
  let component: PatientMedicalAccessComponent;
  let fixture: ComponentFixture<PatientMedicalAccessComponent>;

  const mockCase: FamilyMedicalCase = {
    requestId: 'req-1',
    familyId: 'fam-1',
    childPatientId: 'child-1',
    affectedAdultPatientId: 'adult-1',
    requestType: 'Restriction',
    status: 'Pending',
    revision: 1,
    reason: 'Parent reason',
    submittedAtUtc: '2026-10-10T12:00:00Z',
    rowVersion: 'ver-1',
    reviewMessage: null,
    restrictionStatus: 'Allowed',
    capabilities: {
      canWithdraw: true,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canRequestModification: false,
    },
    documents: [
      {
        documentId: 'doc-1',
        fileName: 'evidence.pdf',
        documentType: 'LegalDocument',
        canDownload: true,
      },
    ],
  };

  const mockChildStatus: FamilyMedicalAccessStatus = {
    status: 'Allowed',
    canView: true,
    canRequestRestriction: true,
    canRequestRestoration: false,
  };

  const mockApi = {
    myMedicalAccessRequests: vi.fn(() =>
      of({ items: [mockCase], pageNumber: 1, pageSize: 20, totalCount: 1 }),
    ),
    myMedicalAccessRequest: vi.fn(() => of(mockCase)),
    myMedicalAccessHistory: vi.fn(() =>
      of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }),
    ),
    myMedicalAccessDocument: vi.fn(() =>
      of(new HttpResponse({ body: new Blob(['fake']), status: 200 })),
    ),
    childMedicalAccess: vi.fn(() => of(mockChildStatus)),
    createMedicalAccessRequest: vi.fn(() => of({ requestId: 'new-req-1' })),
    withdrawMedicalAccessRequest: vi.fn(() => of(void 0)),
    resubmitMedicalAccessRequest: vi.fn(() => of(void 0)),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.myMedicalAccessRequests.mockReturnValue(
      of({ items: [mockCase], pageNumber: 1, pageSize: 20, totalCount: 1 }),
    );
    mockApi.myMedicalAccessRequest.mockReturnValue(of(mockCase));
    mockApi.myMedicalAccessHistory.mockReturnValue(
      of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }),
    );
    mockApi.childMedicalAccess.mockReturnValue(of(mockChildStatus));
    mockApi.createMedicalAccessRequest.mockReturnValue(of({ requestId: 'new-req-1' }));
    mockApi.withdrawMedicalAccessRequest.mockReturnValue(of(void 0));
    mockApi.resubmitMedicalAccessRequest.mockReturnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [PatientMedicalAccessComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientMedicalAccessComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load patient medical access requests on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockApi.myMedicalAccessRequests).toHaveBeenCalled();
    expect(component['listResult']()?.items.length).toBe(1);
  });

  it('should open details drawer and fetch full details and history', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component['openDetailsDrawer'](mockCase);

    expect(component['drawerOpen']()).toBe(true);
    expect(mockApi.myMedicalAccessRequest).toHaveBeenCalledWith('req-1');
    expect(mockApi.myMedicalAccessHistory).toHaveBeenCalledWith('req-1');
  });

  it('should check child dependent medical access status', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component['checkDependentAccess']('child-1');

    expect(mockApi.childMedicalAccess).toHaveBeenCalledWith('child-1');
    expect(component['childStatus']()?.canView).toBe(true);
  });

  it('should submit a new medical access request and reload', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['newRequestModel'].set({
      requestType: 'Restriction',
      childPatientId: 'child-1',
      affectedAdultPatientId: 'adult-1',
      reason: 'Need restriction for safety',
      documentTypes: 'Evidence',
    });

    await component['submitNewRequest']();

    expect(mockApi.createMedicalAccessRequest).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('should withdraw a request when confirmed', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await component['withdrawRequest'](mockCase);

    expect(mockApi.withdrawMedicalAccessRequest).toHaveBeenCalledWith(
      'req-1',
      'ver-1',
      expect.any(String),
    );
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('should resubmit a request with new reason and files', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['selectedCase'].set(mockCase);
    component['resubmitModel'].set({
      reason: 'Updated reason with extra docs',
      documentTypes: 'UpdatedEvidence',
    });

    await component['submitResubmit']();

    expect(mockApi.resubmitMedicalAccessRequest).toHaveBeenCalledWith(
      'req-1',
      expect.objectContaining({
        rowVersion: 'ver-1',
        reason: 'Updated reason with extra docs',
      }),
    );
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('should download document content', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['selectedCase'].set(mockCase);
    const doc: FamilyMedicalDocument = mockCase.documents[0];

    await component['downloadDoc'](doc);

    expect(mockApi.myMedicalAccessDocument).toHaveBeenCalledWith('req-1', 'doc-1');
  });
});
