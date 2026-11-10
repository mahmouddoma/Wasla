import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PatientBookingDrawerComponent } from './patient-booking-drawer.component';
import { PatientBookingState } from './patient-booking.state';

describe('PatientBookingDrawerComponent', () => {
  it('displays the coordinator failure and delegates patient selection without creating a booking', async () => {
    const selectPatient = vi.fn();
    const booking = {
      opened: signal(true), loading: signal(false), submitting: signal(false),
      messages: signal(['booking.selectionExpired']), receipt: signal(null), doctor: signal(null),
      close: vi.fn(), selectPatient,
    };
    TestBed.configureTestingModule({ imports: [PatientBookingDrawerComponent],
      providers: [provideRouter([]), { provide: PatientBookingState, useValue: booking }] });
    const fixture = TestBed.createComponent(PatientBookingDrawerComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    const select = document.createElement('select');
    select.add(new Option('Patient', 'patient-1'));
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: select });
    fixture.componentInstance.selectPatient(event);
    expect(selectPatient).toHaveBeenCalledWith('patient-1');
  });
});
