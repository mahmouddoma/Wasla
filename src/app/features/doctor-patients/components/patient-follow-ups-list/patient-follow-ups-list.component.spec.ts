import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientFollowUpsListComponent } from './patient-follow-ups-list.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { of, throwError } from 'rxjs';

describe('PatientFollowUpsListComponent', () => {
  let component: PatientFollowUpsListComponent;
  let fixture: ComponentFixture<PatientFollowUpsListComponent>;
  let doctorPatientsApi: { followUps: ReturnType<typeof vi.fn> };

  const mockFollowUp = {
    eligibilityId: 'fu-1',
    sourceEncounterId: 'enc-1',
    practiceId: 'p-1',
    status: 'Available',
    validUntil: '2026-11-15',
    reservedReservationId: null,
    reservedTicketId: null,
    consumedEncounterId: null,
    canBook: false,
    canCreateFollowUpFromSource: false,
    isHistoricalPractice: false,
  };

  beforeEach(async () => {
    doctorPatientsApi = {
      followUps: vi.fn().mockReturnValue(of({ items: [mockFollowUp], totalCount: 1, pageNumber: 1, pageSize: 10 })),
    };

    await TestBed.configureTestingModule({
      imports: [PatientFollowUpsListComponent],
      providers: [
        { provide: DoctorPatientsApi, useValue: doctorPatientsApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientFollowUpsListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'pat-1');
    fixture.detectChanges();
  });

  it('creates component and loads follow-ups', () => {
    expect(component).toBeTruthy();
    expect(doctorPatientsApi.followUps).toHaveBeenCalledWith('pat-1', { pageNumber: 1, pageSize: 10 });
    expect(component.followUps().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('handles load error', () => {
    doctorPatientsApi.followUps.mockReturnValue(throwError(() => new Error('Error')));
    component.loadFollowUps();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});

