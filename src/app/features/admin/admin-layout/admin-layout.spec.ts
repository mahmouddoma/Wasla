import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { AdminLayout } from './admin-layout';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { CurrentUser } from '../../../core/auth/auth.models';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('AdminLayout', () => {
  let fixture: ComponentFixture<AdminLayout>;
  let component: AdminLayout;
  let mockRouter: Router;
  const userSignal = signal<CurrentUser | null>(null);

  const adminUser: CurrentUser = {
    applicationUserId: 'admin-1',
    userName: 'superadmin',
    email: 'admin@example.com',
    phoneNumber: '+201000000000',
    roles: ['SuperAdmin'],
    userType: 'SuperAdmin',
    permissions: [PERMISSIONS.doctorsViewAll, PERMISSIONS.superAdminsViewAll],
    isFirstLogin: false,
    doctorId: null,
    patientId: null,
  };

  const mockSession = {
    user: userSignal,
    hasPermission: vi.fn((perm: string) => {
      return perm === PERMISSIONS.doctorsViewAll || perm === PERMISSIONS.superAdminsViewAll;
    }),
    clear: vi.fn(),
    destinationFor: vi.fn(() => '/admin/doctors'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    userSignal.set(adminUser);

    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: mockSession },
        LanguageService,
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate');

    fixture = TestBed.createComponent(AdminLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create layout and display user info', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('superadmin');
  });

  it('should toggle and close sidebar', () => {
    (component as unknown as { toggleSidebar: () => void }).toggleSidebar();
    expect((component as unknown as { isSidebarOpen: () => boolean }).isSidebarOpen()).toBe(true);

    (component as unknown as { closeSidebar: () => void }).closeSidebar();
    expect((component as unknown as { isSidebarOpen: () => boolean }).isSidebarOpen()).toBe(false);
  });

  it('should toggle sidebar collapse', () => {
    const initial = (component as unknown as { isSidebarCollapsed: () => boolean }).isSidebarCollapsed();
    (component as unknown as { toggleSidebarCollapse: () => void }).toggleSidebarCollapse();
    expect((component as unknown as { isSidebarCollapsed: () => boolean }).isSidebarCollapsed()).toBe(!initial);
  });

  it('should logout and redirect to login', () => {
    (component as unknown as { logout: () => void }).logout();
    expect(mockSession.clear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
