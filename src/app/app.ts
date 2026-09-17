import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './shared/toast/toast-container';
import { AuthSession } from './core/auth/auth-session';
import { LanguageService } from './core/i18n/language.service';
import { TranslatePipe } from './core/i18n/translate.pipe';
import { ReceptionPracticeContext } from './domains/reception-practices';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly session = inject(AuthSession);
  protected readonly language = inject(LanguageService);
  protected readonly practiceContext = inject(ReceptionPracticeContext);

  constructor() {
    let owner: string | null = null;
    effect(() => {
      const user = this.session.user();
      const next = user?.userType === 'Reception' ? user.applicationUserId : null;
      if (next === owner) return;
      owner = next;
      untracked(() => {
        this.practiceContext.clear();
        if (next) void this.practiceContext.refresh();
      });
    });
  }

  protected selectPractice(event: Event): void {
    this.practiceContext.select((event.currentTarget as HTMLSelectElement).value);
  }
}
