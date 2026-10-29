import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnChanges,
  OnDestroy,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClinicalFilterQuery } from '../../../../domains/doctor-patients';
import { Subscription } from 'rxjs';
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

export type PatientDrawerTab =
  | 'overview'
  | 'attendances'
  | 'diagnoses'
  | 'prescriptions'
  | 'diagnostics'
  | 'appointments'
  | 'followUps';

@Component({
  selector: 'app-patient-detail-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    LocalizedDatePipe,
    SideDrawer,
    PatientAttendanceListComponent,
    PatientDiagnosisTimelineComponent,
    PatientPrescriptionsListComponent,
    PatientDiagnosticsTabComponent,
    PatientAppointmentsListComponent,
    PatientFollowUpsListComponent,
  ],
  templateUrl: './patient-detail-drawer.component.html',
  styleUrl: './patient-detail-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDetailDrawerComponent implements OnChanges, OnDestroy {
  private request: Subscription | undefined;
  private sequence = 0;
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);

  readonly opened = input<boolean>(false);
  readonly patientId = input<string | null>(null);
  readonly initialTab = input<PatientDrawerTab>('overview');

  readonly closed = output<void>();
  readonly tabChanged = output<PatientDrawerTab>();

  readonly clinicalFilters = signal<Partial<ClinicalFilterQuery>>({});
  filterDraft = { practiceId: '', fromDate: '', toDate: '' };
  applyFilters(): void {
    if (
      this.filterDraft.fromDate &&
      this.filterDraft.toDate &&
      this.filterDraft.fromDate > this.filterDraft.toDate
    )
      return;
    this.clinicalFilters.set({ ...this.filterDraft });
  }
  readonly activeTab = signal<PatientDrawerTab>('overview');
  readonly overview = signal<DoctorMyPatientOverviewResponse | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<boolean>(false);

  readonly practiceNames = computed<Readonly<Record<string, string>>>(() =>
    Object.fromEntries(
      (this.overview()?.practices || []).map((practice) => [
        practice.id,
        (this.language.isRtl()
          ? practice.nameAr || practice.nameEn
          : practice.nameEn || practice.nameAr) || this.language.t('doctorRemediation.unavailable'),
      ]),
    ),
  );
  readonly patient = computed(() => this.overview()?.patient ?? null);
  readonly capabilities = computed<DoctorPatientCapabilities | null>(
    () => this.patient()?.capabilities ?? null,
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialTab'] && !changes['opened'] && !changes['patientId'] && this.overview())
      this.setTab(this.initialTab());
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

    const seq = ++this.sequence;
    this.request?.unsubscribe();
    this.overview.set(null);
    this.loading.set(true);
    this.error.set(false);

    this.request = this.doctorPatientsApi.overview(pid).subscribe({
      next: (data) => {
        if (seq !== this.sequence || pid !== this.patientId() || !this.opened()) return;
        this.overview.set(data);
        if (!this.tabAllowed(this.activeTab())) this.activeTab.set('overview');
        this.loading.set(false);
      },
      error: () => {
        if (seq !== this.sequence) return;
        this.overview.set(null);
        this.error.set(true);
        this.loading.set(false);
        this.toast.error(this.language.t('doctorPatients.toasts.patientLoadFailed'));
      },
    });
  }

  setTab(tab: PatientDrawerTab): void {
    if (!this.tabAllowed(tab) || this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.tabChanged.emit(tab);
  }

  onClose(): void {
    this.clearState();
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.clearState();
  }

  tabAllowed(tab: PatientDrawerTab): boolean {
    const c = this.capabilities();
    return (
      tab === 'overview' ||
      (!!c &&
        {
          attendances: c.canViewAttendances,
          diagnoses: c.canViewDiagnoses,
          prescriptions: c.canViewPrescriptions,
          diagnostics:
            c.canViewLabRequests ||
            c.canViewLabResults ||
            c.canViewLabSubmissions ||
            c.canViewRadiologyRequests ||
            c.canViewRadiologyResults ||
            c.canViewRadiologySubmissions,
          appointments: c.canViewAppointments,
          followUps: c.canViewFollowUps,
        }[tab] === true)
    );
  }

  private clearState(): void {
    this.sequence++;
    this.request?.unsubscribe();
    this.overview.set(null);
    this.clinicalFilters.set({});
    this.filterDraft = { practiceId: '', fromDate: '', toDate: '' };
    this.error.set(false);
    this.loading.set(false);
  }
}
