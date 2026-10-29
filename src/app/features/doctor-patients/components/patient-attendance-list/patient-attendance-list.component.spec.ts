import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientAttendanceListComponent } from './patient-attendance-list.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { TicketsApi } from '../../../../domains/tickets';
import { ToastService } from '../../../../core/notifications/toast.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('PatientAttendanceListComponent', () => {
  let component: PatientAttendanceListComponent;
  let fixture: ComponentFixture<PatientAttendanceListComponent>;
  let doctorPatientsApi: { attendances: ReturnType<typeof vi.fn> };
  let ticketsApi: { ticket: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  const mockAttendance = {
    ticketId: 't-1',
    practiceId: 'p-1',
    practiceName: 'Main Clinic',
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
  };

  beforeEach(async () => {
    doctorPatientsApi = {
      attendances: vi.fn().mockReturnValue(of({ items: [mockAttendance], totalCount: 1, pageNumber: 1, pageSize: 10 })),
    };
    ticketsApi = {
      ticket: vi.fn().mockReturnValue(of({
        ticketId: 't-1',
        ticketNumber: 42,
        status: 'Completed',
        businessDate: '2026-10-28',
        checkInTimeUtc: '2026-10-28T08:00:00Z',
        source: 'WalkIn',
        checkInMode: 'Kiosk',
      })),
    };
    toast = {
      error: vi.fn(),
      success: vi.fn(),
    };
    router = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PatientAttendanceListComponent],
      providers: [
        { provide: DoctorPatientsApi, useValue: doctorPatientsApi },
        { provide: TicketsApi, useValue: ticketsApi },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientAttendanceListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'pat-1');
    fixture.detectChanges();
  });

  it('creates component and loads attendances', () => {
    expect(component).toBeTruthy();
    expect(doctorPatientsApi.attendances).toHaveBeenCalledWith('pat-1', { pageNumber: 1, pageSize: 10 });
    expect(component.attendances().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('inspects ticket and displays modal', () => {
    component.inspectTicket(mockAttendance);
    expect(ticketsApi.ticket).toHaveBeenCalledWith('p-1', 't-1');
    expect(component.selectedTicket()?.ticketNumber).toBe(42);

    component.closeTicketModal();
    expect(component.selectedTicket()).toBeNull();
  });

  it('navigates to encounter when authorized', () => {
    const viewEncounterSpy = vi.fn();
    component.viewEncounter.subscribe(viewEncounterSpy);

    component.navigateToEncounter(mockAttendance);

    expect(viewEncounterSpy).toHaveBeenCalledWith({ encounterId: 'enc-1', practiceId: 'p-1' });
    expect(router.navigate).toHaveBeenCalledWith(['/doctor/encounters'], {
      queryParams: { practiceId: 'p-1', encounterId: 'enc-1' },
    });
  });

  it('handles load error', () => {
    doctorPatientsApi.attendances.mockReturnValue(throwError(() => new Error('Network error')));
    component.loadAttendances();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});

