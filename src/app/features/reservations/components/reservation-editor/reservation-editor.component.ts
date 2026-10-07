import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import {
  ReservationPatientSearchComponent,
  ReservationPatientSearch,
} from '../reservation-patient-search/reservation-patient-search.component';
import { PatientSearchItem } from '../../../../domains/patients';
import { FollowUpEligibility } from '../../../../domains/follow-ups';
import { ReservationDraft, ReservationEditorMode } from '../../state/reservation-workspace.store';
@Component({
  selector: 'app-reservation-editor',
  imports: [
    FormField,
    TranslatePipe,
    RouterLink,
    ReservationPatientSearchComponent,
    NgTemplateOutlet,
  ],
  templateUrl: './reservation-editor.component.html',
  styleUrl: './reservation-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationEditorComponent {
  readonly mode = input.required<ReservationEditorMode>();
  readonly provider = input(false);
  readonly reception = input(false);
  readonly patients = input<BookablePatient[]>([]);
  readonly eligibilities = input<readonly FollowUpEligibility[]>([]);
  readonly eligibilityId = input('');
  readonly patientId = input('');
  readonly patientChange = output<string>();
  readonly eligibilityChange = output<string>();
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
  readonly search = output<ReservationPatientSearch>();
  readonly patientResults = input<PatientSearchItem[]>([]);
  readonly patientSearchLoading = input(false);
  readonly patientSearched = input(false);
  readonly patientSearchFailed = input(false);
  readonly selectedPatient = input<{ nameAr: string; nameEn: string | null } | null>(null);
  readonly actionLabel = computed(() =>
    this.reception()
      ? {
          create: 'reception.appointments.book',
          reschedule: 'reception.appointments.saveTime',
          cancel: 'reception.appointments.cancel',
          restore: 'reception.appointments.restore',
        }[this.mode()]
      : 'reservations.confirm',
  );
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
  constructor() {
    effect(() => {
      const patientId = this.patientId();
      this.model.update((model) => ({ ...model, patientId, segmentId: '', visitTypeId: '' }));
    });
    effect(() => {
      this.options();
      this.model.update((model) => ({ ...model, segmentId: '', visitTypeId: '' }));
    });
  }
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
