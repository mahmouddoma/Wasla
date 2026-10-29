import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import {
  MedicalRecordsApi,
  TreatingDoctorMedicalOverview,
} from '../../../../domains/medical-records';

@Component({
  selector: 'app-patient-shared-records',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './patient-shared-records.component.html',
  styleUrl: './patient-shared-records.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientSharedRecordsComponent implements OnInit {
  private readonly medicalRecordsApi = inject(MedicalRecordsApi);

  readonly patientId = input.required<string>();
  readonly activeTicketId = input<string | null>(null);
  readonly activePracticeId = input<string | null>(null);

  readonly overview = signal<TreatingDoctorMedicalOverview | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<boolean>(false);

  ngOnInit(): void {
    this.checkAndLoad();
  }

  checkAndLoad(): void {
    const tid = this.activeTicketId();
    const pid = this.activePracticeId();

    if (!tid || !pid) {
      this.overview.set(null);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.medicalRecordsApi.doctorTreatingOverview(pid, tid).subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
