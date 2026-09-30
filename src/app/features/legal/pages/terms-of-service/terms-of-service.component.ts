import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './terms-of-service.component.html',
  styleUrl: './terms-of-service.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfServiceComponent {
  readonly language = inject(LanguageService);
}
