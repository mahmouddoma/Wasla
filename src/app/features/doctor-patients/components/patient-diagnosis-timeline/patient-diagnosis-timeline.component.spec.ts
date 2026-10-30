import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientDiagnosisTimelineComponent } from './patient-diagnosis-timeline.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { ToastService } from '../../../../core/notifications/toast.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('PatientDiagnosisTimelineComponent', () => {
  let component: PatientDiagnosisTimelineComponent;
  let fixture: ComponentFixture<PatientDiagnosisTimelineComponent>;
  let doctorPatientsApi: { diagnoses: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  const mockDiagnosis = {
    diagnosisId: 'diag-1',
    encounterId: 'enc-1',
    practiceId: 'prac-1',
    businessDate: '2026-10-28',
    encounterDate: '2026-10-28T09:00:00Z',
    diagnosisType: 'Primary',
    displayText: 'Acute Bronchitis',
    encounterStatus: 'Completed',
    isActive: true,
    isHistoricalPractice: false,
  };

  beforeEach(async () => {
    doctorPatientsApi = {
      diagnoses: vi
        .fn()
        .mockReturnValue(
          of({ items: [mockDiagnosis], totalCount: 1, pageNumber: 1, pageSize: 15 }),
        ),
    };
    toast = {
      error: vi.fn(),
      success: vi.fn(),
    };
    router = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PatientDiagnosisTimelineComponent],
      providers: [
        { provide: DoctorPatientsApi, useValue: doctorPatientsApi },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientDiagnosisTimelineComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'pat-1');
    fixture.componentRef.setInput('canViewEncounters', true);
    fixture.detectChanges();
  });

  it('creates component and loads diagnoses', () => {
    expect(component).toBeTruthy();
    expect(doctorPatientsApi.diagnoses).toHaveBeenCalledWith('pat-1', {
      pageNumber: 1,
      pageSize: 15,
    });
    expect(component.diagnoses().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('navigates to encounter', () => {
    const viewEncounterSpy = vi.fn();
    component.viewEncounter.subscribe(viewEncounterSpy);

    component.navigateToEncounter(mockDiagnosis);

    expect(viewEncounterSpy).toHaveBeenCalledWith({ encounterId: 'enc-1', practiceId: 'prac-1' });
    expect(router.navigate).toHaveBeenCalledWith(['/doctor/encounters'], {
      queryParams: { practiceId: 'prac-1', encounterId: 'enc-1' },
    });
  });

  it('renders diagnosis identity, structured metadata and an explicit encounter action', () => {
    expect(fixture.nativeElement.querySelector('.diagnosis-title').textContent).toContain(
      'Acute Bronchitis',
    );
    expect(fixture.nativeElement.querySelectorAll('.diagnosis-meta dd').length).toBe(3);
    const action: HTMLButtonElement = fixture.nativeElement.querySelector('.encounter-action');
    expect(action.querySelector('.fa-file-medical')).toBeTruthy();
    action.click();
    expect(router.navigate).toHaveBeenCalledWith(['/doctor/encounters'], {
      queryParams: { practiceId: 'prac-1', encounterId: 'enc-1' },
    });
    fixture.componentRef.setInput('canViewEncounters', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.encounter-action')).toBeNull();
  });

  it('does not open an encounter when the patient capability is absent', () => {
    fixture.componentRef.setInput('canViewEncounters', false);
    component.navigateToEncounter(mockDiagnosis);
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('handles load error', () => {
    doctorPatientsApi.diagnoses.mockReturnValue(throwError(() => new Error('Error')));
    component.loadDiagnoses();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});
