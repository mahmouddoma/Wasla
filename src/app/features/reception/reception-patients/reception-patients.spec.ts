import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PagedResponse, PatientSearchItem } from '../../../domains/patients';
import { PatientsApi } from '../../../domains/patients';
import { ReceptionPractice, ReceptionPracticesApi } from '../../../domains/reception-practices';
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
    permissionCodes: ['Patients.SearchBasic'],
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
    hasPermission: vi.fn(() => true),
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
});
