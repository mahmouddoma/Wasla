import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientAppointmentsListComponent } from './patient-appointments-list.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
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

  it('cancels active appointment with reason', () => {
    component.openCancel(mockAppointment);
    expect(component.cancellingReservation()?.reservationId).toBe('res-1');

    component.cancelReason.set('Patient requested cancellation');
    component.confirmCancel();

    expect(reservationsApi.cancel).toHaveBeenCalledWith(
      { actor: 'Doctor', practiceId: 'prac-1' },
      'res-1',
      {
        reasonCode: 'DoctorCancelled',
        comment: 'Patient requested cancellation',
        rowVersion: 'AAAA==',
      },
      expect.any(String),
    );
    expect(toast.success).toHaveBeenCalledWith('تم إلغاء الموعد بنجاح');
  });

  it('handles load error', () => {
    doctorPatientsApi.appointments.mockReturnValue(throwError(() => new Error('Error')));
    component.loadAppointments();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});
