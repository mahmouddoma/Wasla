import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthSession } from './auth-session';
import { CurrentUser } from './auth.models';
import { catalogManagerAreaGuard, permissionGuard } from './auth.guards';
describe('Medication actor boundaries', () => {
  let session: AuthSession;
  const manager: CurrentUser = {
    applicationUserId: 'm1',
    userName: 'Manager',
    email: '',
    phoneNumber: '',
    userType: 'DrugCatalogManager',
    roles: ['DrugCatalogManager'],
    permissions: ['DrugCatalog.View', 'Prescriptions.ViewOwn'],
    isFirstLogin: false,
    doctorId: null,
    patientId: null,
  };
  const state = {} as RouterStateSnapshot;
  const route = (data: Record<string, unknown>, path = 'doctor/prescriptions') =>
    ({ data, routeConfig: { path }, paramMap: convertToParamMap({}) }) as ActivatedRouteSnapshot;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(AuthSession);
    session.begin({
      accessToken: 'synthetic',
      expiresOnUtc: new Date(Date.now() + 60000).toISOString(),
      passwordChangeRequired: false,
    });
    session.complete(manager);
  });
  afterEach(() => sessionStorage.clear());
  it('denies clinical, patient and admin areas even if a manager has an unrelated permission', () => {
    for (const path of ['doctor/prescriptions', 'patient/prescriptions', 'admin']) {
      const result = TestBed.runInInjectionContext(() =>
        catalogManagerAreaGuard(route({}, path), state),
      );
      expect((result as UrlTree).toString()).toBe('/drug-catalog');
    }
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(route({ actor: 'Doctor', permission: 'Prescriptions.ViewOwn' }), state),
    );
    expect((result as UrlTree).toString()).toBe('/drug-catalog');
  });
  it('isolates medical managers from drug, patient and clinical areas and gates first login', () => {
    session.complete({
      ...manager,
      userType: 'MedicalCatalogManager',
      roles: ['MedicalCatalogManager'],
      permissions: ['LabCatalog.View', 'Prescriptions.ViewOwn'],
      isFirstLogin: true,
    });
    expect(session.requiresPasswordChange()).toBe(true);
    for (const data of [
      {},
      { catalogManagerArea: true },
      { catalogManagerArea: 'DrugCatalogManager' },
    ]) {
      const result = TestBed.runInInjectionContext(() =>
        catalogManagerAreaGuard(route(data), state),
      );
      expect((result as UrlTree).toString()).toBe('/medical-catalog/lab');
    }
    expect(
      TestBed.runInInjectionContext(() =>
        catalogManagerAreaGuard(
          route({ catalogManagerArea: 'MedicalCatalogManager' }, 'medical-catalog'),
          state,
        ),
      ),
    ).toBe(true);
  });
  it('allows only declared catalog areas and derives limited-manager destinations from permissions', () => {
    expect(
      TestBed.runInInjectionContext(() =>
        catalogManagerAreaGuard(route({ catalogManagerArea: true }, 'drug-catalog'), state),
      ),
    ).toBe(true);
    expect(session.destinationFor({ ...manager, permissions: ['DrugCatalog.ImportHistory'] })).toBe(
      '/drug-catalog/imports',
    );
    expect(session.destinationFor({ ...manager, permissions: ['DrugCatalogRequests.View'] })).toBe(
      '/drug-catalog-requests',
    );
  });
  it('preserves the existing admin landing priority and allows a governance-only admin', () => {
    const admin = {
      ...manager,
      userType: 'SuperAdmin' as const,
      permissions: ['DrugCatalogManagers.ViewAll', 'Doctors.ViewAll'],
    };
    expect(session.destinationFor(admin)).toBe('/admin/doctors');
    expect(session.destinationFor({ ...admin, permissions: ['DrugCatalogManagers.ViewAll'] })).toBe(
      '/admin/drug-catalog-managers',
    );
  });
});
