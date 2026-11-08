import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubscriptionsApi } from './subscriptions-api';
import { environment } from '../../../environments/environment';
import { wireDetailsFixture } from '../../../testing/subscriptions';
describe('v1.2 contract/allocation wire integration', () => {
  let api: SubscriptionsApi, http: HttpTestingController;
  const base = environment.apiBaseUrl + '/api/v1';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SubscriptionsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('WAS-686 reads the explicitly selected owned contract as a one-element array', () => {
    api.contracts('selected-contract').subscribe((value) => {
      expect(value).toHaveLength(1);
      expect(value[0].subscriptionContractId).toBe('selected-contract');
    });
    const request = http.expectOne(base + '/doctors/me/subscriptions/selected-contract');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        subscriptionContractId: 'selected-contract',
        periods: [wireDetailsFixture()],
        practices: [],
        usage: { practiceCount: 0, receptionCount: 0 },
        availablePracticeSeats: 1,
        availableReceptionSeats: 0,
        renewalPreview: null,
        upcomingStatus: 'Active',
      },
    ]);
  });
  it('reads plural contracts preserving period ID separately from stable contract ID', () => {
    let value: unknown;
    api.contracts().subscribe((v) => (value = v));
    http.expectOne(base + '/doctors/me/subscriptions').flush([
      {
        subscriptionContractId: 'contract',
        periods: [
          {
            ...wireDetailsFixture(),
            subscription: {
              ...wireDetailsFixture().subscription,
              subscriptionContractId: 'contract',
            },
          },
        ],
        practices: [],
        usage: { practiceCount: 0, receptionCount: 0 },
        availablePracticeSeats: 2,
        availableReceptionSeats: 3,
        renewalPreview: null,
        upcomingStatus: 'Active',
      },
    ]);
    expect(value).toMatchObject([
      {
        subscriptionContractId: 'contract',
        periods: [{ subscription: { id: 'sub-1', subscriptionContractId: 'contract' } }],
      },
    ]);
  });
  it('reads a chosen contract through its array response, without taking the first overall contract', () => {
    api.contracts('contract/2').subscribe();
    http.expectOne(base + '/doctors/me/subscriptions/contract%2F2').flush([]);
  });
  it.each([
    'activateTrial',
    'selectContract',
    'changeContract',
    'cancelContract',
    'saveRenewal',
  ] as const)('sends a stable idempotency key for %s', (method) => {
    const selection = {
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly' as const,
    };
    const request =
      method === 'activateTrial'
        ? api.activateTrial('intent')
        : method === 'selectContract'
          ? api.selectContract(selection, 'intent')
          : method === 'changeContract'
            ? api.changeContract(
                'contract',
                {
                  changeType: 'UpgradePlan',
                  targetPlanCode: 'PROFESSIONAL',
                  reason: 'More practices',
                  rowVersion: 'version',
                },
                'intent',
              )
            : method === 'cancelContract'
              ? api.cancelContract('contract', 'version', 'At end', 'intent')
              : api.saveRenewal(
                  'contract',
                  {
                    rowVersion: 'version',
                    targetPlanCode: 'STARTER',
                    targetBillingCycle: 'Monthly',
                    retainedAllocations: [
                      {
                        practiceId: 'clinic',
                        allocationId: 'allocation',
                        receptionIds: ['profile'],
                      },
                    ],
                  },
                  'intent',
                );
    request.subscribe();
    const r = http.expectOne(() => true);
    expect(r.request.method).toBe('POST');
    expect(r.request.headers.get('Idempotency-Key')).toBe('intent');
    expect(r.request.url).toContain('/doctors/me/subscriptions/');
    if (method === 'saveRenewal')
      expect(r.request.body.retainedAllocations[0].allocationId).toBe('allocation');
    if (method === 'cancelContract')
      expect(r.request.url).toContain('/contract/cancel-at-period-end');
    r.flush(wireDetailsFixture());
  });
  it('reads and maps a practice allocation without using the Doctor-wide subscription', () => {
    let value: unknown;
    api.allocation('clinic').subscribe((v) => (value = v));
    http.expectOne(base + '/doctors/me/practices/clinic/subscription-allocation').flush({
      practiceId: 'clinic',
      allocation: {
        id: 'allocation',
        rowVersion: 'allocation-version',
        subscriptionContractId: 'contract',
      },
      effectivePeriod: {
        ...wireDetailsFixture().subscription,
        subscriptionContractId: 'contract',
      },
      contractUsage: { practiceCount: 1, receptionCount: 0 },
      activeReceptionIds: ['profile'],
    });
    expect(value).toMatchObject({
      practiceId: 'clinic',
      allocation: { rowVersion: 'allocation-version' },
      effectivePeriod: { planCode: 'STARTER', subscriptionContractId: 'contract' },
    });
  });
  it('moves only the chosen practice with explicit reception profile IDs and allocation revision', () => {
    api
      .moveAllocation(
        'clinic',
        {
          targetSubscriptionContractId: 'target',
          continuedReceptionIds: ['profile'],
          rowVersion: 'allocation-version',
        },
        'intent',
      )
      .subscribe();
    const r = http.expectOne(base + '/doctors/me/practices/clinic/subscription-allocation/move');
    expect(r.request.headers.get('Idempotency-Key')).toBe('intent');
    expect(r.request.body).toEqual({
      targetSubscriptionContractId: 'target',
      continuedReceptionIds: ['profile'],
      rowVersion: 'allocation-version',
    });
    r.flush({
      practiceId: 'clinic',
      allocation: null,
      effectivePeriod: null,
      contractUsage: null,
      activeReceptionIds: [],
    });
  });
  it('releases coverage without a practice delete request', () => {
    api
      .releaseAllocation(
        'clinic',
        { rowVersion: 'allocation-version', reason: 'Stop new operations' },
        'intent',
      )
      .subscribe();
    const r = http.expectOne(base + '/doctors/me/practices/clinic/subscription-allocation/release');
    expect(r.request.method).toBe('POST');
    expect(r.request.body.rowVersion).toBe('allocation-version');
    r.flush({
      practiceId: 'clinic',
      allocation: null,
      effectivePeriod: null,
      contractUsage: null,
      activeReceptionIds: [],
    });
  });
  it('reads the server renewal quote with exact selected codes', () => {
    api
      .renewalPreview('contract', {
        productCode: 'ONLINE_BOOKING_ONLY',
        planCode: 'BOOKING_ONLY',
        billingCycle: 'Monthly',
        selectedPracticeCount: 5,
      })
      .subscribe();
    const r = http.expectOne((r) => r.url.endsWith('/contract/renewal-preview'));
    expect(r.request.params.get('selectedPracticeCount')).toBe('5');
    expect(r.request.method).toBe('GET');
    r.flush({
      terms: { priceAmount: 250 },
      allocations: [],
      activeReceptionIds: [],
      periodRowVersion: 'fresh',
    });
  });
});
