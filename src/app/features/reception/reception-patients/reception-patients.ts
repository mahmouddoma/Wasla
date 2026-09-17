import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
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
} from '../../../domains/patients';
import { PatientsApi } from '../../../domains/patients';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';

import { PlatformFooter } from '../../../shared/components/platform-footer/platform-footer';

@Component({
  selector: 'app-reception-patients',
  imports: [FormField, RouterLink, TranslatePipe, PlatformFooter],
  templateUrl: './reception-patients.html',
  styleUrls: ['../../healthcare-workspace.css', './reception-patients.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionPatients {
  private readonly toast = inject(ToastService);
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(PatientsApi);
  private readonly authApi = inject(AuthApi);
  private readonly practiceContext = inject(ReceptionPracticeContext);
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
    required(field.nameAr, { message: 'validation.nameArRequired' });
    maxLength(field.nameAr, 200, { message: 'validation.nameLength' });
    maxLength(field.nameEn, 200, { message: 'validation.nameLength' });
    required(field.dateOfBirth, { message: 'ui.full.757' });
    validate(field.dateOfBirth, ({ value }) => {
      if (!value()) return undefined;
      return new Date(`${value()}T00:00:00`) > today()
        ? { kind: 'futureDate', message: 'validation.birthFuture' }
        : undefined;
    });
    required(field.gender, { message: 'ui.full.758' });
    email(field.email, { message: 'validation.emailFormat' });
    required(field.primaryContactNameAr, {
      message: 'ui.full.759',
      when: ({ valueOf }) => !valueOf(field.phoneNumber).trim(),
    });
    required(field.primaryContactPhoneNumber, {
      message: 'ui.full.760',
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
  protected readonly practices = this.practiceContext.practices;
  protected readonly selectedPracticeId = this.practiceContext.currentPracticeId;
  protected readonly canSearch = this.session.hasPermission(PERMISSIONS.patientsSearchBasic);
  protected readonly canRegister = this.session.hasPermission(PERMISSIONS.patientsRegister);

  constructor() {
    if (this.canSearch && !this.practices().length) void this.loadPractices();
    effect(() => {
      this.selectedPracticeId();
      this.results.set(null);
      this.selectedPatientId.set('');
    });
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
        this.toast.success(this.uiLanguage.t('patient.registered'));
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
    if (
      !this.selectedPracticeId() ||
      !this.selectedPracticeAllows(PERMISSIONS.patientsSearchBasic)
    ) {
      this.messages.set([this.uiLanguage.t('ui.full.761')]);
      return;
    }
    await submit(this.searchForm, async () => {
      if (this.isSearching()) return;
      this.isSearching.set(true);
      this.clearFeedback();
      const practiceId = this.selectedPracticeId();
      try {
        this.pageNumber.set(pageNumber);
        const result = await firstValueFrom(
          this.api.search({
            ...this.searchModel(),
            doctorPracticeId: practiceId,
            pageNumber,
          }),
        );
        if (this.selectedPracticeId() === practiceId) this.results.set(result);
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

  protected selectedPracticeAllows(permission: string): boolean {
    return this.practiceContext.allows(permission);
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
    await this.practiceContext.refresh();
    this.messages.set(this.practiceContext.messages());
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
