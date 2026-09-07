import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';

@Component({
  selector: 'app-change-password',
  imports: [FormField],
  templateUrl: './change-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePassword {
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly model = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  protected readonly passwordForm = form(this.model, (field) => {
    required(field.currentPassword, { message: 'أدخل كلمة المرور الحالية.' });
    maxLength(field.currentPassword, 4096, {
      message: 'كلمة المرور الحالية أطول من الحد المسموح.',
    });
    required(field.newPassword, { message: 'أدخل كلمة المرور الجديدة.' });
    maxLength(field.newPassword, 4096, { message: 'كلمة المرور الجديدة أطول من الحد المسموح.' });
    required(field.confirmPassword, { message: 'أكّد كلمة المرور الجديدة.' });
    maxLength(field.confirmPassword, 4096, { message: 'تأكيد كلمة المرور أطول من الحد المسموح.' });
    validate(field.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(field.newPassword)
        ? undefined
        : { kind: 'passwordMismatch', message: 'تأكيد كلمة المرور غير مطابق.' },
    );
  });
  protected readonly isSubmitting = signal(false);
  protected readonly showPasswords = signal(false);
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
        await this.router.navigate(['/login'], { queryParams: { status: 'password-changed' } });
      } catch (error) {
        const parsed = parseApiErrors(error);
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
}
