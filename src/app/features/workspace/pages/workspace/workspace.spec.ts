import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Workspace } from './workspace';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { PERMISSIONS } from '../../../../core/auth/permissions';

describe('Workspace', () => {
  let fixture: ComponentFixture<Workspace>;
  let component: Workspace;
  const userSignal = signal<CurrentUser | null>(null);

  const doctorUser: CurrentUser = {
    applicationUserId: 'u-1',
    userName: 'dr_john',
    email: 'doc@example.com',
    phoneNumber: '+201000000000',
    roles: ['Doctor'],
    userType: 'Doctor',
    permissions: [PERMISSIONS.doctorPracticesViewOwn],
    isFirstLogin: false,
    doctorId: 'doc-1',
    patientId: null,
  };

  const mockAuthSession = {
    user: userSignal,
    hasPermission: vi.fn((perm: string) => perm === PERMISSIONS.doctorPracticesViewOwn),
    clear: vi.fn(),
  };

  let mockRouter: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    userSignal.set(doctorUser);

    await TestBed.configureTestingModule({
      imports: [Workspace],
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: mockAuthSession },
        LanguageService,
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate');

    fixture = TestBed.createComponent(Workspace);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render user name and role badge', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('dr_john');
  });

  it('should compute roleBadge properly for Doctor', () => {
    const roleBadge = (component as unknown as { roleBadge: () => { label: string; icon: string } }).roleBadge();
    expect(roleBadge.icon).toBe('stethoscope');
  });

  it('should compute hasAnyModules as true when user has permissions', () => {
    const hasAny = (component as unknown as { hasAnyModules: () => boolean }).hasAnyModules();
    expect(hasAny).toBe(true);
  });

  it('should logout and navigate to login', () => {
    (component as unknown as { logout: () => void }).logout();
    expect(mockAuthSession.clear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
