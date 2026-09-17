import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { TRANSLATIONS } from './translations';
import { TranslatePipe } from './translate.pipe';

describe('bilingual translations', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('provides nonempty Arabic and English values for every registered UI key', () => {
    const language = TestBed.inject(LanguageService);
    for (const [key, entry] of Object.entries(TRANSLATIONS)) {
      language.setLanguage('ar');
      expect(language.t(key), key).toBe(entry.ar);
      expect(entry.ar.trim(), key).not.toBe('');
      language.setLanguage('en');
      expect(language.t(key), key).toBe(entry.en);
      expect(entry.en.trim(), key).not.toBe('');
      expect(entry.en, key).not.toMatch(/[\u0600-\u06ff]/);
    }
  });

  it('updates an existing pipe immediately when the language changes', () => {
    const language = TestBed.inject(LanguageService);
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    language.setLanguage('ar');
    expect(pipe.transform('errors.network')).toBe(TRANSLATIONS['errors.network'].ar);
    language.setLanguage('en');
    expect(pipe.transform('errors.network')).toBe(TRANSLATIONS['errors.network'].en);
    expect(language.dir()).toBe('ltr');
    language.setLanguage('ar');
    expect(language.dir()).toBe('rtl');
  });

  it('interpolates data without treating names as translation keys', () => {
    const language = TestBed.inject(LanguageService);
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    language.setLanguage('en');
    expect(pipe.transform('validation.maximumCharacters', { maximum: 100 })).toBe(
      'Maximum 100 characters.',
    );
    expect(language.t('validation.unsupportedEvidence', { name: 'scan$&.jfif' })).toContain(
      'scan$&.jfif',
    );
    expect(language.t('Server validation details')).toBe('Server validation details');
  });
});
