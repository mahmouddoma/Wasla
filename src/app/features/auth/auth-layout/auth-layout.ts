import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  readonly langService = inject(LanguageService);
}
