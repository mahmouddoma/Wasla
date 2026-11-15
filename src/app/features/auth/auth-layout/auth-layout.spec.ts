import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthLayout } from './auth-layout';

describe('AuthLayout', () => {
  let fixture: ComponentFixture<AuthLayout>;
  let component: AuthLayout;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AuthLayout],
      providers: [provideRouter([])],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(AuthLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem('wasla_lang');
  });

  it('creates component and renders brand and language switcher', () => {
    expect(component).toBeTruthy();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('app-header')).not.toBeNull();
    expect(element.querySelector('app-language-switcher')).not.toBeNull();
    expect(element.querySelector('#header-login-btn')?.getAttribute('href')).toBe('/login');
    expect(element.querySelector('#header-start-cta')?.getAttribute('href')).toBe('/register/doctor');
    expect(element.querySelector('.auth-panel')).not.toBeNull();
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('renders chic video showcase with autoplay loop video player and brand slogan', () => {
    const element: HTMLElement = fixture.nativeElement;
    const showcase = element.querySelector('.auth-showcase-panel');
    expect(showcase).not.toBeNull();

    const video = showcase?.querySelector('video.showcase-video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('/videos/wasla-auth-showcase.mp4');
    expect(video?.getAttribute('poster')).toBe('/videos/auth-video-poster.jpg');
    expect(video?.hasAttribute('autoplay')).toBe(true);
    expect(video?.hasAttribute('loop')).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);

    const slogan = showcase?.querySelector('.showcase-slogan');
    expect(slogan?.textContent?.trim()).toBeTruthy();

    const pills = showcase?.querySelectorAll('.showcase-pill');
    expect(pills?.length).toBeGreaterThanOrEqual(3);
  });

  it('switches language from a single visible utility control in both directions', async () => {
    const element: HTMLElement = fixture.nativeElement;
    const switchers = element.querySelectorAll('app-language-switcher');
    expect(switchers.length).toBe(1);
    const button = element.querySelector<HTMLButtonElement>('app-header app-language-switcher button')!;
    const shell = element.querySelector('.auth-shell')!;
    const language = TestBed.inject(LanguageService);

    expect(button.textContent).toContain('English');
    button.click();
    await fixture.whenStable();
    expect(language.currentLang()).toBe('en');
    expect(shell.getAttribute('dir')).toBe('ltr');
    expect(button.textContent).toContain('Arabic');

    button.click();
    await fixture.whenStable();
    expect(language.currentLang()).toBe('ar');
    expect(shell.getAttribute('dir')).toBe('rtl');
  });
});
