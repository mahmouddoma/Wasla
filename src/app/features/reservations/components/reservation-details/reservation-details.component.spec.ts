import { TestBed } from '@angular/core/testing';
import { ReservationDetailsComponent } from './reservation-details.component';
import { reservationFixture } from '../../reservation-test-fixtures';
describe('ReservationDetailsComponent', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  beforeEach(() => TestBed.configureTestingModule({ imports: [ReservationDetailsComponent] }));
  function create(admin = false) {
    const f = TestBed.createComponent(ReservationDetailsComponent);
    f.componentRef.setInput('reservation', reservationFixture);
    f.componentRef.setInput('administrative', admin);
    f.componentRef.setInput('canCancel', true);
    f.detectChanges();
    return f;
  }
  it('renders appointment details and emits a permitted cancellation', () => {
    const f = create();
    expect(f.nativeElement.textContent).toContain('R-100');
    const emit = vi.spyOn(f.componentInstance.action, 'emit');
    f.nativeElement.querySelector('button').click();
    expect(emit).toHaveBeenCalledWith('cancel');
  });
  it('never exposes booking notes or mutation controls to administrative viewers', () => {
    const f = create(true);
    expect(f.nativeElement.textContent).not.toContain('PRIVATE NOTE');
    expect(f.nativeElement.querySelector('button')).toBeNull();
  });
  it('hides mutations when capabilities are unavailable', () => {
    const f = create();
    f.componentRef.setInput('canCancel', false);
    f.detectChanges();
    expect(f.nativeElement.querySelector('button')).toBeNull();
  });
  it('keeps Reception identity primary and puts reference and timeline inside Additional details', () => {
    const f = create();
    f.componentRef.setInput('reception', true);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.res-reception-identity').textContent).not.toContain(
      'R-100',
    );
    expect(f.nativeElement.querySelector('.res-reception-identity h3')).toBeTruthy();
    const details = f.nativeElement.querySelector('details');
    expect(details.open).toBe(false);
    expect(details.textContent).toContain('R-100');
    expect(f.nativeElement.querySelector('.status-dot-pulse')).toBeNull();
  });
});
