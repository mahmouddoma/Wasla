import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSession } from '../../core/auth/auth-session';
import { CurrentUser } from '../../core/auth/auth.models';
import { PERMISSIONS } from '../../core/auth/permissions';
import { ReceptionPracticeContext } from '../../domains/reception-practices';
import { PortalNavigation } from './portal-navigation';

describe('PortalNavigation', () => {
  const user = signal<CurrentUser | null>(null);
  const grants = signal<string[]>([]);
  beforeEach(() => {
    grants.set([]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthSession,
          useValue: {
            user,
            hasPermission: (code: string) => user()?.permissions.includes(code) ?? false,
          },
        },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            hasAnyPracticeWithPermission: (code: string) => grants().includes(code),
            hasAnyPracticeWithAnyPermission: (codes: readonly string[]) =>
              codes.some((code) => grants().includes(code)),
          },
        },
      ],
    });
  });
  const setUser = (userType: CurrentUser['userType'], permissions: string[] = []) =>
    user.set({
      applicationUserId: 'u1',
      userName: 'Test',
      email: '',
      phoneNumber: '',
      roles: [userType],
      userType,
      permissions,
      isFirstLogin: false,
      doctorId: null,
      patientId: null,
    });
  it('groups doctor daily, management and finance links without changing permission rules', () => {
    setUser('Doctor', [
      'DoctorPracticeReservations.ViewOwn',
      PERMISSIONS.medicalEncountersViewOwn,
      PERMISSIONS.doctorPracticesViewOwn,
      PERMISSIONS.receptionUsersViewOwn,
      PERMISSIONS.doctorPracticePaymentsViewOwn,
    ]);
    const nav = TestBed.inject(PortalNavigation);
    expect(
      nav
        .sections()
        .find((g) => g.id === 'daily')
        ?.items.map((i) => i.id),
    ).toEqual(['workspace', 'reservations', 'queue', 'encounters']);
    expect(
      nav
        .sections()
        .find((g) => g.id === 'management')
        ?.items.map((i) => i.id),
    ).toEqual(['practices', 'receptions']);
    expect(
      nav
        .sections()
        .find((g) => g.id === 'finance')
        ?.items.map((i) => i.id),
    ).toEqual(['finance']);
    expect(nav.mobileItems().map((i) => i.id)).toEqual([
      'workspace',
      'reservations',
      'queue',
      'encounters',
    ]);
    setUser('Doctor', [PERMISSIONS.doctorRevenueViewOwn]);
    expect(
      nav
        .sections()
        .find((g) => g.id === 'finance')
        ?.items.map((i) => i.id),
    ).toEqual(['revenue']);
    expect(nav.mobileItems().map((i) => i.id)).toEqual(['workspace', 'queue']);
  });
  it('reacts to reception assignment and session permission changes', () => {
    setUser('Reception');
    const nav = TestBed.inject(PortalNavigation);
    expect(nav.items().map((i) => i.id)).toEqual(['workspace']);
    grants.set([PERMISSIONS.practiceReservationsCreate, PERMISSIONS.practicePaymentsView]);
    setUser('Reception', [
      PERMISSIONS.patientsRegister,
      PERMISSIONS.familyRelationshipRequestsCreateAssisted,
    ]);
    expect(
      nav
        .sections()
        .find((g) => g.id === 'daily')
        ?.items.map((i) => i.id),
    ).toEqual(['workspace', 'reservations', 'patients']);
    expect(nav.items().map((i) => i.id)).toContain('family-requests');
    expect(nav.items().map((i) => i.id)).toContain('finance');
    expect(nav.mobileItems().map((i) => i.id)).toEqual(['workspace', 'reservations', 'patients']);
    grants.set([]);
    expect(nav.items().map((i) => i.id)).not.toContain('reservations');
    expect(nav.items().map((i) => i.id)).not.toContain('finance');
  });
  it('only shows patient health and account items with the required permissions', () => {
    setUser('Patient');
    const nav = TestBed.inject(PortalNavigation);
    expect(nav.sections().map((g) => g.id)).toEqual(['daily']);
    setUser('Patient', [
      PERMISSIONS.medicalEncountersViewOwnCompleted,
      'Prescriptions.ViewOwnCompleted',
      PERMISSIONS.followUpEligibilityViewOwn,
      PERMISSIONS.ticketsViewOwn,
      PERMISSIONS.familiesViewOwn,
    ]);
    expect(
      nav
        .sections()
        .find((g) => g.id === 'health')
        ?.items.map((i) => i.id),
    ).toEqual(['encounters', 'prescriptions', 'follow-ups']);
    expect(
      nav
        .sections()
        .find((g) => g.id === 'account')
        ?.items.map((i) => i.id),
    ).toEqual(['family']);
    expect(nav.mobileItems().map((i) => i.id)).toEqual([
      'workspace',
      'reservations',
      'find-doctor',
      'tickets',
    ]);
  });
  it('preserves catalog manager routes and independent import/history permissions', () => {
    setUser('DrugCatalogManager', [
      'DrugCatalog.View',
      'DrugCatalog.ImportHistory',
      'DrugCatalogRequests.View',
    ]);
    const nav = TestBed.inject(PortalNavigation);
    expect(nav.items().map((i) => i.route)).toEqual([
      '/drug-catalog',
      '/drug-catalog/imports',
      '/drug-catalog-requests',
    ]);
    expect(nav.mobileItems().map((i) => i.id)).toEqual([
      'drug-catalog',
      'drug-imports',
      'medication-requests',
    ]);
    setUser('DrugCatalogManager', ['DrugCatalog.Import']);
    expect(nav.items().map((i) => i.id)).toEqual(['drug-imports']);
  });
  it('has no duplicated links across groups or untranslated mobile labels', () => {
    setUser('Patient', [PERMISSIONS.paymentsViewOwn, PERMISSIONS.patientProfileViewOwn]);
    const nav = TestBed.inject(PortalNavigation);
    const ids = nav.sections().flatMap((group) => group.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      nav
        .items()
        .map((item) => item.id)
        .sort(),
    );
    expect(nav.mobileItems().length).toBeLessThanOrEqual(4);
  });
});
