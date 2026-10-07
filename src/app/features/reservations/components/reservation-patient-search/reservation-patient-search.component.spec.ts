import { TestBed } from '@angular/core/testing';
import { ReservationPatientSearchComponent } from './reservation-patient-search.component';
describe('ReservationPatientSearchComponent', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('emits structured name, phone and DOB search without submitting its parent form', () => {
    const fixture = TestBed.createComponent(ReservationPatientSearchComponent);
    const component = fixture.componentInstance;
    const emitted = vi.fn();
    component.search.subscribe(emitted);
    component.model.set({
      name: 'Synthetic',
      phoneNumber: '01011122233',
      dateOfBirth: '1990-01-01',
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(emitted).toHaveBeenCalledWith(component.model());
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('input[type=date]').dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(emitted).toHaveBeenCalledTimes(2);
  });
  it('renders contact phone guidance, selects a result, and blocks searching while busy', () => {
    const fixture = TestBed.createComponent(ReservationPatientSearchComponent);
    fixture.componentRef.setInput('results', [
      {
        patientId: 'p1',
        nameAr: 'Synthetic',
        nameEn: 'Synthetic',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        phoneNumber: null,
        hasContactPhone: true,
      },
    ]);
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.patient-option').click();
    expect(selected).toHaveBeenCalledWith('p1');
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
  });
  it('shows an illustrated empty state and a distinct failure state', () => {
    const fixture = TestBed.createComponent(ReservationPatientSearchComponent);
    fixture.componentRef.setInput('searched', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state img')).toBeTruthy();
    fixture.componentRef.setInput('failed', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
  });
});
