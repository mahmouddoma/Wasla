import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientAttendanceListComponent } from './patient-attendance-list.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { TicketsApi } from '../../../../domains/tickets';
import { ToastService } from '../../../../core/notifications/toast.service';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

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
      attendances: vi
        .fn()
        .mockReturnValue(
          of({ items: [mockAttendance], totalCount: 1, pageNumber: 1, pageSize: 10 }),
        ),
    };
    ticketsApi = {
      ticket: vi.fn().mockReturnValue(
        of({
          ticketId: 't-1',
          ticketNumber: 42,
          status: 'Completed',
          businessDate: '2026-10-28',
          checkInTimeUtc: '2026-10-28T08:00:00Z',
          source: 'WalkIn',
          checkInMode: 'Kiosk',
        }),
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
    expect(doctorPatientsApi.attendances).toHaveBeenCalledWith('pat-1', {
      pageNumber: 1,
      pageSize: 10,
    });
    expect(component.attendances().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('expands ticket details inside the visit list without opening another drawer', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.action-cell .btn-link');
    button.click();
    fixture.detectChanges();
    expect(ticketsApi.ticket).toHaveBeenCalledWith('p-1', 't-1');
    expect(component.selectedTicket()?.ticketNumber).toBe(42);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.attendance-entry .ticket-details')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-side-drawer')).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();

    button.click();
    fixture.detectChanges();
    expect(component.selectedTicket()).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.ticket-details')).toBeNull();
  });

  it('shows loading in place and cancels the ticket request when collapsed', () => {
    const pendingTicket = new Subject();
    ticketsApi.ticket.mockReturnValue(pendingTicket);
    component.inspectTicket(mockAttendance);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ticket-loading[role="status"]')).toBeTruthy();
    expect(pendingTicket.observed).toBe(true);
    component.closeTicketDetails();
    fixture.detectChanges();
    expect(pendingTicket.observed).toBe(false);
    expect(component.viewingTicketLoading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.ticket-details')).toBeNull();
  });

  it('keeps a failed ticket in place and allows retry without losing the visit list', () => {
    ticketsApi.ticket.mockReturnValue(throwError(() => new Error('Unavailable')));
    component.inspectTicket(mockAttendance);
    fixture.detectChanges();
    expect(component.ticketLoadFailed()).toBe(true);
    expect(fixture.nativeElement.querySelector('.ticket-details [role="alert"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.attendance-row')).toBeTruthy();
    ticketsApi.ticket.mockReturnValue(of({ ticketNumber: 42, status: 'Completed' }));
    fixture.nativeElement.querySelector('.ticket-details .error-state button').click();
    fixture.detectChanges();
    expect(component.ticketLoadFailed()).toBe(false);
    expect(fixture.nativeElement.querySelector('.ticket-facts')).toBeTruthy();
  });

  it('clears expanded details when the visit list is refreshed and enforces permissions', () => {
    component.inspectTicket(mockAttendance);
    component.loadAttendances();
    expect(component.inspectedAttendance()).toBeNull();
    expect(component.selectedTicket()).toBeNull();
    ticketsApi.ticket.mockClear();
    component.inspectTicket({ ...mockAttendance, canViewTicket: false });
    expect(ticketsApi.ticket).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
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

  it('renders the immutable source timeline without mutation controls', () => {
    ticketsApi.ticket.mockReturnValue(
      of({
        status: 'Completed',
        timeline: [
          { eventId: 'evt-1', eventType: 'Completed', occurredAtUtc: '2026-10-28T09:00:00Z' },
        ],
      }),
    );
    component.inspectTicket(mockAttendance);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ticket-timeline li')?.textContent).toContain(
      component.ticketEventLabel('Completed'),
    );
    expect(component.ticketEventLabel('UnknownFutureEvent')).not.toContain('UnknownFutureEvent');
  });
  it('handles load error', () => {
    doctorPatientsApi.attendances.mockReturnValue(throwError(() => new Error('Network error')));
    component.loadAttendances();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});
