import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import {
  FormField,
  email,
  form,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import {
  CreateSuperAdminRequest,
  SuperAdminRecord,
  UpdateSuperAdminRequest,
} from '../../../core/superadmins/superadmins.models';

export type SuperAdminFormSubmission =
  | { mode: 'create'; request: CreateSuperAdminRequest }
  | { mode: 'update'; request: UpdateSuperAdminRequest };

interface SuperAdminFormModel {
  userName: string;
  email: string;
  phoneNumber: string;
  nameAr: string;
  nameEn: string;
  initialPassword: string;
  confirmPassword: string;
}

const EMPTY_MODEL: SuperAdminFormModel = {
  userName: '',
  email: '',
  phoneNumber: '',
  nameAr: '',
  nameEn: '',
  initialPassword: '',
  confirmPassword: '',
};

@Component({
  selector: 'app-superadmin-form',
  imports: [FormField],
  templateUrl: './superadmin-form.html',
  styleUrl: './superadmin-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminForm {
  mode = input<'create' | 'update'>('create');
  record = input<SuperAdminRecord | null>(null);
  busy = input(false);
  messages = input<readonly string[]>([]);
  fieldErrors = input<Readonly<Record<string, string[]>>>({});
  saved = output<SuperAdminFormSubmission>();
  cancelled = output<void>();

  private populatedRecordId = '';
  protected readonly model = signal<SuperAdminFormModel>({ ...EMPTY_MODEL });
  protected readonly showPasswords = signal(false);
  protected readonly adminForm = form(this.model, (field) => {
    validate(field.userName, ({ value }) => {
      if (this.mode() === 'update') return undefined;
      return value().trim() ? undefined : { kind: 'required', message: 'أدخل اسم المستخدم.' };
    });
    maxLength(field.userName, 100, { message: 'الحد الأقصى لاسم المستخدم 100 حرف.' });
    required(field.email, { message: 'أدخل البريد الإلكتروني.' });
    email(field.email, { message: 'أدخل بريدًا إلكترونيًا صالحًا.' });
    maxLength(field.email, 200, { message: 'الحد الأقصى للبريد الإلكتروني 200 حرف.' });
    maxLength(field.phoneNumber, 30, { message: 'الحد الأقصى لرقم الهاتف 30 حرفًا.' });
    required(field.nameAr, { message: 'أدخل الاسم بالعربية.' });
    maxLength(field.nameAr, 200, { message: 'الحد الأقصى للاسم بالعربية 200 حرف.' });
    maxLength(field.nameEn, 200, { message: 'الحد الأقصى للاسم بالإنجليزية 200 حرف.' });
    validate(field.initialPassword, ({ value }) => {
      if (this.mode() === 'update') return undefined;
      return value() ? undefined : { kind: 'required', message: 'أدخل كلمة المرور الأولية.' };
    });
    maxLength(field.initialPassword, 4096, {
      message: 'كلمة المرور الأولية أطول من الحد المسموح.',
    });
    validate(field.confirmPassword, ({ value, valueOf }) => {
      if (this.mode() === 'update') return undefined;
      if (!value()) return { kind: 'required', message: 'أكّد كلمة المرور الأولية.' };
      return value() === valueOf(field.initialPassword)
        ? undefined
        : { kind: 'passwordMismatch', message: 'تأكيد كلمة المرور غير مطابق.' };
    });
    maxLength(field.confirmPassword, 4096, {
      message: 'تأكيد كلمة المرور أطول من الحد المسموح.',
    });
  });

  constructor() {
    effect(() => {
      const record = this.record();
      if (this.mode() !== 'update' || !record || record.superAdminId === this.populatedRecordId)
        return;
      this.populatedRecordId = record.superAdminId;
      this.model.set({
        ...EMPTY_MODEL,
        userName: record.userName,
        email: record.email,
        phoneNumber: record.phoneNumber ?? '',
        nameAr: record.nameAr,
        nameEn: record.nameEn ?? '',
      });
      this.adminForm().reset();
    });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.adminForm, async () => {
      if (this.busy()) return;
      const value = this.model();
      const shared = {
        nameAr: value.nameAr.trim(),
        nameEn: value.nameEn.trim() || undefined,
        email: value.email.trim(),
        phoneNumber: value.phoneNumber.trim() || undefined,
      };
      this.saved.emit(
        this.mode() === 'create'
          ? {
              mode: 'create',
              request: {
                ...shared,
                userName: value.userName.trim(),
                initialPassword: value.initialPassword,
                confirmPassword: value.confirmPassword,
              },
            }
          : { mode: 'update', request: shared },
      );
    });
  }

  protected clientError(field: keyof SuperAdminFormModel): string {
    const control = this.adminForm[field]();
    return control.touched() ? (control.errors()[0]?.message ?? '') : '';
  }

  protected serverError(field: keyof SuperAdminFormModel): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  protected togglePasswords(): void {
    this.showPasswords.update((visible) => !visible);
  }
}
