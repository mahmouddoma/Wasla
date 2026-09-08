import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom, timer } from 'rxjs';
import { ParsedApiErrors, parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { PasswordRecoverySession } from '../../../core/auth/password-recovery-session';

@Component({
  selector: 'app-reset-password',
  imports: [FormField],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly api = inject(AuthApi);
  private readonly recovery = inject(PasswordRecoverySession);
  private readonly router = inject(Router);
  private readonly now = signal(Date.now());
  private hasRedirected = false;

  protected readonly grant = this.recovery.grant;
  protected readonly model = signal({ newPassword: '', confirmPassword: '' });
  protected readonly passwordForm = form(this.model, (field) => {
    required(field.newPassword, { message: 'أدخل كلمة المرور الجديدة.' });
    maxLength(field.newPassword, 4096, {
      message: 'كلمة المرور الجديدة أطول من الحد المسموح.',
    });
    required(field.confirmPassword, { message: 'أكّد كلمة المرور الجديدة.' });
    maxLength(field.confirmPassword, 4096, {
      message: 'تأكيد كلمة المرور أطول من الحد المسموح.',
    });
    validate(field.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(field.newPassword)
        ? undefined
        : { kind: 'passwordMismatch', message: 'تأكيد كلمة المرور غير مطابق.' },
    );
  });
  protected readonly expiresAt = computed(() => {
    const value = this.grant()?.expiresOnUtc;
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en' : 'ar-EG', {
          hour: 'numeric',
          minute: '2-digit',
        }).format(date);
  });
  protected readonly isSubmitting = signal(false);
  protected readonly showPasswords = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});

  constructor() {
    if (!this.recovery.validGrant()) {
      void this.redirectToStart();
      return;
    }
    timer(1000, 1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.now.set(Date.now());
        const grant = this.grant();
        if (grant && Date.parse(grant.expiresOnUtc) <= this.now()) void this.redirectToStart();
      });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.passwordForm, async () => {
      const grant = this.recovery.validGrant();
      if (!grant) {
        await this.redirectToStart();
        return;
      }
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.apiMessages.set([]);
      this.fieldErrors.set({});
      try {
        await firstValueFrom(
          this.api.resetPassword({
            requestId: grant.requestId,
            resetToken: grant.resetToken,
            ...this.model(),
          }),
        );
        this.recovery.clear();
        await this.router.navigate(['/login'], {
          queryParams: { status: 'password-reset' },
          replaceUrl: true,
        });
      } catch (error) {
        const parsed = parseApiErrors(error);
        if (this.isResetChallengeError(parsed)) {
          await this.redirectToStart();
          return;
        }
        this.apiMessages.set(parsed.messages);
        this.fieldErrors.set(parsed.fields);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  protected togglePasswords(): void {
    this.showPasswords.update((visible) => !visible);
  }

  private isResetChallengeError(parsed: ParsedApiErrors): boolean {
    if (parsed.status !== 422) return false;
    if (parsed.fields['resettoken']?.length || parsed.fields['requestid']?.length) return true;
    const codes = parsed.codes.join(' ').toLowerCase();
    return ['token', 'challenge', 'expired', 'consumed', 'invalidated'].some((term) =>
      codes.includes(term),
    );
  }

  private async redirectToStart(): Promise<void> {
    if (this.hasRedirected) return;
    this.hasRedirected = true;
    this.recovery.clear();
    await this.router.navigate(['/forgot-password'], {
      queryParams: { status: 'challenge-expired' },
      replaceUrl: true,
    });
  }
}
