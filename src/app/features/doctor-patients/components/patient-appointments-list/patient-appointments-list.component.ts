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
import { Router } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { DoctorPatientsApi, DoctorPatientAppointment } from '../../../../domains/doctor-patients';

@Component({
  selector: 'app-patient-appointments-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-appointments-list.component.html',
  styleUrl: './patient-appointments-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientAppointmentsListComponent implements OnInit, OnChanges, OnDestroy {
  ngOnDestroy(): void {
    this.historyRequest?.unsubscribe();
  }
  private historyRequest: Subscription | undefined;
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  protected readonly language = inject(LanguageService);

  readonly filters = input<Partial<ClinicalFilterQuery>>({});
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && !changes['filters'].firstChange) {
      this.pageNumber.set(1);
      this.loadAppointments();
    }
  }
  readonly patientId = input.required<string>();
  readonly practiceNames = input<Readonly<Record<string, string>>>({});
  readonly isHistoricalOnly = input<boolean>(false);

  readonly appointments = signal<readonly DoctorPatientAppointment[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly totalCount = signal<number>(0);
  readonly pageSize = 10;

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.historyRequest?.unsubscribe();
    this.appointments.set([]);
    this.loading.set(true);
    this.error.set(false);

    this.historyRequest = this.doctorPatientsApi
      .appointments(pid, {
        ...this.filters(),
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.appointments.set(page.items || []);
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
    this.loadAppointments();
  }

  viewReservation(item: DoctorPatientAppointment): void {
    if (!this.session.hasPermission('DoctorPracticeReservations.ViewOwn')) return;
    void this.router.navigate(['/doctor/reservations'], {
      queryParams: {
        practiceId: item.practiceId,
        reservationId: item.reservationId,
        returnPatientId: this.patientId(),
      },
    });
  }
}
