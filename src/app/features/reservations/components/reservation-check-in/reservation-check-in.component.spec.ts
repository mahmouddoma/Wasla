import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ReservationCheckInComponent } from './reservation-check-in.component';

describe('ReservationCheckInComponent', () => {
  let fixture: ComponentFixture<ReservationCheckInComponent>;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ReservationCheckInComponent] });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture = TestBed.createComponent(ReservationCheckInComponent);
    fixture.componentRef.setInput('expectedPrice', 250);
    fixture.componentRef.setInput('patientName', 'Synthetic patient');
    fixture.componentRef.setInput('canForce', true);
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  async function submit() {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }
  it('renders the patient and fixed amount without amount entry or price shortcut', () => {
    expect(fixture.nativeElement.textContent).toContain('Synthetic patient');
    expect(fixture.nativeElement.textContent).toContain('250');
    expect(fixture.nativeElement.querySelector('input[type=number]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.price-shortcut')).toBeNull();
    expect(fixture.nativeElement.querySelector('details').open).toBe(false);
  });
  it.each(['Cash', 'Card', 'Wallet'] as const)('emits fixed payment using %s', async (method) => {
    const emitted = vi.fn();
    fixture.componentInstance.checkIn.subscribe(emitted);
    const buttons = [
      ...fixture.nativeElement.querySelectorAll('.payment-methods button'),
    ] as HTMLButtonElement[];
    buttons[['Cash', 'Card', 'Wallet'].indexOf(method)].click();
    await fixture.whenStable();
    await submit();
    expect(emitted).toHaveBeenCalledWith({
      paidAmount: 250,
      paymentMethod: method,
      referenceNumber: null,
      notes: null,
      force: false,
      reason: '',
    });
  });
  it('keeps exceptional arrival secondary and requires its reason', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.checkIn.subscribe(emitted);
    const details = fixture.nativeElement.querySelector('.exception-options') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    details.open = true;
    fixture.nativeElement.querySelector('.exception-toggle').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.submit-action').disabled).toBe(true);
    await submit();
    expect(emitted).not.toHaveBeenCalled();
    const reason = details.querySelector('textarea')!;
    reason.value = 'Early arrival';
    reason.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    await submit();
    expect(emitted).toHaveBeenCalledWith(
      expect.objectContaining({ force: true, reason: 'Early arrival' }),
    );
  });
  it('supports force-only operators with an explicit reason flow', async () => {
    fixture.componentRef.setInput('canNormal', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.exception-options').open).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('exceptional arrival only');
    expect(fixture.nativeElement.querySelector('.exception-toggle')).toBeNull();
    expect(fixture.nativeElement.querySelector('.submit-action').disabled).toBe(true);
  });
  it('accepts zero price and describes it without implying cash collection', async () => {
    fixture.componentRef.setInput('expectedPrice', 0);
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.checkIn.subscribe(emitted);
    await submit();
    expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ paidAmount: 0 }));
    expect(fixture.nativeElement.querySelector('.amount-due').textContent).toContain(
      'No payment due',
    );
  });
  it('blocks submission while busy or price is unavailable and retains optional values', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.checkIn.subscribe(emitted);
    const reference = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    reference.value = 'POS-1';
    reference.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    await submit();
    expect(emitted).not.toHaveBeenCalled();
    fixture.componentRef.setInput('busy', false);
    await fixture.whenStable();
    expect(reference.value).toBe('POS-1');
    fixture.componentRef.setInput('expectedPrice', undefined);
    await fixture.whenStable();
    await submit();
    expect(emitted).not.toHaveBeenCalled();
  });
});
