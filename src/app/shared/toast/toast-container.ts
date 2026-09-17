import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/notifications/toast.service';

@Component({
  imports: [TranslatePipe],
  selector: 'app-toast-container',
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly uiLanguage = inject(LanguageService);

  protected readonly toast = inject(ToastService);
}
