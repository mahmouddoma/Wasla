import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import {
  DiagnosticImportBatchResponse,
  DiagnosticImportBatchResponseClinicalPage,
  DiagnosticImportRecordResponseClinicalPage,
  DiagnosticImportRecordResponse,
  DiagnosticKind,
  MedicalCatalogApi,
} from '../../../../domains/medical-catalog';

@Component({
  selector: 'app-medical-imports',
  imports: [FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './imports.component.html',
  styleUrls: ['../../../../shared/styles/directory-workspace.css', './imports.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportsComponent implements OnInit {
  private readonly api = inject(MedicalCatalogApi);
  private readonly auth = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  readonly kind = inject(ActivatedRoute).snapshot.data['kind'] as DiagnosticKind;
  readonly title = `diagnostics.${this.kind}Imports`;
  readonly page = signal<DiagnosticImportBatchResponseClinicalPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly changes = signal<DiagnosticImportRecordResponseClinicalPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly batch = signal<DiagnosticImportBatchResponse | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly opened = signal(false);
  readonly file = signal<File | null>(null);
  readonly sourceVersion = signal('');
  readonly reason = signal('');
  readonly confirmApply = signal(false);
  readonly messages = signal<readonly string[]>([]);
  private listSequence = 0;
  private detailSequence = 0;
  private lastDetailId = '';
  retryDetail() {
    if (this.lastDetailId) void this.inspect(this.lastDetailId);
  }
  private changeSequence = 0;
  private previewIntent: { file: File; version: string; key: string } | null = null;
  private applyIntent: { signature: string; key: string } | null = null;
  ngOnInit() {
    void this.load();
  }
  allowed(action: string) {
    return (
      this.session.user()?.userType === 'MedicalCatalogManager' &&
      this.session.hasPermission(`${this.kind === 'lab' ? 'Lab' : 'Radiology'}Catalog.${action}`)
    );
  }
  async load(pageNumber = 1) {
    if (!this.allowed('ImportHistory') || this.busy()) return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(this.api.imports(this.kind, pageNumber));
      if (sequence === this.listSequence) this.page.set(page);
    } catch (error) {
      if (sequence === this.listSequence) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (sequence === this.listSequence) this.loading.set(false);
    }
  }
  chooseFile(event: Event) {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.previewIntent = null;
  }
  async preview() {
    const file = this.file(),
      version = this.sourceVersion().trim();
    if (this.busy() || !this.allowed('Import') || !file || !version) return;
    if (this.previewIntent?.file !== file || this.previewIntent.version !== version)
      this.previewIntent = { file, version, key: createIdempotencyKey() };
    await this.mutate(() => this.api.preview(this.kind, file, version, this.previewIntent!.key));
  }
  async inspect(id: string) {
    if (this.busy() || !this.allowed('ImportHistory')) return;
    this.lastDetailId = id;
    const sequence = ++this.detailSequence;
    this.opened.set(true);
    this.batch.set(null);
    this.confirmApply.set(false);
    this.reason.set('');
    this.messages.set([]);
    this.detailLoading.set(true);
    try {
      const batch = await firstValueFrom(this.api.batch(this.kind, id));
      if (sequence === this.detailSequence) {
        this.batch.set(batch);
        await this.loadChanges();
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  async loadChanges(pageNumber = 1) {
    const batch = this.batch();
    if (!batch || !this.allowed('ImportHistory')) return;
    const sequence = ++this.changeSequence;
    try {
      const changes = await firstValueFrom(this.api.changes(this.kind, batch.batchId, pageNumber));
      if (sequence === this.changeSequence && batch.batchId === this.batch()?.batchId)
        this.changes.set(changes);
    } catch (error) {
      this.failure(error);
    }
  }
  async apply() {
    const batch = this.batch();
    if (
      !batch ||
      !this.confirmApply() ||
      !this.allowed('Import') ||
      !batch.capabilities?.canApply ||
      this.busy()
    )
      return;
    const body = { rowVersion: batch.rowVersion, skipPossibleConflicts: false };
    const signature = JSON.stringify({ id: batch.batchId, body });
    if (signature !== this.applyIntent?.signature)
      this.applyIntent = { signature, key: createIdempotencyKey() };
    await this.mutate(() => this.api.apply(this.kind, batch.batchId, body, this.applyIntent!.key));
  }
  async discard() {
    const batch = this.batch();
    if (
      !batch ||
      !this.allowed('Import') ||
      !batch.capabilities?.canDiscard ||
      !this.reason().trim() ||
      this.busy()
    )
      return;
    await this.mutate(() =>
      this.api.discard(this.kind, batch.batchId, {
        rowVersion: batch.rowVersion,
        reason: this.reason().trim(),
        targetCatalogId: null,
      }),
    );
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.changeSequence++;
      this.opened.set(false);
      this.batch.set(null);
      this.confirmApply.set(false);
    }
  }
  counts() {
    return Object.entries(this.batch()?.counts ?? {});
  }
  changeName(change: DiagnosticImportRecordResponse) {
    // The change DTO exposes the official English name; Arabic can be included
    // in its source JSON. Never invent an Arabic translation of a clinical name.
    if (this.language.currentLang() === 'ar' && change.sourceDataJson) {
      try {
        const source: unknown = JSON.parse(change.sourceDataJson);
        if (
          source &&
          typeof source === 'object' &&
          'nameAr' in source &&
          typeof source.nameAr === 'string' &&
          source.nameAr.trim()
        )
          return source.nameAr;
      } catch {
        /* The official source name remains available for malformed source JSON. */
      }
    }
    return change.nameEn || change.loincCode || '';
  }
  private async mutate(request: () => Observable<DiagnosticImportBatchResponse>) {
    this.busy.set(true);
    let saved = false;
    try {
      this.batch.set(await firstValueFrom(request()));
      this.opened.set(true);
      this.confirmApply.set(false);
      this.applyIntent = null;
      this.previewIntent = null;
      saved = true;
      this.toast.success('diagnostics.saved');
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409 && this.batch()) {
        this.applyIntent = null;
        this.confirmApply.set(false);
        try {
          this.batch.set(await firstValueFrom(this.api.batch(this.kind, this.batch()!.batchId)));
        } catch (refreshError) {
          this.failure(refreshError);
        }
      }
    } finally {
      this.busy.set(false);
    }
    if (saved) {
      await this.load();
      await this.loadChanges();
    }
  }
  private failure(error: unknown, mutation = false) {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['diagnostics.failed']);
    if (mutation) this.toast.error(this.messages()[0]);
    if (parsed.status === 403)
      void firstValueFrom(this.auth.currentUser())
        .then((u) => this.session.complete(u))
        .catch(() => {});
  }
}
