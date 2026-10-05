import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-platform-footer',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './platform-footer.html',
  styleUrl: './platform-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformFooter {
  readonly langService = inject(LanguageService);
  protected readonly version = 'v2.4.0';
}
