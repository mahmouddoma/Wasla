import { ChangeDetectionStrategy, Component, OnDestroy, afterRenderEffect, computed, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MedicalRecordsApi } from '../../../domains/medical-records';
import {
  SafeRecordEntry,
  SafeRecordOverview,
  isClinicalRecordEntry,
  isHistoricalRecordEntry,
} from '../../../domains/medical-records/patient-record.models';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { HistoricalDocumentsComponent } from '../historical-documents/historical-documents.component';
import { RecordAccessLogComponent } from '../record-access-log/record-access-log.component';

@Component({
  selector: 'app-patient-record',
  imports: [DatePipe, TranslatePipe, PageHeader, HistoricalDocumentsComponent, RecordAccessLogComponent],
  templateUrl: './patient-record.component.html',
  styleUrl: './patient-record.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientRecordComponent implements OnDestroy {
  readonly language = inject(LanguageService);
  readonly session = inject(AuthSession);
  private readonly api = inject(MedicalRecordsApi);
  private readonly documentsPanel = viewChild(HistoricalDocumentsComponent);
  private readonly uploadRequested = signal(false);
  readonly overview = signal<SafeRecordOverview | null>(null);
  readonly entries = signal<SafeRecordEntry[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly hasMore = signal(false);
  readonly activeView = signal<'timeline' | 'documents' | 'access'>('timeline');
  readonly showDocuments = computed(() => this.activeView() === 'documents');
  readonly filter = signal('all');
  readonly documentId = signal<string | null>(null);
  readonly isClinical = isClinicalRecordEntry;
  readonly isHistorical = isHistoricalRecordEntry;
  private cursor: string | null = null;
  private sequence = 0;
  constructor() {
    afterRenderEffect(() => {
      const panel = this.documentsPanel();
      if (!panel || !this.uploadRequested()) return;
      this.uploadRequested.set(false);
      if (this.session.hasPermission('MedicalDocuments.CreateOwn')) untracked(() => panel.startEdit());
    });
    if (!this.session.hasPermission('MedicalRecords.ViewOwn')) this.activeView.set('documents');
    else void this.load();
  }
  ngOnDestroy(): void {
    this.sequence++;
  }
  openUpload(): void {
    if (!this.session.hasPermission('MedicalDocuments.CreateOwn')) return;
    this.documentId.set(null);
    this.activeView.set('documents');
    this.uploadRequested.set(true);
  }
  async load(): Promise<void> {
    if (!this.session.hasPermission('MedicalRecords.ViewOwn')) return;
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.entries.set([]);
    this.overview.set(null);
    this.cursor = null;
    this.hasMore.set(false);
    const filter = this.filter();
    try {
      const overview = await firstValueFrom(this.api.patientOverview());
      if (sequence !== this.sequence) return;
      this.overview.set(overview);
      const timeline = filter === 'all' ? overview.timeline : await firstValueFrom(this.api.patientTimeline(filter));
      if (sequence !== this.sequence) return;
      this.entries.set(timeline.items);
      this.cursor = timeline.nextCursor;
      this.hasMore.set(timeline.hasMore);
    } catch (error) {
      if (sequence === this.sequence) this.fail(error);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  async timeline(filter = this.filter(), append = false): Promise<void> {
    if (append && !this.cursor) return;
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.filter.set(filter);
    if (!append) {
      this.entries.set([]);
      this.cursor = null;
      this.hasMore.set(false);
    }
    try {
      const result = await firstValueFrom(
        this.api.patientTimeline(filter, undefined, undefined, this.cursor ?? undefined),
      );
      if (sequence !== this.sequence) return;
      this.entries.update((items) => (append ? [...items, ...result.items] : result.items));
      this.cursor = result.nextCursor;
      this.hasMore.set(result.hasMore);
    } catch (error) {
      if (sequence !== this.sequence) return;
      if (append && error instanceof HttpErrorResponse && [400, 409].includes(error.status)) {
        this.cursor = null;
        this.hasMore.set(false);
        await this.timeline(filter);
        return;
      }
      this.fail(error);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  openDocument(id: string): void {
    if (this.session.hasPermission('MedicalDocuments.ViewOwn')) {
      this.documentId.set(id);
      this.activeView.set('documents');
    }
  }
  private fail(error: unknown): void {
    this.failed.set(true);
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      this.cursor = null;
      this.hasMore.set(false);
      this.overview.set(null);
      this.entries.set([]);
      this.activeView.set('timeline');
    }
  }
}
