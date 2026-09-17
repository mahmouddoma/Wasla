import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { ReceptionFamilyRequests } from './reception-family-requests';
import { FamiliesApi, FamilyRequestDetails, FamilyRequestPage } from '../../../domains/families';
import { PatientsApi } from '../../../domains/patients';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('ReceptionFamilyRequests', () => {
  let fixture: ComponentFixture<ReceptionFamilyRequests>;
  let component: ReceptionFamilyRequests;

  const mockPage: FamilyRequestPage = {
    items: [
      {
        requestId: 'req-1',
        requesterPatientId: 'pat-1',
        requesterNameAr: 'الأب أحمد',
        targetPatientId: 'pat-2',
        targetNameAr: 'الطفل علي',
        requestType: 'CreateFamily',
        status: 'Pending',
        requesterClaimedRole: 'Father',
        targetClaimedRole: 'Child',
        currentRevisionNumber: 1,
        submittedOnUtc: '2026-01-01T00:00:00Z',
        rowVersion: 'v1',
      },
    ],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 20,
  };

  const mockDetails: FamilyRequestDetails = {
    requestId: 'req-1',
    requestType: 'CreateFamily',
    requesterPatientId: 'pat-1',
    requesterNameAr: 'الأب أحمد',
    targetPatientId: 'pat-2',
    targetNameAr: 'الطفل علي',
    requesterClaimedRole: 'Father',
    targetClaimedRole: 'Child',
    status: 'Pending',
    currentRevisionNumber: 1,
    submittedOnUtc: '2026-01-01T00:00:00Z',
    rowVersion: 'v1',
    familyId: null,
    modificationMessage: null,
    rejectionReason: null,
    currentFamilyMembers: [],
    documents: [],
    history: [],
  };

  const mockFamiliesApi = {
    assistedRequests: vi.fn(() => of(mockPage)),
    assistedDetails: vi.fn(() => of(mockDetails)),
    submitAssisted: vi.fn(() => of(mockDetails)),
    resubmitAssisted: vi.fn(() => of(mockDetails)),
    assistedDocument: vi.fn(() => of(new Blob())),
  };

  const mockPatientsApi = {
    search: vi.fn(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 })),
  };

  const mockAuthSession = {
    hasPermission: vi.fn((perm: string) => {
      return (
        perm === PERMISSIONS.familyRelationshipRequestsViewAssisted ||
        perm === PERMISSIONS.familyRelationshipRequestsCreateAssisted ||
        perm === PERMISSIONS.familyRelationshipRequestsResubmitAssisted
      );
    }),
    clear: vi.fn(),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  let mockRouter: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFamiliesApi.assistedRequests.mockReturnValue(of(mockPage));
    mockFamiliesApi.assistedDetails.mockReturnValue(of(mockDetails));

    await TestBed.configureTestingModule({
      imports: [ReceptionFamilyRequests],
      providers: [
        provideRouter([]),
        { provide: FamiliesApi, useValue: mockFamiliesApi },
        { provide: PatientsApi, useValue: mockPatientsApi },
        { provide: AuthSession, useValue: mockAuthSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate');

    fixture = TestBed.createComponent(ReceptionFamilyRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load requests', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { loadRequests: () => Promise<void> }).loadRequests();
    fixture.detectChanges();
    expect(mockFamiliesApi.assistedRequests).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('الأب أحمد');
  });

  it('should open request details when selected', async () => {
    await (component as unknown as { openRequest: (id: string) => Promise<void> }).openRequest('req-1');
    fixture.detectChanges();

    expect(mockFamiliesApi.assistedDetails).toHaveBeenCalledWith('req-1');
    const selected = (component as unknown as { selectedRequest: () => FamilyRequestDetails | null }).selectedRequest();
    expect(selected?.requestId).toBe('req-1');
  });

  it('should close details panel when closeDetails is called', async () => {
    await (component as unknown as { openRequest: (id: string) => Promise<void> }).openRequest('req-1');
    fixture.detectChanges();

    (component as unknown as { closeDetails: () => void }).closeDetails();
    fixture.detectChanges();

    const selected = (component as unknown as { selectedRequest: () => FamilyRequestDetails | null }).selectedRequest();
    expect(selected).toBeNull();
  });

  it('should handle request loading error gracefully', async () => {
    mockFamiliesApi.assistedRequests.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Server error' } })),
    );

    await (component as unknown as { loadRequests: (page?: number) => Promise<void> }).loadRequests(1);
    fixture.detectChanges();

    const messages = (component as unknown as { messages: () => string[] }).messages();
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should logout and navigate to login', () => {
    (component as unknown as { logout: () => void }).logout();
    expect(mockAuthSession.clear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
