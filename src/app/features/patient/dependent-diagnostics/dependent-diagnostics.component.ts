import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnDestroy,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DependentDiagnosticReceipt, FamilyWorkspaceApi } from '../../../domains/families';
import { DiagnosticSubmissionSummary } from '../../../domains/diagnostics/contracts';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';

@Component({
  selector: 'app-dependent-diagnostics',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './dependent-diagnostics.component.html',
  styleUrl: './dependent-diagnostics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependentDiagnosticsComponent implements OnChanges, OnDestroy {
  readonly childId = input.required<string>();
  readonly requestId = input.required<string>();
  readonly kind = input.required<'lab' | 'radiology'>();
  readonly canSubmit = input(false);
  readonly canView = input(false);
  readonly canWithdraw = input(false);
  readonly language = inject(LanguageService);
  private readonly api = inject(FamilyWorkspaceApi);
  private readonly toast = inject(ToastService);
  readonly submissions = signal<readonly DiagnosticSubmissionSummary[]>([]);
  readonly receipt = signal<DependentDiagnosticReceipt | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly confirming = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  files: File[] = [];
  externalProviderName = '';
  externalReportDate = '';
  patientNote = '';
  private generation = 0;
  private intent: { signature: string; key: string } | null = null;
  ngOnChanges(): void {
    this.generation++;
    this.busy.set(false);
    this.failed.set(false);
    this.externalProviderName = '';
    this.externalReportDate = '';
    this.patientNote = '';
    this.receipt.set(null);
    this.submissions.set([]);
    this.files = [];
    this.confirming.set(false);
    this.intent = null;
    void this.load(1);
  }
  ngOnDestroy(): void {
    this.generation++;
  }
  async load(page = 1): Promise<void> {
    if (!this.canView()) return;
    const generation = this.generation;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const result = await firstValueFrom(
        this.api.diagnosticSubmissions(this.childId(), this.kind(), this.requestId(), page),
      );
      if (generation === this.generation) {
        this.submissions.set(result.items ?? []);
        this.total.set(result.totalCount);
        this.page.set(page);
      }
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  chooseFiles(event: Event): void {
    this.files = Array.from((event.target as HTMLInputElement).files ?? []);
  }
  async submit(): Promise<void> {
    if (!this.canSubmit() || this.busy()) return;
    if (
      !this.files.length ||
      this.files.length > 5 ||
      this.files.some(
        (f) =>
          !f.size ||
          f.size > 10485760 ||
          !['application/pdf', 'image/jpeg', 'image/png'].includes(f.type),
      )
    ) {
      this.toast.error(this.language.t('historical.invalid'));
      return;
    }
    const metadata = {
      externalProviderName: this.externalProviderName.trim() || undefined,
      externalReportDate: this.externalReportDate || undefined,
      patientNote: this.patientNote.trim() || undefined,
    };
    const signature = JSON.stringify([
      this.childId(),
      this.requestId(),
      metadata,
      this.files.map((f) => [f.name, f.size, f.lastModified]),
    ]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    const generation = this.generation;
    this.busy.set(true);
    try {
      const result = await firstValueFrom(
        this.api.submitDiagnostic(
          this.childId(),
          this.kind(),
          this.requestId(),
          this.files,
          metadata,
          this.intent.key,
        ),
      );
      if (generation !== this.generation) return;
      this.receipt.set(result);
      this.files = [];
      this.intent = null;
      this.toast.success(this.language.t('familyFlow.submitted'));
      await this.load();
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  async withdraw(): Promise<void> {
    const receipt = this.receipt();
    if (
      !receipt ||
      receipt.status !== 'PendingReview' ||
      !this.canWithdraw() ||
      !this.confirming() ||
      this.busy()
    )
      return;
    const signature = JSON.stringify(['withdraw', receipt.submissionId, receipt.rowVersion]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    this.busy.set(true);
    const generation = this.generation;
    try {
      const result = await firstValueFrom(
        this.api.withdrawDiagnostic(
          this.childId(),
          this.kind(),
          this.requestId(),
          receipt.submissionId,
          receipt.rowVersion,
          this.intent.key,
        ),
      );
      if (generation === this.generation) {
        this.receipt.set(result);
        this.confirming.set(false);
        this.intent = null;
        this.toast.success(this.language.t('historical.withdrawn'));
        await this.load();
      }
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  private fail(error: unknown): void {
    this.failed.set(true);
    this.toast.error(this.language.t('familyFlow.failed'));
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      this.receipt.set(null);
      this.submissions.set([]);
      this.files = [];
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.receipt.set(null);
      this.confirming.set(false);
    }
  }
}
