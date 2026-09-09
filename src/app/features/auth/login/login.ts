import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly model = signal({ identifier: '', password: '' });
  protected readonly loginForm = form(this.model, (field) => {
    required(field.identifier, { message: 'أدخل اسم المستخدم أو البريد الإلكتروني.' });
    maxLength(field.identifier, 200, { message: 'الحد الأقصى 200 حرف.' });
    required(field.password, { message: 'أدخل كلمة المرور.' });
    maxLength(field.password, 4096, { message: 'كلمة المرور أطول من الحد المسموح.' });
  });
  protected readonly isSubmitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly successStatus = this.route.snapshot.queryParamMap.get('status');

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.loginForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.apiMessages.set([]);
      this.fieldErrors.set({});
      try {
        const login = await firstValueFrom(this.api.login(this.model()));
        if (!this.session.begin(login)) {
          this.apiMessages.set(['تعذر إنشاء جلسة صالحة من استجابة الخادم.']);
          return;
        }
        const user = await firstValueFrom(this.api.currentUser());
        this.session.complete(user);
        const destination = this.session.requiresPasswordChange()
          ? '/change-password'
          : this.session.destinationFor(user);
        await this.router.navigate([destination]);
      } catch (error) {
        this.session.clear();
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
  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }
}
