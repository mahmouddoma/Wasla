import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../../core/i18n/language.service';
import { SimpleChange } from '@angular/core';
import { PatientDetailDrawerComponent } from './patient-detail-drawer.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { ToastService } from '../../../../core/notifications/toast.service';
import { of, throwError } from 'rxjs';

describe('PatientDetailDrawerComponent', () => {
  let component: PatientDetailDrawerComponent;
  let fixture: ComponentFixture<PatientDetailDrawerComponent>;
  let doctorPatientsApi: { overview: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  const mockOverview = {
    patient: {
      patientId: 'pat-1',
      nameAr: 'أحمد محمود',
      nameEn: 'Ahmed Mahmoud',
      phoneNumber: '01012345678',
      email: 'ahmed@example.com',
      dateOfBirth: '1995-05-12',
      age: 31,
      gender: 'Male' as const,
      firstAttendanceAtUtc: '2026-01-01T08:00:00Z',
      lastAttendanceAtUtc: '2026-10-28T08:00:00Z',
      lastAttendanceBusinessDate: '2026-10-28',
      attendanceCount: 3,
      completedEncounterCount: 2,
      practiceCount: 1,
      lastPractice: { id: 'p-1', nameAr: 'عيادة النصر', nameEn: 'Al-Nasr Clinic', isActive: true },
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
    },
    practices: [{ id: 'p-1', nameAr: 'عيادة النصر', nameEn: 'Al-Nasr Clinic', isActive: true }],
    lastAttendance: {
      ticketId: 't-1',
      practiceId: 'p-1',
      practiceName: 'عيادة النصر',
      businessDate: '2026-10-28',
      checkInAtUtc: '2026-10-28T08:00:00Z',
      source: 'WalkIn',
      checkInMode: 'Kiosk',
      ticketStatus: 'Completed',
      ticketNumber: 42,
      isArchived: false,
      linkedReservationId: null,
      encounterId: 'enc-1',
      encounterStatus: 'Completed',
      canViewTicket: true,
      canViewEncounter: true,
    },
    lastDiagnosis: {
      diagnosisId: 'diag-1',
      encounterId: 'enc-1',
      practiceId: 'p-1',
      businessDate: '2026-10-28',
      encounterDate: '2026-10-28T09:00:00Z',
      diagnosisType: 'Primary',
      displayText: 'Acute Tonsillitis',
      encounterStatus: 'Completed',
      isActive: true,
      isHistoricalPractice: false,
    },
    lastPrescription: null,
    labRequestCount: 2,
    radiologyRequestCount: 0,
    nextAppointment: null,
    currentFollowUp: null,
  };

  beforeEach(async () => {
    doctorPatientsApi = {
      overview: vi.fn().mockReturnValue(of(mockOverview)),
    };
    toast = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PatientDetailDrawerComponent],
      providers: [
        { provide: DoctorPatientsApi, useValue: doctorPatientsApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PatientDetailDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('translates patient demographics when switching language in the open drawer', async () => {
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('patientId', 'pat-1');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.meta-row')?.textContent).toContain('ذكر');

    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    expect(element.querySelector('.meta-row')?.textContent).toContain('Male');
    expect(element.querySelector('.secondary-name')?.tagName).toBe('BDI');
  });

  it('loads overview when drawer is opened with patientId', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('patientId', 'pat-1');
    component.ngOnChanges({
      opened: new SimpleChange(false, true, true),
      patientId: new SimpleChange(null, 'pat-1', true),
    });

    expect(doctorPatientsApi.overview).toHaveBeenCalledWith('pat-1');
    expect(component.overview()?.patient.nameAr).toBe('أحمد محمود');
    expect(component.capabilities()?.canViewAttendances).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('switches tabs only after the patient source grants access', async () => {
    component.setTab('diagnoses');
    expect(component.activeTab()).toBe('overview');
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('patientId', 'pat-1');
    await fixture.whenStable();
    component.setTab('diagnoses');
    expect(component.activeTab()).toBe('diagnoses');
  });

  it('clears state on close', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('patientId', 'pat-1');
    component.loadOverview();

    const closedSpy = vi.fn();
    component.closed.subscribe(closedSpy);

    component.onClose();

    expect(component.overview()).toBeNull();
    expect(closedSpy).toHaveBeenCalled();
  });

  it('handles overview load error', () => {
    doctorPatientsApi.overview.mockReturnValue(throwError(() => new Error('Error')));
    fixture.componentRef.setInput('patientId', 'pat-1');
    component.loadOverview();

    expect(component.error()).toBe(true);
    expect(toast.error).toHaveBeenCalledWith('تعذر تحميل بيانات المريض');
    expect(component.loading()).toBe(false);
  });
});
