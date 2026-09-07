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
import { FileUpload } from '../file-upload/file-upload';

@Component({
  selector: 'app-patient-registration',
  imports: [FormField, RouterLink, FileUpload],
  templateUrl: './patient-registration.html',
  styleUrl: './patient-registration.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientRegistration {
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
    required(field.userName, { message: 'أدخل اسم المستخدم.' });
    maxLength(field.userName, 100, { message: 'الحد الأقصى 100 حرف.' });
    required(field.email, { message: 'أدخل البريد الإلكتروني.' });
    email(field.email, { message: 'أدخل بريدًا إلكترونيًا صالحًا.' });
    maxLength(field.email, 200, { message: 'الحد الأقصى للبريد الإلكتروني 200 حرف.' });
    required(field.phoneNumber, { message: 'أدخل رقم الهاتف.' });
    maxLength(field.phoneNumber, 30, { message: 'الحد الأقصى لرقم الهاتف 30 حرفًا.' });
    required(field.password, { message: 'أدخل كلمة المرور.' });
    maxLength(field.password, 4096, { message: 'كلمة المرور أطول من الحد المسموح.' });
    required(field.confirmPassword, { message: 'أكّد كلمة المرور.' });
    maxLength(field.confirmPassword, 4096, { message: 'تأكيد كلمة المرور أطول من الحد المسموح.' });
    validate(field.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(field.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'تأكيد كلمة المرور غير مطابق.' },
    );
    required(field.nameAr, { message: 'أدخل الاسم بالعربية.' });
    maxLength(field.nameAr, 200, { message: 'الحد الأقصى للاسم 200 حرف.' });
    maxLength(field.nameEn, 200, { message: 'الحد الأقصى للاسم 200 حرف.' });
    required(field.dateOfBirth, { message: 'أدخل تاريخ الميلاد.' });
    validate(field.dateOfBirth, ({ value }) =>
      isFutureDate(value())
        ? { kind: 'futureDate', message: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل.' }
        : undefined,
    );
    required(field.gender, { message: 'اختر النوع.' });
  });
  protected readonly profileImage = signal<File | undefined>(undefined);
  protected readonly personalIdFrontImage = signal<File | undefined>(undefined);
  protected readonly personalIdBackImage = signal<File | undefined>(undefined);
  protected readonly isSubmitting = signal(false);
  protected readonly showPasswords = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.registrationForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.apiMessages.set([]);
      this.fieldErrors.set({});
      try {
        await firstValueFrom(
          this.api.registerPatient({
            ...this.model(),
            gender: this.model().gender as Gender,
            profileImage: this.profileImage(),
            personalIdFrontImage: this.personalIdFrontImage(),
            personalIdBackImage: this.personalIdBackImage(),
          }),
        );
        await this.router.navigate(['/login'], { queryParams: { status: 'patient-registered' } });
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
