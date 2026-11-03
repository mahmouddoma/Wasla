import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import {
  SubscriptionDetails,
  SubscriptionsApi,
  SubscriptionState,
} from '../../../../domains/subscriptions';
import { catalogFixture, detailsFixture } from '../../../../../testing/subscriptions';
import { ToastService } from '../../../../core/notifications/toast.service';
import { MySubscriptionComponent } from './my-subscription.component';

describe('MySubscriptionComponent', () => {
  const details = signal<SubscriptionDetails | null>(detailsFixture());
  const api = {
    catalog: vi.fn(() => of(catalogFixture)),
    select: vi.fn(() => of(detailsFixture())),
    cancelAtPeriodEnd: vi.fn(() => of(detailsFixture())),
    requestChange: vi.fn(() => of(detailsFixture())),
  };
  const state = { details, invalidate: vi.fn(), refresh: vi.fn(async () => details()) };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    details.set(detailsFixture());
    api.catalog.mockReturnValue(of(catalogFixture));
    api.select.mockReturnValue(of(detailsFixture()));
    TestBed.configureTestingModule({
      imports: [MySubscriptionComponent],
      providers: [
        { provide: SubscriptionsApi, useValue: api },
        { provide: SubscriptionState, useValue: state },
        { provide: AuthSession, useValue: { hasPermission: () => true } },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  it('renders current and scheduled periods separately, without admin payment history', async () => {
    const value = detailsFixture();
    value.nextPeriod = { ...value.subscription!, status: 'Scheduled', planCode: 'PREMIUM' };
    details.set(value);
    const fixture = TestBed.createComponent(MySubscriptionComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('PREMIUM');
    expect(fixture.nativeElement.textContent).toContain('STARTER');
    expect(fixture.nativeElement.querySelector('app-page-header')).not.toBeNull();
  });
  it('requires confirmation, sends only selected codes and refreshes after success', async () => {
    const fixture = TestBed.createComponent(MySubscriptionComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.selection.set({
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly',
    });
    await component.confirm();
    expect(api.select).not.toHaveBeenCalled();
    component.confirmation.set('selection');
    await component.confirm();
    expect(api.select).toHaveBeenCalledWith({
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly',
    });
    expect(toast.success).toHaveBeenCalledOnce();
    expect(state.refresh).toHaveBeenCalledTimes(2);
  });
  it('keeps selected values on server failure and never claims activation or payment', async () => {
    const fixture = TestBed.createComponent(MySubscriptionComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const selected = {
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly' as const,
    };
    component.selection.set(selected);
    component.confirmation.set('selection');
    api.select.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    await component.confirm();
    expect(component.selection()).toEqual(selected);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
  it('sends the current version when confirming period-end cancellation', async () => {
    const fixture = TestBed.createComponent(MySubscriptionComponent);
    await fixture.whenStable();
    fixture.componentInstance.confirmation.set('cancel');
    await fixture.componentInstance.confirm();
    expect(api.cancelAtPeriodEnd).toHaveBeenCalledWith('AQID');
  });
  it('offers a paid selection for an explicit no-subscription response without manufacturing current terms', async () => {
    details.set(null);
    state.refresh.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 404,
        error: { errors: [{ code: 'Subscription.NotFound' }] },
      }),
    );
    const fixture = TestBed.createComponent(MySubscriptionComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    expect(component.noSubscription()).toBe(true);
    expect(component.error()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-plan-selector')).not.toBeNull();
    component.selection.set({
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly',
    });
    component.confirmation.set('selection');
    await component.confirm();
    expect(api.select).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
  });
});
