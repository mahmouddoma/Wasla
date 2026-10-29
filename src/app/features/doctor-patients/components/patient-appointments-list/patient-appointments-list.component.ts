import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { DoctorPatientsApi, DoctorPatientAppointment } from '../../../../domains/doctor-patients';
import { ReservationsApi } from '../../../../domains/reservations';
import { ToastService } from '../../../../core/notifications/toast.service';

@Component({
  selector: 'app-patient-appointments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-appointments-list.component.html',
  styleUrl: './patient-appointments-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientAppointmentsListComponent implements OnInit {
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);

  readonly patientId = input.required<string>();
  readonly isHistoricalOnly = input<boolean>(false);

  readonly appointments = signal<readonly DoctorPatientAppointment[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly totalCount = signal<number>(0);
  readonly pageSize = 10;

  readonly cancellingReservation = signal<DoctorPatientAppointment | null>(null);
  readonly cancelReason = signal<string>('');
  readonly cancelLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(false);

    this.doctorPatientsApi
      .appointments(pid, {
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

  openCancel(item: DoctorPatientAppointment): void {
    if (this.isHistoricalOnly() || item.status !== 'Active') {
      this.toast.error(this.language.t('doctorPatients.toasts.cannotCancel'));
      return;
    }
    this.cancellingReservation.set(item);
    this.cancelReason.set('');
  }

  closeCancel(): void {
    this.cancellingReservation.set(null);
  }

  confirmCancel(): void {
    const res = this.cancellingReservation();
    if (!res) return;

    const reason = this.cancelReason().trim();
    if (!reason) {
      this.toast.error(this.language.t('doctorPatients.toasts.reasonRequired'));
      return;
    }

    this.cancelLoading.set(true);
    const key = `cancel-${res.reservationId}-${Date.now()}`;

    this.reservationsApi
      .cancel(
        { actor: 'Doctor', practiceId: res.practiceId },
        res.reservationId,
        {
          reasonCode: 'DoctorCancelled',
          comment: reason,
          rowVersion: 'AAAA==',
        },
        key,
      )
      .subscribe({
        next: () => {
          this.cancelLoading.set(false);
          this.toast.success(this.language.t('doctorPatients.toasts.cancelSuccess'));
          this.closeCancel();
          this.loadAppointments();
        },
        error: () => {
          this.cancelLoading.set(false);
          this.toast.error(this.language.t('doctorPatients.toasts.cancelFailed'));
        },
      });
  }
}
