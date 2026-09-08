import { computed, Injectable, signal } from '@angular/core';
import { AuthSessionState, CurrentUser, LoginResponse } from './auth.models';
import { PERMISSIONS } from './permissions';

const SESSION_KEY = 'wasla.auth.session';
const DOCTOR_ONBOARDING_PERMISSIONS = new Set<string>([
  PERMISSIONS.doctorOnboardingViewOwn,
  PERMISSIONS.doctorSpecializationsViewOwn,
  PERMISSIONS.doctorSpecializationsSubmitOwn,
  PERMISSIONS.doctorSpecializationsResubmitOwn,
  PERMISSIONS.doctorPracticeLocationViewOwn,
  PERMISSIONS.doctorPracticeLocationManageOwn,
]);

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly state = signal<AuthSessionState | null>(this.restore());
  readonly session = this.state.asReadonly();
  readonly user = computed(() => this.state()?.user ?? null);
  readonly isAuthenticated = computed(() => this.token() !== null && this.user() !== null);

  begin(response: LoginResponse): boolean {
    if (!response.accessToken || !this.isFutureDate(response.expiresOnUtc)) return false;
    this.update({
      accessToken: response.accessToken,
      expiresOnUtc: response.expiresOnUtc,
      passwordChangeRequired: response.passwordChangeRequired,
      user: null,
    });
    return true;
  }
  complete(user: CurrentUser): void {
    const session = this.state();
    if (session) this.update({ ...session, user });
  }
  token(): string | null {
    const session = this.state();
    return session && this.isFutureDate(session.expiresOnUtc) ? session.accessToken : null;
  }
  requiresPasswordChange(): boolean {
    const session = this.state();
    return session?.passwordChangeRequired === true || session?.user?.isFirstLogin === true;
  }
  hasPermission(permission: string): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }
  destinationFor(user: CurrentUser): string {
    if (user.userType === 'SuperAdmin') {
      if (user.permissions.includes(PERMISSIONS.doctorsViewAll)) return '/admin/doctors';
      if (user.permissions.includes(PERMISSIONS.superAdminsViewAll)) return '/admin/superadmins';
      if (user.permissions.includes(PERMISSIONS.rolesView)) return '/admin/roles';
      if (user.permissions.includes(PERMISSIONS.specializationsView)) {
        return '/admin/medical-specializations';
      }
      if (user.permissions.includes(PERMISSIONS.doctorSpecializationRequestsViewAll)) {
        return '/admin/doctor-specialization-requests';
      }
    }
    if (user.userType === 'Doctor' && !this.hasDoctorOperationalAccess(user)) {
      return '/doctor/onboarding';
    }
    return (
      {
        SuperAdmin: '/workspace/super-admin',
        Doctor: '/workspace/doctor',
        Reception: '/workspace/reception',
        Patient: '/workspace/patient',
      } as const
    )[user.userType];
  }
  hasDoctorOperationalAccess(user: CurrentUser): boolean {
    return (
      user.userType === 'Doctor' &&
      user.permissions.some((permission) => !DOCTOR_ONBOARDING_PERMISSIONS.has(permission))
    );
  }
  clear(): void {
    this.state.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }
  private update(session: AuthSessionState): void {
    this.state.set(session);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  private restore(): AuthSessionState | null {
    try {
      const value = sessionStorage.getItem(SESSION_KEY);
      if (!value) return null;
      const session = JSON.parse(value) as AuthSessionState;
      if (!session.accessToken || !this.isFutureDate(session.expiresOnUtc)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
  private isFutureDate(value: string): boolean {
    const expiry = Date.parse(value);
    return Number.isFinite(expiry) && expiry > Date.now();
  }
}
