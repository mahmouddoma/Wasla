import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  DestroyRef,
  signal,
} from '@angular/core';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import {
  PatientDetailDrawerComponent,
  PatientDrawerTab,
} from '../../components/patient-detail-drawer/patient-detail-drawer.component';

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
  host: { '[attr.dir]': 'language.dir()', '[attr.lang]': 'language.currentLang()' },
})
export class DoctorPatientsDirectoryComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | undefined;
  private listSequence = 0;
  private readonly searchChanges = new Subject<string>();
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly doctorPracticesApi = inject(DoctorPracticesApi);
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
  private readonly errorKey = signal('');
  readonly errorMessage = computed(() => this.language.t(this.errorKey()));

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

    this.searchChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onSearch());

    // Route state contains identifiers only, never patient search text.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const pid = params.get('patientId');
      if (pid) {
        this.inspectedPatientId.set(pid);
        this.drawerOpened.set(true);
      }
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      const patientId = q.get('patientId') || this.route.snapshot.paramMap.get('patientId');
      this.inspectedPatientId.set(patientId);
      this.drawerOpened.set(!!patientId);
      const value = q.get('tab');
      const tab = [
        'overview',
        'attendances',
        'diagnoses',
        'prescriptions',
        'diagnostics',
        'appointments',
        'followUps',
      ].includes(value || '')
        ? (value as PatientDrawerTab)
        : 'overview';
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

    const seq = ++this.listSequence;
    this.request?.unsubscribe();
    this.patients.set([]);
    this.summary.set(null);
    this.loading.set(true);
    this.error.set(false);
    this.errorKey.set('');

    const query: DoctorPatientQuery = {
      search: this.search().trim() || undefined,
      practiceId: this.selectedPracticeId() || undefined,
      practiceScope: this.practiceScope() !== 'all' ? this.practiceScope() : undefined,
      lastAttendanceFrom: this.fromDate() || undefined,
      lastAttendanceTo: this.toDate() || undefined,
      minAttendanceCount:
        this.minAttendance() && this.minAttendance()! > 0 ? this.minAttendance()! : undefined,
      hasUpcomingAppointment: this.hasUpcoming() !== null ? this.hasUpcoming()! : undefined,
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize,
      asOfUtc: this.asOfUtc() || undefined,
    };

    this.request = this.doctorPatientsApi.list(query).subscribe({
      next: (res) => {
        if (seq !== this.listSequence) return;
        this.patients.set(res.items || []);
        this.totalCount.set(res.totalCount);
        this.summary.set(res.summary);
        if (res.asOfUtc) {
          this.asOfUtc.set(res.asOfUtc);
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (seq !== this.listSequence) return;
        this.patients.set([]);
        this.summary.set(null);
        this.totalCount.set(0);
        this.loading.set(false);
        this.error.set(true);
        if (err.status === 403) {
          this.errorKey.set('doctorPatients.toasts.noDirectoryPermission');
        } else if (err.status === 429) {
          this.errorKey.set('doctorPatients.toasts.rateLimited');
        } else {
          this.errorKey.set('doctorPatients.toasts.directoryLoadFailed');
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.listSequence++;
    this.request?.unsubscribe();
  }

  updateSearch(value: string): void {
    this.search.set(value);
    this.searchChanges.next(value);
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
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { patientId, tab },
      queryParamsHandling: 'merge',
    });
  }

  onDrawerTabChanged(tab: PatientDrawerTab): void {
    this.drawerTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  closeDrawer(): void {
    this.drawerOpened.set(false);
    this.inspectedPatientId.set(null);
    if (this.route.snapshot.paramMap.get('patientId')) {
      void this.router.navigate(['/doctor/patients']);
    } else {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { patientId: null, tab: null },
        queryParamsHandling: 'merge',
      });
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
      this.hasUpcoming() !== null,
    );
  }
}
