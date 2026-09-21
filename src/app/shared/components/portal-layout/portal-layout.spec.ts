import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { PortalLayout } from './portal-layout';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { CurrentUser } from '../../../core/auth/auth.models';

describe('PortalLayout', () => {
  let fixture: ComponentFixture<PortalLayout>;
  let component: PortalLayout;
  let mockRouter: Router;
  const userSignal = signal<CurrentUser | null>(null);

  const doctorUser: CurrentUser = {
    applicationUserId: 'doc-1',
    userName: 'د. أحمد محمود',
    email: 'doctor@example.com',
    phoneNumber: '+201000000000',
    roles: ['Doctor'],
    userType: 'Doctor',
    permissions: [],
    isFirstLogin: false,
    doctorId: '101',
    patientId: null,
  };

  const patientUser: CurrentUser = {
    applicationUserId: 'pat-1',
    userName: 'سارة خالد',
    email: 'patient@example.com',
    phoneNumber: '+201100000000',
    roles: ['Patient'],
    userType: 'Patient',
    permissions: [],
    isFirstLogin: false,
    doctorId: null,
    patientId: '202',
  };

  const receptionUser: CurrentUser = {
    applicationUserId: 'rec-1',
    userName: 'منى الاستقبال',
    email: 'reception@example.com',
    phoneNumber: '+201200000000',
    roles: ['Reception'],
    userType: 'Reception',
    permissions: [],
    isFirstLogin: false,
    doctorId: null,
    patientId: null,
  };

  const mockSession = {
    user: userSignal,
    hasPermission: vi.fn(() => true),
    clear: vi.fn(),
    destinationFor: vi.fn((u: CurrentUser) => `/workspace/${u.userType.toLowerCase()}`),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    userSignal.set(doctorUser);

    await TestBed.configureTestingModule({
      imports: [PortalLayout],
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: mockSession },
        LanguageService,
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate');

    fixture = TestBed.createComponent(PortalLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create layout and display user info', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('د. أحمد محمود');
  });

  it('should compute Doctor nav items when userType is Doctor', () => {
    const items = (component as unknown as { roleNavItems: () => { route: string }[] }).roleNavItems();
    const routes = items.map((i) => i.route);
    expect(routes).toContain('/workspace/doctor');
    expect(routes).toContain('/doctor/reservations');
    expect(routes).toContain('/doctor/queue');
    expect(routes).toContain('/doctor/profile');
    expect(routes).toContain('/doctor/practices');
    expect(routes).toContain('/doctor/receptions');
  });

  it('should compute Patient nav items when userType is Patient', () => {
    userSignal.set(patientUser);
    fixture.detectChanges();

    const items = (component as unknown as { roleNavItems: () => { route: string }[] }).roleNavItems();
    const routes = items.map((i) => i.route);
    expect(routes).toContain('/workspace/patient');
    expect(routes).toContain('/patient/reservations');
    expect(routes).toContain('/patient/tickets');
    expect(routes).toContain('/patient/profile');
    expect(routes).toContain('/patient/family');
  });

  it('should compute Reception nav items when userType is Reception', () => {
    userSignal.set(receptionUser);
    fixture.detectChanges();

    const items = (component as unknown as { roleNavItems: () => { route: string }[] }).roleNavItems();
    const routes = items.map((i) => i.route);
    expect(routes).toContain('/workspace/reception');
    expect(routes).toContain('/reception/reservations');
    expect(routes).toContain('/reception/queue');
    expect(routes).toContain('/reception/patients');
    expect(routes).toContain('/reception/family-requests');
  });

  it('should toggle and close mobile sidebar', () => {
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
