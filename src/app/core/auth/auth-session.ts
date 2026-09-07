import { computed, Injectable, signal } from '@angular/core';
import { AuthSessionState, CurrentUser, LoginResponse, UserType } from './auth.models';

const SESSION_KEY = 'wasla.auth.session';

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
  destinationFor(userType: UserType): string {
    return (
      {
        SuperAdmin: '/workspace/super-admin',
        Doctor: '/workspace/doctor',
        Reception: '/workspace/reception',
        Patient: '/workspace/patient',
      } as const
    )[userType];
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
