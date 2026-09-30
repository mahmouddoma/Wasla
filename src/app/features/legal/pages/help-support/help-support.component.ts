import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';

export interface FaqItem {
  qKey: string;
  aKey: string;
}

@Component({
  selector: 'app-help-support',
  standalone: true,
  imports: [RouterLink, FormsModule, TranslatePipe, LanguageSwitcher],
  templateUrl: './help-support.component.html',
  styleUrl: './help-support.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpSupportComponent {
  readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);

  protected readonly openFaq = signal<number | null>(0);
  protected readonly searchQuery = signal('');

  // Form Model
  protected readonly senderName = signal('');
  protected readonly senderEmail = signal('');
  protected readonly senderRole = signal('Doctor');
  protected readonly senderMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly faqs: FaqItem[] = [
    { qKey: 'help.faq1Q', aKey: 'help.faq1A' },
    { qKey: 'help.faq2Q', aKey: 'help.faq2A' },
    { qKey: 'help.faq3Q', aKey: 'help.faq3A' },
    { qKey: 'help.faq4Q', aKey: 'help.faq4A' },
    { qKey: 'help.faq5Q', aKey: 'help.faq5A' },
  ];

  protected toggleFaq(index: number): void {
    this.openFaq.update((current) => (current === index ? null : index));
  }

  protected submitInquiry(): void {
    const name = this.senderName().trim();
    const email = this.senderEmail().trim();
    const message = this.senderMessage().trim();

    if (!name || !email || !message) {
      this.toast.error(this.language.t('help.sendRequired'));
      return;
    }

    this.isSubmitting.set(true);

    // Simulated API dispatch
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.toast.success(this.language.t('help.sendSuccess'));
      this.senderName.set('');
      this.senderEmail.set('');
      this.senderMessage.set('');
    }, 400);
  }
}
