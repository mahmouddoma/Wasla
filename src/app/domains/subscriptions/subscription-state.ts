import { computed, inject, Injectable, signal, DestroyRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { SubscriptionsApi } from './subscriptions-api';
import {
  PracticeAllocationDetails,
  Subscription,
  SubscriptionContract,
  SubscriptionDetails,
} from './subscription.models';

/** Account-scoped contracts. Selection never grants another practice its features. */
@Injectable({ providedIn: 'root' })
export class SubscriptionState {
  private readonly api = inject(SubscriptionsApi);
  private readonly session = inject(AuthSession);
  private readonly snapshot = signal<{
    identity: string;
    contracts: SubscriptionContract[];
  } | null>(null);
  private readonly allocations = signal<Record<string, PracticeAllocationDetails>>({});
  private revision = 0;
  private pending: {
    identity: string;
    revision: number;
    promise: Promise<SubscriptionDetails | null>;
  } | null = null;
  private practiceReads = new Map<string, Promise<PracticeAllocationDetails | null>>();
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly now = signal(Date.now());
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.boundaryTimer) clearTimeout(this.boundaryTimer);
    });
  }
  private readonly identity = computed(() => {
    const session = this.session.session();
    return session?.user?.userType === 'Doctor'
      ? session.user.applicationUserId + ':' + session.accessToken
      : null;
  });
  readonly selectedContractId = signal('');
  readonly contracts = computed(() =>
    this.snapshot()?.identity === this.identity() ? this.snapshot()!.contracts : [],
  );
  readonly selectedContract = computed(
    () =>
      this.contracts().find((c) => c.subscriptionContractId === this.selectedContractId()) ?? null,
  );
  readonly details = computed(() => {
    const contract = this.selectedContract();
    return contract
      ? (this.currentDetails(contract) ??
          contract.periods.find((p) => p.subscription?.status === 'Expired') ??
          contract.periods[0] ??
          null)
      : null;
  });
  readonly usage = computed(() => this.selectedContract()?.usage ?? null);
  readonly terms = computed(
    () => this.details()?.subscription ?? this.details()?.pendingSubscription ?? null,
  );
  readonly needsReview = computed(
    () => !['Active', 'Expired'].includes(this.terms()?.status ?? ''),
  );
  readonly availableContracts = computed(() =>
    this.contracts().filter((c) => c.availablePracticeSeats > 0 && this.currentDetails(c)),
  );
  readonly canCreatePractice = computed(() =>
    this.availableContracts().some((c) =>
      this.grants(this.currentDetails(c), 'PRACTICE_MANAGEMENT', true),
    ),
  );
  // An unassigned staff account consumes no seat. Assignment is checked per target contract.
  readonly canCreateReception = computed(() =>
    this.contracts().some((c) => this.grants(this.currentDetails(c), 'RECEPTION_MANAGEMENT', true)),
  );
  selectContract(id: string): void {
    this.selectedContractId.set(
      this.contracts().some((c) => c.subscriptionContractId === id) ? id : '',
    );
  }
  currentDetails(contract: SubscriptionContract): SubscriptionDetails | null {
    return contract.periods.find((p) => this.effective(p.subscription)) ?? null;
  }
  effective(period: Subscription | null | undefined): boolean {
    if (!period || !['Active', 'Scheduled'].includes(period.status)) return false;
    const now = this.now();
    return (
      !!period.startsAtUtc &&
      !!period.endsAtUtc &&
      Date.parse(period.startsAtUtc) <= now &&
      now < Date.parse(period.endsAtUtc)
    );
  }
  private grants(details: SubscriptionDetails | null, feature: string, mutation: boolean): boolean {
    const grant = details?.entitlements.find(
      (g) => g.featureCode.toUpperCase() === feature.toUpperCase(),
    );
    return grant?.accessLevel === 'Full' || (!mutation && grant?.accessLevel === 'ReadOnly');
  }
  /** Menu visibility only; operational writers use exact-practice or resource capabilities. */
  has(feature: string, mutation = false): boolean {
    return this.contracts().some((c) => this.grants(this.currentDetails(c), feature, mutation));
  }
  allocationFor(practiceId: string): PracticeAllocationDetails | null {
    return this.snapshot()?.identity === this.identity()
      ? (this.allocations()[practiceId] ?? null)
      : null;
  }
  hasForPractice(practiceId: string, feature: string, mutation = false): boolean {
    const value = this.allocationFor(practiceId);
    if (!value?.allocation || !this.effective(value.effectivePeriod)) return false;
    const contract = this.contracts().find(
      (c) => c.subscriptionContractId === value.allocation!.subscriptionContractId,
    );
    const detail =
      contract?.periods.find((p) => p.subscription?.id === value.effectivePeriod?.id) ?? null;
    return this.grants(detail, feature, mutation);
  }
  invalidate(): void {
    ++this.revision;
    this.snapshot.set(null);
    this.allocations.set({});
    this.practiceReads.clear();
    if (this.boundaryTimer) clearTimeout(this.boundaryTimer);
  }
  async refresh(force = false): Promise<SubscriptionDetails | null> {
    const identity = this.identity();
    if (!identity) {
      this.invalidate();
      return null;
    }
    if (!force && this.snapshot()?.identity === identity) return this.details();
    if (this.pending?.identity === identity && this.pending.revision === this.revision)
      return this.pending.promise;
    const revision = this.revision;
    const promise = firstValueFrom(this.api.contracts()).then((contracts) => {
      if (identity !== this.identity() || revision !== this.revision) return null;
      this.snapshot.set({ identity, contracts });
      this.allocations.set({});
      this.now.set(Date.now());
      this.scheduleBoundary(contracts);
      if (!contracts.some((c) => c.subscriptionContractId === this.selectedContractId()))
        this.selectedContractId.set('');
      return this.details();
    });
    this.pending = { identity, revision, promise };
    try {
      return await promise;
    } finally {
      if (this.pending?.promise === promise) this.pending = null;
    }
  }
  refreshPractice(practiceId: string): Promise<PracticeAllocationDetails | null> {
    if (!practiceId || !this.identity()) return Promise.resolve(null);
    const existing = this.practiceReads.get(practiceId);
    if (existing) return existing;
    const identity = this.identity(),
      revision = this.revision;
    const promise = firstValueFrom(this.api.allocation(practiceId))
      .then((value) => {
        if (identity !== this.identity() || revision !== this.revision) return null;
        this.allocations.update((items) => ({ ...items, [practiceId]: value }));
        return value;
      })
      .catch((error: unknown) => {
        if (identity === this.identity() && revision === this.revision)
          this.allocations.update((items) => {
            const next = { ...items };
            delete next[practiceId];
            return next;
          });
        throw error;
      })
      .finally(() => {
        if (this.practiceReads.get(practiceId) === promise) this.practiceReads.delete(practiceId);
      });
    this.practiceReads.set(practiceId, promise);
    return promise;
  }
  private scheduleBoundary(contracts: SubscriptionContract[]): void {
    if (this.boundaryTimer) clearTimeout(this.boundaryTimer);
    const future = contracts
      .flatMap((c) =>
        c.periods.flatMap((p) => [p.subscription?.startsAtUtc, p.subscription?.endsAtUtc]),
      )
      .filter((value): value is string => !!value)
      .map(Date.parse)
      .filter((time) => time > Date.now());
    if (!future.length) return;
    this.boundaryTimer = setTimeout(
      () => {
        const practices = Object.keys(this.allocations());
        this.now.set(Date.now());
        void this.refresh(true)
          .then(() => Promise.allSettled(practices.map((id) => this.refreshPractice(id))))
          .catch(() => this.invalidate());
      },
      Math.min(Math.max(1, Math.min(...future) - Date.now() + 1), 2147483647),
    );
  }
}

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
