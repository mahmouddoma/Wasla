import { TestBed } from '@angular/core/testing';
import { CurrentUser } from './auth.models';
import { AuthSession } from './auth-session';
import { PERMISSIONS } from './permissions';

describe('AuthSession doctor destination', () => {
  let session: AuthSession;
  const doctor: CurrentUser = {
    applicationUserId: '1bbac680-bda0-4cb0-b531-7cc1d61e22b6',
    userName: 'doctor1',
    email: 'doctor@example.com',
    phoneNumber: '01000000000',
    userType: 'Doctor',
    roles: ['Doctor'],
    permissions: [PERMISSIONS.doctorOnboardingViewOwn],
    isFirstLogin: false,
    doctorId: '771326e6-1033-4e43-b5b0-484cc2d74ec2',
    patientId: null,
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    session = TestBed.inject(AuthSession);
  });

  it('routes catalog managers to their own area and enforces first login independently of nullable clinical IDs', () => {
    const manager: CurrentUser = { ...doctor, userType: 'DrugCatalogManager', roles: ['DrugCatalogManager'],
      permissions: ['DrugCatalog.View'], doctorId: null, patientId: null, isFirstLogin: true };
    session.begin({ accessToken: 'synthetic-token', expiresOnUtc: new Date(Date.now() + 60000).toISOString(), passwordChangeRequired: true });
    session.complete(manager);
    expect(session.destinationFor(manager)).toBe('/drug-catalog');
    expect(session.requiresPasswordChange()).toBe(true);
    expect(session.hasPermission('Prescriptions.ViewOwn')).toBe(false);
    expect(session.destinationFor({ ...manager, permissions: [] })).toBe('/workspace/drug-catalog-manager');
  });

  it('keeps an onboarding-only doctor out of the operational workspace', () => {
    expect(session.destinationFor(doctor)).toBe('/doctor/onboarding');
  });

  it('opens the doctor workspace when effective operational permissions are present', () => {
    expect(
      session.destinationFor({
        ...doctor,
        permissions: [PERMISSIONS.doctorOnboardingViewOwn, 'Appointments.ViewOwn'],
      }),
    ).toBe('/workspace/doctor');
  });

  it('opens doctors management for a SuperAdmin with Doctors.ViewAll', () => {
    expect(
      session.destinationFor({
        ...doctor,
        userType: 'SuperAdmin',
        roles: ['SuperAdmin'],
        permissions: [PERMISSIONS.doctorsViewAll],
        doctorId: null,
      }),
    ).toBe('/admin/doctors');
  });

  it('opens SuperAdmin management when it is the available admin area', () => {
    expect(
      session.destinationFor({
        ...doctor,
        userType: 'SuperAdmin',
        roles: ['SuperAdmin'],
        permissions: [PERMISSIONS.superAdminsViewAll],
        doctorId: null,
      }),
    ).toBe('/admin/superadmins');
  });

  it('opens role governance when it is the available admin area', () => {
    expect(
      session.destinationFor({
        ...doctor,
        userType: 'SuperAdmin',
        roles: ['SuperAdmin'],
        permissions: [PERMISSIONS.rolesView],
        doctorId: null,
      }),
    ).toBe('/admin/roles');
  });

  it('forces the first-login password change from the login response', () => {
    expect(
      session.begin({
        accessToken: 'token',
        expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
        passwordChangeRequired: true,
      }),
    ).toBe(true);
    session.complete({ ...doctor, isFirstLogin: false });

    expect(session.requiresPasswordChange()).toBe(true);
  });

  it('forces the first-login password change when auth me marks the user as first login', () => {
    session.begin({
      accessToken: 'token',
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      passwordChangeRequired: false,
    });
    session.complete({ ...doctor, isFirstLogin: true });

    expect(session.requiresPasswordChange()).toBe(true);
  });

  it('keeps new doctor onboarding permissions out of the operational workspace', () => {
    expect(
      session.destinationFor({
        ...doctor,
        permissions: [
          PERMISSIONS.doctorOnboardingViewOwn,
          PERMISSIONS.doctorSpecializationsViewOwn,
          PERMISSIONS.doctorSpecializationsSubmitOwn,
          PERMISSIONS.doctorPracticeLocationManageOwn,
        ],
      }),
    ).toBe('/doctor/onboarding');
  });
});
