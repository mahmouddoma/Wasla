import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { CommercialCatalog, SubscriptionsApi } from '../../../../domains/subscriptions';
import { WaslaLandingComponent } from './wasla-landing.component';

describe('WaslaLandingComponent', () => {
  let fixture: ComponentFixture<WaslaLandingComponent>;

  const sampleCatalog: CommercialCatalog = {
    catalogVersion: '1.0',
    currency: 'EGP',
    paymentMethods: {
      cash: true,
      card: false,
      eWallet: false,
    },
    trialOffer: {
      offerCode: 'FREE_TRIAL',
      enabled: true,
      durationDays: 20,
      startsOnDoctorApproval: true,
    },
    bookingOnly: {
      enabled: true,
      planCode: 'BOOKING_ONLY',
      monthlyUnitPrice: 200,
      minimumSelectedPractices: 1,
    },
    products: [],
  };

  const subscriptionsApi = {
    catalog: vi.fn(() => of(sampleCatalog)),
  };

  const authSession = {
    user: vi.fn(() => null),
    destinationFor: vi.fn(() => '/workspace/doctor'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    subscriptionsApi.catalog.mockReturnValue(of(sampleCatalog));
    authSession.user.mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [WaslaLandingComponent],
      providers: [
        provideRouter([]),
        { provide: SubscriptionsApi, useValue: subscriptionsApi },
        { provide: AuthSession, useValue: authSession },
      ],
    }).compileComponents();

    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(WaslaLandingComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('renders official Arabic headline, primary CTA, and switches cleanly to English LTR', async () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.wasla-landing-page')?.getAttribute('dir')).toBe('rtl');
    expect(el.querySelector('#landing-hero-title')?.textContent).toContain('عيادتك منظمة، ومريضك متابع.');
    expect(el.querySelector('#hero-primary-cta')?.getAttribute('href')).toBe('/register/doctor');
    expect(el.querySelector('#hero-login-link')?.getAttribute('href')).toBe('/login');

    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('.wasla-landing-page')?.getAttribute('dir')).toBe('ltr');
    expect(el.querySelector('#landing-hero-title')?.textContent).toContain('Your Clinic Organized');
  });

  it('switches interactive clinic journey stages and role tabs', async () => {
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('#journey-tab-during')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('#journey-tab-during')?.getAttribute('aria-selected')).toBe('true');
    expect(el.textContent).toContain('مساحة الكشف السريري');

    el.querySelector<HTMLButtonElement>('#role-tab-reception')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('#role-tab-reception')?.getAttribute('aria-selected')).toBe('true');
    expect(el.textContent).toContain('حماية كاملة: لا يرى الملاحظات الطبية');
  });

  it('toggles FAQ accordion items accessibly', async () => {
    const el: HTMLElement = fixture.nativeElement;
    const faq2Btn = el.querySelector<HTMLButtonElement>('#faq-btn-faq-2')!;
    expect(faq2Btn.getAttribute('aria-expanded')).toBe('false');

    faq2Btn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(faq2Btn.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#faq-panel-faq-2')).not.toBeNull();
  });

  it('renders clean pricing fallback CTA when catalog request fails without hardcoded prices', async () => {
    subscriptionsApi.catalog.mockReturnValueOnce(throwError(() => new Error('Network unavailable')));
    await fixture.componentInstance['loadPricingCatalog']();
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const fallbackBtn = el.querySelector<HTMLAnchorElement>('#landing-pricing-fallback-btn');
    expect(fallbackBtn).not.toBeNull();
    expect(fallbackBtn?.getAttribute('href')).toBe('/pricing');
  });
});
