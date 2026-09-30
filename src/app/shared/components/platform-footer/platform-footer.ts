import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

export type FooterModalType = 'privacy' | 'terms' | 'help';

@Component({
  selector: 'app-platform-footer',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './platform-footer.html',
  styleUrl: './platform-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformFooter {
  readonly langService = inject(LanguageService);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly version = 'v2.4.0';

  protected readonly activeModal = signal<FooterModalType | null>(null);

  protected openModal(type: FooterModalType, event?: Event): void {
    if (event) event.preventDefault();
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
  }
}
