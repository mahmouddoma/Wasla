import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-change-password',
  imports: [FormField, RouterLink, TranslatePipe],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePassword {
  protected readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly model = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  protected readonly passwordForm = form(this.model, (field) => {
    required(field.currentPassword, { message: 'changePassword.currentRequired' });
    maxLength(field.currentPassword, 4096, {
      message: 'changePassword.currentTooLong',
    });
    required(field.newPassword, { message: 'changePassword.newRequired' });
    maxLength(field.newPassword, 4096, { message: 'changePassword.newTooLong' });
    required(field.confirmPassword, { message: 'changePassword.confirmRequired' });
    maxLength(field.confirmPassword, 4096, { message: 'changePassword.confirmTooLong' });
    validate(field.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(field.newPassword)
        ? undefined
        : { kind: 'passwordMismatch', message: 'changePassword.mismatch' },
    );
  });

  protected readonly isSubmitting = signal(false);
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.passwordForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.apiMessages.set([]);
      this.fieldErrors.set({});
      try {
        await firstValueFrom(this.api.changePassword(this.model()));
        this.session.clear();
        this.toast.success(this.language.t('changePassword.success'));
        await this.router.navigate(['/login'], { queryParams: { status: 'password-changed' } });
      } catch (error) {
        const parsed = parseApiErrors(error);
        this.apiMessages.set(parsed.messages);
        this.fieldErrors.set(parsed.fields);
        this.toast.error(this.language.t('changePassword.failure'));
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  protected toggleShowCurrent(): void {
    this.showCurrentPassword.update((v) => !v);
  }

  protected toggleShowNew(): void {
    this.showNewPassword.update((v) => !v);
  }

  protected toggleShowConfirm(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  protected async onCancelToLogin(): Promise<void> {
    this.session.clear();
    await this.router.navigate(['/login']);
  }
}
