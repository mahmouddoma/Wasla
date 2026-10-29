import { Subscription } from 'rxjs';
import { ClinicalFilterQuery } from '../../../../domains/doctor-patients';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { DoctorPatientsApi, DoctorPatientDiagnosis } from '../../../../domains/doctor-patients';
import { ToastService } from '../../../../core/notifications/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-diagnosis-timeline',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-diagnosis-timeline.component.html',
  styleUrl: './patient-diagnosis-timeline.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDiagnosisTimelineComponent implements OnInit, OnChanges, OnDestroy {
  ngOnDestroy(): void {
    this.historyRequest?.unsubscribe();
  }
  private historyRequest: Subscription | undefined;
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly language = inject(LanguageService);

  readonly filters = input<Partial<ClinicalFilterQuery>>({});
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && !changes['filters'].firstChange) {
      this.pageNumber.set(1);
      this.loadDiagnoses();
    }
  }
  readonly patientId = input.required<string>();
  readonly practiceNames = input<Readonly<Record<string, string>>>({});
  readonly canViewEncounters = input(false);
  readonly isHistoricalOnly = input<boolean>(false);

  readonly viewEncounter = output<{ encounterId: string; practiceId: string }>();

  readonly diagnoses = signal<readonly DoctorPatientDiagnosis[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly totalCount = signal<number>(0);
  readonly pageSize = 15;

  ngOnInit(): void {
    this.loadDiagnoses();
  }

  loadDiagnoses(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.historyRequest?.unsubscribe();
    this.diagnoses.set([]);
    this.loading.set(true);
    this.error.set(false);

    this.historyRequest = this.doctorPatientsApi
      .diagnoses(pid, {
        ...this.filters(),
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.diagnoses.set(page.items || []);
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
    this.loadDiagnoses();
  }

  navigateToEncounter(item: DoctorPatientDiagnosis): void {
    if (!item.encounterId || !this.canViewEncounters()) {
      this.toast.error(this.language.t('doctorPatients.toasts.cannotViewDiagnosisEncounter'));
      return;
    }
    this.viewEncounter.emit({
      encounterId: item.encounterId,
      practiceId: item.practiceId,
    });
    this.router.navigate(['/doctor/encounters'], {
      queryParams: { practiceId: item.practiceId, encounterId: item.encounterId },
    });
  }
}
