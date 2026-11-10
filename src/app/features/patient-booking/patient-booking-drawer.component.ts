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

  constructor() {
    inject(DestroyRef).onDestroy(() => this.booking.close());
  }

  name(item: { nameAr: string; nameEn?: string | null }): string {
    return this.language.isRtl() ? item.nameAr : item.nameEn || item.nameAr;
  }

  updateNote(event: Event): void {
    if (!this.booking.submitting()) {
      this.booking.note.set((event.target as HTMLTextAreaElement).value);
    }
  }

  selectPatient(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (target?.value) {
      this.booking.selectPatient(target.value);
    }
  }

  formatSlotTime(time: string | null | undefined): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const isAr = this.language.isRtl();
    const isPm = hour >= 12;
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    const padHour = hour.toString().padStart(2, '0');
    const period = isAr ? (isPm ? 'م' : 'ص') : isPm ? 'PM' : 'AM';
    return `${padHour}:${minute} ${period}`;
  }

  formatDateDayName(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(this.language.isRtl() ? 'ar-EG' : 'en-US', { weekday: 'short' });
    } catch {
      return dateStr;
    }
  }

  formatDateDayMonth(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(this.language.isRtl() ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  dateBadge(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      ) {
        return this.language.isRtl() ? 'اليوم' : 'Today';
      }
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      if (
        d.getFullYear() === tomorrow.getFullYear() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getDate() === tomorrow.getDate()
      ) {
        return this.language.isRtl() ? 'غداً' : 'Tomorrow';
      }
      return '';
    } catch {
      return '';
    }
  }
}
