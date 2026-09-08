import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ParsedApiErrors, parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { PasswordRecoverySession } from '../../../core/auth/password-recovery-session';

@Component({
  selector: 'app-otp-handoff',
  imports: [FormField, RouterLink],
  templateUrl: './otp-handoff.html',
  styleUrl: './otp-handoff.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpHandoff {
  private readonly api = inject(AuthApi);
  private readonly recovery = inject(PasswordRecoverySession);
  private readonly router = inject(Router);

  protected readonly challenge = this.recovery.challenge;
  protected readonly model = signal({ otp: '' });
  protected readonly otpForm = form(this.model, (field) => {
    required(field.otp, { message: 'أدخل رمز التحقق.' });
    maxLength(field.otp, 6, { message: 'رمز التحقق يتكوّن من 6 أرقام.' });
    pattern(field.otp, /^\d{6}$/, { message: 'أدخل رمز تحقق صحيحًا مكوّنًا من 6 أرقام.' });
  });
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly isSubmitting = signal(false);
  protected readonly isResending = signal(false);
  protected readonly challengeUnavailable = signal(false);

  constructor() {
    if (!this.challenge()) {
      void this.router.navigate(['/forgot-password'], { replaceUrl: true });
    }
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
            'تعذر إنشاء خطوة آمنة لإعادة تعيين كلمة المرور. اطلب رمزًا جديدًا.',
          ]);
          this.challengeUnavailable.set(true);
          return;
        }
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
    if (!challenge || this.isResending() || this.isSubmitting()) return;
    this.isResending.set(true);
    this.clearErrors();
    try {
      const response = await firstValueFrom(
        this.api.requestPasswordReset({ email: challenge.email }),
      );
      this.recovery.begin(challenge.email, response);
      this.model.set({ otp: '' });
      this.otpForm().reset();
      this.challengeUnavailable.set(false);
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
}
