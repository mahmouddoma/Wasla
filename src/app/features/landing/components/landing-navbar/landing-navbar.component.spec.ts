import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../../../app.routes';
import { App } from '../../../../app';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LandingNavbarComponent } from './landing-navbar.component';

describe('LandingNavbarComponent', () => {
  let fixture: ComponentFixture<LandingNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingNavbarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(LandingNavbarComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wasla_lang');
    }
  });

  it('creates navbar with brand, navigation links, language switcher, and CTAs', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-language-switcher')).not.toBeNull();
    expect(el.querySelector('#nav-login-btn')?.getAttribute('href')).toBe('/login');
    expect(el.querySelector('#nav-start-cta')?.getAttribute('href')).toBe('/register/doctor');
  });

  it('renders mobile top brand bar with logo and language switcher without sticky header', () => {
    const el: HTMLElement = fixture.nativeElement;
    const topBar = el.querySelector('.mobile-top-bar');
    expect(topBar).not.toBeNull();
    expect(topBar?.querySelector('.navbar-brand')).not.toBeNull();
    expect(topBar?.querySelector('app-language-switcher')).not.toBeNull();
  });

  it('emits sectionNavigate when section link is clicked', async () => {
    const spy = vi.fn();
    fixture.componentInstance.sectionNavigate.subscribe(spy);

    const el: HTMLElement = fixture.nativeElement;
    const featuresLink = el.querySelector<HTMLAnchorElement>('a[href="#features"]')!;
    featuresLink.click();

    expect(spy).toHaveBeenCalledWith('features');
  });

  it('renders clean route links in mobile bottom dock without burger menu or redundant login icon', () => {
    const el: HTMLElement = fixture.nativeElement;
    const mobileDock = el.querySelector('.mobile-bottom-header');
    expect(mobileDock).not.toBeNull();

    expect(mobileDock?.querySelector('a[href="#features"]')).not.toBeNull();
    expect(mobileDock?.querySelector('a[href="#pricing-section"]')).not.toBeNull();
    expect(mobileDock?.querySelector('a[href="#faq-section"]')).not.toBeNull();
    expect(mobileDock?.querySelector('#nav-start-cta-mobile')).not.toBeNull();

    // Redundant login icon and burger menu removed as requested
    expect(mobileDock?.querySelector('#nav-login-btn-mobile')).toBeNull();
    expect(mobileDock?.querySelector('.mobile-menu-toggle')).toBeNull();
  });

  it('activates is-scrolled state when user scrolls page', () => {
    const component = fixture.componentInstance as any;
    expect(component.isScrolled()).toBe(false);

    // Mock scroll
    Object.defineProperty(window, 'scrollY', { value: 150, writable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isScrolled()).toBe(true);
    const dock = fixture.nativeElement.querySelector('.mobile-bottom-header');
    expect(dock?.classList.contains('is-scrolled')).toBe(true);
  });
});

describe('LandingNavbarComponent real router navigation', () => {
  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wasla_lang');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('navigates directly to /login and /register/doctor when header CTAs are clicked', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const loginBtn = el.querySelector<HTMLAnchorElement>('#nav-login-btn');
    expect(loginBtn).not.toBeNull();
    loginBtn!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/login');
    expect(el.querySelector('app-login')).not.toBeNull();

    const startBtn =
      el.querySelector<HTMLAnchorElement>('#nav-start-cta') ??
      el.querySelector<HTMLAnchorElement>('#header-start-cta');
    expect(startBtn).not.toBeNull();
    startBtn!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/register/doctor');
    expect(el.querySelector('app-doctor-registration')).not.toBeNull();
  });
});
