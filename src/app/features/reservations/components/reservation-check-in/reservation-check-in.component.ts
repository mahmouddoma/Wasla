import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { CheckInSubmission } from '../../../../domains/tickets';
import { PaymentMethod } from '../../../../domains/finance';

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
  readonly patientName = input('');
  readonly appointmentDate = input('');
  readonly appointmentTime = input('');
  readonly visitName = input('');
  readonly currency = input('EGP');
  readonly paymentMethods = ['Cash', 'Card', 'Wallet'] as const;
  readonly checkIn = output<CheckInSubmission>();

  protected readonly model = signal({
    paymentMethod: 'Cash' as PaymentMethod,
    referenceNumber: '',
    notes: '',
    force: false,
    reason: '',
  });
  protected readonly checkInForm = form(this.model, (path) => {
    required(path.paymentMethod, { message: 'finance.validation.methodRequired' });
    required(path.reason, {
      when: ({ valueOf }) => valueOf(path.force),
      message: 'tickets.validation.reasonRequired',
    });
  });

  constructor() {
    effect(() => {
      if (!this.canNormal() && this.canForce() && !this.model().force)
        this.model.update((value) => ({ ...value, force: true }));
      if (!this.canForce() && this.model().force)
        this.model.update((value) => ({ ...value, force: false }));
    });
  }

  protected setForce(force: boolean): void {
    if (this.busy()) return;
    if ((!force && this.canNormal()) || (force && this.canForce()))
      this.model.update((value) => ({ ...value, force }));
  }

  protected choosePayment(paymentMethod: PaymentMethod): void {
    if (!this.busy()) this.model.update((value) => ({ ...value, paymentMethod }));
  }

  protected submit(): void {
    submit(this.checkInForm, async () => {
      const value = this.model();
      const price = this.expectedPrice();
      if (
        this.busy() ||
        price === undefined ||
        (value.force && !value.reason.trim()) ||
        (value.force && !this.canForce()) ||
        (!value.force && !this.canNormal())
      )
        return;
      this.checkIn.emit({
        ...value,
        paidAmount: price,
        reason: value.reason.trim(),
        referenceNumber: value.referenceNumber.trim() || null,
        notes: value.notes.trim() || null,
      });
    });
  }
}
