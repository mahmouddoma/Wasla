import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SideDrawer } from '../../shared/components/side-drawer/side-drawer';
import { PatientBookingState } from './patient-booking.state';

@Component({
  selector: 'app-patient-booking-drawer',
  imports: [RouterLink, TranslatePipe, SideDrawer],
  templateUrl: './patient-booking-drawer.component.html',
  styleUrl: './patient-booking-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientBookingDrawerComponent {
  readonly booking = inject(PatientBookingState);
  readonly language = inject(LanguageService);
  constructor() { inject(DestroyRef).onDestroy(() => this.booking.close()); }
  name(item: { nameAr: string; nameEn?: string | null }): string {
    return this.language.isRtl() ? item.nameAr : item.nameEn || item.nameAr;
  }
  updateNote(event: Event): void {
    if (!this.booking.submitting()) this.booking.note.set((event.target as HTMLTextAreaElement).value);
  }
  selectPatient(event: Event): void {
    this.booking.selectPatient((event.target as HTMLSelectElement).value);
  }
}
