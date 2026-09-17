import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { SuperAdminsList } from './superadmins-list';
import { SuperAdminsApi, SuperAdminRecord, SuperAdminsPage } from '../services/superadmins';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('SuperAdminsList', () => {
  let fixture: ComponentFixture<SuperAdminsList>;
  let component: SuperAdminsList;

  const mockRecord: SuperAdminRecord = {
    superAdminId: 'sa-1',
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

  const mockPage: SuperAdminsPage = {
    items: [mockRecord],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 10,
  };

  const mockApi = {
    list: vi.fn(() => of(mockPage)),
    create: vi.fn(() => of(mockRecord)),
    update: vi.fn(() => of(mockRecord)),
    activate: vi.fn(() => of(mockRecord)),
    deactivate: vi.fn(() => of(mockRecord)),
    delete: vi.fn(() => of(undefined)),
    restore: vi.fn(() => of(mockRecord)),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => {
      return (
        perm === PERMISSIONS.superAdminsViewAll ||
        perm === PERMISSIONS.superAdminsCreate ||
        perm === PERMISSIONS.superAdminsUpdate
      );
    }),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.list.mockReturnValue(of(mockPage));

    await TestBed.configureTestingModule({
      imports: [SuperAdminsList],
      providers: [
        provideRouter([]),
        { provide: SuperAdminsApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load superadmins list', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.list).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('superadmin1');
  });

  it('should open side drawer for create superadmin', () => {
    (component as unknown as { openCreateDrawer: () => void }).openCreateDrawer();
    fixture.detectChanges();

    expect(
      (component as unknown as { isCreateDrawerOpen: () => boolean }).isCreateDrawerOpen(),
    ).toBe(true);
  });

  it('should open side drawer for superadmin details', () => {
    (component as unknown as { openDetailsDrawer: (id: string) => void }).openDetailsDrawer(
      mockRecord.superAdminId,
    );
    fixture.detectChanges();

    expect(
      (component as unknown as { selectedAdminId: () => string | null }).selectedAdminId(),
    ).toBe(mockRecord.superAdminId);
  });

  it('should close side drawer on closeCreateDrawer', () => {
    (component as unknown as { openCreateDrawer: () => void }).openCreateDrawer();
    (component as unknown as { closeCreateDrawer: () => void }).closeCreateDrawer();
    fixture.detectChanges();

    expect(
      (component as unknown as { isCreateDrawerOpen: () => boolean }).isCreateDrawerOpen(),
    ).toBe(false);
  });

  it('should handle API errors during load gracefully', async () => {
    mockApi.list.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Failed to load superadmins' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
