import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Reservation, ReservationLabel } from '../../../../domains/reservations';
@Component({
  selector: 'app-reservation-details',
  imports: [TranslatePipe],
  templateUrl: './reservation-details.component.html',
  styleUrl: './reservation-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationDetailsComponent {
  readonly reservation = input.required<Reservation>();
  readonly administrative = input(false);
  readonly canCancel = input(false);
  readonly canReschedule = input(false);
  readonly canRestore = input(false);
  readonly statuses = input<ReservationLabel[]>([]);
  readonly bookingSources = input<ReservationLabel[]>([]);
  readonly action = output<'cancel' | 'reschedule' | 'restore'>();
  readonly language = inject(LanguageService);
  label(item: { nameAr: string; nameEn?: string | null }): string {
    return this.language.currentLang() === 'en' ? item.nameEn || item.nameAr : item.nameAr;
  }
  source(code: string): string {
    const source = this.bookingSources().find((s) => s.code === code);
    return source ? this.label(source) : code;
  }
  status(): string {
    const s = this.statuses().find((s) => s.code === this.reservation().status);
    return s ? this.label(s) : this.reservation().status;
  }
}
