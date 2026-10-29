import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import {
  DoctorPatientsApi,
  DoctorPatientListItem,
  DoctorPatientsSummary,
  DoctorPatientQuery,
} from '../../../../domains/doctor-patients';
import { DoctorPracticesApi, DoctorPractice } from '../../../../domains/doctor-practices';
import { ToastService } from '../../../../core/notifications/toast.service';
import { PatientDetailDrawerComponent, PatientDrawerTab } from '../../components/patient-detail-drawer/patient-detail-drawer.component';

@Component({
  selector: 'app-doctor-patients-directory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    LocalizedDatePipe,
    PageHeader,
    PatientDetailDrawerComponent,
  ],
  templateUrl: './doctor-patients-directory.component.html',
  styleUrl: './doctor-patients-directory.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorPatientsDirectoryComponent implements OnInit {
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly doctorPracticesApi = inject(DoctorPracticesApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly language = inject(LanguageService);

  // Directory Data
  readonly patients = signal<readonly DoctorPatientListItem[]>([]);
  readonly summary = signal<DoctorPatientsSummary | null>(null);
  readonly practices = signal<readonly DoctorPractice[]>([]);
  readonly totalCount = signal<number>(0);
  readonly asOfUtc = signal<string | null>(null);

  // States
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  // Filters & Query
  readonly search = signal<string>('');
  readonly selectedPracticeId = signal<string>('');
  readonly practiceScope = signal<'all' | 'active' | 'historicalOnly'>('all');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly minAttendance = signal<number | null>(null);
  readonly hasUpcoming = signal<boolean | null>(null);
  readonly pageNumber = signal<number>(1);
  readonly pageSize = 20;

  // Drawer Inspection State
  readonly drawerOpened = signal<boolean>(false);
  readonly inspectedPatientId = signal<string | null>(null);
  readonly drawerTab = signal<PatientDrawerTab>('overview');

  ngOnInit(): void {
    this.loadPractices();
    this.loadPatients();

    // Check route params for direct deep-link
    this.route.paramMap.subscribe((params) => {
      const pid = params.get('patientId');
      if (pid) {
        this.openPatient(pid);
      }
    });

    this.route.queryParamMap.subscribe((q) => {
      const tab = q.get('tab') as PatientDrawerTab;
      if (tab) {
        this.drawerTab.set(tab);
      }
    });
  }

  loadPractices(): void {
    this.doctorPracticesApi.list().subscribe({
      next: (data) => this.practices.set(data),
      error: () => {
        // Soft fail for practice dropdown
      },
    });
  }

  loadPatients(resetPagination = false): void {
    if (resetPagination) {
      this.pageNumber.set(1);
      this.asOfUtc.set(null);
    }

    this.loading.set(true);
    this.error.set(false);
    this.errorMessage.set('');

    const query: DoctorPatientQuery = {
      search: this.search().trim() || undefined,
      practiceId: this.selectedPracticeId() || undefined,
      practiceScope: this.practiceScope() !== 'all' ? this.practiceScope() : undefined,
      lastAttendanceFrom: this.fromDate() || undefined,
      lastAttendanceTo: this.toDate() || undefined,
      minAttendanceCount: this.minAttendance() && this.minAttendance()! > 0 ? this.minAttendance()! : undefined,
      hasUpcomingAppointment: this.hasUpcoming() !== null ? this.hasUpcoming()! : undefined,
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize,
      asOfUtc: this.asOfUtc() || undefined,
    };

    this.doctorPatientsApi.list(query).subscribe({
      next: (res) => {
        this.patients.set(res.items || []);
        this.totalCount.set(res.totalCount);
        this.summary.set(res.summary);
        if (res.asOfUtc) {
          this.asOfUtc.set(res.asOfUtc);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(true);
        if (err.status === 403) {
          this.errorMessage.set(this.language.t('doctorPatients.toasts.noDirectoryPermission'));
        } else if (err.status === 429) {
          this.errorMessage.set(this.language.t('doctorPatients.toasts.rateLimited'));
        } else {
          this.errorMessage.set(this.language.t('doctorPatients.toasts.directoryLoadFailed'));
        }
      },
    });
  }

  onSearch(): void {
    this.loadPatients(true);
  }

  toggleUpcoming(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.hasUpcoming.set(target?.checked ? true : null);
    this.onSearch();
  }

  resetFilters(): void {
    this.search.set('');
    this.selectedPracticeId.set('');
    this.practiceScope.set('all');
    this.fromDate.set('');
    this.toDate.set('');
    this.minAttendance.set(null);
    this.hasUpcoming.set(null);
    this.loadPatients(true);
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadPatients(false);
  }

  openPatient(patientId: string, tab: PatientDrawerTab = 'overview'): void {
    this.inspectedPatientId.set(patientId);
    this.drawerTab.set(tab);
    this.drawerOpened.set(true);
  }

  closeDrawer(): void {
    this.drawerOpened.set(false);
    this.inspectedPatientId.set(null);
    if (this.route.snapshot.paramMap.get('patientId')) {
      this.router.navigate(['/doctor/patients'], { replaceUrl: true });
    }
  }

  isFiltered(): boolean {
    return Boolean(
      this.search().trim() ||
      this.selectedPracticeId() ||
      this.practiceScope() !== 'all' ||
      this.fromDate() ||
      this.toDate() ||
      (this.minAttendance() && this.minAttendance()! > 0) ||
      this.hasUpcoming() !== null
    );
  }
}
