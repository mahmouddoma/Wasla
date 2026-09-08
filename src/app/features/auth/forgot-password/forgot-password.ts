import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, email, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { PasswordRecoverySession } from '../../../core/auth/password-recovery-session';

@Component({
  selector: 'app-forgot-password',
  imports: [FormField, RouterLink],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly api = inject(AuthApi);
  private readonly recovery = inject(PasswordRecoverySession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly model = signal({ email: '' });
  protected readonly resetForm = form(this.model, (field) => {
    required(field.email, { message: 'أدخل البريد الإلكتروني.' });
    email(field.email, { message: 'أدخل بريدًا إلكترونيًا صالحًا.' });
    maxLength(field.email, 200, { message: 'الحد الأقصى 200 حرف.' });
  });
  protected readonly isSubmitting = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly recoveryStatus = this.route.snapshot.queryParamMap.get('status');

  constructor() {
    this.recovery.clear();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.resetForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.apiMessages.set([]);
      this.fieldErrors.set({});
      try {
        const response = await firstValueFrom(this.api.requestPasswordReset(this.model()));
        this.recovery.begin(this.model().email, response);
        await this.router.navigate(['/forgot-password/otp']);
      } catch (error) {
        const parsed = parseApiErrors(error);
        this.apiMessages.set(parsed.messages);
        this.fieldErrors.set(parsed.fields);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
  protected serverError(): string {
    return this.fieldErrors()['email']?.[0] ?? '';
  }
}
