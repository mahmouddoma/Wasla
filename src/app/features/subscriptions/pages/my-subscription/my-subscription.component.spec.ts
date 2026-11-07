import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import {
  SubscriptionsApi,
  SubscriptionState,
  TrialEligibility,
} from '../../../../domains/subscriptions';
import { catalogFixture, contractFixture } from '../../../../../testing/subscriptions';
import { ToastService } from '../../../../core/notifications/toast.service';
import { MySubscriptionComponent } from './my-subscription.component';
describe('contract-scoped MySubscriptionComponent', () => {
  const contracts = signal([contractFixture('a'), contractFixture('b')]),
    selected = signal('');
  const trial: TrialEligibility = {
    status: 'TrialAvailable',
    canActivate: true,
    durationDays: 20,
    practiceLimit: 1,
    receptionLimit: 1,
    trial: null,
  };
  const api = {
    catalog: vi.fn(() => of(catalogFixture)),
    trialEligibility: vi.fn(() => of(trial)),
    selectContract: vi.fn(),
    cancelContract: vi.fn(),
    changeContract: vi.fn(),
    activateTrial: vi.fn(),
    renewalPreview: vi.fn(),
    saveRenewal: vi.fn(),
  };
  const state = {
    contracts,
    selectedContractId: selected,
    selectedContract: () =>
      contracts().find((c) => c.subscriptionContractId === selected()) ?? null,
    details: () => state.selectedContract()?.periods[0] ?? null,
    terms: () => state.details()?.subscription ?? null,
    currentDetails: (c: ReturnType<typeof contractFixture>) => c.periods[0],
    selectContract: (id: string) => selected.set(id),
    invalidate: vi.fn(),
    refresh: vi.fn(async () => null),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    contracts.set([contractFixture('a'), contractFixture('b')]);
    selected.set('');
    api.selectContract.mockReturnValue(of({}));
    api.cancelContract.mockReturnValue(of({}));
    api.activateTrial.mockReturnValue(of({}));
    TestBed.configureTestingModule({
      imports: [MySubscriptionComponent],
      providers: [
        provideRouter([]),
        { provide: SubscriptionsApi, useValue: api },
        { provide: SubscriptionState, useValue: state },
        { provide: AuthSession, useValue: { hasPermission: () => true } },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  it('renders independent contracts without automatically selecting one', async () => {
    const f = TestBed.createComponent(MySubscriptionComponent);
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('.contract-row')).toHaveLength(2);
    expect(selected()).toBe('');
    expect(f.nativeElement.querySelector('.contract-detail')).toBeNull();
  });
  it('requires confirmation and sends a stable key for a new independent contract', async () => {
    const f = TestBed.createComponent(MySubscriptionComponent);
    await f.whenStable();
    const c = f.componentInstance;
    c.selection.set({ productCode: 'FULL_PLATFORM', planCode: 'STARTER', billingCycle: 'Monthly' });
    await c.confirm();
    expect(api.selectContract).not.toHaveBeenCalled();
    c.confirmation.set('selection');
    api.selectContract.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await c.confirm();
    await c.confirm();
    expect(api.selectContract.mock.calls[0][1]).toBe(api.selectContract.mock.calls[1][1]);
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('cancels only the explicitly selected contract with its current revision', async () => {
    const f = TestBed.createComponent(MySubscriptionComponent);
    await f.whenStable();
    const c = f.componentInstance;
    c.confirmation.set('cancel');
    await c.confirm();
    expect(api.cancelContract).not.toHaveBeenCalled();
    c.selectContract('b');
    c.confirmation.set('cancel');
    await c.confirm();
    expect(api.cancelContract).toHaveBeenCalledWith('b', 'AQID', '', expect.any(String));
    expect(contracts()[0].periods[0].subscription?.willNotRenew).toBe(false);
  });
  it('starts a trial only after an explicit confirmed action', async () => {
    const f = TestBed.createComponent(MySubscriptionComponent);
    await f.whenStable();
    expect(api.activateTrial).not.toHaveBeenCalled();
    f.componentInstance.confirmation.set('trial');
    await f.componentInstance.confirm();
    expect(api.activateTrial).toHaveBeenCalledWith(expect.any(String));
    expect(toast.success).toHaveBeenCalledWith('subscriptions.trialActivated');
  });
  it('renders an empty contracts illustration and allows adding a contract', async () => {
    contracts.set([]);
    const f = TestBed.createComponent(MySubscriptionComponent);
    await f.whenStable();
    expect(f.nativeElement.querySelector('.empty-contracts img')).not.toBeNull();
    expect(f.nativeElement.querySelector('app-plan-selector')).not.toBeNull();
  });
  it('renders an illustrated error state panel with retry action when loading fails', async () => {
    api.catalog.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    const f = TestBed.createComponent(MySubscriptionComponent);
    await f.whenStable();
    f.detectChanges();
    const errorPanel = f.nativeElement.querySelector('.subscription-state-panel--error');
    expect(errorPanel).not.toBeNull();
    expect(errorPanel.querySelector('img.state-empty-illustration')).not.toBeNull();
    expect(errorPanel.querySelector('button.state-action-btn')).not.toBeNull();
  });
  it('rejects a retained allocation selection exceeding quoted capacity', async () => {
    const f = TestBed.createComponent(MySubscriptionComponent);
    await f.whenStable();
    const c = f.componentInstance;
    c.renewal.set({
      terms: {
        productCode: 'FULL_PLATFORM',
        planCode: 'STARTER',
        priceAmount: 100,
        currency: 'EGP',
        practiceLimit: 0,
        receptionLimit: 0,
        features: [],
      },
      allocations: [],
      activeReceptionIds: [],
      periodRowVersion: 'fresh',
    });
    c.retained.set([{ practiceId: 'p1', allocationId: 'allocation', receptionIds: [] }]);
    expect(c.renewalValid()).toBe(false);
  });
});
