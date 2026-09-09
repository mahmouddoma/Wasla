import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { SupportedLang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'wasla_lang';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly document = inject(DOCUMENT);

  readonly currentLang = signal<SupportedLang>(this.resolveInitialLanguage());
  readonly dir = computed<'rtl' | 'ltr'>(() => (this.currentLang() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed<boolean>(() => this.currentLang() === 'ar');
  readonly isLtr = computed<boolean>(() => this.currentLang() === 'en');

  constructor() {
    // Synchronize HTML attributes (lang, dir) and localStorage whenever currentLang changes
    effect(() => {
      const lang = this.currentLang();
      const dir = this.dir();

      if (this.document?.documentElement) {
        this.document.documentElement.lang = lang;
        this.document.documentElement.dir = dir;
        this.document.documentElement.setAttribute('data-lang', lang);
      }

      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Safe fallback if storage is restricted
      }
    });
  }

  setLanguage(lang: SupportedLang): void {
    if (lang === 'ar' || lang === 'en') {
      this.currentLang.set(lang);
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLang() === 'ar' ? 'en' : 'ar');
  }

  t(key: string): string {
    const lang = this.currentLang();
    const entry = TRANSLATIONS[key];
    if (!entry) {
      return key;
    }
    return entry[lang] || entry['ar'] || key;
  }

  private resolveInitialLanguage(): SupportedLang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') {
        return stored;
      }
    } catch {
      // ignore storage access errors
    }

    // Default to Arabic for Wasla platform
    return 'ar';
  }
}
