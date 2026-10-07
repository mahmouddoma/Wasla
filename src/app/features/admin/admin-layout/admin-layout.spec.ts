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
      userSignal();
      return perm === PERMISSIONS.doctorsViewAll || perm === PERMISSIONS.superAdminsViewAll;
    }),
    clear: vi.fn(),
    destinationFor: vi.fn(() => '/admin/doctors'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSession.hasPermission.mockImplementation((perm: string) => {
      userSignal();
      return perm === PERMISSIONS.doctorsViewAll || perm === PERMISSIONS.superAdminsViewAll;
    });
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

  it('uses the same permitted routes in both navigation surfaces', () => {
    const root = fixture.nativeElement as HTMLElement;
    const hrefs = (selector: string) =>
      Array.from(root.querySelectorAll(selector)).map((link) => link.getAttribute('href'));
    expect(hrefs('.sidebar-nav a')).toEqual(['/admin/doctors', '/admin/superadmins']);
    expect(hrefs('app-mobile-navigation a')).toEqual(['/admin/doctors', '/admin/superadmins']);
    root.querySelector<HTMLButtonElement>('app-mobile-navigation button')!.click();
    fixture.detectChanges();
    expect(component['isSidebarOpen']()).toBe(true);
    component.onEscape();
    fixture.detectChanges();
    expect(root.querySelector('app-mobile-navigation button')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('limits primary shortcuts to four when all management modules are permitted', () => {
    mockSession.hasPermission.mockImplementation(() => true);
    userSignal.set({ ...adminUser });
    fixture.detectChanges();
    expect(component['mobileNavItems']().map((item) => item.id)).toEqual([
      'doctors',
      'reservations',
      'requests',
      'revenue',
    ]);
    expect(component['navItems']()).toHaveLength(10);
  });

  it('should toggle and close sidebar', () => {
    (component as unknown as { toggleSidebar: () => void }).toggleSidebar();
    expect((component as unknown as { isSidebarOpen: () => boolean }).isSidebarOpen()).toBe(true);

    (component as unknown as { closeSidebar: () => void }).closeSidebar();
    expect((component as unknown as { isSidebarOpen: () => boolean }).isSidebarOpen()).toBe(false);
  });

  it('should toggle sidebar collapse', () => {
    const initial = (
      component as unknown as { isSidebarCollapsed: () => boolean }
    ).isSidebarCollapsed();
    (component as unknown as { toggleSidebarCollapse: () => void }).toggleSidebarCollapse();
    expect(
      (component as unknown as { isSidebarCollapsed: () => boolean }).isSidebarCollapsed(),
    ).toBe(!initial);
  });

  it('should logout and redirect to login', () => {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('app-header .btn-topbar-logout')!
      .click();
    expect(mockSession.clear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
