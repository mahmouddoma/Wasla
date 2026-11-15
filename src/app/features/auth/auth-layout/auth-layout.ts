import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AppHeader } from '../../../shared/components/app-header/app-header';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeader, TranslatePipe],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  readonly langService = inject(LanguageService);
}
