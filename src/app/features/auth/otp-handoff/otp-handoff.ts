import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ParsedApiErrors, parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { PasswordRecoverySession } from '../../../core/auth/password-recovery-session';

const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'app-otp-handoff',
  imports: [FormField, RouterLink, TranslatePipe],
  templateUrl: './otp-handoff.html',
  styleUrl: './otp-handoff.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpHandoff implements OnDestroy {
  private readonly toast = inject(ToastService);
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(AuthApi);
  private readonly recovery = inject(PasswordRecoverySession);
  private readonly router = inject(Router);

  protected readonly challenge = this.recovery.challenge;
  protected readonly model = signal({ otp: '' });
  protected readonly otpForm = form(this.model, (field) => {
    required(field.otp, { message: 'ui.full.258' });
    maxLength(field.otp, 6, { message: 'ui.full.259' });
    pattern(field.otp, /^\d{6}$/, { message: 'ui.full.260' });
  });
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly isSubmitting = signal(false);
  protected readonly isResending = signal(false);
  protected readonly challengeUnavailable = signal(false);
  protected readonly resendCooldown = signal(0);
  private cooldownTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    if (!this.challenge()) {
      void this.router.navigate(['/forgot-password'], { replaceUrl: true });
    } else {
      this.startCooldown();
    }
  }

  ngOnDestroy(): void {
    this.stopCooldown();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.otpForm, async () => {
      const challenge = this.challenge();
      if (!challenge || this.isSubmitting() || this.challengeUnavailable()) return;
      this.isSubmitting.set(true);
      this.clearErrors();
      try {
        const response = await firstValueFrom(
          this.api.verifyPasswordResetOtp({
            requestId: challenge.requestId,
            otp: this.model().otp,
          }),
        );
        if (!this.recovery.acceptGrant(response)) {
          this.apiMessages.set([
            this.uiLanguage.t('ui.full.261'),
          ]);
          this.challengeUnavailable.set(true);
          return;
        }
        this.toast.success(this.uiLanguage.t('auth.otpVerified'));
        await this.router.navigate(['/forgot-password/reset'], { replaceUrl: true });
      } catch (error) {
        const parsed = parseApiErrors(error);
        this.setErrors(parsed);
        this.challengeUnavailable.set(this.isTerminalChallengeError(parsed));
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected async resend(): Promise<void> {
    const challenge = this.challenge();
    if (!challenge || this.isResending() || this.isSubmitting() || this.resendCooldown() > 0) {
      return;
    }
    this.isResending.set(true);
    this.clearErrors();
    try {
      const response = await firstValueFrom(
        this.api.requestPasswordReset({ email: challenge.email }),
      );
      this.recovery.begin(challenge.email, response);
      this.toast.success(this.uiLanguage.t('auth.otpResent'));
      this.model.set({ otp: '' });
      this.otpForm().reset();
      this.challengeUnavailable.set(false);
      this.startCooldown();
    } catch (error) {
      this.setErrors(parseApiErrors(error));
    } finally {
      this.isResending.set(false);
    }
  }

  protected serverError(): string {
    return this.fieldErrors()['otp']?.[0] ?? '';
  }

  protected normalizeOtp(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.model.set({ otp: input.value.replace(/\D/g, '').slice(0, 6) });
  }

  private clearErrors(): void {
    this.apiMessages.set([]);
    this.fieldErrors.set({});
  }

  private setErrors(parsed: ParsedApiErrors): void {
    const hiddenFieldMessages = Object.entries(parsed.fields)
      .filter(([field]) => field !== 'otp')
      .flatMap(([, messages]) => messages);
    this.apiMessages.set([...parsed.messages, ...hiddenFieldMessages]);
    this.fieldErrors.set(parsed.fields);
  }

  private isTerminalChallengeError(parsed: ParsedApiErrors): boolean {
    const codes = parsed.codes.join(' ').toLowerCase();
    return ['expired', 'tooManyAttempts', 'invalidated', 'challengeInvalid'].some((term) =>
      codes.includes(term.toLowerCase()),
    );
  }

  private startCooldown(): void {
    this.stopCooldown();
    this.resendCooldown.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown.update((seconds) => Math.max(0, seconds - 1));
      if (this.resendCooldown() === 0) this.stopCooldown();
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = undefined;
  }
}
