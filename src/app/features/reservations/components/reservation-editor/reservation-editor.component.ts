import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form } from '@angular/forms/signals';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AvailableDate, AvailableSlot, BookingOptions } from '../../../../domains/public-discovery';
import { BookablePatient, ReservationLabel } from '../../../../domains/reservations';
import { ReservationDraft, ReservationEditorMode } from '../../state/reservation-workspace.store';
@Component({
  selector: 'app-reservation-editor',
  imports: [FormField, TranslatePipe, RouterLink],
  templateUrl: './reservation-editor.component.html',
  styleUrl: './reservation-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationEditorComponent {
  readonly mode = input.required<ReservationEditorMode>();
  readonly provider = input(false);
  readonly reception = input(false);
  readonly patients = input<BookablePatient[]>([]);
  readonly dates = input<AvailableDate[]>([]);
  readonly slots = input<AvailableSlot[]>([]);
  readonly options = input<BookingOptions | null>(null);
  readonly reasons = input<ReservationLabel[]>([]);
  readonly busy = input(false);
  readonly loading = input(false);
  readonly date = input('');
  readonly time = input('');
  readonly canSearch = input(false);
  readonly canRegister = input(false);
  readonly save = output<ReservationDraft>();
  readonly dateChange = output<string>();
  readonly timeChange = output<string>();
  readonly search = output<string>();
  readonly language = inject(LanguageService);
  readonly model = signal<ReservationDraft>({
    patientId: '',
    segmentId: '',
    visitTypeId: '',
    bookingNote: '',
    reasonCode: '',
    comment: '',
    patientConsentConfirmed: false,
    reason: '',
  });
  readonly fields = form(this.model);
  readonly segments = computed(
    () =>
      this.options()?.visitTypes.find((v) => v.visitTypeId === this.model().visitTypeId)
        ?.segments ?? [],
  );
  readonly valid = computed(() => {
    const d = this.model();
    if (this.mode() === 'restore') return true;
    if (this.mode() === 'cancel') {
      const r = this.reasons().find((r) => r.code === d.reasonCode);
      return !!r && (!r.requiresComment || !!d.comment.trim());
    }
    if (!this.date() || !this.time()) return false;
    if (this.mode() === 'reschedule')
      return !this.provider() || (d.patientConsentConfirmed && !!d.reason.trim());
    return (
      (this.reception()
        ? !!d.patientId.trim()
        : this.patients().some((p) => p.patientId === d.patientId)) &&
      this.segments().some((s) => s.segmentId === d.segmentId)
    );
  });
  label(item: { nameAr: string; nameEn?: string | null }): string {
    return this.language.currentLang() === 'en' ? item.nameEn || item.nameAr : item.nameAr;
  }
  submit(event: Event): void {
    event.preventDefault();
    if (this.valid() && !this.busy() && !this.loading()) this.save.emit(this.model());
  }
  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
