import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubscriptionsApi } from './subscriptions-api';
import { SubscriptionDetails } from './subscription.models';
import { wireDetailsFixture } from '../../../testing/subscriptions';
import { catalogFixture } from '../../../testing/subscriptions';

describe('SubscriptionsApi deployed contracts', () => {
  let api: SubscriptionsApi;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/api/v1`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SubscriptionsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads the public commercial catalog with server trial duration and payment flags', async () => {
    const result = firstValueFrom(api.catalog());
    const request = http.expectOne(`${base}/public/commercial/catalog`);
    expect(request.request.method).toBe('GET');
    request.flush(catalogFixture);
    const catalog = await result;
    expect(catalog.trialOffer.durationDays).toBe(20);
    expect(catalog.paymentMethods.card).toBe(false);
    expect(catalog.products[0].plans[0].pricing?.monthlyPrice).toBe(123);
  });
  it('maps nested terms and feature snapshots from own details without exposing admin history', async () => {
    const result = firstValueFrom(api.mine());
    const request = http.expectOne(`${base}/doctors/me/subscription`);
    expect(request.request.method).toBe('GET');
    request.flush(wireDetailsFixture());
    const details = await result;
    expect(details.subscription?.planCode).toBe('STARTER');
    expect(details.subscription?.kind).toBe('Paid');
    expect(details.entitlements[0].featureCode).toBe('PRACTICE_MANAGEMENT');
    expect(details.payments).toBeNull();
    expect(details.history).toBeNull();
  });
  it('sends only selection codes and uses the server change enum', async () => {
    const selected = {
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly' as const,
    };
    const result = firstValueFrom(api.select(selected));
    const request = http.expectOne(`${base}/doctors/me/subscription/selection`);
    expect(request.request.body).toEqual(selected);
    request.flush(wireDetailsFixture());
    await result;
    const changed = firstValueFrom(
      api.requestChange({
        changeType: 'UpgradePlan',
        targetPlanCode: 'PREMIUM',
        reason: 'Capacity',
      }),
    );
    const change = http.expectOne(`${base}/doctors/me/subscription/change-requests`);
    expect(change.request.body.changeType).toBe('Upgrade');
    expect(change.request.body.amountReceived).toBeUndefined();
    change.flush(wireDetailsFixture());
    await changed;
  });
  it('uses the current opaque row version for cancellation', async () => {
    const result = firstValueFrom(api.cancelAtPeriodEnd('opaque-version'));
    const request = http.expectOne(`${base}/doctors/me/subscription/cancel-at-period-end`);
    expect(request.request.body).toEqual({ rowVersion: 'opaque-version' });
    request.flush(wireDetailsFixture());
    await result;
  });
  it('paginates and filters admin results on the server', async () => {
    const result = firstValueFrom(
      api.list({ pageNumber: 2, pageSize: 20, status: 'Pending', search: 'doctor' }),
    );
    const request = http.expectOne((req) => req.url === `${base}/admin/subscriptions`);
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('search')).toBe('doctor');
    request.flush({
      items: [wireDetailsFixture().subscription],
      pageNumber: 2,
      pageSize: 20,
      totalCount: 21,
    });
    expect((await result).items[0].planCode).toBe('STARTER');
  });
  it('loads admin details and maps payment amounts and audit history', async () => {
    const result = firstValueFrom(api.details('sub/1'));
    http
      .expectOne(`${base}/admin/subscriptions/sub%2F1`)
      .flush({
        ...wireDetailsFixture(),
        payments: [{ id: 'payment-1', amount: 123, paidAtUtc: '2026-01-01T00:00:00Z' }],
        history: [{ id: 'event-1', eventType: 'Activated' }],
      });
    expect((await result).payments?.[0].amountReceived).toBe(123);
  });
  it('keeps payment intent keys on activation, renewal and upgrade approval', async () => {
    const payment = { rowVersion: 'AQID', paymentMethod: 'Cash' as const, amountReceived: 123 };
    const cases: [string, () => Observable<SubscriptionDetails>][] = [
      ['activate', () => api.activate('sub-1', payment, 'same-intent')],
      ['renew', () => api.renew('sub-1', payment, 'same-intent')],
      [
        'change-requests/change%2F1/approve',
        () =>
          api.approveChange(
            'sub-1',
            'change/1',
            { ...payment, changeRowVersion: 'BAUG' },
            'same-intent',
          ),
      ],
    ];
    for (const [path, call] of cases) {
      const result = firstValueFrom(call());
      const request = http.expectOne(`${base}/admin/subscriptions/sub-1/${path}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.headers.get('Idempotency-Key')).toBe('same-intent');
      expect(request.request.body.rowVersion).toBe('AQID');
      request.flush(wireDetailsFixture());
      await result;
    }
    expect(() => api.activate('sub-1', payment, '')).toThrow();
  });
  it('sends reasons and both row versions for rejection and the days for trial extension', async () => {
    const rejectBody = { rowVersion: 'AQID', changeRowVersion: 'BAUG', reason: 'Not approved' };
    const rejected = firstValueFrom(api.rejectChange('sub-1', 'change-1', rejectBody));
    const reject = http.expectOne(
      `${base}/admin/subscriptions/sub-1/change-requests/change-1/reject`,
    );
    expect(reject.request.body).toEqual(rejectBody);
    expect(reject.request.headers.has('Idempotency-Key')).toBe(false);
    reject.flush(wireDetailsFixture());
    await rejected;
    const extendBody = { rowVersion: 'AQID', additionalDays: 5, reason: 'Approved exception' };
    const extended = firstValueFrom(api.extendTrial('sub-1', extendBody));
    const extend = http.expectOne(`${base}/admin/subscriptions/sub-1/trial-extend`);
    expect(extend.request.body).toEqual(extendBody);
    extend.flush(wireDetailsFixture());
    await extended;
  });
  it('never enrolls a legacy batch before an explicit call and maps its completion date', async () => {
    http.expectNone(`${base}/admin/subscriptions/legacy-transition/enroll`);
    const result = firstValueFrom(api.enrollLegacyTransition());
    const request = http.expectOne(`${base}/admin/subscriptions/legacy-transition/enroll`);
    expect(request.request.body).toBeNull();
    request.flush({ id: 'batch-1', status: 'Completed', completedAtUtc: '2026-01-01T00:00:00Z' });
    expect((await result).completedOnUtc).toBe('2026-01-01T00:00:00Z');
  });
});
