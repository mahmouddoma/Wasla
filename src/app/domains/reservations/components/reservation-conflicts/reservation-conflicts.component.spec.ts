import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReservationConflictsComponent } from './reservation-conflicts.component';
describe('ReservationConflictsComponent', () => {
  it('renders structured affected reservations and scoped inspection links', () => {
    TestBed.configureTestingModule({
      imports: [ReservationConflictsComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ReservationConflictsComponent);
    fixture.componentRef.setInput('practiceId', 'p1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    fixture.componentRef.setInput('conflict', {
      affectedReservationsCount: 2,
      affectedReservations: [
        {
          reservationId: 'r1',
          reference: 'W-1',
          businessDate: '2026-09-20',
          scheduledTime: '18:00',
        },
      ],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('W-1');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toContain(
      'reservationId=r1',
    );
  });
});
