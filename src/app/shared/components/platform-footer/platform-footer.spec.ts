import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlatformFooter } from './platform-footer';

describe('PlatformFooter', () => {
  let component: PlatformFooter;
  let fixture: ComponentFixture<PlatformFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformFooter],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformFooter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the platform footer component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand logo, title, and tagline', () => {
    const el: HTMLElement = fixture.nativeElement;
    const logoBadge = el.querySelector('.footer-logo-badge');
    expect(logoBadge).toBeTruthy();

    const brandName = el.querySelector('.brand-name');
    expect(brandName).toBeTruthy();

    const tagline = el.querySelector('.brand-tagline');
    expect(tagline).toBeTruthy();
  });

  it('should render copyright notice as clean text', () => {
    const el: HTMLElement = fixture.nativeElement;
    const copyright = el.querySelector('.copyright-text');
    expect(copyright).toBeTruthy();
  });

  it('should render quick navigation links pointing to privacy, terms, and help', () => {
    const el: HTMLElement = fixture.nativeElement;
    const navLinks = el.querySelectorAll<HTMLAnchorElement>('.footer-nav-btn');
    expect(navLinks.length).toBe(3);

    const hrefs = Array.from(navLinks).map(
      (a) => a.getAttribute('href') || a.getAttribute('ng-reflect-router-link'),
    );
    expect(hrefs.some((h) => h?.includes('privacy'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('terms'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('help'))).toBe(true);
  });

  it('keeps language switching in the page header', () => {
    const el: HTMLElement = fixture.nativeElement;
    const langSwitcher = el.querySelector('app-language-switcher');
    expect(langSwitcher).toBeNull();
  });
});
