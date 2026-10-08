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
  styleUrls: ['../registration.css', './doctor-registration.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorRegistration {
  private readonly toast = inject(ToastService);
  readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  readonly currentStep = signal<1 | 2 | 3>(1);
  readonly step1Attempted = signal(false);
  readonly step2Attempted = signal(false);

  readonly model = signal({
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

  readonly registrationForm = form(this.model, (field) => {
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
      isFutureDate(value()) ? { kind: 'futureDate', message: 'validation.birthFuture' } : undefined,
    );
    required(field.gender, { message: 'validation.genderRequired' });
  });

  readonly profileImage = signal<File | undefined>(undefined);
  readonly personalIdFrontImage = signal<File | undefined>(undefined);
  readonly personalIdBackImage = signal<File | undefined>(undefined);
  readonly syndicateCardFrontImage = signal<File | undefined>(undefined);
  readonly syndicateCardBackImage = signal<File | undefined>(undefined);
  readonly isSubmitting = signal(false);
  readonly showPasswords = signal(false);
  readonly filesError = signal('');
  readonly stepNotice = signal('');
  readonly apiMessages = signal<string[]>([]);
  readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});

  isStep1Valid(): boolean {
    const m = this.model();
    const f = this.registrationForm;
    return !!(
      m.userName.trim() &&
      !f.userName().errors().length &&
      m.email.trim() &&
      !f.email().errors().length &&
      m.phoneNumber.trim() &&
      !f.phoneNumber().errors().length &&
      m.password &&
      !f.password().errors().length &&
      m.confirmPassword &&
      !f.confirmPassword().errors().length &&
      m.password === m.confirmPassword
    );
  }

  isStep2Valid(): boolean {
    const m = this.model();
    const f = this.registrationForm;
    return !!(
      m.nameAr.trim() &&
      !f.nameAr().errors().length &&
      m.dateOfBirth &&
      !f.dateOfBirth().errors().length &&
      m.gender &&
      !f.gender().errors().length
    );
  }

  nextStep(): void {
    this.stepNotice.set('');
    if (this.currentStep() === 1) {
      if (!this.isStep1Valid()) {
        this.step1Attempted.set(true);
        this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
        return;
      }
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      if (!this.isStep2Valid()) {
        this.step2Attempted.set(true);
        this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
        return;
      }
      this.currentStep.set(3);
    }
  }

  prevStep(): void {
    this.stepNotice.set('');
    if (this.currentStep() === 3) {
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      this.currentStep.set(1);
    }
  }

  goToStep(target: 1 | 2 | 3): void {
    if (target === this.currentStep()) return;
    this.stepNotice.set('');
    if (target < this.currentStep()) {
      this.currentStep.set(target);
      return;
    }
    if (target === 2 && this.isStep1Valid()) {
      this.currentStep.set(2);
    } else if (target === 3 && this.isStep1Valid() && this.isStep2Valid()) {
      this.currentStep.set(3);
    } else {
      if (!this.isStep1Valid()) {
        this.step1Attempted.set(true);
      } else if (!this.isStep2Valid()) {
        this.step2Attempted.set(true);
      }
      this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.filesError.set('');
    this.stepNotice.set('');

    if (!this.isStep1Valid()) {
      this.step1Attempted.set(true);
      this.currentStep.set(1);
      this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
      return;
    }

    if (!this.isStep2Valid()) {
      this.step2Attempted.set(true);
      this.currentStep.set(2);
      this.stepNotice.set(this.uiLanguage.t('register.stepValidationNotice'));
      return;
    }

    await submit(this.registrationForm, async () => {
      if (
        !this.personalIdFrontImage() ||
        !this.personalIdBackImage() ||
        !this.syndicateCardFrontImage()
      ) {
        this.filesError.set(this.uiLanguage.t('ui.full.241'));
        this.currentStep.set(3);
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

        if (
          this.serverError('UserName') ||
          this.serverError('Email') ||
          this.serverError('PhoneNumber') ||
          this.serverError('Password') ||
          this.serverError('ConfirmPassword')
        ) {
          this.currentStep.set(1);
        } else if (
          this.serverError('NameAr') ||
          this.serverError('NameEn') ||
          this.serverError('DateOfBirth') ||
          this.serverError('Gender')
        ) {
          this.currentStep.set(2);
        } else {
          this.currentStep.set(3);
        }
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  togglePasswords(): void {
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
