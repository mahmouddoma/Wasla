import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  beforeEach(() => localStorage.removeItem('wasla_lang'));
  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('switches both ways and updates its label and document direction', async () => {
    const fixture = TestBed.createComponent(LanguageSwitcher);
    const language = TestBed.inject(LanguageService);
    language.setLanguage('ar');
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(fixture.componentInstance).toBeTruthy();
    expect(button.textContent).toContain('English');
    expect(button.getAttribute('aria-label')).toBe('التحويل إلى الإنجليزية');
    button.click();
    await fixture.whenStable();
    expect(language.currentLang()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(button.textContent).toContain('Arabic');
    expect(button.getAttribute('aria-label')).toBe('Switch to Arabic');
    button.click();
    await fixture.whenStable();
    expect(language.currentLang()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('renders the configured header variant', async () => {
    const fixture = TestBed.createComponent(LanguageSwitcher);
    fixture.componentRef.setInput('variant', 'header');
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.classList.contains('header-btn')).toBe(true);
    expect(button.classList.contains('pill')).toBe(false);
  });
});
