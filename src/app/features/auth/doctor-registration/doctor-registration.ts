import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormField,
  email,
  form,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { Gender } from '../../../core/auth/auth.models';
import { NoFutureDate } from '../../../shared/no-future-date/no-future-date';
import { FileUpload } from '../file-upload/file-upload';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-doctor-registration',
  imports: [FormField, RouterLink, FileUpload, NoFutureDate, TranslatePipe],
  templateUrl: './doctor-registration.html',
  styleUrl: './doctor-registration.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorRegistration {
  private readonly toast = inject(ToastService);
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  protected readonly model = signal({
    userName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    nameAr: '',
    nameEn: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
  });
  protected readonly registrationForm = form(this.model, (field) => {
    required(field.userName, { message: 'validation.usernameRequired' });
    maxLength(field.userName, 100, { message: 'validation.max100' });
    required(field.email, { message: 'validation.emailRequired' });
    email(field.email, { message: 'validation.emailValid' });
    maxLength(field.email, 200, { message: 'validation.emailLength' });
    required(field.phoneNumber, { message: 'validation.phoneRequired' });
    maxLength(field.phoneNumber, 30, { message: 'validation.phoneLength' });
    required(field.password, { message: 'validation.passwordRequired' });
    maxLength(field.password, 4096, { message: 'validation.passwordLength' });
    required(field.confirmPassword, { message: 'validation.confirmPasswordRequired' });
    maxLength(field.confirmPassword, 4096, { message: 'changePassword.confirmTooLong' });
    validate(field.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(field.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'changePassword.mismatch' },
    );
    required(field.nameAr, { message: 'validation.nameArEnter' });
    maxLength(field.nameAr, 200, { message: 'validation.nameLength' });
    maxLength(field.nameEn, 200, { message: 'validation.nameLength' });
    required(field.dateOfBirth, { message: 'validation.birthDateRequired' });
    validate(field.dateOfBirth, ({ value }) =>
      isFutureDate(value())
        ? { kind: 'futureDate', message: 'validation.birthFuture' }
        : undefined,
    );
    required(field.gender, { message: 'validation.genderRequired' });
  });
  protected readonly profileImage = signal<File | undefined>(undefined);
  protected readonly personalIdFrontImage = signal<File | undefined>(undefined);
  protected readonly personalIdBackImage = signal<File | undefined>(undefined);
  protected readonly syndicateCardFrontImage = signal<File | undefined>(undefined);
  protected readonly syndicateCardBackImage = signal<File | undefined>(undefined);
  protected readonly isSubmitting = signal(false);
  protected readonly showPasswords = signal(false);
  protected readonly filesError = signal('');
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.filesError.set('');
    await submit(this.registrationForm, async () => {
      if (
        !this.personalIdFrontImage() ||
        !this.personalIdBackImage() ||
        !this.syndicateCardFrontImage()
      ) {
        this.filesError.set(this.uiLanguage.t('ui.full.241'));
        return;
      }
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.apiMessages.set([]);
      this.fieldErrors.set({});
      try {
        await firstValueFrom(
          this.api.registerDoctor({
            ...this.model(),
            gender: this.model().gender as Gender,
            profileImage: this.profileImage(),
            personalIdFrontImage: this.personalIdFrontImage()!,
            personalIdBackImage: this.personalIdBackImage()!,
            syndicateCardFrontImage: this.syndicateCardFrontImage()!,
            syndicateCardBackImage: this.syndicateCardBackImage(),
          }),
        );
        this.toast.success(this.uiLanguage.t('auth.doctorRegistered'));
        await this.router.navigate(['/login'], { queryParams: { status: 'doctor-registered' } });
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

function isFutureDate(value: string): boolean {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}
