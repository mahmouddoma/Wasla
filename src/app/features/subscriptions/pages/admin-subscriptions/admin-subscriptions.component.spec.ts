import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { SubscriptionsApi, SubscriptionPaymentRequest } from '../../../../domains/subscriptions';
import { catalogFixture, detailsFixture } from '../../../../../testing/subscriptions';
import { ToastService } from '../../../../core/notifications/toast.service';
import { AdminSubscriptionsComponent } from './admin-subscriptions.component';

describe('AdminSubscriptionsComponent', () => {
  const api = {
    catalog: vi.fn(() => of(catalogFixture)),
    list: vi.fn(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 })),
    details: vi.fn(() => of(detailsFixture())),
    activate: vi.fn((_id: string, _request: SubscriptionPaymentRequest, _key: string) =>
      of(detailsFixture()),
    ),
    renew: vi.fn(() => of(detailsFixture())),
    enrollLegacyTransition: vi.fn(() => of({ id: 'batch-1' })),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    api.activate.mockReturnValue(of(detailsFixture()));
    TestBed.configureTestingModule({
      imports: [AdminSubscriptionsComponent],
      providers: [
        { provide: SubscriptionsApi, useValue: api },
        { provide: AuthSession, useValue: { hasPermission: () => true } },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  it('renders an illustrated empty state and never automatically enrolls legacy doctors', async () => {
    const fixture = TestBed.createComponent(AdminSubscriptionsComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img.state-empty-illustration')).not.toBeNull();
    expect(api.enrollLegacyTransition).not.toHaveBeenCalled();
  });
  it('opens details in a drawer and resets pagination when filters change', async () => {
    const fixture = TestBed.createComponent(AdminSubscriptionsComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    await component.inspect('sub-1');
    fixture.detectChanges();
    expect(component.selectedId()).toBe('sub-1');
    expect(fixture.nativeElement.querySelector('app-side-drawer')).not.toBeNull();
    component.query.pageNumber = 3;
    await component.load(true);
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ pageNumber: 1 }));
  });
  it('reuses a payment intent after a network failure, refreshes after success and blocks partial payment', async () => {
    const fixture = TestBed.createComponent(AdminSubscriptionsComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const pending = detailsFixture();
    pending.subscription!.status = 'Pending';
    component.details.set(pending);
    component.selectedId.set('sub-1');
    component.begin('activate');
    component.amountReceived = 122;
    expect(component.valid()).toBe(false);
    component.amountReceived = 123;
    api.activate.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    await component.confirm();
    const firstKey = api.activate.mock.calls[0]?.[2];
    await component.confirm();
    expect(api.activate.mock.calls[1]?.[2]).toBe(firstKey);
    expect(firstKey).toBeTruthy();
    expect(toast.success).toHaveBeenCalledOnce();
    expect(api.details).toHaveBeenCalledWith('sub-1');
  });
  it('allows trial extension only for an active trial and requires a reason', async () => {
    const fixture = TestBed.createComponent(AdminSubscriptionsComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.details.set(detailsFixture());
    expect(component.can('extend')).toBe(false);
    const trial = detailsFixture();
    trial.subscription!.kind = 'Trial';
    component.details.set(trial);
    component.begin('extend');
    expect(component.valid()).toBe(false);
    component.reason = 'Approved exception';
    expect(component.valid()).toBe(true);
  });
  it('renders inline split-view detail pane on desktop and closes on close()', async () => {
    const fixture = TestBed.createComponent(AdminSubscriptionsComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.isDesktop.set(true);
    await component.inspect('sub-1');
    fixture.detectChanges();
    expect(component.selectedId()).toBe('sub-1');
    expect(fixture.nativeElement.querySelector('.subscriptions-detail-pane')).not.toBeNull();
    component.close();
    fixture.detectChanges();
    expect(component.selectedId()).toBeNull();
    expect(fixture.nativeElement.querySelector('.subscriptions-detail-pane')).toBeNull();
  });
});
