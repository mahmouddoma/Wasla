import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReservationCheckInComponent } from './reservation-check-in.component';

describe('ReservationCheckInComponent', () => {
  let fixture: ComponentFixture<ReservationCheckInComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationCheckInComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ReservationCheckInComponent);
    fixture.componentRef.setInput('expectedPrice', 250);
    fixture.componentRef.setInput('canForce', true);
    await fixture.whenStable();
  });

  it('creates and renders the locked price shortcut', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('250');
  });

  it('emits a normal check-in with the expected payment', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.checkIn.subscribe(emitted);
    (fixture.nativeElement.querySelector('.price-shortcut') as HTMLButtonElement).click();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(emitted).toHaveBeenCalledWith({ paidAmount: 250, force: false, reason: '' });
  });

  it('requires a reason for forced check-in', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.mode-switch button');
    (buttons[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('textarea')).toBeTruthy();
    expect(
      (fixture.nativeElement.querySelector('.submit-action') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('rejects a payment that differs from the locked reservation price', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.checkIn.subscribe(emitted);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '200';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(
      (fixture.nativeElement.querySelector('.submit-action') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(emitted).not.toHaveBeenCalled();
  });
});
