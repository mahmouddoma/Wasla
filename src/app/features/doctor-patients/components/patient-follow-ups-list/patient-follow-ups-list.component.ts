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
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { DoctorPatientsApi, DoctorPatientFollowUp } from '../../../../domains/doctor-patients';

@Component({
  selector: 'app-patient-follow-ups-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-follow-ups-list.component.html',
  styleUrl: './patient-follow-ups-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientFollowUpsListComponent implements OnInit {
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  protected readonly language = inject(LanguageService);

  readonly patientId = input.required<string>();
  readonly isHistoricalOnly = input<boolean>(false);

  readonly followUps = signal<readonly DoctorPatientFollowUp[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly totalCount = signal<number>(0);
  readonly pageSize = 10;

  ngOnInit(): void {
    this.loadFollowUps();
  }

  loadFollowUps(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(false);

    this.doctorPatientsApi
      .followUps(pid, {
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.followUps.set(page.items || []);
          this.totalCount.set(page.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadFollowUps();
  }
}
