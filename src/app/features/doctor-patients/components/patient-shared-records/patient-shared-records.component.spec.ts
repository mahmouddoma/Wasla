import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientSharedRecordsComponent } from './patient-shared-records.component';
import { MedicalRecordsApi } from '../../../../domains/medical-records';
import { of, throwError } from 'rxjs';

describe('PatientSharedRecordsComponent', () => {
  let component: PatientSharedRecordsComponent;
  let fixture: ComponentFixture<PatientSharedRecordsComponent>;
  let medicalRecordsApi: { doctorTreatingOverview: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    medicalRecordsApi = {
      doctorTreatingOverview: vi.fn().mockReturnValue(of({
        patientId: 'pat-1',
        patientName: 'Patient Name',
        ticketId: 't-1',
        encounterId: 'e-1',
        visitsCount: 3,
        diagnosesCount: 2,
        prescriptionsCount: 4,
        labOrdersCount: 1,
        radiologyOrdersCount: 0,
        hiddenEncountersCount: 0,
      })),
    };

    await TestBed.configureTestingModule({
      imports: [PatientSharedRecordsComponent],
      providers: [
        { provide: MedicalRecordsApi, useValue: medicalRecordsApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientSharedRecordsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'pat-1');
    fixture.detectChanges();
  });

  it('creates component and displays locked notice when no active encounter session', () => {
    expect(component).toBeTruthy();
    expect(component.overview()).toBeNull();
    expect(medicalRecordsApi.doctorTreatingOverview).not.toHaveBeenCalled();
  });

  it('loads treating doctor overview when active ticket and practice are provided', () => {
    fixture.componentRef.setInput('activeTicketId', 't-1');
    fixture.componentRef.setInput('activePracticeId', 'p-1');
    component.checkAndLoad();

    expect(medicalRecordsApi.doctorTreatingOverview).toHaveBeenCalledWith('p-1', 't-1');
    expect(component.overview()?.diagnosesCount).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('handles load error', () => {
    fixture.componentRef.setInput('activeTicketId', 't-1');
    fixture.componentRef.setInput('activePracticeId', 'p-1');
    medicalRecordsApi.doctorTreatingOverview.mockReturnValue(throwError(() => new Error('Error')));

    component.checkAndLoad();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});
