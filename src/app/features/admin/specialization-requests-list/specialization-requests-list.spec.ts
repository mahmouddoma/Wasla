import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { SpecializationRequestsList } from './specialization-requests-list';
import {
  DoctorSpecializationRequestsApi,
  DoctorSpecializationRequestsPage,
  DoctorSpecializationRequestListItem,
} from '../services/doctor-specialization-requests';
import { MedicalSpecializationsApi } from '../services/medical-specializations';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';

describe('SpecializationRequestsList', () => {
  let fixture: ComponentFixture<SpecializationRequestsList>;
  let component: SpecializationRequestsList;

  const mockSummary: DoctorSpecializationRequestListItem = {
    requestId: 'req-1',
    doctorId: 'doc-1',
    doctorNameAr: 'د. سامح كمال',
    doctorNameEn: 'Dr. Sameh Kamal',
    email: 'sameh@example.com',
    type: 'Initial',
    status: 'PendingReview',
    currentRevisionNumber: 1,
    submittedOnUtc: '2026-01-01T00:00:00Z',
    rowVersion: 'v1',
  };

  const mockPage: DoctorSpecializationRequestsPage = {
    items: [mockSummary],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 20,
  };

  const mockApi = {
    list: vi.fn(() => of(mockPage)),
  };

  const mockCatalogApi = {
    active: vi.fn(() => of([])),
  };

  const mockSession = {
    hasPermission: vi.fn(() => true),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.list.mockReturnValue(of(mockPage));

    await TestBed.configureTestingModule({
      imports: [SpecializationRequestsList],
      providers: [
        provideRouter([]),
        { provide: DoctorSpecializationRequestsApi, useValue: mockApi },
        { provide: MedicalSpecializationsApi, useValue: mockCatalogApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecializationRequestsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load requests list', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.list).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('د. سامح كمال');
  });

  it('should open side drawer with details when item is selected', () => {
    (component as unknown as { openReviewDrawer: (id: string, name: string) => void }).openReviewDrawer(
      mockSummary.requestId,
      mockSummary.doctorNameAr,
    );
    fixture.detectChanges();

    expect((component as unknown as { selectedRequestId: () => string | null }).selectedRequestId()).toBe('req-1');
  });

  it('should close side drawer when closeReviewDrawer is called', () => {
    (component as unknown as { openReviewDrawer: (id: string, name: string) => void }).openReviewDrawer(
      mockSummary.requestId,
      mockSummary.doctorNameAr,
    );
    (component as unknown as { closeReviewDrawer: () => void }).closeReviewDrawer();
    fixture.detectChanges();

    expect((component as unknown as { selectedRequestId: () => string | null }).selectedRequestId()).toBeNull();
  });

  it('should filter by status and reload', () => {
    (component as unknown as { filterByStatus: (s: string) => void }).filterByStatus('Approved');
    expect((component as unknown as { status: () => string }).status()).toBe('Approved');
    expect(mockApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Approved', pageNumber: 1 }),
    );
  });

  it('should handle API errors gracefully', async () => {
    mockApi.list.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Network error' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
