import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { AuthSessionState } from '../../core/auth/auth.models';
import { SubscriptionsApi } from './subscriptions-api';
import { SubscriptionState } from './subscription-state';
import { SubscriptionContract, PracticeAllocationDetails } from './subscription.models';
import { contractFixture, detailsFixture } from '../../../testing/subscriptions';
describe('practice-scoped SubscriptionState', () => {
  const session = signal<AuthSessionState | null>(null);
  const api = { contracts: vi.fn(), allocation: vi.fn() };
  function login(id = 'doctor-1', userType = 'Doctor'): void {
    session.set({
      accessToken: 'synthetic-' + id,
      expiresOnUtc: '2099-01-01',
      passwordChangeRequired: false,
      user: {
        applicationUserId: id,
        userType,
        userName: id,
        email: '',
        phoneNumber: '',
        roles: [],
        permissions: [],
        isFirstLogin: false,
        doctorId: id,
        patientId: null,
      },
    } as AuthSessionState);
  }
  beforeEach(() => {
    vi.resetAllMocks();
    login();
    api.contracts.mockReturnValue(of([contractFixture()]));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSession, useValue: { session } },
        { provide: SubscriptionsApi, useValue: api },
      ],
    });
  });
  function allocation(
    contract: SubscriptionContract,
    practiceId: string,
  ): PracticeAllocationDetails {
    return {
      practiceId,
      allocation: {
        id: 'allocation-' + practiceId,
        doctorPracticeId: practiceId,
        subscriptionContractId: contract.subscriptionContractId,
        rowVersion: 'AQID',
        allocatedFromUtc: '2026-01-01',
        releasedAtUtc: null,
      },
      effectivePeriod: contract.periods[0].subscription,
      contractUsage: contract.usage,
      activeReceptionIds: [],
    };
  }
  it('keeps two contracts independent and never auto-selects one', async () => {
    api.contracts.mockReturnValue(of([contractFixture('a'), contractFixture('b')]));
    const state = TestBed.inject(SubscriptionState);
    await state.refresh();
    expect(state.contracts()).toHaveLength(2);
    expect(state.details()).toBeNull();
    state.selectContract('b');
    expect(state.details()?.subscription?.subscriptionContractId).toBe('b');
    state.selectContract('missing');
    expect(state.details()).toBeNull();
  });
  it('never borrows a Full entitlement from a sibling practice', async () => {
    const premium = contractFixture('premium');
    premium.periods[0].entitlements = [{ featureCode: 'TICKET_QUEUE', accessLevel: 'Full' }];
    const booking = contractFixture('booking');
    booking.periods[0].entitlements = [{ featureCode: 'ONLINE_BOOKING', accessLevel: 'Full' }];
    api.contracts.mockReturnValue(of([premium, booking]));
    api.allocation.mockImplementation((id: string) =>
      of(allocation(id === 'a' ? premium : booking, id)),
    );
    const state = TestBed.inject(SubscriptionState);
    await state.refresh();
    await state.refreshPractice('a');
    await state.refreshPractice('b');
    expect(state.hasForPractice('a', 'TICKET_QUEUE', true)).toBe(true);
    expect(state.hasForPractice('b', 'TICKET_QUEUE', true)).toBe(false);
    expect(state.hasForPractice('b', 'ONLINE_BOOKING', true)).toBe(true);
    expect(state.hasForPractice('unallocated', 'ONLINE_BOOKING')).toBe(false);
  });
  it('does not use ReadOnly for writes, Pending or an expired effective interval', async () => {
    const contract = contractFixture();
    contract.periods[0].entitlements = [
      { featureCode: 'PRACTICE_MANAGEMENT', accessLevel: 'ReadOnly' },
    ];
    api.contracts.mockReturnValue(of([contract]));
    api.allocation.mockReturnValue(of(allocation(contract, 'a')));
    const state = TestBed.inject(SubscriptionState);
    await state.refresh();
    await state.refreshPractice('a');
    expect(state.hasForPractice('a', 'PRACTICE_MANAGEMENT')).toBe(true);
    expect(state.hasForPractice('a', 'PRACTICE_MANAGEMENT', true)).toBe(false);
    contract.periods[0].subscription!.endsAtUtc = '2020-01-01';
    await state.refresh(true);
    await state.refreshPractice('a');
    expect(state.hasForPractice('a', 'PRACTICE_MANAGEMENT')).toBe(false);
  });
  it('counts seats per contract and does not merge capacity', async () => {
    const full = contractFixture('full');
    full.availablePracticeSeats = 0;
    full.availableReceptionSeats = 0;
    const pending = contractFixture('pending');
    pending.periods[0].subscription!.status = 'Pending';
    api.contracts.mockReturnValue(of([full, pending]));
    const state = TestBed.inject(SubscriptionState);
    await state.refresh();
    expect(state.canCreatePractice()).toBe(false);
    expect(state.canCreateReception()).toBe(true);
  });
  it('deduplicates reads and ignores results from an earlier account', async () => {
    const pending = new Subject<SubscriptionContract[]>();
    api.contracts.mockReturnValue(pending);
    const state = TestBed.inject(SubscriptionState),
      first = state.refresh(),
      second = state.refresh();
    expect(api.contracts).toHaveBeenCalledOnce();
    login('other');
    pending.next([contractFixture()]);
    pending.complete();
    await Promise.all([first, second]);
    expect(state.contracts()).toEqual([]);
  });
  it('discards allocations invalidated during a transfer', async () => {
    const contract = contractFixture();
    api.contracts.mockReturnValue(of([contract]));
    const pending = new Subject<PracticeAllocationDetails>();
    api.allocation.mockReturnValue(pending);
    const state = TestBed.inject(SubscriptionState);
    await state.refresh();
    const read = state.refreshPractice('a');
    state.invalidate();
    pending.next(allocation(contract, 'a'));
    pending.complete();
    await read;
    expect(state.allocationFor('a')).toBeNull();
  });
  it('does not request doctor contracts for patients, reception or admin', async () => {
    const state = TestBed.inject(SubscriptionState);
    for (const actor of ['Patient', 'Reception', 'SuperAdmin']) {
      login('other', actor);
      await state.refresh();
      expect(state.contracts()).toEqual([]);
    }
    expect(api.contracts).not.toHaveBeenCalled();
  });
});
