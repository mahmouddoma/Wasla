import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { HistoricalDocumentsApi } from '../../../domains/medical-records/historical-documents-api';
import {
  HistoricalCategory,
  HistoricalDocument,
  HistoricalReceipt,
  HistoricalSubject,
  HistoricalVersion,
} from '../../../domains/medical-records/historical-documents.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthSession } from '../../../core/auth/auth-session';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';

@Component({
  selector: 'app-historical-documents',
  imports: [DatePipe, FormsModule, NgTemplateOutlet, TranslatePipe, SideDrawer],
  templateUrl: './historical-documents.component.html',
  styleUrl: './historical-documents.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricalDocumentsComponent implements OnChanges, OnDestroy {
  readonly subject = input<HistoricalSubject>({ kind: 'own' });
  readonly canCreate = input(false);
  readonly canView = input(true);
  readonly documentId = input<string | null>(null);
  readonly language = inject(LanguageService);
  private readonly api = inject(HistoricalDocumentsApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(AuthSession);

  // Responsive Master-Detail Split View (>= 1025px) vs Side Drawer (< 1025px)
  private readonly resizeListener = () => {
    if (typeof window !== 'undefined') {
      this.isDesktop.set(window.innerWidth >= 1025);
    }
  };

  readonly isDesktop = signal(
    typeof window !== 'undefined' ? window.innerWidth >= 1025 : true,
  );

  readonly hasActiveDetail = computed(
    () => this.editing() || this.withdrawing() || !!this.selected(),
  );

  readonly detailTitle = computed(() => {
    if (this.withdrawing()) return this.language.t('historical.withdraw');
    if (this.editing()) {
      return this.selected()
        ? this.language.t('historical.revise')
        : this.language.t('historical.add');
    }
    if (this.selected()) {
      return (
        this.selected()?.currentVersion?.metadata?.title ||
        this.language.t('historical.document')
      );
    }
    return this.language.t('historical.document');
  });

  isSelected(id: string): boolean {
    return this.selected()?.documentId === id;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener, { passive: true });
    }
  }
  readonly documents = signal<HistoricalDocument[]>([]);
  readonly selected = signal<HistoricalDocument | null>(null);
  readonly versions = signal<HistoricalVersion[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly editing = signal(false);
  readonly withdrawing = signal(false);
  readonly receipt = signal<HistoricalReceipt | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly versionPage = signal(1);
  readonly categories: readonly HistoricalCategory[] = [
    'HistoricalPrescription',
    'HistoricalLabReport',
    'HistoricalRadiologyReport',
    'SurgeryOrDischargeReport',
    'OtherMedicalDocument',
  ];
  category: HistoricalCategory = 'OtherMedicalDocument';
  documentDate = '';
  dateUnknown = true;
  providerName = '';
  title = '';
  patientNote = '';
  reason = '';
  includeWithdrawn = false;
  files: File[] = [];
  private listRequest?: Subscription;
  private detailRequest?: Subscription;
  private generation = 0;
  private intent: { signature: string; key: string } | null = null;
  private readonly mediaUrls = new Set<string>();

  ngOnChanges(): void {
    this.generation++;
    this.clear();
    this.load(1);
    const id = this.documentId();
    if (id) this.inspect(id);
  }
  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.generation++;
    this.listRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    this.revokeMedia();
  }
  load(page = this.page()): void {
    if (!this.canView()) {
      this.documents.set([]);
      this.loading.set(false);
      return;
    }
    this.listRequest?.unsubscribe();
    this.documents.set([]);
    this.loading.set(true);
    this.failed.set(false);
    this.page.set(page);
    this.listRequest = this.api.list(this.subject(), page, this.includeWithdrawn).subscribe({
      next: (result) => {
        this.documents.set(result.items);
        this.total.set(result.totalCount);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.failed.set(true);
        this.handleError(error);
      },
    });
  }
  inspect(document: HistoricalDocument | string): void {
    if (!this.canView()) return;
    this.detailRequest?.unsubscribe();
    this.selected.set(null);
    this.versions.set([]);
    this.failed.set(false);
    this.detailRequest = this.api
      .details(this.subject(), typeof document === 'string' ? document : document.documentId)
      .subscribe({
        next: (value) => this.selected.set(value),
        error: (error) => this.handleError(error),
      });
  }
  async loadVersions(page = 1): Promise<void> {
    const selected = this.selected();
    if (!selected || this.subject().kind !== 'own') return;
    const generation = this.generation;
    try {
      const versions = await firstValueFrom(this.api.versions(selected.documentId, page));
      if (generation === this.generation && this.selected()?.documentId === selected.documentId) {
        this.versions.set(versions);
        this.versionPage.set(page);
      }
    } catch (error) {
      if (generation === this.generation) this.handleError(error);
    }
  }
  startEdit(document?: HistoricalDocument): void {
    if (this.busy() || (document ? !document.canRevise : !this.canCreate())) return;
    this.selected.set(document ?? null);
    this.receipt.set(null);
    this.intent = null;
    this.files = [];
    this.reason = '';
    const metadata = document?.currentVersion?.metadata;
    this.category = metadata?.category ?? 'OtherMedicalDocument';
    this.documentDate = metadata?.documentDate ?? '';
    this.dateUnknown = metadata?.dateUnknown ?? true;
    this.providerName = metadata?.providerName ?? '';
    this.title = metadata?.title ?? '';
    this.patientNote = metadata?.patientNote ?? '';
    this.editing.set(true);
  }
  chooseFiles(event: Event): void {
    this.files = Array.from((event.target as HTMLInputElement).files ?? []);
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    const selected = this.selected();
    if (selected ? !selected.canRevise : !this.canCreate()) return;
    if (
      !this.files.length ||
      this.files.length > 5 ||
      this.files.some(
        (f) =>
          f.size === 0 ||
          f.size > 10 * 1024 * 1024 ||
          !['application/pdf', 'image/jpeg', 'image/png'].includes(f.type),
      ) ||
      (!this.dateUnknown && !this.documentDate) ||
      (selected && !this.reason.trim())
    ) {
      this.toast.error(this.language.t('historical.invalid'));
      return;
    }
    const body = {
      category: this.category,
      documentDate: this.dateUnknown ? null : this.documentDate,
      dateUnknown: this.dateUnknown,
      providerName: this.providerName.trim() || null,
      title: this.title.trim() || null,
      patientNote: this.patientNote.trim() || null,
      files: this.files,
      ...(selected ? { rowVersion: selected.rowVersion, reason: this.reason.trim() } : {}),
    };
    const key = this.intentKey({
      ...body,
      files: this.files.map((f) => [f.name, f.size, f.lastModified]),
    });
    const generation = this.generation;
    this.busy.set(true);
    try {
      const receipt = await firstValueFrom(
        this.api.upload(this.subject(), body, key, selected?.documentId),
      );
      if (generation !== this.generation) return;
      this.receipt.set(receipt);
      if (receipt.validationState === 'AvailableUnverified') {
        this.toast.success(this.language.t('historical.saved'));
        this.editing.set(false);
        this.selected.set(null);
        this.intent = null;
        this.files = [];
      } else {
        this.toast.error(this.language.t(`historical.state.${receipt.validationState}`));
      }
      this.load(1);
    } catch (error) {
      if (generation === this.generation) this.handleError(error);
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  confirmWithdraw(document: HistoricalDocument): void {
    if (!document.canWithdraw) return;
    this.selected.set(document);
    this.reason = '';
    this.intent = null;
    this.withdrawing.set(true);
  }
  async withdraw(): Promise<void> {
    const document = this.selected();
    if (!document?.canWithdraw || !this.reason.trim() || this.busy()) return;
    this.busy.set(true);
    const generation = this.generation;
    try {
      await firstValueFrom(
        this.api.withdraw(
          this.subject(),
          document.documentId,
          document.rowVersion,
          this.reason.trim(),
          this.intentKey({
            id: document.documentId,
            rowVersion: document.rowVersion,
            reason: this.reason.trim(),
          }),
        ),
      );
      if (generation !== this.generation) return;
      this.toast.success(this.language.t('historical.withdrawn'));
      this.close();
      this.load(1);
    } catch (error) {
      if (generation === this.generation) this.handleError(error);
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  async download(attachmentId: string, fileName: string): Promise<void> {
    const document = this.selected();
    if (!document || document.state !== 'AvailableUnverified') return;
    const generation = this.generation;
    try {
      const response = await firstValueFrom(
        this.api.attachment(this.subject(), document.documentId, attachmentId),
      );
      if (!response.body || generation !== this.generation || !this.session.isAuthenticated())
        return;
      const url = URL.createObjectURL(response.body);
      this.mediaUrls.add(url);
      const anchor = globalThis.document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        this.mediaUrls.delete(url);
      }, 1000);
    } catch (error) {
      if (generation === this.generation) this.handleError(error);
    }
  }
  close(): void {
    this.detailRequest?.unsubscribe();
    this.editing.set(false);
    this.withdrawing.set(false);
    this.selected.set(null);
    this.versions.set([]);
    this.files = [];
    this.revokeMedia();
  }
  private intentKey(payload: unknown): string {
    const signature = JSON.stringify([this.subject(), payload]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    return this.intent.key;
  }
  private clear(): void {
    this.close();
    this.receipt.set(null);
    this.documents.set([]);
    this.busy.set(false);
    this.intent = null;
  }
  private handleError(error: unknown): void {
    this.toast.error(
      this.language.t(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'historical.conflict'
          : 'historical.failed',
      ),
    );
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      this.clear();
      this.failed.set(true);
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.close();
      this.load();
    }
  }
  private revokeMedia(): void {
    this.mediaUrls.forEach((url) => URL.revokeObjectURL(url));
    this.mediaUrls.clear();
  }
}
