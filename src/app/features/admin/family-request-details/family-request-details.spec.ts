import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { FamilyRequestDetailsPage } from './family-request-details';
import { FamiliesApi, FamilyRequestDetails } from '../../../domains/families';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('FamilyRequestDetailsPage', () => {
  let fixture: ComponentFixture<FamilyRequestDetailsPage>;
  let component: FamilyRequestDetailsPage;

  const mockDetails: FamilyRequestDetails = {
    requestId: 'req-1',
    familyId: 'fam-1',
    requesterPatientId: 'pat-1',
    requesterNameAr: 'أحمد محمود',
    targetPatientId: 'pat-2',
    targetNameAr: 'علي أحمد',
    requestType: 'CreateFamily',
    status: 'Pending',
    requesterClaimedRole: 'Father',
    targetClaimedRole: 'Child',
    currentRevisionNumber: 1,
    submittedOnUtc: '2026-01-01T00:00:00Z',
    modificationMessage: null,
    rejectionReason: null,
    currentFamilyMembers: [],
    documents: [],
    history: [],
    rowVersion: 'v1',
  };

  const mockApi = {
    adminDetails: vi.fn(() => of(mockDetails)),
    approve: vi.fn(() => of(mockDetails)),
    reject: vi.fn(() => of(mockDetails)),
    requestModification: vi.fn(() => of(mockDetails)),
    document: vi.fn(() => of(new Blob())),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => {
      return (
        perm === PERMISSIONS.familyRelationshipRequestsApprove ||
        perm === PERMISSIONS.familyRelationshipRequestsReject ||
        perm === PERMISSIONS.familyRelationshipRequestsViewAll
      );
    }),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.adminDetails.mockReturnValue(of(mockDetails));

    await TestBed.configureTestingModule({
      imports: [FamilyRequestDetailsPage],
      providers: [
        provideRouter([]),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyRequestDetailsPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('requestIdInput', 'req-1');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load request details when requestIdInput is provided', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.adminDetails).toHaveBeenCalledWith('req-1');
    const details = (component as unknown as { details: () => FamilyRequestDetails | null }).details();
    expect(details?.requesterNameAr).toBe('أحمد محمود');
  });

  it('should emit closed event', () => {
    let closedCalled = false;
    component.closed.subscribe(() => (closedCalled = true));

    component.closed.emit();

    expect(closedCalled).toBe(true);
  });

  it('should handle API errors during load gracefully', async () => {
    mockApi.adminDetails.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Failed to fetch details' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const messages = (component as unknown as { messages: () => string[] }).messages();
    expect(messages.length).toBeGreaterThan(0);
  });
});
