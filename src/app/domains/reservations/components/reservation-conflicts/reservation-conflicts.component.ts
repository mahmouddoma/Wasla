import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ReservationConflict } from '../../reservation.models';
@Component({
  selector: 'app-reservation-conflicts',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './reservation-conflicts.component.html',
  styleUrl: './reservation-conflicts.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationConflictsComponent {
  readonly conflict = input<ReservationConflict | null>(null);
  readonly practiceId = input.required<string>();
}
