import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormField,
  email,
  form,
  max,
  maxLength,
  min,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import {
  PagedResponse,
  PatientRelationshipType,
  PatientSearchItem,
} from '../../../core/patients/patient.models';
import { PatientsApi } from '../../../core/patients/patients-api';

@Component({
  selector: 'app-reception-patients',
  imports: [FormField, RouterLink],
  templateUrl: './reception-patients.html',
  styleUrl: '../../healthcare-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionPatients {
  private readonly api = inject(PatientsApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly createModel = signal({
    nameAr: '',
    nameEn: '',
    dateOfBirth: '',
    gender: '' as 'Male' | 'Female' | '',
    phoneNumber: '',
    email: '',
    primaryContactNameAr: '',
    primaryContactPhoneNumber: '',
    primaryContactRelationshipType: 'Guardian' as PatientRelationshipType,
    primaryContactLinkedPatientId: '',
  });
  protected readonly createForm = form(this.createModel, (field) => {
    required(field.nameAr, { message: 'الاسم بالعربية مطلوب.' });
    maxLength(field.nameAr, 200, { message: 'الحد الأقصى للاسم 200 حرف.' });
    maxLength(field.nameEn, 200, { message: 'الحد الأقصى للاسم 200 حرف.' });
    required(field.dateOfBirth, { message: 'تاريخ الميلاد مطلوب.' });
    validate(field.dateOfBirth, ({ value }) => {
      if (!value()) return undefined;
      return new Date(`${value()}T00:00:00`) > today()
        ? { kind: 'futureDate', message: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل.' }
        : undefined;
    });
    required(field.gender, { message: 'النوع مطلوب.' });
    email(field.email, { message: 'صيغة البريد الإلكتروني غير صحيحة.' });
    required(field.primaryContactNameAr, {
      message: 'اسم جهة الاتصال الأساسية مطلوب عند عدم وجود هاتف للمريض.',
      when: ({ valueOf }) => !valueOf(field.phoneNumber).trim(),
    });
    required(field.primaryContactPhoneNumber, {
      message: 'هاتف جهة الاتصال الأساسية مطلوب عند عدم وجود هاتف للمريض.',
      when: ({ valueOf }) => !valueOf(field.phoneNumber).trim(),
    });
  });
  protected readonly searchModel = signal({
    phoneNumber: '',
    name: '',
    dateOfBirth: '',
    pageSize: 20,
  });
  protected readonly searchForm = form(this.searchModel, (field) => {
    min(field.pageSize, 1);
    max(field.pageSize, 100);
  });
  protected readonly profileImage = signal<File | undefined>(undefined);
  protected readonly results = signal<PagedResponse<PatientSearchItem> | null>(null);
  protected readonly selectedPatientId = signal('');
  protected readonly createdPatientId = signal('');
  protected readonly messages = signal<string[]>([]);
  protected readonly isCreating = signal(false);
  protected readonly isSearching = signal(false);
  protected readonly pageNumber = signal(1);

  protected async createPatient(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.createForm, async () => {
      if (this.isCreating()) return;
      this.isCreating.set(true);
      this.clearFeedback();
      try {
        const value = this.createModel();
        const response = await firstValueFrom(
          this.api.create({
            ...value,
            gender: value.gender as 'Male' | 'Female',
            primaryContactIsPrimary: true,
            profileImage: this.profileImage(),
          }),
        );
        this.createdPatientId.set(response.patientId);
        this.selectedPatientId.set(response.patientId);
        this.createModel.set({
          nameAr: '',
          nameEn: '',
          dateOfBirth: '',
          gender: '',
          phoneNumber: '',
          email: '',
          primaryContactNameAr: '',
          primaryContactPhoneNumber: '',
          primaryContactRelationshipType: 'Guardian',
          primaryContactLinkedPatientId: '',
        });
        this.profileImage.set(undefined);
        this.createForm().reset();
      } catch (error) {
        this.messages.set(flattenErrors(error));
      } finally {
        this.isCreating.set(false);
      }
    });
  }

  protected async search(pageNumber = 1, event?: Event): Promise<void> {
    event?.preventDefault();
    await submit(this.searchForm, async () => {
      if (this.isSearching()) return;
      this.isSearching.set(true);
      this.clearFeedback();
      try {
        this.pageNumber.set(pageNumber);
        this.results.set(
          await firstValueFrom(this.api.search({ ...this.searchModel(), pageNumber })),
        );
      } catch (error) {
        this.messages.set(flattenErrors(error));
      } finally {
        this.isSearching.set(false);
      }
    });
  }

  protected choose(patientId: string): void {
    this.selectedPatientId.set(patientId);
  }

  protected fileChanged(event: Event): void {
    this.profileImage.set((event.currentTarget as HTMLInputElement).files?.[0]);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  protected displayName(patient: PatientSearchItem): string {
    return patient.nameEn ? `${patient.nameAr} · ${patient.nameEn}` : patient.nameAr;
  }

  private clearFeedback(): void {
    this.messages.set([]);
    this.createdPatientId.set('');
  }
}

function today(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
