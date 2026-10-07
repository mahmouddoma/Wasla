import { TestBed } from '@angular/core/testing';
import { Data, Route, Router, Routes, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { CurrentUser, UserType } from './core/auth/auth.models';
import { AuthSession } from './core/auth/auth-session';
import { PERMISSIONS } from './core/auth/permissions';
import { ReceptionPracticeContext } from './domains/reception-practices';
import { PortalNavigation } from './layout/navigation/portal-navigation';

interface Entry {
  url: string;
  actor: UserType;
  data: Data;
}
const actors: UserType[] = [
  'SuperAdmin',
  'Doctor',
  'Reception',
  'Patient',
  'DrugCatalogManager',
  'MedicalCatalogManager',
];
const entries: Entry[] = [];
let configuration: Routes;
let allPermissions: string[];

// Preserve real redirects, route data and every guard. Only screen rendering/API calls
// are removed so the complete lazy route tree can be exercised by Angular Router.
async function authorizationRoutes(
  source: Routes,
  prefix = '',
  inherited: Data = {},
): Promise<Routes> {
  const result: Routes = [];
  for (const original of source) {
    const {
      component: _component,
      loadComponent: _loadComponent,
      loadChildren,
      children,
      ...base
    } = original;
    const route: Route = base;
    const path = [prefix, route.path].filter(Boolean).join('/');
    const data = { ...inherited, ...route.data };
    let nested = children;
    if (loadChildren) {
      const loaded: unknown = await loadChildren();
      if (!Array.isArray(loaded)) throw new Error(`Expected standalone routes: ${path}`);
      nested = loaded as Routes;
    }
    if (nested) route.children = await authorizationRoutes(nested, path, data);
    else if (route.redirectTo === undefined) {
      route.children = [];
      const actor = path.startsWith('admin/')
        ? 'SuperAdmin'
        : path.startsWith('medical-catalog/')
          ? 'MedicalCatalogManager'
          : path.startsWith('drug-catalog')
            ? 'DrugCatalogManager'
            : path.startsWith('doctor/') || path.startsWith('diagnostics/doctor/')
              ? 'Doctor'
              : path.startsWith('patient/') || path.startsWith('diagnostics/patient/')
                ? 'Patient'
                : path.startsWith('reception/')
                  ? 'Reception'
                  : null;
      if (actor) entries.push({ url: '/' + path.replace(/:[^/]+/g, 'synthetic-id'), actor, data });
    }
    result.push({ ...route, runGuardsAndResolvers: 'always' });
  }
  return result;
}

beforeAll(async () => {
  configuration = await authorizationRoutes(routes);
  allPermissions = [
    ...new Set([
      ...Object.values(PERMISSIONS),
      ...entries.flatMap(({ data }) =>
        [data['permission'], data['practicePermission']]
          .flat()
          .filter((value): value is string => typeof value === 'string'),
      ),
      'DoctorPracticeReservations.ViewOwn',
      'Reservations.ViewAdministrative',
    ]),
  ];
});

describe('Complete route authorization matrix', () => {
  let router: Router;
  let session: AuthSession;
  let delegated: string[];
  const ensureLoaded = vi.fn(async () => undefined);
  function login(actor: UserType, permissions = allPermissions, firstLogin = false): CurrentUser {
    const user: CurrentUser = {
      applicationUserId: 'synthetic-' + actor,
      userName: 'Synthetic',
      email: '',
      phoneNumber: '',
      userType: actor,
      roles: ['Custom role'],
      permissions,
      isFirstLogin: firstLogin,
      doctorId: actor === 'Doctor' ? 'doctor-id' : null,
      patientId: actor === 'Patient' ? 'patient-id' : null,
    };
    session.begin({
      accessToken: 'synthetic',
      expiresOnUtc: '2099-01-01T00:00:00Z',
      passwordChangeRequired: false,
    });
    session.complete(user);
    return user;
  }
  beforeEach(() => {
    sessionStorage.clear();
    delegated = allPermissions;
    ensureLoaded.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(configuration),
        {
          provide: ReceptionPracticeContext,
          useValue: {
            ensureLoaded,
            hasAnyPracticeWithPermission: (code: string) => delegated.includes(code),
            hasAnyPracticeWithAnyPermission: (codes: readonly string[]) =>
              codes.some((code) => delegated.includes(code)),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSession);
  });
  afterEach(() => sessionStorage.clear());

  for (const actor of actors) {
    it(`allows ${actor} on its routes and denies all five other account types even with matching permissions`, async () => {
      login(actor);
      expect(entries.length).toBeGreaterThan(45);
      for (const entry of entries) {
        await router.navigateByUrl('/privacy');
        await router.navigateByUrl(entry.url);
        if (entry.actor === actor) expect(router.url, `${actor}: ${entry.url}`).toBe(entry.url);
        else expect(router.url, `${actor} must not enter ${entry.url}`).not.toBe(entry.url);
      }
    });

    it(`requires effective page permissions for ${actor}`, async () => {
      login(actor, []);
      delegated = [];
      for (const entry of entries.filter((entry) => entry.actor === actor)) {
        const actorOnly = entry.url === '/patient/reservations';
        await router.navigateByUrl('/privacy');
        await router.navigateByUrl(entry.url);
        if (actorOnly) expect(router.url, entry.url).toBe(entry.url);
        else expect(router.url, entry.url).not.toBe(entry.url);
      }
    });

    it(`enforces the first-login gate on every protected ${actor} page`, async () => {
      login(actor, allPermissions, true);
      for (const entry of entries.filter((entry) => entry.actor === actor)) {
        await router.navigateByUrl('/privacy');
        await router.navigateByUrl(entry.url);
        expect(router.url, entry.url).toBe('/change-password');
      }
    });
  }

  it('redirects anonymous users from every protected page to login', async () => {
    for (const entry of entries) {
      await router.navigateByUrl('/privacy');
      await router.navigateByUrl(entry.url);
      expect(router.url.split('?')[0], entry.url).toBe('/login');
    }
  });

  it('accepts each individual alternative in the page permission contracts', async () => {
    for (const entry of entries) {
      const requirement: unknown = entry.data['permission'];
      const alternatives =
        typeof requirement === 'string'
          ? [requirement]
          : Array.isArray(requirement)
            ? requirement.filter((value): value is string => typeof value === 'string')
            : [];
      for (const permission of alternatives) {
        login(entry.actor, [permission]);
        await router.navigateByUrl('/privacy');
        await router.navigateByUrl(entry.url);
        expect(router.url, `${entry.url}: ${permission}`).toBe(entry.url);
      }
    }
  });

  it('checks session expiry and first login again on sibling navigation inside both shells', async () => {
    for (const [actor, initial, next] of [
      ['SuperAdmin', '/admin/doctors', '/admin/roles'],
      ['Patient', '/patient/profile', '/patient/family'],
    ] as const) {
      const user = login(actor);
      await router.navigateByUrl(initial);
      expect(router.url).toBe(initial);
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2100-01-01T00:00:00Z'));
      await router.navigateByUrl(next);
      expect(router.url).toBe('/login');
      vi.restoreAllMocks();
      login(actor);
      await router.navigateByUrl(initial);
      session.complete({ ...user, isFirstLogin: true });
      await router.navigateByUrl(next);
      expect(router.url).toBe('/change-password');
    }
  });

  it('uses delegated practice permissions instead of global reception grants, including cold entry', async () => {
    login('Reception');
    delegated = [];
    for (const url of ['/reception/queue', '/reception/reservations', '/reception/finance']) {
      await router.navigateByUrl(url);
      expect(router.url).toBe('/workspace/reception');
    }
    expect(ensureLoaded).toHaveBeenCalledTimes(3);
    login('Reception', []);
    for (const [url, permission] of [
      ['/reception/queue', 'PracticeTickets.View'],
      ['/reception/reservations', 'PracticeReservations.Create'],
      ['/reception/finance', 'PracticePayments.View'],
    ]) {
      delegated = [permission];
      await router.navigateByUrl(url);
      expect(router.url).toBe(url);
    }
  });

  it('opens /admin at a permitted destination for limited and empty admin accounts', async () => {
    for (const [permissions, destination] of [
      [['PlatformRevenue.ViewAggregates'], '/admin/revenue'],
      [['Reservations.ViewAdministrative'], '/admin/reservations'],
      [['Roles.View'], '/admin/roles'],
      [[], '/workspace/super-admin'],
    ] as const) {
      login('SuperAdmin', [...permissions]);
      await router.navigateByUrl('/privacy');
      await router.navigateByUrl('/admin');
      expect(router.url).toBe(destination);
    }
  });

  it('allows DoctorProfile-only accounts and sends unprivileged doctors to a reachable workspace', async () => {
    login('Doctor', ['DoctorProfile.ViewOwn']);
    await router.navigateByUrl('/doctor/profile');
    expect(router.url).toBe('/doctor/profile');
    login('Doctor', []);
    await router.navigateByUrl('/doctor/practices');
    expect(router.url).toBe('/workspace/doctor');
    login('Doctor', ['DoctorOnboarding.ViewOwn']);
    await router.navigateByUrl('/doctor/queue');
    expect(router.url).toBe('/doctor/onboarding');
    await router.navigateByUrl('/workspace/doctor');
    expect(router.url).toBe('/doctor/onboarding');
  });

  it('keeps every visible portal navigation link reachable for each account type', async () => {
    const navigation = TestBed.inject(PortalNavigation);
    for (const actor of actors) {
      login(actor);
      const links = navigation.items();
      if (actor === 'SuperAdmin') expect(links).toEqual([]);
      for (const link of links) {
        await router.navigateByUrl('/privacy');
        await router.navigateByUrl(link.route);
        expect(router.url, `${actor}: ${link.id}`).toBe(link.route);
      }
    }
  });

  it('leaves discovery, legal pages and authentication recovery public', async () => {
    for (const url of [
      '/doctors',
      '/doctors/synthetic-id',
      '/privacy',
      '/terms',
      '/help',
      '/login',
      '/register/patient',
      '/register/doctor',
      '/forgot-password',
    ]) {
      await router.navigateByUrl(url);
      expect(router.url).toBe(url);
    }
  });
});
