import { ChangeDetectionStrategy, Component, input, output, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { PatientSearchItem } from '../../core/patients/patient.models';
import { PatientsApi } from '../../core/patients/patients-api';

@Component({
  selector: 'app-patient-picker',
  imports: [FormField],
  templateUrl: './patient-picker.html',
  styleUrl: './patient-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientPicker {
  readonly label = input.required<string>();
  readonly selected = output<PatientSearchItem>();
  private readonly api = inject(PatientsApi);
  protected readonly model = signal({ name: '', phoneNumber: '', dateOfBirth: '' });
  protected readonly searchForm = form(this.model);
  protected readonly results = signal<PatientSearchItem[]>([]);
  protected readonly selectedPatient = signal<PatientSearchItem | null>(null);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly message = signal('');

  protected async search(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.searchForm, async () => {
      if (this.loading()) return;
      this.loading.set(true);
      this.message.set('');
      try {
        const response = await firstValueFrom(
          this.api.search({ ...this.model(), pageNumber: 1, pageSize: 20 }),
        );
        this.results.set(response.items);
        this.searched.set(true);
      } catch (error) {
        const parsed = parseApiErrors(error);
        this.message.set([...parsed.messages, ...Object.values(parsed.fields).flat()].join(' '));
      } finally {
        this.loading.set(false);
      }
    });
  }

  protected choose(patient: PatientSearchItem): void {
    this.selectedPatient.set(patient);
    this.selected.emit(patient);
  }
}
