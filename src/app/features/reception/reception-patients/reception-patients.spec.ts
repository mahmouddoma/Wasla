import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PagedResponse, PatientSearchItem } from '../../../domains/patients';
import { PatientsApi } from '../../../domains/patients';
import {
  ReceptionPracticeContext,
  ReceptionPractice,
  ReceptionPracticesApi,
} from '../../../domains/reception-practices';
import { ReceptionPatients } from './reception-patients';

describe('ReceptionPatients', () => {
  let fixture: ComponentFixture<ReceptionPatients>;
  let component: ReceptionPatients;

  const samplePractice: ReceptionPractice = {
    id: 'practice-1',
    nameAr: 'عيادة الأمل',
    nameEn: 'Al-Amal Clinic',
    doctorNameAr: null,
    doctorNameEn: null,
    isActive: true,
    permissionCodes: ['Patients.SearchBasic', 'PracticeReservations.Create'],
  };

  const sampleSearchItem: PatientSearchItem = {
    patientId: 'pat-1',
    nameAr: 'أحمد محمود',
    nameEn: 'Ahmed Mahmoud',
    phoneNumber: '01011122233',
    gender: 'Male',
    dateOfBirth: '1990-01-01',
    hasContactPhone: false,
  };

  const samplePage: PagedResponse<PatientSearchItem> = {
    items: [sampleSearchItem],
    pageNumber: 1,
    pageSize: 20,
    totalCount: 1,
    totalPages: 1,
  };

  const patientsApi = {
    create: vi.fn(() => of({ patientId: 'new-pat-1' })),
    search: vi.fn(() => of(samplePage)),
  };

  const practicesApi = {
    list: vi.fn(() => of([samplePractice])),
  };

  const authApi = {
    currentUser: vi.fn(() => of({ id: 'u1', permissions: [] })),
  };

  const session = {
    hasPermission: vi.fn((_code: string) => true),
    complete: vi.fn(),
  };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    practicesApi.list.mockReturnValue(of([samplePractice]));
    patientsApi.create.mockReturnValue(of({ patientId: 'new-pat-1' }));
    patientsApi.search.mockReturnValue(of(samplePage));
    session.hasPermission.mockReturnValue(true);

    TestBed.configureTestingModule({
      imports: [ReceptionPatients],
      providers: [
        provideRouter([]),
        { provide: PatientsApi, useValue: patientsApi },
        { provide: ReceptionPracticesApi, useValue: practicesApi },
        { provide: AuthApi, useValue: authApi },
        { provide: AuthSession, useValue: session },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(ReceptionPatients);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('keeps search primary and opens registration in a context-preserving drawer', () => {
    component['searchModel'].update((model) => ({ ...model, name: 'Ahmed' }));
    component['createModel'].update((model) => ({ ...model, nameEn: 'New patient' }));
    component['registrationOpen'].set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-side-drawer [role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.patient-panel-switcher')).toBeNull();
    component['registrationOpen'].set(false);
    fixture.detectChanges();
    expect(component['searchModel']().name).toBe('Ahmed');
    expect(component['createModel']().nameEn).toBe('New patient');
  });
  it('loads accessible practices on creation and selects the first active one', () => {
    expect(component).toBeTruthy();
    expect(practicesApi.list).toHaveBeenCalled();
    expect(component['practices']()).toEqual([samplePractice]);
    expect(component['selectedPracticeId']()).toBe(samplePractice.id);
  });

  it('searches for patients in selected practice and populates results', async () => {
    component['searchModel'].set({
      name: 'أحمد',
      phoneNumber: '',
      dateOfBirth: '',
      pageSize: 20,
    });
    fixture.detectChanges();

    await component['search'](1, new Event('submit', { cancelable: true }));

    expect(patientsApi.search).toHaveBeenCalledWith({
      name: 'أحمد',
      phoneNumber: '',
      dateOfBirth: '',
      pageSize: 20,
      doctorPracticeId: samplePractice.id,
      pageNumber: 1,
    });
    expect(component['results']()).toEqual(samplePage);
  });

  it('creates patient record successfully, notifies, and sets createdPatientId', async () => {
    component['createModel'].set({
      nameAr: 'مريض جديد',
      nameEn: 'New Patient',
      dateOfBirth: '1998-06-20',
      gender: 'Male',
      phoneNumber: '01012345678',
      email: 'newpatient@example.com',
      primaryContactNameAr: '',
      primaryContactPhoneNumber: '',
      primaryContactRelationshipType: 'Guardian',
      primaryContactLinkedPatientId: '',
    });
    fixture.detectChanges();

    await component['createPatient'](new Event('submit', { cancelable: true }));

    expect(patientsApi.create).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
    expect(component['createdPatientId']()).toBe('new-pat-1');
  });
  it('hands off a named patient and the current clinic without displaying its ID', async () => {
    await component['search']();
    component['choose']('pat-1');
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component['book']();
    expect(navigate).toHaveBeenCalledWith(
      ['/reception/reservations'],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          practiceId: 'practice-1',
          patientId: 'pat-1',
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
        state: { receptionPatient: { ...sampleSearchItem, practiceId: 'practice-1' } },
      }),
    );
    expect(fixture.nativeElement.textContent).not.toContain('pat-1');
    expect(fixture.nativeElement.querySelector('.selected-context button')).toBeTruthy();
  });
  it('shows an actionable illustrated empty search and hides registration without permission', async () => {
    patientsApi.search.mockReturnValue(of({ ...samplePage, items: [], totalCount: 0 }));
    await component['search']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state img')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-state button')).toBeTruthy();
    session.hasPermission.mockImplementation((code) => code !== 'Patients.Register');
    fixture.destroy();
    fixture = TestBed.createComponent(ReceptionPatients);
    component = fixture.componentInstance;
    await fixture.whenStable();
    await component['search']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state button')).toBeNull();
  });
  it('renders registration only for register-only accounts', async () => {
    session.hasPermission.mockImplementation((code) => code === 'Patients.Register');
    fixture.destroy();
    fixture = TestBed.createComponent(ReceptionPatients);
    component = fixture.componentInstance;
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.registration-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-page-header').textContent).toContain(
      TestBed.inject(LanguageService).t('reception.patients.add'),
    );
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
    await component['search']();
    expect(patientsApi.search).not.toHaveBeenCalled();
  });
  it('requires a contact phone when the patient has no phone and preserves advanced fields', async () => {
    component['createModel'].update((model) => ({
      ...model,
      nameAr: 'Synthetic',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
    }));
    fixture.detectChanges();
    await component['createPatient'](new Event('submit'));
    expect(patientsApi.create).not.toHaveBeenCalled();
    component['createModel'].update((model) => ({
      ...model,
      primaryContactNameAr: 'Contact',
      primaryContactPhoneNumber: '01011122233',
      primaryContactLinkedPatientId: 'linked',
    }));
    fixture.detectChanges();
    await component['createPatient'](new Event('submit'));
    fixture.detectChanges();
    expect(patientsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryContactLinkedPatientId: 'linked',
        primaryContactPhoneNumber: '01011122233',
      }),
    );
    expect(fixture.nativeElement.querySelector('.selected-context')?.textContent).toContain(
      'Synthetic',
    );
    expect(fixture.nativeElement.textContent).not.toContain('new-pat-1');
  });
  it('retains entered registration values and provides an error toast after failure', async () => {
    patientsApi.create.mockReturnValue(throwError(() => new Error('Failure')));
    component['createModel'].update((model) => ({
      ...model,
      nameAr: 'Synthetic',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phoneNumber: '01011122233',
    }));
    fixture.detectChanges();
    await component['createPatient'](new Event('submit'));
    expect(component['createModel']().nameAr).toBe('Synthetic');
    expect(toast.error).toHaveBeenCalled();
    expect(component['selectedPatient']()).toBeNull();
  });
  it('invalidates selection and ignores an in-flight search when the clinic changes', async () => {
    const pending = new Subject<PagedResponse<PatientSearchItem>>();
    patientsApi.search.mockReturnValue(pending);
    const search = component['search']();
    await Promise.resolve();
    TestBed.inject(ReceptionPracticeContext).select('');
    fixture.detectChanges();
    pending.next(samplePage);
    pending.complete();
    await search;
    expect(component['results']()).toBeNull();
    expect(component['selectedPatient']()).toBeNull();
    expect(component['isSearching']()).toBe(false);
  });
  it('explains an unselected clinic without adding a second selector or making a search request', async () => {
    const context = TestBed.inject(ReceptionPracticeContext);
    practicesApi.list.mockReturnValue(
      of([samplePractice, { ...samplePractice, id: 'practice-2' }]),
    );
    await context.refresh();
    context.select('');
    fixture.detectChanges();
    await component['search']();
    expect(patientsApi.search).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.patient-panel select')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      TestBed.inject(LanguageService).t('reception.patients.chooseClinic'),
    );
  });
  it('does not silently offer a patient registered during a clinic switch for the new clinic', async () => {
    const pending = new Subject<{ patientId: string }>();
    patientsApi.create.mockReturnValue(pending);
    component['createModel'].update((model) => ({
      ...model,
      nameAr: 'Synthetic',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phoneNumber: '01011122233',
    }));
    fixture.detectChanges();
    const save = component['createPatient'](new Event('submit'));
    await Promise.resolve();
    TestBed.inject(ReceptionPracticeContext).select('');
    fixture.detectChanges();
    pending.next({ patientId: 'registered' });
    pending.complete();
    await save;
    expect(toast.success).toHaveBeenCalled();
    expect(component['selectedPatient']()).toBeNull();
    expect(component['createdPatientId']()).toBe('');
  });
});
