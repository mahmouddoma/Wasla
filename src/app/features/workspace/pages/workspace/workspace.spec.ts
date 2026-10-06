import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Workspace } from './workspace';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { ReceptionPracticeContext } from '../../../../domains/reception-practices';

describe('Workspace', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
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

  beforeEach(async () => {
    vi.clearAllMocks();
    userSignal.set(doctorUser);

    await TestBed.configureTestingModule({
      imports: [Workspace],
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: mockAuthSession },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            hasAnyPracticeWithAnyPermission: () => false,
            hasAnyPracticeWithPermission: () => false,
          },
        },
        LanguageService,
      ],
    }).compileComponents();

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
    const roleBadge = (
      component as unknown as { roleBadge: () => { label: string; icon: string } }
    ).roleBadge();
    expect(roleBadge.icon).toBe('stethoscope');
  });

  it('should compute hasAnyModules as true when user has permissions', () => {
    const hasAny = (component as unknown as { hasAnyModules: () => boolean }).hasAnyModules();
    expect(hasAny).toBe(true);
  });

  it('keeps the reception guide collapsed and translates it with the active language', () => {
    userSignal.set({ ...doctorUser, userType: 'Reception', roles: ['Reception'] });
    const language = TestBed.inject(LanguageService);
    for (const lang of ['ar', 'en'] as const) {
      language.setLanguage(lang);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const guide = root.querySelector('details');
      expect(guide?.open).toBe(false);
      expect(guide?.querySelectorAll('li').length).toBe(4);
      expect(guide?.querySelector('summary')?.textContent).toContain(
        language.t('workspace.receptionGuideTitle'),
      );
    }
  });
});
