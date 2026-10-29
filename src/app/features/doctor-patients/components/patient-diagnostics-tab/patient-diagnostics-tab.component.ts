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
import {
  DiagnosticsApi,
  DiagnosticQuery,
} from '../../../../domains/diagnostics';
import { DiagnosticKind } from '../../../../domains/medical-catalog';
import type {
  DiagnosticRequestSummary,
  DiagnosticResultResponse,
  DiagnosticSubmissionSummary,
  DiagnosticSubmissionResponse,
} from '../../../../domains/diagnostics/contracts';
import { ToastService } from '../../../../core/notifications/toast.service';

type SubTab = 'requests' | 'results' | 'submissions';

@Component({
  selector: 'app-patient-diagnostics-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-diagnostics-tab.component.html',
  styleUrl: './patient-diagnostics-tab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDiagnosticsTabComponent implements OnInit {
  private readonly diagnosticsApi = inject(DiagnosticsApi);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);

  readonly patientId = input.required<string>();
  readonly isHistoricalOnly = input<boolean>(false);

  readonly currentKind = signal<DiagnosticKind>('lab');
  readonly currentTab = signal<SubTab>('requests');

  readonly loading = signal<boolean>(false);
  readonly error = signal<boolean>(false);

  readonly requests = signal<readonly DiagnosticRequestSummary[]>([]);
  readonly results = signal<readonly DiagnosticResultResponse[]>([]);
  readonly submissions = signal<readonly DiagnosticSubmissionSummary[]>([]);

  readonly reviewingSubmission = signal<DiagnosticSubmissionSummary | null>(null);
  readonly selectedSubmissionDetail = signal<DiagnosticSubmissionResponse | null>(null);
  readonly reviewAction = signal<'accept' | 'reject'>('accept');
  readonly reviewReason = signal<string>('');
  readonly reviewingLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
  }

  setKind(kind: DiagnosticKind): void {
    this.currentKind.set(kind);
    this.loadData();
  }

  setTab(tab: SubTab): void {
    this.currentTab.set(tab);
    this.loadData();
  }

  loadData(): void {
    const pid = this.patientId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(false);

    const kind = this.currentKind();
    const tab = this.currentTab();
    const query: DiagnosticQuery = {
      PatientId: pid,
      PageNumber: 1,
      PageSize: 20,
    };

    if (tab === 'requests') {
      this.diagnosticsApi.requests(kind, 'Doctor', query).subscribe({
        next: (page) => {
          this.requests.set(page.items || []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
    } else if (tab === 'results') {
      this.diagnosticsApi.results(kind, 'Doctor', query).subscribe({
        next: (page) => {
          this.results.set(page.items || []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
    } else {
      this.diagnosticsApi.inbox(kind, query).subscribe({
        next: (page) => {
          this.submissions.set(page.items || []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
    }
  }

  openReview(submission: DiagnosticSubmissionSummary, action: 'accept' | 'reject'): void {
    if (this.isHistoricalOnly()) {
      this.toast.error(this.language.t('doctorPatients.toasts.cannotReviewClosedPractice'));
      return;
    }
    this.reviewingSubmission.set(submission);
    this.selectedSubmissionDetail.set(null);
    this.reviewAction.set(action);
    this.reviewReason.set('');

    this.diagnosticsApi.submission(this.currentKind(), 'Doctor', submission.submissionId).subscribe({
      next: (detail) => this.selectedSubmissionDetail.set(detail),
      error: () => this.toast.error(this.language.t('doctorPatients.toasts.submissionLoadFailed')),
    });
  }

  closeReview(): void {
    this.reviewingSubmission.set(null);
    this.selectedSubmissionDetail.set(null);
  }

  submitReview(): void {
    const sub = this.reviewingSubmission();
    if (!sub) return;

    const kind = this.currentKind();
    const action = this.reviewAction();
    const key = `review-${sub.submissionId}-${Date.now()}`;
    const rowVersion = this.selectedSubmissionDetail()?.rowVersion ?? null;

    this.reviewingLoading.set(true);

    if (action === 'accept') {
      const body =
        kind === 'lab'
          ? { coveredLabRequestItemIds: null, rowVersion }
          : { coveredRadiologyRequestItemIds: null, rowVersion };

      this.diagnosticsApi
        .accept(kind, sub.submissionId, body, key)
        .subscribe({
          next: () => {
            this.reviewingLoading.set(false);
            this.toast.success(this.language.t('doctorPatients.toasts.acceptSuccess'));
            this.closeReview();
            this.loadData();
          },
          error: () => {
            this.reviewingLoading.set(false);
            this.toast.error(this.language.t('doctorPatients.toasts.acceptFailed'));
          },
        });
    } else {
      const reason = this.reviewReason().trim();
      if (!reason) {
        this.toast.error(this.language.t('doctorPatients.toasts.rejectReasonRequired'));
        this.reviewingLoading.set(false);
        return;
      }
      this.diagnosticsApi
        .reject(kind, sub.submissionId, {
          patientVisibleReason: reason,
          rowVersion,
        })
        .subscribe({
          next: () => {
            this.reviewingLoading.set(false);
            this.toast.success(this.language.t('doctorPatients.toasts.rejectSuccess'));
            this.closeReview();
            this.loadData();
          },
          error: () => {
            this.reviewingLoading.set(false);
            this.toast.error(this.language.t('doctorPatients.toasts.rejectFailed'));
          },
        });
    }
  }
}

