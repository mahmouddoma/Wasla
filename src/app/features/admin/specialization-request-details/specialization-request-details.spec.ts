import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { SpecializationRequestDetailsPage } from './specialization-request-details';
import {
  DoctorSpecializationRequestsApi,
  DoctorSpecializationRequestDetails,
} from '../services/doctor-specialization-requests';
import { MedicalSpecializationsApi } from '../services/medical-specializations';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('SpecializationRequestDetailsPage', () => {
  let fixture: ComponentFixture<SpecializationRequestDetailsPage>;
  let component: SpecializationRequestDetailsPage;

  const mockDetails: DoctorSpecializationRequestDetails = {
    request: {
      requestId: 'req-1',
      type: 'Initial',
      status: 'PendingReview',
      currentRevisionNumber: 1,
      latestRevision: [],
      latestModificationMessage: null,
      rowVersion: 'v1',
    },
    doctorId: 'doc-1',
    doctorNameAr: 'د. سامح كمال',
    doctorNameEn: 'Dr. Sameh Kamal',
    email: 'sameh@example.com',
    currentEffectiveSpecializations: [],
    revisions: [],
    history: [],
  };

  const mockApi = {
    details: vi.fn(() => of(mockDetails)),
    approve: vi.fn(() => of(mockDetails)),
    reject: vi.fn(() => of(mockDetails)),
    requestModification: vi.fn(() => of(mockDetails)),
    adjust: vi.fn(() => of(mockDetails)),
  };

  const mockCatalogApi = {
    active: vi.fn(() => of([])),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => {
      return (
        perm === PERMISSIONS.doctorSpecializationRequestsApprove ||
        perm === PERMISSIONS.doctorSpecializationRequestsReject ||
        perm === PERMISSIONS.doctorSpecializationRequestsAdjust
      );
    }),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.details.mockReturnValue(of(mockDetails));
    mockCatalogApi.active.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SpecializationRequestDetailsPage],
      providers: [
        provideRouter([]),
        { provide: DoctorSpecializationRequestsApi, useValue: mockApi },
        { provide: MedicalSpecializationsApi, useValue: mockCatalogApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecializationRequestDetailsPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('requestIdInput', 'req-1');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load request details when requestIdInput is provided', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.details).toHaveBeenCalledWith('req-1');
    const details = (component as unknown as { details: () => DoctorSpecializationRequestDetails | null }).details();
    expect(details?.doctorNameAr).toBe('د. سامح كمال');
  });

  it('should emit closed event', () => {
    let closedCalled = false;
    component.closed.subscribe(() => (closedCalled = true));

    component.closed.emit();

    expect(closedCalled).toBe(true);
  });

  it('should approve request and display toast message', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockApi.approve.mockReturnValue(of({ ...mockDetails, request: { ...mockDetails.request, status: 'Approved' } }));

    (component as unknown as { openAction: (action: string) => void }).openAction('approve');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockApi.approve).toHaveBeenCalledWith('req-1', expect.anything());
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('should handle API errors during load gracefully', async () => {
    mockApi.details.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Failed to fetch details' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
