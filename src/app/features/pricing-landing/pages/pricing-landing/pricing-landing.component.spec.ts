import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SubscriptionsApi } from '../../../../domains/subscriptions';
import { catalogFixture } from '../../../../../testing/subscriptions';
import { PricingLandingComponent } from './pricing-landing.component';

describe('PricingLandingComponent', () => {
  const api = {
    catalog: vi.fn(() => of(catalogFixture)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.catalog.mockReturnValue(of(catalogFixture));
    TestBed.configureTestingModule({
      imports: [PricingLandingComponent],
      providers: [
        provideRouter([]),
        { provide: SubscriptionsApi, useValue: api },
      ],
    });
  });

  it('renders landing hero, platform pillars, and live catalog', async () => {
    const fixture = TestBed.createComponent(PricingLandingComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('الأساسية');
    expect(fixture.nativeElement.querySelector('.landing-hero-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pillars-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-plan-selector')).not.toBeNull();
  });

  it('navigates to doctor registration when a plan is selected', async () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PricingLandingComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onPlanSelected({
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly',
    });

    expect(navSpy).toHaveBeenCalledWith(['/register/doctor'], {
      queryParams: {
        plan: 'STARTER',
        cycle: 'Monthly',
      },
    });
  });

  it('toggles FAQ item on click', async () => {
    const fixture = TestBed.createComponent(PricingLandingComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.faqs()[0].isOpen).toBe(false);
    fixture.componentInstance.toggleFaq(0);
    expect(fixture.componentInstance.faqs()[0].isOpen).toBe(true);
    fixture.componentInstance.toggleFaq(0);
    expect(fixture.componentInstance.faqs()[0].isOpen).toBe(false);
  });

  it('renders error state on catalog failure and retries successfully', async () => {
    api.catalog.mockReturnValueOnce(throwError(() => new Error('Network error')));
    const fixture = TestBed.createComponent(PricingLandingComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(true);
    expect(fixture.nativeElement.querySelector('.pricing-error-state')).not.toBeNull();

    api.catalog.mockReturnValueOnce(of(catalogFixture));
    await fixture.componentInstance.loadCatalog();
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-plan-selector')).not.toBeNull();
  });
});
