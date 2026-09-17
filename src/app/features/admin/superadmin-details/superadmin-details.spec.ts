import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { SuperAdminDetails } from './superadmin-details';
import { SuperAdminsApi, SuperAdminRecord } from '../services/superadmins';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('SuperAdminDetails', () => {
  let fixture: ComponentFixture<SuperAdminDetails>;
  let component: SuperAdminDetails;

  const validId = '11111111-1111-1111-1111-111111111111';

  const mockRecord: SuperAdminRecord = {
    superAdminId: validId,
    applicationUserId: 'app-u-1',
    userName: 'superadmin1',
    email: 'admin@example.com',
    phoneNumber: '01012345678',
    nameAr: 'مشرف أول',
    nameEn: 'Super Admin One',
    isRootSuperAdmin: false,
    isActive: true,
    isDeleted: false,
    createdOnUtc: '2026-01-01T00:00:00Z',
  };

  const mockApi = {
    details: vi.fn(() => of(mockRecord)),
    update: vi.fn(() => of(mockRecord)),
    activate: vi.fn(() => of(mockRecord)),
    deactivate: vi.fn(() => of(mockRecord)),
    delete: vi.fn(() => of(undefined)),
    restore: vi.fn(() => of(mockRecord)),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => {
      return (
        perm === PERMISSIONS.superAdminsUpdate ||
        perm === PERMISSIONS.superAdminsActivate ||
        perm === PERMISSIONS.superAdminsDeactivate ||
        perm === PERMISSIONS.superAdminsDelete
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
    mockApi.details.mockReturnValue(of(mockRecord));

    await TestBed.configureTestingModule({
      imports: [SuperAdminDetails],
      providers: [
        provideRouter([]),
        { provide: SuperAdminsApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminDetails);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('superAdminIdInput', validId);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load superadmin details when superAdminIdInput is provided', () => {
    expect(component).toBeTruthy();
    expect(mockApi.details).toHaveBeenCalledWith(validId);
    const details = (component as unknown as { details: () => SuperAdminRecord | null }).details();
    expect(details?.userName).toBe('superadmin1');
  });

  it('should emit closed output', () => {
    let closedCalled = false;
    component.closed.subscribe(() => (closedCalled = true));

    component.closed.emit();

    expect(closedCalled).toBe(true);
  });

  it('should handle API error gracefully during load', async () => {
    mockApi.details.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Database error' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
