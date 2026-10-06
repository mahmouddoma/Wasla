import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import {
  DrugImportBatch,
  ImportChangePage,
  ImportChangeType,
  ImportPage,
} from '../../models/drug-import.models';
import { DrugImportsApi } from '../../services/drug-imports-api';
@Component({
  selector: 'app-drug-imports',
  imports: [LocalizedDatePipe, JsonPipe, RouterLink, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './drug-imports.component.html',
  styleUrls: ['../../../../shared/styles/directory-workspace.css', './drug-imports.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrugImportsComponent implements OnInit {
  private readonly api = inject(DrugImportsApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly file = signal<File | null>(null);
  readonly sourceVersion = signal('');
  readonly sourceCommitSha = signal('');
  readonly detail = signal<DrugImportBatch | null>(null);
  readonly opened = signal(false);
  readonly messages = signal<string[]>([]);
  readonly confirmation = signal(false);
  readonly changeType = signal<ImportChangeType | undefined>(undefined);
  readonly changeTypes: readonly ImportChangeType[] = [
    'New',
    'Unchanged',
    'PriceChange',
    'NeedsReview',
    'MissingFromSource',
    'PossibleDuplicate',
    'ExactDuplicate',
  ];
  readonly page = signal<ImportPage>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
  readonly changes = signal<ImportChangePage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly changesLoading = signal(false);
  private listSequence = 0;
  private detailSequence = 0;
  private changesSequence = 0;
  private applyIntent: { batchId: string; key: string } | null = null;
  ngOnInit() {
    void this.load();
  }
  allowed(permission: string) {
    return (
      this.session.user()?.userType === 'DrugCatalogManager' &&
      this.session.hasPermission('DrugCatalog.' + permission)
    );
  }
  value(event: Event) {
    return (event.target as HTMLInputElement).value;
  }
  chooseFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.file.set(null);
    this.messages.set([]);
    if (
      file &&
      (!file.name.toLowerCase().endsWith('.json') || file.size > 20 * 1024 * 1024 || !file.size)
    ) {
      this.messages.set(['imports.invalidFile']);
      return;
    }
    this.file.set(file);
  }
  async load(pageNumber = 1) {
    if (!this.allowed('ImportHistory') || this.busy()) return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(this.api.list(pageNumber));
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
  async preview() {
    const file = this.file();
    if (!file || this.busy() || !this.allowed('Import')) return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      const batch = await firstValueFrom(
        this.api.preview(file, this.sourceVersion(), this.sourceCommitSha()),
      );
      this.detail.set(batch);
      this.opened.set(true);
      this.confirmation.set(false);
      this.applyIntent = null;
      this.file.set(null);
      this.toast.success('imports.previewSaved');
    } catch (error) {
      this.failure(error, true);
    } finally {
      this.busy.set(false);
    }
    if (this.detail()) {
      await this.load();
      if (this.allowed('ImportHistory')) await this.loadChanges();
    }
  }
  async inspect(batchId: string) {
    if (this.busy() || !this.allowed('ImportHistory')) return;
    const sequence = ++this.detailSequence;
    this.opened.set(true);
    this.detail.set(null);
    this.busy.set(true);
    this.confirmation.set(false);
    this.messages.set([]);
    this.applyIntent = null;
    try {
      const batch = await firstValueFrom(this.api.details(batchId));
      if (sequence === this.detailSequence) this.detail.set(batch);
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.busy.set(false);
    }
    if (this.detail()) await this.loadChanges();
  }
  async loadChanges(pageNumber = 1) {
    const batch = this.detail();
    if (!batch || !this.allowed('ImportHistory')) return;
    const sequence = ++this.changesSequence;
    this.changesLoading.set(true);
    try {
      const changes = await firstValueFrom(
        this.api.changes(batch.batchId, this.changeType(), pageNumber),
      );
      if (sequence === this.changesSequence && batch.batchId === this.detail()?.batchId)
        this.changes.set(changes);
    } catch (error) {
      if (sequence === this.changesSequence) this.failure(error);
    } finally {
      if (sequence === this.changesSequence) this.changesLoading.set(false);
    }
  }
  filter(event: Event) {
    const type = this.value(event);
    if (type && !this.changeTypes.includes(type as ImportChangeType)) return;
    this.changeType.set((type as ImportChangeType) || undefined);
    void this.loadChanges();
  }
  counts(batch: DrugImportBatch) {
    return Object.entries(batch.counts ?? {});
  }
  sourceFields(row: unknown) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const data = row as Record<string, unknown>;
    return [
      'commercialNameEn',
      'commercialNameAr',
      'scientificName',
      'manufacturer',
      'drugClass',
      'route',
      'strengthText',
      'dosageForm',
      'priceEgp',
    ]
      .filter((field) => typeof data[field] === 'string' || typeof data[field] === 'number')
      .map((field) => ({ label: 'medications.' + field, value: String(data[field]) }));
  }
  async apply() {
    const batch = this.detail();
    if (
      !batch ||
      batch.status !== 'Staged' ||
      !this.confirmation() ||
      this.busy() ||
      !this.allowed('Import')
    )
      return;
    if (this.applyIntent?.batchId !== batch.batchId)
      this.applyIntent = { batchId: batch.batchId, key: createIdempotencyKey() };
    this.busy.set(true);
    this.messages.set([]);
    let saved = false;
    try {
      this.detail.set(await firstValueFrom(this.api.apply(batch.batchId, this.applyIntent.key)));
      this.confirmation.set(false);
      this.applyIntent = null;
      saved = true;
      this.toast.success('medications.saved');
    } catch (error) {
      this.failure(error, true);
      if (
        error instanceof HttpErrorResponse &&
        error.status === 409 &&
        this.allowed('ImportHistory')
      ) {
        try {
          this.detail.set(await firstValueFrom(this.api.details(batch.batchId)));
          this.confirmation.set(false);
          this.applyIntent = null;
        } catch (refreshError) {
          this.failure(refreshError);
        }
      }
    } finally {
      this.busy.set(false);
    }
    if (saved) {
      if (this.allowed('ImportHistory')) {
        try {
          this.detail.set(await firstValueFrom(this.api.details(batch.batchId)));
        } catch (error) {
          this.failure(error);
        }
      }
      await this.load();
      await this.loadChanges();
    }
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.changesSequence++;
      this.opened.set(false);
      this.detail.set(null);
      this.confirmation.set(false);
      this.changesLoading.set(false);
    }
  }
  private failure(error: unknown, mutation = false) {
    const parsed = parseApiErrors(error),
      messages =
        parsed.status === 404
          ? ['medications.notFound']
          : [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages);
    if (mutation) this.toast.error(messages[0] || 'medications.failed');
  }
}
