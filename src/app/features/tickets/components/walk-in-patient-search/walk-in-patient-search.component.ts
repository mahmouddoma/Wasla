import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { PatientSearchItem, PatientSearchQuery } from '../../../../domains/patients';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
export type WalkInPatientSearch = Pick<PatientSearchQuery, 'name' | 'phoneNumber' | 'dateOfBirth'>;
@Component({
  selector: 'app-walk-in-patient-search',
  imports: [FormField, TranslatePipe],
  templateUrl: './walk-in-patient-search.component.html',
  styleUrl: './walk-in-patient-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalkInPatientSearchComponent {
  readonly results = input<PatientSearchItem[]>([]);
  readonly busy = input(false);
  readonly searched = input(false);
  readonly failed = input(false);
  readonly selectedId = input('');
  readonly search = output<WalkInPatientSearch>();
  readonly selected = output<string>();
  readonly language = inject(LanguageService);
  readonly model = signal({ name: '', phoneNumber: '', dateOfBirth: '' });
  readonly fields = form(this.model);
  find(): void {
    if (!this.busy() && Object.values(this.model()).some((value) => value.trim()))
      this.search.emit(this.model());
  }
  name(patient: PatientSearchItem): string {
    return this.language.currentLang() === 'en' ? patient.nameEn || patient.nameAr : patient.nameAr;
  }
}
