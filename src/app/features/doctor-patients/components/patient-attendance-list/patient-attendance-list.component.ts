import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
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
import { DoctorPatientsApi, DoctorPatientAttendance } from '../../../../domains/doctor-patients';
import { TicketsApi, PracticeTicket } from '../../../../domains/tickets';
import { ToastService } from '../../../../core/notifications/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-attendance-list',
  standalone: true,
  imports: [SideDrawer, CommonModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-attendance-list.component.html',
  styleUrl: './patient-attendance-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientAttendanceListComponent implements OnInit, OnChanges, OnDestroy {
  ngOnDestroy(): void {
    this.historyRequest?.unsubscribe();
    this.ticketRequest?.unsubscribe();
  }
  private historyRequest: Subscription | undefined;
  private ticketRequest: Subscription | undefined;
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly ticketsApi = inject(TicketsApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly language = inject(LanguageService);

  readonly filters = input<Partial<ClinicalFilterQuery>>({});
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && !changes['filters'].firstChange) {
      this.pageNumber.set(1);
      this.loadAttendances();
    }
  }
  readonly patientId = input.required<string>();
  readonly practiceNames = input<Readonly<Record<string, string>>>({});
  readonly isHistoricalOnly = input<boolean>(false);

  readonly viewEncounter = output<{ encounterId: string; practiceId: string }>();

  readonly attendances = signal<readonly DoctorPatientAttendance[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly totalCount = signal<number>(0);
  readonly pageSize = 10;

  readonly selectedTicket = signal<PracticeTicket | null>(null);
  readonly viewingTicketLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadAttendances();
  }

  loadAttendances(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.historyRequest?.unsubscribe();
    this.attendances.set([]);
    this.loading.set(true);
    this.error.set(false);

    this.historyRequest = this.doctorPatientsApi
      .attendances(pid, {
        ...this.filters(),
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.attendances.set(page.items || []);
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
    this.loadAttendances();
  }

  inspectTicket(item: DoctorPatientAttendance): void {
    if (!item.canViewTicket) {
      this.toast.error(this.language.t('doctorPatients.toasts.noTicketPermission'));
      return;
    }

    this.ticketRequest?.unsubscribe();
    this.selectedTicket.set(null);
    this.viewingTicketLoading.set(true);
    this.ticketRequest = this.ticketsApi.ticket(item.practiceId, item.ticketId).subscribe({
      next: (ticket) => {
        this.selectedTicket.set(ticket);
        this.viewingTicketLoading.set(false);
      },
      error: () => {
        this.toast.error(this.language.t('doctorPatients.toasts.ticketLoadFailed'));
        this.viewingTicketLoading.set(false);
      },
    });
  }

  closeTicketModal(): void {
    this.ticketRequest?.unsubscribe();
    this.selectedTicket.set(null);
  }

  ticketEventLabel(event: string | null | undefined): string {
    const key = 'doctorRemediation.ticketEvent.' + event;
    const label = this.language.t(key);
    return label === key ? this.language.t('doctorRemediation.ticketActivity') : label;
  }

  navigateToEncounter(item: DoctorPatientAttendance): void {
    if (!item.encounterId || !item.canViewEncounter) {
      this.toast.error(this.language.t('doctorPatients.toasts.cannotViewEncounter'));
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
