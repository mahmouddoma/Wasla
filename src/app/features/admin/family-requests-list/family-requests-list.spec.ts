import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { FamilyRequestsList } from './family-requests-list';
import {
  FamiliesApi,
  FamilyRequestPage,
  FamilyRequestSummary,
} from '../../../domains/families';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';

describe('FamilyRequestsList', () => {
  let fixture: ComponentFixture<FamilyRequestsList>;
  let component: FamilyRequestsList;

  const mockSummary: FamilyRequestSummary = {
    requestId: 'req-1',
    requestType: 'CreateFamily',
    status: 'Pending',
    requesterPatientId: 'pat-1',
    requesterNameAr: 'أحمد محمود',
    targetPatientId: 'pat-2',
    targetNameAr: 'علي أحمد',
    requesterClaimedRole: 'Father',
    targetClaimedRole: 'Child',
    currentRevisionNumber: 1,
    submittedOnUtc: '2026-01-01T00:00:00Z',
    rowVersion: 'v1',
  };

  const mockPage: FamilyRequestPage = {
    items: [mockSummary],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 20,
  };

  const mockApi = {
    adminRequests: vi.fn(() => of(mockPage)),
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
    mockApi.adminRequests.mockReturnValue(of(mockPage));

    await TestBed.configureTestingModule({
      imports: [FamilyRequestsList],
      providers: [
        provideRouter([]),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyRequestsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load requests list', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.adminRequests).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('أحمد محمود');
  });

  it('should open side drawer with details when item is selected', () => {
    (component as unknown as { openReviewDrawer: (id: string) => void }).openReviewDrawer(mockSummary.requestId);
    fixture.detectChanges();

    expect((component as unknown as { selectedRequestId: () => string | null }).selectedRequestId()).toBe('req-1');
  });

  it('should close side drawer when closeReviewDrawer is called', () => {
    (component as unknown as { openReviewDrawer: (id: string) => void }).openReviewDrawer(mockSummary.requestId);
    (component as unknown as { closeReviewDrawer: () => void }).closeReviewDrawer();
    fixture.detectChanges();

    expect((component as unknown as { selectedRequestId: () => string | null }).selectedRequestId()).toBeNull();
  });

  it('should filter by status and reload', async () => {
    (component as unknown as { status: { set: (s: string) => void } }).status.set('Approved');
    await (component as unknown as { load: () => Promise<void> }).load();
    expect(mockApi.adminRequests).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Approved' }),
    );
  });

  it('should handle API errors gracefully', async () => {
    mockApi.adminRequests.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Network error' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const messages = (component as unknown as { messages: () => string[] }).messages();
    expect(messages.length).toBeGreaterThan(0);
  });
});
