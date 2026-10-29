import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import {
  DoctorPatientsApi,
  DoctorMyPatientOverviewResponse,
  DoctorPatientCapabilities,
} from '../../../../domains/doctor-patients';
import { ToastService } from '../../../../core/notifications/toast.service';
import { PatientAttendanceListComponent } from '../patient-attendance-list/patient-attendance-list.component';
import { PatientDiagnosisTimelineComponent } from '../patient-diagnosis-timeline/patient-diagnosis-timeline.component';
import { PatientPrescriptionsListComponent } from '../patient-prescriptions-list/patient-prescriptions-list.component';
import { PatientDiagnosticsTabComponent } from '../patient-diagnostics-tab/patient-diagnostics-tab.component';
import { PatientAppointmentsListComponent } from '../patient-appointments-list/patient-appointments-list.component';
import { PatientFollowUpsListComponent } from '../patient-follow-ups-list/patient-follow-ups-list.component';
import { PatientSharedRecordsComponent } from '../patient-shared-records/patient-shared-records.component';
import { CreateFollowupDialogComponent } from '../create-followup-dialog/create-followup-dialog.component';

export type PatientDrawerTab =
  | 'overview'
  | 'attendances'
  | 'diagnoses'
  | 'prescriptions'
  | 'diagnostics'
  | 'appointments'
  | 'followUps'
  | 'sharedRecords';

@Component({
  selector: 'app-patient-detail-drawer',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LocalizedDatePipe,
    SideDrawer,
    PatientAttendanceListComponent,
    PatientDiagnosisTimelineComponent,
    PatientPrescriptionsListComponent,
    PatientDiagnosticsTabComponent,
    PatientAppointmentsListComponent,
    PatientFollowUpsListComponent,
    PatientSharedRecordsComponent,
    CreateFollowupDialogComponent,
  ],
  templateUrl: './patient-detail-drawer.component.html',
  styleUrl: './patient-detail-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDetailDrawerComponent implements OnChanges {
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);

  readonly opened = input<boolean>(false);
  readonly patientId = input<string | null>(null);
  readonly initialTab = input<PatientDrawerTab>('overview');

  readonly closed = output<void>();

  readonly activeTab = signal<PatientDrawerTab>('overview');
  readonly overview = signal<DoctorMyPatientOverviewResponse | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<boolean>(false);

  // Follow-up creation dialog state
  readonly showCreateFollowUp = signal<boolean>(false);
  readonly createFollowUpPracticeId = signal<string>('');
  readonly createFollowUpEncounterId = signal<string>('');

  readonly patient = computed(() => this.overview()?.patient ?? null);
  readonly capabilities = computed<DoctorPatientCapabilities | null>(
    () => this.patient()?.capabilities ?? null,
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['opened'] || changes['patientId']) {
      if (this.opened() && this.patientId()) {
        this.activeTab.set(this.initialTab() || 'overview');
        this.loadOverview();
      } else if (!this.opened()) {
        this.clearState();
      }
    }
  }

  loadOverview(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(false);

    this.doctorPatientsApi.overview(pid).subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
        this.toast.error(this.language.t('doctorPatients.toasts.patientLoadFailed'));
      },
    });
  }

  setTab(tab: PatientDrawerTab): void {
    this.activeTab.set(tab);
  }

  onClose(): void {
    this.clearState();
    this.closed.emit();
  }

  private clearState(): void {
    this.overview.set(null);
    this.error.set(false);
    this.loading.set(false);
    this.showCreateFollowUp.set(false);
  }

  openFollowUpDialog(practiceId: string, encounterId: string): void {
    this.createFollowUpPracticeId.set(practiceId);
    this.createFollowUpEncounterId.set(encounterId);
    this.showCreateFollowUp.set(true);
  }

  onFollowUpCreated(): void {
    this.showCreateFollowUp.set(false);
    this.loadOverview();
  }
}
