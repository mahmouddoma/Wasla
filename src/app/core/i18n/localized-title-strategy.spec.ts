import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { LanguageService } from './language.service';
import { LocalizedTitleStrategy } from './localized-title-strategy';
import { AUTH_ROUTES } from '../../features/auth/auth.routes';
import { LanguageSwitcher } from '../../shared/components/language-switcher/language-switcher';

describe('LocalizedTitleStrategy', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('translates the default brand instead of displaying its dictionary key', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), LocalizedTitleStrategy] });
    TestBed.inject(LocalizedTitleStrategy);
    const language = TestBed.inject(LanguageService);
    language.setLanguage('ar');
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('وصلة');
    language.setLanguage('en');
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('Wasla');
  });

  it('translates the configured login title on navigation and language changes', async () => {
    const login = AUTH_ROUTES[0].children!.find((route) => route.path === 'login')!;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: LanguageSwitcher, title: login.title }]),
        { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
      ],
    });
    const language = TestBed.inject(LanguageService);
    language.setLanguage('ar');
    await TestBed.inject(Router).navigateByUrl('/login');
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('تسجيل الدخول | وصلة');
    language.setLanguage('en');
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('Sign in | Wasla');
  });
  it('translates the current route title again when the language changes', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), LocalizedTitleStrategy] });
    const strategy = TestBed.inject(LocalizedTitleStrategy);
    const language = TestBed.inject(LanguageService);
    vi.spyOn(strategy, 'buildTitle').mockReturnValue('routes.practices');
    language.setLanguage('ar');
    strategy.updateTitle(TestBed.inject(Router).routerState.snapshot);
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('عياداتي | وصلة');
    language.setLanguage('en');
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('My practices | Wasla');
  });
  it('keeps the last title for untitled routes', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), LocalizedTitleStrategy] });
    const strategy = TestBed.inject(LocalizedTitleStrategy);
    TestBed.inject(LanguageService).setLanguage('en');
    const build = vi.spyOn(strategy, 'buildTitle').mockReturnValue('routes.practices');
    strategy.updateTitle(TestBed.inject(Router).routerState.snapshot);
    TestBed.tick();
    build.mockReturnValue(undefined);
    strategy.updateTitle(TestBed.inject(Router).routerState.snapshot);
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('My practices | Wasla');
  });
});
