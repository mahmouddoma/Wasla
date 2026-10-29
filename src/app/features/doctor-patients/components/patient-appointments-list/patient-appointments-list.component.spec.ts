import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientAppointmentsListComponent } from './patient-appointments-list.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { Router, provideRouter } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ReservationsApi } from '../../../../domains/reservations';
import { ToastService } from '../../../../core/notifications/toast.service';
import { of, throwError } from 'rxjs';

describe('PatientAppointmentsListComponent', () => {
  let component: PatientAppointmentsListComponent;
  let fixture: ComponentFixture<PatientAppointmentsListComponent>;
  let doctorPatientsApi: { appointments: ReturnType<typeof vi.fn> };
  let reservationsApi: { cancel: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  const mockAppointment = {
    reservationId: 'res-1',
    practiceId: 'prac-1',
    businessDate: '2026-10-30',
    scheduledStart: '2026-10-30T10:00:00Z',
    visitType: 'Regular',
    segment: 'Morning',
    status: 'Active',
    linkedTicketId: null,
    followUpEligibilityId: null,
    isArchived: false,
    source: 'Patient',
  };

  beforeEach(async () => {
    doctorPatientsApi = {
      appointments: vi
        .fn()
        .mockReturnValue(
          of({ items: [mockAppointment], totalCount: 1, pageNumber: 1, pageSize: 10 }),
        ),
    };
    reservationsApi = {
      cancel: vi.fn().mockReturnValue(of({})),
    };
    toast = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PatientAppointmentsListComponent],
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: { hasPermission: () => true } },
        { provide: DoctorPatientsApi, useValue: doctorPatientsApi },
        { provide: ReservationsApi, useValue: reservationsApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientAppointmentsListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'pat-1');
    fixture.detectChanges();
  });

  it('creates component and loads appointments', () => {
    expect(component).toBeTruthy();
    expect(doctorPatientsApi.appointments).toHaveBeenCalledWith('pat-1', {
      pageNumber: 1,
      pageSize: 10,
    });
    expect(component.appointments().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('opens the original reservation workflow with source IDs instead of sending a fabricated revision', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.viewReservation(mockAppointment);
    expect(navigate).toHaveBeenCalledWith(['/doctor/reservations'], {
      queryParams: { practiceId: 'prac-1', reservationId: 'res-1', returnPatientId: 'pat-1' },
    });
    expect(reservationsApi.cancel).not.toHaveBeenCalled();
  });

  it('handles load error', () => {
    doctorPatientsApi.appointments.mockReturnValue(throwError(() => new Error('Error')));
    component.loadAppointments();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});
