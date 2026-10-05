import { ChangeDetectionStrategy, Component, input, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  readonly langService = inject(LanguageService);
  readonly variant = input<'pill' | 'header'>('pill');

  toggle(): void {
    this.langService.toggleLanguage();
  }
}
