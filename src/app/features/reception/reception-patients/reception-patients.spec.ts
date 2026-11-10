import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError, Observable } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PagedResponse, PatientSearchItem, RegistrationMatchesRequest, RegistrationMatchesResponse, RegistrationSearchResponse } from '../../../domains/patients';
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
    permissionCodes: ['Patients.SearchBasic', 'PracticeReservations.Create', 'Patients.Register', 'Patients.RegisterFull', 'Patients.RegistrationMatch'],
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
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
  };

  const patientsApi = {
    create: vi.fn(() => of({ patientId: 'new-pat-1' })),
    search: vi.fn(() => of(samplePage)),
    registrationMatches: vi.fn<(request: RegistrationMatchesRequest) => Observable<RegistrationMatchesResponse>>(),
    registerFull: vi.fn(),
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

  const prepareRegistration = (mode: 'basic' | 'full' = 'basic') => {
    component['registrationAccountMode'].set(mode);
    component['createModel'].update(value => ({ ...value, nameAr: 'Synthetic person', dateOfBirth: '1990-01-01', gender: 'Male', phoneNumber: '01011122233', email: 'synthetic@example.invalid' }));
    fixture.detectChanges();
  };
  const softMatch: RegistrationSearchResponse = {
    matchOutcome: 'PossibleMatch', canCreateBasic: true, canCreateFull: true, requiresClaimForAccount: false,
    candidates: [{ patientId: 'existing', nameAr: 'Existing person', dateOfBirth: '1990-01-01', gender: 'Male', phoneMasked: '010****33', emailMasked: 'e***@example.invalid', isLinkedAccount: false }],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    practicesApi.list.mockReturnValue(of([samplePractice]));
    patientsApi.create.mockReturnValue(of({ patientId: 'new-pat-1' }));
    patientsApi.search.mockReturnValue(of(samplePage));
    patientsApi.registrationMatches.mockImplementation(request => of(request.mode === 'Search'
      ? { matchOutcome: 'NoMatch', candidates: [], canCreateBasic: true, canCreateFull: true, requiresClaimForAccount: false }
      : { patientId: request.patientId ?? '', attestationId: 'attestation', expiresOnUtc: null }));
    patientsApi.registerFull.mockReturnValue(of({ patientId: 'new-full', applicationUserId: 'new-user', profileType: 'Full', accountStatus: 'PendingActivation', activationEmailMasked: 's***@example.invalid', invitationExpiresOnUtc: '2026-12-01' }));
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
    component['searchModel'].update((model) => ({ ...model, phoneNumber: '01011122233' }));
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('keeps search primary and opens registration in an inline side block', () => {
    component['searchModel'].update((model) => ({ ...model, name: 'Ahmed' }));
    component['createModel'].update((model) => ({ ...model, nameEn: 'New patient' }));
    component['registrationOpen'].set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.patient-inline-sidebar-block[role="dialog"]')).toBeTruthy();
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

  it('does not send an empty search on initial clinic selection', async () => {
    await fixture.whenStable();
    expect(patientsApi.search).not.toHaveBeenCalled();
    expect(component['results']()).toBeNull();
  });

  it('searches for patients in selected practice and populates results', async () => {
    patientsApi.search.mockClear();
    component['searchModel'].set({
      name: 'أحمد',
      phoneNumber: '',
      dateOfBirth: '1990-01-01',
      pageSize: 10,
    });
    fixture.detectChanges();

    await component['search'](1, new Event('submit', { cancelable: true }));

    expect(patientsApi.search).toHaveBeenCalledWith({
      name: 'أحمد',
      phoneNumber: '',
      dateOfBirth: '1990-01-01',
      pageSize: 10,
      doctorPracticeId: samplePractice.id,
      pageNumber: 1,
    });
    expect(component['results']()).toEqual(samplePage);
  });

  it('requires a birth date with a name and makes no request for insufficient criteria', async () => {
    component['searchModel'].set({ name: 'Ahmed', phoneNumber: '', dateOfBirth: '', pageSize: 10 });
    await component['search'](1, new Event('submit'));
    expect(patientsApi.search).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('reports clipboard failure without claiming the reference was copied', async () => {
    component['generatedAttestationId'].set('attestation-reference');
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await component['copyAttestationId']();
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
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

    expect(patientsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nameAr: 'مريض جديد',
        doctorPracticeId: samplePractice.id,
      }),
      expect.any(String),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(component['createdPatientId']()).toBe('new-pat-1');
  });

  it.each(['basic', 'full'] as const)('requires explicit distinct-person review before %s registration on a soft match', async (mode) => {
    prepareRegistration(mode);
    patientsApi.registrationMatches.mockReturnValueOnce(of(softMatch));
    await component['createPatient'](new Event('submit'));
    expect(patientsApi.registrationMatches).toHaveBeenCalledWith(expect.objectContaining({ mode: 'Search', doctorPracticeId: 'practice-1', email: 'synthetic@example.invalid', pageSize: 20 }));
    expect(patientsApi.create).not.toHaveBeenCalled();
    expect(patientsApi.registerFull).not.toHaveBeenCalled();
    component['fullRegistrationVerifiedInPerson'].set(true);
    component['distinctPersonConfirmed'].set(true);
    component['matchReviewReason'].set('Verified different people with original identity evidence');
    await component['createPatient'](new Event('submit'));
    const expected = expect.objectContaining({ matchReviewOutcome: 'DistinctPerson', matchReviewReason: 'Verified different people with original identity evidence' });
    expect(mode === 'basic' ? patientsApi.create : patientsApi.registerFull).toHaveBeenCalledWith(expected, expect.any(String));
    expect(patientsApi.registrationMatches).toHaveBeenCalledTimes(1);
  });

  it('blocks exact identity collisions and requires explicit verified reuse instead of creating a duplicate', async () => {
    prepareRegistration();
    patientsApi.registrationMatches.mockReturnValueOnce(of({ ...softMatch, canCreateBasic: false, canCreateFull: false, requiresClaimForAccount: true }));
    await component['createPatient'](new Event('submit'));
    expect(component['canDistinguish']()).toBe(false);
    component['distinctPersonConfirmed'].set(true);
    component['matchReviewReason'].set('This cannot override an exact match');
    await component['createPatient'](new Event('submit'));
    expect(patientsApi.create).not.toHaveBeenCalled();
    await component['reuseCandidate'](softMatch.candidates![0]);
    expect(patientsApi.registrationMatches).toHaveBeenCalledTimes(1);
    component['fullRegistrationVerifiedInPerson'].set(true);
    await component['reuseCandidate'](softMatch.candidates![0]);
    expect(patientsApi.registrationMatches).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'ConfirmReuse', doctorPracticeId: 'practice-1', patientId: 'existing', verifiedInPerson: true }), expect.any(String));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Existing person');
    expect(component['reusedPatient']()?.patientId).toBe('existing');
    expect(patientsApi.create).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('clears matching decisions when identity criteria change and never creates after a denied search', async () => {
    prepareRegistration();
    patientsApi.registrationMatches.mockReturnValueOnce(of(softMatch));
    await component['createPatient'](new Event('submit'));
    component['distinctPersonConfirmed'].set(true);
    component['createModel'].update(value => ({ ...value, email: 'different@example.invalid' }));
    fixture.detectChanges();
    expect(component['identityMatches']()).toBeNull();
    expect(component['distinctPersonConfirmed']()).toBe(false);
    patientsApi.registrationMatches.mockReturnValueOnce(throwError(() => new Error('Denied')));
    await component['createPatient'](new Event('submit'));
    expect(patientsApi.create).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('links a scoped contact selection without exposing a raw identifier input', async () => {
    prepareRegistration();
    component['registrationOpen'].set(true);
    component['chooseLinkedContact'](sampleSearchItem);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#linkedId')).toBeNull();
    expect(component['createModel']().primaryContactLinkedPatientId).toBe(sampleSearchItem.patientId);
    await component['createPatient'](new Event('submit'));
    expect(patientsApi.create).toHaveBeenCalledWith(expect.objectContaining({ primaryContactLinkedPatientId: 'pat-1' }), expect.any(String));
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
    session.hasPermission.mockImplementation((code) => !['Patients.Register', 'Patients.RegisterFull'].includes(code));
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
    patientsApi.search.mockClear();
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
      expect.any(String),
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
    patientsApi.search.mockClear();
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
    await vi.waitFor(() => expect(patientsApi.create).toHaveBeenCalled());
    TestBed.inject(ReceptionPracticeContext).select('');
    fixture.detectChanges();
    pending.next({ patientId: 'registered' });
    pending.complete();
    await save;
    expect(toast.success).toHaveBeenCalled();
    expect(component['selectedPatient']()).toBeNull();
    expect(component['createdPatientId']()).toBe('');
  });

  it('resets search fields and results when resetSearch is called', () => {
    component['searchModel'].set({
      name: 'Test',
      phoneNumber: '0101111',
      dateOfBirth: '1990-01-01',
      pageSize: 20,
    });
    component['results'].set(samplePage);
    component['resetSearch']();
    expect(component['searchModel']().name).toBe('');
    expect(component['searchModel']().phoneNumber).toBe('');
    expect(component['results']()).toBeNull();
  });

  it('clears selected patient when clearSelection is called', () => {
    component['results'].set(samplePage);
    component['choose']('pat-1');
    expect(component['selectedPatient']()).toBeTruthy();
    component['clearSelection']();
    expect(component['selectedPatient']()).toBeNull();
    expect(component['selectedPatientId']()).toBe('');
  });

  it('selects and navigates to book in one step via selectAndBook', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component['selectAndBook'](sampleSearchItem);
    expect(component['selectedPatientId']()).toBe('pat-1');
    expect(navigate).toHaveBeenCalledWith(
      ['/reception/reservations'],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          practiceId: 'practice-1',
          patientId: 'pat-1',
        }),
      }),
    );
  });

  it('calculates age correctly from date of birth', () => {
    expect(component['calculateAge'](null)).toBeNull();
    expect(component['calculateAge']('')).toBeNull();
    expect(component['calculateAge']('invalid-date')).toBeNull();
    const currentYear = new Date().getFullYear();
    const age = component['calculateAge'](`${currentYear - 25}-01-01`);
    expect(age).toBeGreaterThanOrEqual(24);
  });

  it('switches practice when onPracticeChange is triggered', () => {
    const context = TestBed.inject(ReceptionPracticeContext);
    const spy = vi.spyOn(context, 'select');
    const mockEvent = { target: { value: 'practice-2' } } as unknown as Event;
    component['onPracticeChange'](mockEvent);
    expect(spy).toHaveBeenCalledWith('practice-2');
  });

  it('updates pageSize and triggers search on page 1 when setPageSize is called', async () => {
    patientsApi.search.mockClear();
    component['setPageSize'](15);
    expect(component['searchModel']().pageSize).toBe(15);
    expect(component['pageNumber']()).toBe(1);
    expect(patientsApi.search).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 15,
        pageNumber: 1,
      }),
    );

    component['setPageSize'](20);
    expect(component['searchModel']().pageSize).toBe(20);
    expect(patientsApi.search).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 20,
        pageNumber: 1,
      }),
    );
  });

  it('navigates through pages via goToPage within valid bounds', async () => {
    component['results'].set({
      items: [sampleSearchItem],
      pageNumber: 1,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
    });
    fixture.detectChanges();

    expect(component['totalPages']()).toBe(3);
    patientsApi.search.mockClear();

    // Go to next page (2)
    component['goToPage'](2);
    expect(component['pageNumber']()).toBe(2);
    expect(patientsApi.search).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumber: 2,
      }),
    );

    // Ignore invalid bounds
    patientsApi.search.mockClear();
    component['goToPage'](0);
    component['goToPage'](4);
    component['goToPage'](2); // same page
    expect(patientsApi.search).not.toHaveBeenCalled();
  });

  it('calculates startIndex and endIndex accurately', () => {
    component['results'].set({
      items: [sampleSearchItem, sampleSearchItem],
      pageNumber: 2,
      pageSize: 10,
      totalCount: 15,
      totalPages: 2,
    });
    component['pageNumber'].set(2);

    expect(component['startIndex']()).toBe(11);
    expect(component['endIndex']()).toBe(12);
  });
});
