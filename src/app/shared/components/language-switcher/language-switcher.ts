import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="lang-btn"
      [class.pill]="variant() === 'pill'"
      [class.header-btn]="variant() === 'header'"
      (click)="toggle()"
      [attr.aria-label]="
        langService.currentLang() === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'
      "
      [title]="langService.currentLang() === 'ar' ? 'English' : 'العربية'"
    >
      <svg
        class="lang-globe-icon"
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"
        />
      </svg>
      <span class="lang-label">{{
        langService.currentLang() === 'ar' ? 'English' : 'العربية'
      }}</span>
      <span class="lang-tag">{{ langService.currentLang() === 'ar' ? 'EN' : 'ع' }}</span>
    </button>
  `,
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  readonly langService = inject(LanguageService);
  readonly variant = input<'pill' | 'header'>('pill');

  toggle(): void {
    this.langService.toggleLanguage();
  }
}
