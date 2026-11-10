import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SessionRevalidation } from './core/auth/session-revalidation';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './shared/toast/toast-container';
import { AuthSession } from './core/auth/auth-session';
import { LanguageService } from './core/i18n/language.service';
import { ReceptionPracticeContext } from './domains/reception-practices';
import { PlatformFooter } from './shared/components/platform-footer/platform-footer';
import { TranslatePipe } from './core/i18n/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer, PlatformFooter, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly session = inject(AuthSession);
  protected readonly language = inject(LanguageService);
  protected readonly practiceContext = inject(ReceptionPracticeContext);
  protected readonly revalidation = inject(SessionRevalidation);
  private readonly destroyRef = inject(DestroyRef);

  protected retrySession(): void {
    this.revalidation.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  constructor() {
    afterNextRender(() => this.retrySession());
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
}
