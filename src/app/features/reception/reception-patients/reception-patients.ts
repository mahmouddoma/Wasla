import { HttpErrorResponse } from '@angular/common/http';
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
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import {
  PagedResponse,
  PatientRelationshipType,
  PatientSearchItem,
} from '../../../core/patients/patient.models';
import { PatientsApi } from '../../../core/patients/patients-api';
import { ReceptionPractice } from '../../../core/reception/reception-practice.models';
import { ReceptionPracticesApi } from '../../../core/reception/reception-practices-api';

@Component({
  selector: 'app-reception-patients',
  imports: [FormField, RouterLink],
  templateUrl: './reception-patients.html',
  styleUrl: '../../healthcare-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionPatients {
  private readonly api = inject(PatientsApi);
  private readonly authApi = inject(AuthApi);
  private readonly practicesApi = inject(ReceptionPracticesApi);
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
  protected readonly practices = signal<ReceptionPractice[]>([]);
  protected readonly selectedPracticeId = signal('');
  protected readonly isLoadingPractices = signal(false);
  protected readonly canSearch = this.session.hasPermission(PERMISSIONS.patientsSearchBasic);
  protected readonly canRegister = this.session.hasPermission(PERMISSIONS.patientsRegister);

  constructor() {
    if (this.canSearch) void this.loadPractices();
  }

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
    if (!this.selectedPracticeId()) {
      this.messages.set(['اختر العيادة التي تعمل عليها قبل البحث.']);
      return;
    }
    await submit(this.searchForm, async () => {
      if (this.isSearching()) return;
      this.isSearching.set(true);
      this.clearFeedback();
      try {
        this.pageNumber.set(pageNumber);
        this.results.set(
          await firstValueFrom(
            this.api.search({
              ...this.searchModel(),
              doctorPracticeId: this.selectedPracticeId(),
              pageNumber,
            }),
          ),
        );
      } catch (error) {
        this.messages.set(flattenErrors(error));
        if (error instanceof HttpErrorResponse && error.status === 403) {
          await this.refreshAccessContext();
        }
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

  protected practiceChanged(event: Event): void {
    this.selectedPracticeId.set((event.currentTarget as HTMLSelectElement).value);
    this.results.set(null);
    this.selectedPatientId.set('');
    this.messages.set([]);
  }

  protected selectedPracticeAllows(permission: string): boolean {
    const practice = this.practices().find((item) => item.id === this.selectedPracticeId());
    return practice?.permissionCodes.includes(permission) ?? false;
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

  private async loadPractices(): Promise<void> {
    this.isLoadingPractices.set(true);
    try {
      const practices = (await firstValueFrom(this.practicesApi.list())).filter(
        (practice) => practice.isActive,
      );
      this.practices.set(practices);
      const current = this.selectedPracticeId();
      if (!practices.some((practice) => practice.id === current)) {
        this.selectedPracticeId.set(practices.length === 1 ? practices[0].id : '');
        this.results.set(null);
      }
    } catch (error) {
      this.practices.set([]);
      this.selectedPracticeId.set('');
      this.messages.set(flattenErrors(error));
    } finally {
      this.isLoadingPractices.set(false);
    }
  }

  private async refreshAccessContext(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authApi.currentUser());
      this.session.complete(user);
      if (!user.permissions.includes(PERMISSIONS.patientsSearchBasic)) {
        await this.router.navigate([this.session.destinationFor(user)]);
        return;
      }
    } catch {
      return;
    }
    await this.loadPractices();
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
