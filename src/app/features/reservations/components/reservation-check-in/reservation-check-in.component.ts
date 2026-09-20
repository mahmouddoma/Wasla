import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormField, form, min, required, submit, validate } from '@angular/forms/signals';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { CheckInSubmission } from '../../../../domains/tickets';

@Component({
  selector: 'app-reservation-check-in',
  imports: [FormField, TranslatePipe],
  templateUrl: './reservation-check-in.component.html',
  styleUrl: './reservation-check-in.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationCheckInComponent {
  readonly expectedPrice = input<number | undefined>();
  readonly canNormal = input(true);
  readonly canForce = input(false);
  readonly busy = input(false);
  readonly checkIn = output<CheckInSubmission>();

  protected readonly model = signal({ paidAmount: 0, force: false, reason: '' });
  protected readonly checkInForm = form(this.model, (path) => {
    required(path.paidAmount, { message: 'tickets.validation.paymentRequired' });
    min(path.paidAmount, 0.01, { message: 'tickets.validation.paymentPositive' });
    validate(path.paidAmount, ({ value }) => {
      const expectedPrice = this.expectedPrice();
      return expectedPrice === undefined || value() === expectedPrice
        ? undefined
        : { kind: 'priceMismatch', message: 'tickets.validation.paymentExact' };
    });
    required(path.reason, {
      when: ({ valueOf }) => valueOf(path.force),
      message: 'tickets.validation.reasonRequired',
    });
  });

  constructor() {
    effect(() => {
      if (!this.canNormal() && this.canForce() && !this.model().force)
        this.model.update((value) => ({ ...value, force: true }));
    });
  }

  protected setForce(force: boolean): void {
    if ((!force && this.canNormal()) || (force && this.canForce()))
      this.model.update((value) => ({ ...value, force }));
  }

  protected useExpectedPrice(): void {
    const price = this.expectedPrice();
    if (price !== undefined) this.model.update((value) => ({ ...value, paidAmount: price }));
  }

  protected submit(): void {
    submit(this.checkInForm, async () => {
      const value = this.model();
      if ((value.force && !this.canForce()) || (!value.force && !this.canNormal())) return;
      this.checkIn.emit({ ...value, reason: value.reason.trim() });
    });
  }
}
