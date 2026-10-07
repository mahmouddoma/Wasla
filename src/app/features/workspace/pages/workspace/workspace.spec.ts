import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  ReceptionPractice,
  ReceptionPracticeContext,
} from '../../../../domains/reception-practices';
import { Workspace } from './workspace';

const baseUser: CurrentUser = {
  applicationUserId: 'u1',
  userName: 'Test user',
  email: 'private@example.invalid',
  phoneNumber: '01000000000',
  roles: ['Doctor'],
  userType: 'Doctor',
  permissions: [],
  isFirstLogin: false,
  doctorId: 'd1',
  patientId: null,
};

describe('Workspace daily tasks', () => {
  const user = signal(baseUser);
  const practices = signal<ReceptionPractice[]>([]);
  const selected = signal('');
  const loading = signal(false);
  const messages = signal<string[]>([]);
  const current = () => practices().find((p) => p.id === selected()) ?? null;
  const context = {
    practices,
    currentPracticeId: selected,
    currentPractice: current,
    isLoading: loading,
    messages,
    allows: (permission: string) => current()?.permissionCodes.includes(permission) ?? false,
    hasAnyPracticeWithPermission: (permission: string) =>
      practices().some((p) => p.permissionCodes.includes(permission)),
    hasAnyPracticeWithAnyPermission: (permissions: readonly string[]) =>
      practices().some((p) => permissions.some((code) => p.permissionCodes.includes(code))),
    refresh: vi.fn(async () => undefined),
  };
  beforeEach(() => {
    user.set({
      ...baseUser,
      permissions: [
        'DoctorPracticeReservations.ViewOwn',
        PERMISSIONS.medicalEncountersViewOwn,
        PERMISSIONS.doctorPracticesViewOwn,
      ],
    });
    practices.set([]);
    selected.set('');
    loading.set(false);
    messages.set([]);
    context.refresh.mockClear();
    TestBed.configureTestingModule({
      imports: [Workspace],
      providers: [
        provideRouter([]),
        {
          provide: AuthSession,
          useValue: { user, hasPermission: (code: string) => user().permissions.includes(code) },
        },
        { provide: ReceptionPracticeContext, useValue: context },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  const root = async () => {
    const fixture = TestBed.createComponent(Workspace);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };
  it('creates a doctor home with clinical work before clinic setup and no account deck', async () => {
    const { fixture, element } = await root();
    expect(fixture.componentInstance).toBeTruthy();
    expect(element.querySelector('h1')?.textContent).toContain('Your day with patients');
    expect(element.querySelector('.workspace-primary')?.getAttribute('href')).toBe('/doctor/queue');
    expect([...element.querySelectorAll('.task-link')].map((a) => a.getAttribute('href'))).toEqual([
      '/doctor/reservations',
      '/doctor/encounters',
    ]);
    expect(element.querySelector('.secondary-link')?.getAttribute('href')).toBe(
      '/doctor/practices',
    );
    expect(element.textContent).not.toContain(baseUser.email);
    expect(element.querySelector('.modules-grid')).toBeNull();
  });
  it('hides restricted doctor actions reactively', async () => {
    const { fixture, element } = await root();
    user.set({ ...baseUser, permissions: [] });
    await fixture.whenStable();
    expect(element.querySelectorAll('.task-link')).toHaveLength(0);
    expect(element.querySelector('.secondary-link')).toBeNull();
  });
  it('shows patient booking first, with permitted queue status and secondary follow-ups', async () => {
    user.set({
      ...baseUser,
      userType: 'Patient',
      permissions: [PERMISSIONS.ticketsViewOwn, PERMISSIONS.followUpEligibilityViewOwn],
    });
    const { fixture, element } = await root();
    expect(element.querySelector('.workspace-primary')?.getAttribute('href')).toBe('/doctors');
    expect(element.querySelector('h1')?.textContent).toContain('Your appointments and care');
    expect(element.querySelector('.secondary-link')?.getAttribute('href')).toBe(
      '/patient/follow-ups',
    );
    user.set({ ...user(), permissions: [] });
    await fixture.whenStable();
    expect(element.querySelector('a[href="/patient/tickets"]')).toBeNull();
    expect(element.querySelector('a[href="/patient/follow-ups"]')).toBeNull();
  });
  it('requires a practice and focuses the single shell selector', async () => {
    user.set({ ...baseUser, userType: 'Reception', permissions: [] });
    practices.set([
      {
        id: 'p1',
        nameAr: 'عيادة',
        nameEn: 'Clinic',
        doctorNameAr: null,
        doctorNameEn: null,
        isActive: true,
        permissionCodes: [PERMISSIONS.practiceReservationsCreate],
      },
    ]);
    const select = document.createElement('select');
    select.id = 'reception-current-practice';
    document.body.append(select);
    try {
      const { element } = await root();
      expect(element.querySelector('select')).toBeNull();
      expect(element.querySelector('.workspace-primary')).toBeNull();
      element.querySelector<HTMLButtonElement>('.practice-context button')!.click();
      expect(document.activeElement).toBe(select);
      expect(element.querySelector('.state-empty-illustration')).not.toBeNull();
    } finally {
      select.remove();
    }
  });
  it('uses only selected-practice task permissions and opens the supported booking entry', async () => {
    user.set({
      ...baseUser,
      userType: 'Reception',
      permissions: [PERMISSIONS.patientsSearchBasic],
    });
    practices.set([
      {
        id: 'p1',
        nameAr: 'عيادة أولى',
        nameEn: 'First clinic',
        doctorNameAr: null,
        doctorNameEn: null,
        isActive: true,
        permissionCodes: [PERMISSIONS.practiceReservationsCreate, PERMISSIONS.practiceTicketsView],
      },
      {
        id: 'p2',
        nameAr: 'عيادة ثانية',
        nameEn: 'Second clinic',
        doctorNameAr: null,
        doctorNameEn: null,
        isActive: true,
        permissionCodes: [],
      },
    ]);
    selected.set('p1');
    const { fixture, element } = await root();
    const booking = element.querySelector('.workspace-primary')!.getAttribute('href')!;
    expect(booking).toMatch(/^\/reception\/reservations\?practiceId=p1&date=\d{4}-\d{2}-\d{2}$/);
    expect(element.querySelector('a[href="/reception/queue"]')).not.toBeNull();
    selected.set('p2');
    await fixture.whenStable();
    expect(element.textContent).toContain('Second clinic');
    expect(element.querySelector('.workspace-primary')?.getAttribute('href')).toBe(
      '/reception/patients',
    );
    expect(element.querySelector('a[href="/reception/queue"]')).toBeNull();
    expect(element.querySelector('a[href^="/reception/reservations"]')).toBeNull();
  });
  it('renders loading, error/retry and no-assignment guidance in both languages', async () => {
    user.set({ ...baseUser, userType: 'Reception', permissions: [] });
    loading.set(true);
    const { fixture, element } = await root();
    expect(element.querySelector('[role="status"]')).not.toBeNull();
    loading.set(false);
    messages.set(['Failure']);
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('.practice-context button')!.click();
    expect(context.refresh).toHaveBeenCalledOnce();
    messages.set([]);
    for (const lang of ['ar', 'en'] as const) {
      const language = TestBed.inject(LanguageService);
      language.setLanguage(lang);
      await fixture.whenStable();
      expect(element.textContent).toContain(language.t('workspace.noPracticesHint'));
      expect(element.querySelector('.workspace-shell')?.getAttribute('dir')).toBe(
        lang === 'ar' ? 'rtl' : 'ltr',
      );
    }
  });
});
