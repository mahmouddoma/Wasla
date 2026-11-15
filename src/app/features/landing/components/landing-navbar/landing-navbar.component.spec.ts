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

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('creates navbar with brand, navigation links, language switcher, and CTAs', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-language-switcher')).not.toBeNull();
    expect(el.querySelector('#nav-login-btn')?.getAttribute('href')).toBe('/login');
    expect(el.querySelector('#nav-start-cta')?.getAttribute('href')).toBe('/register/doctor');
  });

  it('toggles mobile navigation drawer cleanly', async () => {
    const el: HTMLElement = fixture.nativeElement;
    const toggle = el.querySelector<HTMLButtonElement>('.mobile-menu-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('#landing-mobile-drawer')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#landing-mobile-drawer')).not.toBeNull();
  });

  it('emits sectionNavigate and closes drawer when section link is clicked', async () => {
    const spy = vi.fn();
    fixture.componentInstance.sectionNavigate.subscribe(spy);

    const el: HTMLElement = fixture.nativeElement;
    const featuresLink = el.querySelector<HTMLAnchorElement>('a[href="#features"]')!;
    featuresLink.click();

    expect(spy).toHaveBeenCalledWith('features');
  });
});

describe('LandingNavbarComponent real router navigation', () => {
  afterEach(() => {
    localStorage.removeItem('wasla_lang');
    sessionStorage.clear();
  });

  it('navigates directly to /login and /register/doctor when header CTAs are clicked', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    sessionStorage.clear();
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

    const startBtn = el.querySelector<HTMLAnchorElement>('#header-start-cta');
    expect(startBtn).not.toBeNull();
    startBtn!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/register/doctor');
    expect(el.querySelector('app-doctor-registration')).not.toBeNull();
  });
});
