import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
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
  imports: [CommonModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-prescriptions-list.component.html',
  styleUrl: './patient-prescriptions-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientPrescriptionsListComponent implements OnInit, OnDestroy {
  private readonly doctorPatientsApi = inject(DoctorPatientsApi);
  private readonly prescriptionsApi = inject(PrescriptionsApi);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);

  readonly patientId = input.required<string>();
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

  private activeObjectUrls: string[] = [];

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  ngOnDestroy(): void {
    this.cleanupObjectUrls();
  }

  loadPrescriptions(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(false);

    this.doctorPatientsApi
      .prescriptions(pid, {
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
    if (!rx.canExport) {
      this.toast.error(this.language.t('doctorPatients.toasts.noExportPermission'));
      return;
    }
    const version = versionNumber ?? rx.currentVersionNumber;
    this.pdfLoading.set(true);
    this.toast.success(this.language.t('doctorPatients.pdf.opening'));

    this.doctorPatientsApi.prescriptionPdf(rx.prescriptionId, version, 'inline').subscribe({
      next: (blob) => {
        this.pdfLoading.set(false);
        const url = URL.createObjectURL(blob);
        this.activeObjectUrls.push(url);
        window.open(url, '_blank');
      },
      error: () => {
        this.pdfLoading.set(false);
        this.toast.error(this.language.t('doctorPatients.pdf.failed'));
      },
    });
  }

  downloadPdf(rx: DoctorPatientPrescription, versionNumber?: number): void {
    if (!rx.canExport) {
      this.toast.error(this.language.t('doctorPatients.toasts.noExportPermission'));
      return;
    }
    const version = versionNumber ?? rx.currentVersionNumber;
    this.pdfLoading.set(true);
    this.toast.success(this.language.t('doctorPatients.pdf.downloading'));

    this.doctorPatientsApi.prescriptionPdf(rx.prescriptionId, version, 'attachment').subscribe({
      next: (blob) => {
        this.pdfLoading.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wasla-prescription-${rx.prescriptionId}-v${version}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.pdfLoading.set(false);
        this.toast.error(this.language.t('doctorPatients.pdf.failed'));
      },
    });
  }

  viewVersions(rx: DoctorPatientPrescription): void {
    this.selectedPrescriptionId.set(rx.prescriptionId);
    this.versionsLoading.set(true);

    this.prescriptionsApi.versions(rx.prescriptionId).subscribe({
      next: (versions) => {
        this.selectedVersions.set(versions);
        this.versionsLoading.set(false);
      },
      error: () => {
        this.toast.error(this.language.t('doctorPatients.toasts.versionsLoadFailed'));
        this.versionsLoading.set(false);
      },
    });
  }

  closeVersionsModal(): void {
    this.selectedVersions.set(null);
    this.selectedPrescriptionId.set(null);
  }

  viewVersionPdf(versionNumber: number): void {
    const rxId = this.selectedPrescriptionId();
    if (!rxId) return;

    this.pdfLoading.set(true);
    this.doctorPatientsApi.prescriptionPdf(rxId, versionNumber, 'inline').subscribe({
      next: (blob) => {
        this.pdfLoading.set(false);
        const url = URL.createObjectURL(blob);
        this.activeObjectUrls.push(url);
        window.open(url, '_blank');
      },
      error: () => {
        this.pdfLoading.set(false);
        this.toast.error(this.language.t('doctorPatients.pdf.failed'));
      },
    });
  }

  private cleanupObjectUrls(): void {
    for (const url of this.activeObjectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    this.activeObjectUrls = [];
  }
}
