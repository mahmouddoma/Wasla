import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { SubscriptionsApi } from './subscriptions-api';
import { SubscriptionDetails } from './subscription.models';

/** In-memory, account-scoped commercial state. Never persists billing or medical data. */
@Injectable({ providedIn: 'root' })
export class SubscriptionState {
  private readonly api = inject(SubscriptionsApi);
  private readonly session = inject(AuthSession);
  private readonly snapshot = signal<{ identity: string; value: SubscriptionDetails } | null>(null);
  private revision = 0;
  private pending: {
    identity: string;
    revision: number;
    promise: Promise<SubscriptionDetails | null>;
  } | null = null;
  private readonly identity = computed(() => {
    const session = this.session.session();
    return session?.user?.userType === 'Doctor'
      ? `${session.user.applicationUserId}:${session.accessToken}`
      : null;
  });
  readonly details = computed(() =>
    this.snapshot()?.identity === this.identity() ? this.snapshot()!.value : null,
  );
  readonly usage = computed(() => this.details()?.usage ?? null);
  readonly terms = computed(
    () => this.details()?.subscription ?? this.details()?.pendingSubscription ?? null,
  );
  readonly needsReview = computed(
    () => !['Active', 'Expired'].includes(this.details()?.subscription?.status ?? ''),
  );
  readonly canCreatePractice = computed(
    () =>
      this.details()?.subscription?.status === 'Active' &&
      this.has('PRACTICE_MANAGEMENT', true) &&
      !!this.usage() &&
      !!this.terms() &&
      this.usage()!.practiceCount < this.terms()!.practiceLimit,
  );
  readonly canCreateReception = computed(
    () =>
      this.details()?.subscription?.status === 'Active' &&
      this.has('RECEPTION_MANAGEMENT', true) &&
      !!this.usage() &&
      !!this.terms() &&
      this.usage()!.receptionCount < this.terms()!.receptionLimit,
  );

  has(featureCode: string, mutation = false): boolean {
    const current = this.details()?.subscription;
    if (!current || ['Pending', 'Scheduled', 'Cancelled', 'Superseded'].includes(current.status))
      return false;
    const grant = this.details()?.entitlements.find(
      (item) => item.featureCode.trim().toUpperCase() === featureCode.trim().toUpperCase(),
    );
    return grant?.accessLevel === 'Full' || (!mutation && grant?.accessLevel === 'ReadOnly');
  }
  invalidate(): void {
    ++this.revision;
    this.snapshot.set(null);
  }

  async refresh(force = false): Promise<SubscriptionDetails | null> {
    const identity = this.identity();
    if (!identity) {
      this.invalidate();
      return null;
    }
    if (!force && this.details()) return this.details();
    const revision = this.revision;
    if (this.pending?.identity === identity && this.pending.revision === revision)
      return this.pending.promise;
    const promise = firstValueFrom(this.api.mine()).then((value) => {
      if (this.identity() !== identity || this.revision !== revision) return null;
      this.snapshot.set({ identity, value });
      return value;
    });
    this.pending = { identity, revision, promise };
    try {
      return await promise;
    } finally {
      if (this.pending?.promise === promise) this.pending = null;
    }
  }
}

/** Only staff route families belong here; patient ownership and admin policies stay independent. */
export function subscriptionFeatureForRoute(url: string): string | null {
  const path = url.split(/[?#]/)[0];
  const entries: readonly [RegExp, string][] = [
    [/^\/doctor\/practices(?:\/|$)/, 'PRACTICE_MANAGEMENT'],
    [/^\/doctor\/receptions(?:\/|$)/, 'RECEPTION_MANAGEMENT'],
    [/^\/doctor\/reservations(?:\/|$)/, 'RESERVATION_MANAGEMENT'],
    [/^\/doctor\/queue(?:\/|$)/, 'TICKET_QUEUE'],
    [/^\/doctor\/encounters(?:\/|$)/, 'MEDICAL_ENCOUNTER'],
    [/^\/doctor\/prescriptions(?:\/|$)/, 'PRESCRIPTION'],
    [/^\/doctor\/patients(?:\/|$)/, 'PATIENT_MANAGEMENT'],
    [/^\/doctor\/revenue(?:\/|$)/, 'DOCTOR_REVENUE_DASHBOARD'],
    [/^\/doctor\/finance(?:\/|$)/, 'PAYMENT_COLLECTION'],
    [/^\/doctor\/expenses(?:\/|$)/, 'OPERATING_EXPENSES'],
    [/^\/doctor\/salaries(?:\/|$)/, 'SALARY_MANAGEMENT'],
    [/^\/doctor\/reports(?:\/|$)/, 'OPERATIONAL_REPORTS'],
    [/^\/doctor\/insights(?:\/|$)/, 'ADVANCED_RULE_BASED_INSIGHTS'],
    [/^\/diagnostics\/doctor(?:\/|$)/, 'LAB_RADIOLOGY'],
  ];
  return entries.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}
