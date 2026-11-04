import { RouterLink } from '@angular/router';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { ClinicalFilterQuery } from '../../../../domains/doctor-patients';
import {
  ChangeDetectionStrategy,
  effect,
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { PdfViewerComponent } from '../../../../shared/components/pdf-viewer/pdf-viewer.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { DoctorPatientsApi, DoctorPatientPrescription } from '../../../../domains/doctor-patients';
import { PrescriptionsApi, PrescriptionVersion } from '../../../../domains/prescriptions';
import { ToastService } from '../../../../core/notifications/toast.service';

@Component({
  selector: 'app-patient-prescriptions-list',
  standalone: true,
  imports: [
    RouterLink,
    SideDrawer,
    CommonModule,
    TranslatePipe,
    LocalizedDatePipe,
    PdfViewerComponent,
  ],
  templateUrl: './patient-prescriptions-list.component.html',
  styleUrl: './patient-prescriptions-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientPrescriptionsListComponent implements OnInit, OnChanges, OnDestroy {
  private historyRequest: Subscription | undefined;
  private versionsRequest: Subscription | undefined;
  private inspectionSequence = 0;
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly prescriptionsApi = inject(PrescriptionsApi);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);

  readonly filters = input<Partial<ClinicalFilterQuery>>({});
  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['patientId'] && !changes['patientId'].firstChange) ||
      (changes['filters'] && !changes['filters'].firstChange)
    ) {
      this.pageNumber.set(1);
      this.loadPrescriptions();
    }
  }
  readonly patientId = input.required<string>();
  readonly practiceNames = input<Readonly<Record<string, string>>>({});
  readonly canViewEncounters = input(false);
  readonly isHistoricalOnly = input<boolean>(false);

  readonly prescriptions = signal<readonly DoctorPatientPrescription[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly totalCount = signal<number>(0);
  readonly pageSize = 10;

  readonly pdfLoading = signal<boolean>(false);
  readonly versionsLoading = signal<boolean>(false);
  readonly selectedVersions = signal<readonly PrescriptionVersion[] | null>(null);
  readonly selectedPrescriptionId = signal<string | null>(null);

  private readonly session = inject(AuthSession);
  readonly pdfBlob = signal<Blob | null>(null);
  private pdfRequest: Subscription | undefined;
  private destroyed = false;
  constructor() {
    effect(() => {
      if (!this.session.hasPermission('Prescriptions.ViewOwn')) this.clearInspection();
      else if (!this.session.hasPermission('Prescriptions.ExportOwn')) this.closePdf();
    });
  }
  canExport(rx: DoctorPatientPrescription): boolean {
    return (
      rx.canView === true &&
      this.session.hasPermission('Prescriptions.ViewOwn') &&
      rx.canExport === true &&
      this.session.hasPermission('Prescriptions.ExportOwn') &&
      rx.currentStatus !== 'Draft'
    );
  }

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  ngOnDestroy(): void {
    this.historyRequest?.unsubscribe();
    this.destroyed = true;
    this.clearInspection();
  }

  loadPrescriptions(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.historyRequest?.unsubscribe();
    this.clearInspection();
    this.prescriptions.set([]);
    this.totalCount.set(0);
    this.loading.set(true);
    this.error.set(false);

    this.historyRequest = this.doctorPatientsApi
      .prescriptions(pid, {
        ...this.filters(),
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.prescriptions.set(page.items || []);
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
    this.loadPrescriptions();
  }

  viewPdf(rx: DoctorPatientPrescription, versionNumber?: number): void {
    this.fetchPdf(rx, versionNumber ?? rx.currentVersionNumber, 'inline');
  }
  downloadPdf(rx: DoctorPatientPrescription, versionNumber?: number): void {
    this.fetchPdf(rx, versionNumber ?? rx.currentVersionNumber, 'attachment');
  }
  private fetchPdf(
    rx: DoctorPatientPrescription,
    version: number,
    disposition: 'inline' | 'attachment',
  ): void {
    if (!this.canExport(rx) || this.pdfLoading() || !Number.isInteger(version) || version < 1)
      return;
    this.pdfBlob.set(null);
    this.pdfLoading.set(true);
    const patientId = this.patientId();
    const sequence = this.inspectionSequence;
    this.pdfRequest = this.doctorPatientsApi
      .prescriptionPdf(rx.prescriptionId, version, disposition)
      .subscribe({
        next: (blob) => {
          if (sequence !== this.inspectionSequence || patientId !== this.patientId()) return;
          this.pdfLoading.set(false);
          if (this.destroyed || !this.canExport(rx)) return;
          if (!blob.size || !blob.type.includes('application/pdf')) {
            this.toast.error(this.language.t('doctorPatients.pdf.failed'));
            return;
          }
          if (disposition === 'inline') this.pdfBlob.set(blob);
          else {
            const url = URL.createObjectURL(blob);
            try {
              const a = document.createElement('a');
              a.href = url;
              a.download = `prescription-v${version}.pdf`;
              a.click();
            } finally {
              URL.revokeObjectURL(url);
            }
          }
        },
        error: (error: unknown) => {
          if (sequence !== this.inspectionSequence || patientId !== this.patientId()) return;
          this.pdfLoading.set(false);
          this.pdfBlob.set(null);
          this.toast.error(this.language.t('doctorPatients.pdf.failed'));
          const status = parseApiErrors(error).status;
          if (status === 409) this.loadPrescriptions();
          if ([401, 403, 404].includes(status)) {
            this.clearInspection();
            this.prescriptions.set([]);
            this.totalCount.set(0);
            this.error.set(true);
          }
        },
      });
  }

  viewVersions(rx: DoctorPatientPrescription): void {
    if (!rx.canView || !this.session.hasPermission('Prescriptions.ViewOwn')) return;
    this.clearInspection();
    const patientId = this.patientId();
    const sequence = this.inspectionSequence;
    this.selectedPrescriptionId.set(rx.prescriptionId);
    this.versionsLoading.set(true);

    this.versionsRequest = this.prescriptionsApi.versions(rx.prescriptionId).subscribe({
      next: (versions) => {
        if (
          sequence !== this.inspectionSequence ||
          patientId !== this.patientId() ||
          !this.session.hasPermission('Prescriptions.ViewOwn')
        )
          return;
        this.selectedVersions.set(versions);
        this.versionsLoading.set(false);
      },
      error: () => {
        if (sequence !== this.inspectionSequence || patientId !== this.patientId()) return;
        this.selectedVersions.set(null);
        this.toast.error(this.language.t('doctorPatients.toasts.versionsLoadFailed'));
        this.versionsLoading.set(false);
      },
    });
  }

  closeVersionsModal(): void {
    this.versionsRequest?.unsubscribe();
    this.versionsLoading.set(false);
    this.selectedVersions.set(null);
    this.selectedPrescriptionId.set(null);
  }

  closePdf(): void {
    this.pdfRequest?.unsubscribe();
    this.pdfBlob.set(null);
    this.pdfLoading.set(false);
  }

  private clearInspection(): void {
    ++this.inspectionSequence;
    this.closePdf();
    this.closeVersionsModal();
  }

  canExportVersion(version: PrescriptionVersion): boolean {
    const rx = this.prescriptions().find(
      (item) => item.prescriptionId === this.selectedPrescriptionId(),
    );
    return !!rx && this.canExport(rx) && version.status !== 'Draft';
  }
  viewVersionPdf(versionNumber: number): void {
    const rx = this.prescriptions().find(
      (item) => item.prescriptionId === this.selectedPrescriptionId(),
    );
    const version = this.selectedVersions()?.find((item) => item.versionNumber === versionNumber);
    if (rx && version && version.status !== 'Draft') this.viewPdf(rx, versionNumber);
  }
}
