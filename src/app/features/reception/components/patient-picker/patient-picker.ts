import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, input, output, inject, signal, untracked } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { PatientSearchItem } from '../../../../domains/patients';
import { hasReceptionPatientSearchCriteria } from '../../patient-search-criteria';
import { PatientsApi } from '../../../../domains/patients';

@Component({
  selector: 'app-patient-picker',
  imports: [FormField, TranslatePipe],
  templateUrl: './patient-picker.html',
  styleUrl: './patient-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientPicker {
  protected readonly uiLanguage = inject(LanguageService);

  readonly label = input.required<string>();
  readonly practiceId = input<string | null>(null);
  readonly selected = output<PatientSearchItem>();
  private readonly api = inject(PatientsApi);
  protected readonly model = signal({ name: '', phoneNumber: '', dateOfBirth: '' });
  protected readonly searchForm = form(this.model);
  protected readonly results = signal<PatientSearchItem[]>([]);
  protected readonly selectedPatient = signal<PatientSearchItem | null>(null);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly message = signal('');
  private sequence = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.sequence++);
    effect(() => {
      this.practiceId();
      untracked(() => {
        this.sequence++;
        this.results.set([]); this.selectedPatient.set(null); this.searched.set(false); this.loading.set(false);
      });
    });
  }

  protected async search(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.searchForm, async () => {
      if (this.loading()) return;
      if (!hasReceptionPatientSearchCriteria(this.model())) {
        this.message.set(this.uiLanguage.t('reception.patients.searchRuleHelp'));
        return;
      }
      this.loading.set(true);
      const sequence = ++this.sequence;
      this.message.set('');
      this.results.set([]);
      this.searched.set(false);
      try {
        const response = await firstValueFrom(
          this.api.search({ ...this.model(), doctorPracticeId: this.practiceId() || undefined, pageNumber: 1, pageSize: 20 }),
        );
        if (sequence !== this.sequence) return;
        this.results.set(response.items);
        this.searched.set(true);
      } catch (error) {
        if (sequence !== this.sequence) return;
        const parsed = parseApiErrors(error);
        this.message.set([...parsed.messages, ...Object.values(parsed.fields).flat()].join(' '));
      } finally {
        if (sequence === this.sequence) this.loading.set(false);
      }
    });
  }

  protected choose(patient: PatientSearchItem): void {
    if (!this.results().some(item => item.patientId === patient.patientId)) return;
    this.selectedPatient.set(patient);
    this.selected.emit(patient);
  }
}
