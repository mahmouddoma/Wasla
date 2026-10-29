import { RouterLink } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
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
  imports: [RouterLink, CommonModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-follow-ups-list.component.html',
  styleUrl: './patient-follow-ups-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientFollowUpsListComponent implements OnInit, OnChanges, OnDestroy {
  ngOnDestroy(): void {
    this.historyRequest?.unsubscribe();
  }
  private historyRequest: Subscription | undefined;
  private readonly session = inject(AuthSession);
  canViewSource(item: DoctorPatientFollowUp): boolean {
    return (
      !!item.sourceEncounterId &&
      this.canViewEncounters() &&
      this.session.hasPermission('MedicalEncounters.ViewOwn') &&
      this.session.hasPermission('Diagnoses.ViewOwn') &&
      (!item.isHistoricalPractice || this.session.hasPermission('DoctorPatients.ViewHistoricalOwn'))
    );
  }
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  protected readonly language = inject(LanguageService);

  readonly filters = input<Partial<ClinicalFilterQuery>>({});
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && !changes['filters'].firstChange) {
      this.pageNumber.set(1);
      this.loadFollowUps();
    }
  }
  readonly patientId = input.required<string>();
  readonly practiceNames = input<Readonly<Record<string, string>>>({});
  readonly canViewEncounters = input(false);
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

    this.historyRequest?.unsubscribe();
    this.followUps.set([]);
    this.loading.set(true);
    this.error.set(false);

    this.historyRequest = this.doctorPatientsApi
      .followUps(pid, {
        ...this.filters(),
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
