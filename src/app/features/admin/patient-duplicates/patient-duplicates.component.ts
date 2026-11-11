import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  PatientDuplicateDetails,
  PatientDuplicateStatus,
  PatientDuplicatesPage,
  PatientIdentityApi,
} from '../../../domains/patient-identity';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-patient-duplicates',
  imports: [DatePipe, FormField, TranslatePipe, PageHeader],
  templateUrl: './patient-duplicates.component.html',
  styleUrl: './patient-duplicates.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDuplicatesComponent {
  protected readonly language = inject(LanguageService);
  private readonly api = inject(PatientIdentityApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);

  protected readonly selectedCaseId = signal<string>('');

  protected readonly canView = computed(
    () =>
      this.session.user()?.userType === 'SuperAdmin' &&
      this.session.hasPermission(PERMISSIONS.patientDuplicatesView),
  );
  protected readonly canResolve = computed(
    () => this.canView() && this.session.hasPermission(PERMISSIONS.patientDuplicatesResolve),
  );

  protected readonly statuses: readonly PatientDuplicateStatus[] = [
    'NeedsMoreEvidence',
    'ConfirmedDuplicate',
    'DistinctPatients',
  ];

  protected readonly status = signal<PatientDuplicateStatus | ''>('NeedsMoreEvidence');
  protected readonly result = signal<PatientDuplicatesPage | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly drawerOpen = signal(false);
  protected readonly selected = signal<PatientDuplicateDetails | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailFailed = signal(false);
  protected readonly busy = signal(false);

  protected readonly totalCount = computed(() => this.result()?.totalCount ?? 0);
  protected readonly pageNumber = computed(() => this.result()?.pageNumber ?? 1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.result()?.totalCount ?? 0) / (this.result()?.pageSize ?? 20))),
  );
  protected readonly hasActiveFilters = computed(() => !!this.status());

  protected readonly model = signal({
    resolution: '' as PatientDuplicateStatus | '',
    reason: '',
  });

  protected readonly decisionForm = form(this.model, (fields) => {
    required(fields.resolution);
    required(fields.reason);
    maxLength(fields.reason, 500);
  });

  private listSequence = 0;
  private detailSequence = 0;
  private intent: { signature: string; key: string } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.listSequence++;
      this.detailSequence++;
    });
    void this.load();
  }

  protected async load(page = 1): Promise<void> {
    if (!this.canView()) {
      this.result.set(null);
      this.loading.set(false);
      return;
    }
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const result = await firstValueFrom(
        this.api.adminDuplicates(page, 20, this.status() || undefined),
      );
      if (sequence === this.listSequence && this.canView()) {
        this.result.set(result);
      }
    } catch (error) {
      if (sequence !== this.listSequence) return;
      this.result.set(null);
      this.failed.set(true);
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
        this.close();
      }
    } finally {
      if (sequence === this.listSequence) {
        this.loading.set(false);
      }
    }
  }

  protected setStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value && !this.statuses.some((status) => status === value)) return;
    this.status.set(value as PatientDuplicateStatus | '');
    void this.load(1);
  }

  protected setQuickFilter(status: PatientDuplicateStatus | ''): void {
    this.status.set(status);
    void this.load(1);
  }

  protected clearAllFilters(): void {
    this.status.set('');
    void this.load(1);
  }

  protected async inspect(id: string): Promise<void> {
    if (!this.canView() || this.busy()) return;
    const sequence = ++this.detailSequence;
    this.selectedCaseId.set(id);
    this.drawerOpen.set(true);
    this.detailLoading.set(true);
    this.detailFailed.set(false);
    this.selected.set(null);
    this.model.set({ resolution: '', reason: '' });
    this.decisionForm().reset();
    this.intent = null;
    try {
      const item = await firstValueFrom(this.api.adminDuplicateDetails(id));
      if (sequence === this.detailSequence && this.canView()) {
        this.selected.set(item);
      }
    } catch (error) {
      if (sequence !== this.detailSequence) return;
      this.detailFailed.set(true);
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
        this.result.set(null);
      }
    } finally {
      if (sequence === this.detailSequence) {
        this.detailLoading.set(false);
      }
    }
  }

  protected close(): void {
    if (this.busy()) return;
    this.detailSequence++;
    this.selectedCaseId.set('');
    this.drawerOpen.set(false);
    this.selected.set(null);
    this.detailLoading.set(false);
  }

  protected async resolve(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.decisionForm, async () => {
      const item = this.selected();
      const value = this.model();
      const reason = value.reason.trim();
      if (
        !item?.rowVersion ||
        !this.canResolve() ||
        this.busy() ||
        !reason ||
        !this.statuses.some((status) => status === value.resolution)
      ) {
        return;
      }
      const sequence = this.detailSequence;
      const request = {
        resolution: value.resolution as PatientDuplicateStatus,
        reason,
        rowVersion: item.rowVersion,
      };
      const signature = JSON.stringify([item.caseId, request]);
      if (this.intent?.signature !== signature) {
        this.intent = { signature, key: createIdempotencyKey() };
      }
      this.busy.set(true);
      try {
        await firstValueFrom(this.api.resolveDuplicate(item.caseId, request, this.intent.key));
        this.toast.success(this.language.t('duplicates.saved'));
        if (sequence !== this.detailSequence) return;
        this.busy.set(false);
        this.close();
        await this.load(this.result()?.pageNumber ?? 1);
      } catch (error) {
        if (sequence !== this.detailSequence) return;
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.toast.error(this.language.t('common.conflictState'));
          this.busy.set(false);
          await this.inspect(item.caseId);
        } else {
          this.toast.error(this.language.t('common.actionFailed'));
          if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
            this.selected.set(null);
            this.detailFailed.set(true);
            if (error.status !== 404) this.result.set(null);
          }
        }
      } finally {
        if (sequence === this.detailSequence) {
          this.busy.set(false);
        }
      }
    });
  }

  protected formatDate(utc?: string | null): string {
    if (!utc) return '—';
    try {
      const d = new Date(utc);
      return d.toLocaleDateString(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return utc;
    }
  }

  protected getStatusLabel(status: string): string {
    const key = `duplicates.status.${status}`;
    return this.language.t(key);
  }
}
