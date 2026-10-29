import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DoctorPatientsDirectoryComponent } from './doctor-patients-directory.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { ToastService } from '../../../../core/notifications/toast.service';
import { of, throwError } from 'rxjs';

describe('DoctorPatientsDirectoryComponent', () => {
  let component: DoctorPatientsDirectoryComponent;
  let fixture: ComponentFixture<DoctorPatientsDirectoryComponent>;
  let doctorPatientsApi: { list: ReturnType<typeof vi.fn>; overview: ReturnType<typeof vi.fn> };
  let doctorPracticesApi: { list: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  const mockPatientItem = {
    patientId: 'pat-1',
    nameAr: 'علي حسن',
    nameEn: 'Ali Hassan',
    phoneNumber: '01098765432',
    email: null,
    dateOfBirth: '1990-01-01',
    age: 36,
    gender: 'Male' as const,
    firstAttendanceAtUtc: '2026-05-01T08:00:00Z',
    lastAttendanceAtUtc: '2026-10-28T08:00:00Z',
    lastAttendanceBusinessDate: '2026-10-28',
    attendanceCount: 2,
    completedEncounterCount: 1,
    practiceCount: 1,
    lastPractice: { id: 'prac-1', nameAr: 'عيادة التجمع', nameEn: 'Tagamoa Clinic', isActive: true },
    hasUpcomingAppointment: true,
    historicalOnly: false,
    capabilities: {
      canViewAttendances: true,
      canViewEncounters: true,
      canViewDiagnoses: true,
      canViewPrescriptions: true,
      canExportPrescriptions: true,
      canViewAppointments: true,
      canViewFollowUps: true,
      canViewLabRequests: true,
      canViewLabResults: true,
      canViewLabSubmissions: true,
      canViewRadiologyRequests: true,
      canViewRadiologyResults: true,
      canViewRadiologySubmissions: true,
    },
  };

  const mockResponse = {
    items: [mockPatientItem],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 20,
    summary: {
      allTimeUniquePatients: 100,
      attendedLast30Days: 25,
      returningPatients: 40,
    },
    asOfUtc: '2026-10-28T08:00:00Z',
  };

  beforeEach(async () => {
    doctorPatientsApi = {
      list: vi.fn().mockReturnValue(of(mockResponse)),
      overview: vi.fn().mockReturnValue(of({
        patient: mockPatientItem,
        practices: [],
        lastAttendance: null,
        lastDiagnosis: null,
        lastPrescription: null,
        labRequestCount: null,
        radiologyRequestCount: null,
        nextAppointment: null,
        currentFollowUp: null,
      })),
    };
    doctorPracticesApi = {
      list: vi.fn().mockReturnValue(of([
        { id: 'prac-1', nameAr: 'عيادة التجمع', nameEn: 'Tagamoa Clinic', isActive: true },
      ])),
    };
    toast = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DoctorPatientsDirectoryComponent],
      providers: [
        provideRouter([]),
        { provide: DoctorPatientsApi, useValue: doctorPatientsApi },
        { provide: DoctorPracticesApi, useValue: doctorPracticesApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorPatientsDirectoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates component and loads patients and summary metrics', () => {
    expect(component).toBeTruthy();
    expect(doctorPatientsApi.list).toHaveBeenCalled();
    expect(component.patients().length).toBe(1);
    expect(component.summary()?.allTimeUniquePatients).toBe(100);
    expect(component.loading()).toBe(false);
  });

  it('filters by search term and resets pagination', () => {
    component.search.set('علي');
    component.onSearch();

    expect(doctorPatientsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'علي',
        pageNumber: 1,
      }),
    );
  });

  it('resets filters cleanly', () => {
    component.search.set('علي');
    component.selectedPracticeId.set('prac-1');
    component.resetFilters();

    expect(component.search()).toBe('');
    expect(component.selectedPracticeId()).toBe('');
    expect(component.pageNumber()).toBe(1);
  });

  it('opens patient drawer on click', () => {
    component.openPatient('pat-1');
    expect(component.drawerOpened()).toBe(true);
    expect(component.inspectedPatientId()).toBe('pat-1');

    component.closeDrawer();
    expect(component.drawerOpened()).toBe(false);
    expect(component.inspectedPatientId()).toBeNull();
  });

  it('handles load error with customized message', () => {
    doctorPatientsApi.list.mockReturnValue(throwError(() => ({ status: 403 })));
    component.loadPatients();

    expect(component.error()).toBe(true);
    expect(component.errorMessage()).toBe('ليس لديك صلاحية لعرض سجل المرضى');
    expect(component.loading()).toBe(false);
  });
});

