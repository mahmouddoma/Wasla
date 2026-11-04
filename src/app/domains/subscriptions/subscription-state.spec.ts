import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { AuthSessionState } from '../../core/auth/auth.models';
import { SubscriptionsApi } from './subscriptions-api';
import { SubscriptionState, subscriptionFeatureForRoute } from './subscription-state';
import { SubscriptionDetails } from './subscription.models';
import { detailsFixture } from '../../../testing/subscriptions';

describe('SubscriptionState', () => {
  const session = signal<AuthSessionState | null>(null);
  const api = { mine: vi.fn(() => of(detailsFixture())) };
  function doctor(id = 'doctor-1'): AuthSessionState {
    return {
      accessToken: 'synthetic-' + id,
      expiresOnUtc: '2099-01-01',
      passwordChangeRequired: false,
      user: {
        applicationUserId: id,
        userType: 'Doctor',
        doctorId: id,
        patientId: null,
        userName: id,
        email: '',
        phoneNumber: '',
        roles: [],
        permissions: [],
        isFirstLogin: false,
      },
    };
  }
  beforeEach(() => {
    api.mine.mockReset();
    api.mine.mockReturnValue(of(detailsFixture()));
    session.set(doctor());
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSession, useValue: { session } },
        { provide: SubscriptionsApi, useValue: api },
      ],
    });
  });
  it('uses grants instead of Starter/Professional/Premium plan names', async () => {
    const state = TestBed.inject(SubscriptionState);
    for (const plan of ['STARTER', 'PROFESSIONAL', 'PREMIUM']) {
      const details = detailsFixture();
      details.subscription!.planCode = plan;
      details.entitlements = [{ featureCode: 'reservation_management', accessLevel: 'ReadOnly' }];
      api.mine.mockReturnValue(of(details));
      await state.refresh(true);
      expect(state.has('RESERVATION_MANAGEMENT')).toBe(true);
      expect(state.has('RESERVATION_MANAGEMENT', true)).toBe(false);
      expect(state.has('PRACTICE_MANAGEMENT')).toBe(false);
    }
  });
  it('counts all persisted practices and active reception identities using server usage', async () => {
    const state = TestBed.inject(SubscriptionState);
    await state.refresh();
    expect(state.canCreatePractice()).toBe(true);
    expect(state.canCreateReception()).toBe(true);
    const full = detailsFixture();
    full.usage = { practiceCount: 2, receptionCount: 3 };
    api.mine.mockReturnValue(of(full));
    await state.refresh(true);
    expect(state.canCreatePractice()).toBe(false);
    expect(state.canCreateReception()).toBe(false);
  });
  it('does not manufacture grants from Trial, Pending, Expired or a scheduled period', async () => {
    const state = TestBed.inject(SubscriptionState);
    for (const status of ['Pending', 'Expired', 'Active'] as const) {
      const details = detailsFixture();
      details.subscription!.status = status;
      details.subscription!.kind = 'Trial';
      details.entitlements = [];
      details.nextPeriod = { ...details.subscription!, status: 'Scheduled' };
      api.mine.mockReturnValue(of(details));
      await state.refresh(true);
      expect(state.has('PRACTICE_MANAGEMENT')).toBe(false);
    }
  });
  it('deduplicates in-flight reads and discards responses from a previous login', async () => {
    const pending = new Subject<SubscriptionDetails>();
    api.mine.mockReturnValue(pending);
    const state = TestBed.inject(SubscriptionState);
    const first = state.refresh();
    const second = state.refresh();
    expect(api.mine).toHaveBeenCalledOnce();
    session.set(doctor('doctor-2'));
    pending.next(detailsFixture());
    pending.complete();
    await Promise.all([first, second]);
    expect(state.details()).toBeNull();
  });
  it('never fetches doctor financial data for patient, reception, admin or signed-out sessions', async () => {
    const state = TestBed.inject(SubscriptionState);
    for (const userType of ['Patient', 'Reception', 'SuperAdmin'] as const) {
      const other = doctor();
      other.user!.userType = userType;
      session.set(other);
      await state.refresh();
      expect(state.details()).toBeNull();
    }
    session.set(null);
    await state.refresh();
    expect(api.mine).not.toHaveBeenCalled();
    expect(subscriptionFeatureForRoute('/patient/records')).toBeNull();
    expect(subscriptionFeatureForRoute('/patient/family')).toBeNull();
    expect(subscriptionFeatureForRoute('/admin/doctors')).toBeNull();
    expect(subscriptionFeatureForRoute('/doctor/onboarding')).toBeNull();
    expect(subscriptionFeatureForRoute('/doctor/subscription')).toBeNull();
    expect(subscriptionFeatureForRoute('/doctor/patients?patientId=test')).toBe(
      'PATIENT_MANAGEMENT',
    );
  });
  it('does not unlock future selections or allow new capacity after expiry even when snapshots exist', async () => {
    const state = TestBed.inject(SubscriptionState);
    for (const status of ['Pending', 'Scheduled', 'Expired'] as const) {
      const details = detailsFixture();
      details.subscription!.status = status;
      api.mine.mockReturnValue(of(details));
      await state.refresh(true);
      expect(state.canCreatePractice()).toBe(false);
      expect(state.canCreateReception()).toBe(false);
      if (status !== 'Expired') expect(state.has('PRACTICE_MANAGEMENT')).toBe(false);
    }
  });
});
