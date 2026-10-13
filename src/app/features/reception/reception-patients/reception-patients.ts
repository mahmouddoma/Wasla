import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
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
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
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

@Component({
  selector: 'app-reception-patients',
  imports: [FormField, TranslatePipe, PageHeader, SideDrawer, NgTemplateOutlet],
  templateUrl: './reception-patients.html',
  styleUrl: './reception-patients.css',
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
  private readonly route = inject(ActivatedRoute);

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
    pageSize: 10,
  });
  protected readonly searchForm = form(this.searchModel, (field) => {
    min(field.pageSize, 1);
    max(field.pageSize, 100);
  });
  protected readonly pageSizeOptions = [10, 15, 20] as const;
  protected readonly profileImage = signal<File | undefined>(undefined);
  protected readonly results = signal<PagedResponse<PatientSearchItem> | null>(null);
  protected readonly selectedPatientId = signal('');
  protected readonly selectedPatient = signal<PatientSearchItem | null>(null);
  protected readonly createdPatientId = signal('');
  protected readonly messages = signal<string[]>([]);
  protected readonly isCreating = signal(false);
  protected readonly isSearching = signal(false);
  protected readonly pageNumber = signal(1);
  protected readonly practices = this.practiceContext.practices;
  protected readonly selectedPracticeId = this.practiceContext.currentPracticeId;
  protected readonly currentPractice = this.practiceContext.currentPractice;

  protected readonly totalPages = computed(() => {
    const res = this.results();
    if (!res || !res.totalCount) return 1;
    if (res.totalPages && res.totalPages > 0) return res.totalPages;
    const size = res.pageSize || this.searchModel().pageSize || 10;
    return Math.ceil(res.totalCount / size) || 1;
  });

  protected readonly startIndex = computed(() => {
    const res = this.results();
    if (!res || res.items.length === 0) return 0;
    const size = res.pageSize || this.searchModel().pageSize || 10;
    return (this.pageNumber() - 1) * size + 1;
  });

  protected readonly endIndex = computed(() => {
    const res = this.results();
    if (!res || res.items.length === 0) return 0;
    return Math.min(this.startIndex() + res.items.length - 1, res.totalCount);
  });

  protected readonly canSearch = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientsSearchBasic),
  );
  protected readonly canRegister = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientsRegister),
  );
  protected readonly registrationOpen = signal(false);
  protected readonly canBook = computed(
    () =>
      this.session.hasPermission(PERMISSIONS.practiceReservationsCreate) &&
      this.practiceContext.allows(PERMISSIONS.practiceReservationsCreate),
  );
  private contextGeneration = 0;
  private searchSequence = 0;

  constructor() {
    if (!this.practices().length) void this.loadPractices();
    effect(() => {
      const practiceId = this.selectedPracticeId();
      this.contextGeneration++;
      this.searchSequence++;
      this.results.set(null);
      this.selectedPatientId.set('');
      this.selectedPatient.set(null);
      this.createdPatientId.set('');
      this.messages.set([]);
      this.isSearching.set(false);
      if (
        practiceId &&
        this.canSearch() &&
        this.selectedPracticeAllows(PERMISSIONS.patientsSearchBasic)
      )
        void this.search();
    });

    const params = this.route.snapshot.queryParamMap;
    const action = params.get('action');
    if (action === 'new' || params.get('register') === 'true') {
      this.registrationOpen.set(true);
    }
    const phone = params.get('phone');
    if (phone) {
      this.searchModel.update((m) => ({ ...m, phoneNumber: phone }));
      this.createModel.update((m) => ({ ...m, phoneNumber: phone }));
    }
    const name = params.get('name');
    if (name) {
      this.searchModel.update((m) => ({ ...m, name }));
      this.createModel.update((m) => ({ ...m, nameAr: name }));
    }
  }

  protected onPracticeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select?.value) {
      this.practiceContext.select(select.value);
    }
  }

  protected resetSearch(): void {
    this.searchModel.set({
      phoneNumber: '',
      name: '',
      dateOfBirth: '',
      pageSize: 10,
    });
    this.pageNumber.set(1);
    this.results.set(null);
    this.clearFeedback();
  }

  protected setPageSize(size: number): void {
    if (this.searchModel().pageSize === size && this.pageNumber() === 1) return;
    this.searchModel.update((m) => ({ ...m, pageSize: size }));
    this.pageNumber.set(1);
    void this.search(1);
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = Number(select?.value);
    if (size && size !== this.searchModel().pageSize) {
      this.setPageSize(size);
    }
  }

  protected goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total || page === this.pageNumber() || this.isSearching()) return;
    this.pageNumber.set(page);
    void this.search(page);
  }

  protected clearSelection(): void {
    this.selectedPatient.set(null);
    this.selectedPatientId.set('');
    this.createdPatientId.set('');
  }

  protected selectAndBook(patient: PatientSearchItem): void {
    this.selectedPatientId.set(patient.patientId);
    this.selectedPatient.set(patient);
    this.createdPatientId.set('');
    this.book();
  }

  protected calculateAge(dob?: string | null): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const diffMs = Date.now() - birth.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  protected async createPatient(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canRegister()) return;
    await submit(this.createForm, async () => {
      if (this.isCreating()) return;
      this.isCreating.set(true);
      this.clearFeedback();
      const generation = this.contextGeneration;
      try {
        const value = this.createModel();
        const response = await firstValueFrom(
          this.api.create({
            ...value,
            doctorPracticeId: this.selectedPracticeId(),
            gender: value.gender as 'Male' | 'Female',
            primaryContactIsPrimary: true,
            profileImage: this.profileImage(),
          }),
        );
        this.toast.success(this.uiLanguage.t('patient.registered'));
        if (generation === this.contextGeneration) {
          this.createdPatientId.set(response.patientId);
          this.selectedPatientId.set(response.patientId);
          this.selectedPatient.set({
            patientId: response.patientId,
            nameAr: value.nameAr,
            nameEn: value.nameEn || null,
            dateOfBirth: value.dateOfBirth,
            gender: value.gender as 'Male' | 'Female',
            phoneNumber: value.phoneNumber || null,
            hasContactPhone: !!value.primaryContactPhoneNumber,
          });
        }
        this.registrationOpen.set(false);
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
        this.toast.error(this.messages().join(' ') || this.uiLanguage.t('common.requestFailed'));
      } finally {
        this.isCreating.set(false);
      }
    });
  }

  protected async search(pageNumber = 1, event?: Event): Promise<void> {
    event?.preventDefault();
    if (
      !this.canSearch() ||
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
      this.results.set(null);
      this.selectedPatient.set(null);
      this.selectedPatientId.set('');
      const sequence = ++this.searchSequence;
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
        if (sequence === this.searchSequence && this.selectedPracticeId() === practiceId)
          this.results.set(result);
      } catch (error) {
        if (sequence !== this.searchSequence) return;
        this.messages.set(flattenErrors(error));
        if (error instanceof HttpErrorResponse && error.status === 403) {
          await this.refreshAccessContext();
        }
      } finally {
        if (sequence === this.searchSequence) this.isSearching.set(false);
      }
    });
  }

  protected choose(patientId: string): void {
    const patient = this.results()?.items.find((item) => item.patientId === patientId);
    if (!patient) return;
    this.selectedPatientId.set(patientId);
    this.selectedPatient.set(patient);
    this.createdPatientId.set('');
  }

  protected book(): void {
    const patient = this.selectedPatient();
    const practiceId = this.selectedPracticeId();
    if (!patient || !practiceId || !this.canBook()) return;
    const date = new Date();
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    void this.router.navigate(['/reception/reservations'], {
      queryParams: { practiceId, patientId: patient.patientId, date: localDate },
      state: { receptionPatient: { ...patient, practiceId } },
    });
  }

  protected fileChanged(event: Event): void {
    this.profileImage.set((event.currentTarget as HTMLInputElement).files?.[0]);
  }

  protected selectedPracticeAllows(permission: string): boolean {
    return this.practiceContext.allows(permission);
  }

  protected displayName(patient: PatientSearchItem): string {
    return this.uiLanguage.currentLang() === 'en'
      ? patient.nameEn || patient.nameAr
      : patient.nameAr;
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
