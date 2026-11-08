import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-patient-record',
  imports: [DatePipe, TranslatePipe, PageHeader, HistoricalDocumentsComponent],
  templateUrl: './patient-record.component.html',
  styleUrl: './patient-record.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientRecordComponent implements OnDestroy {
  readonly language = inject(LanguageService);
  readonly session = inject(AuthSession);
  private readonly api = inject(MedicalRecordsApi);
  readonly overview = signal<SafeRecordOverview | null>(null);
  readonly entries = signal<SafeRecordEntry[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly hasMore = signal(false);
  readonly showDocuments = signal(false);
  readonly filter = signal('all');
  readonly documentId = signal<string | null>(null);
  readonly isClinical = isClinicalRecordEntry;
  readonly isHistorical = isHistoricalRecordEntry;
  private cursor: string | null = null;
  private sequence = 0;
  constructor() {
    if (!this.session.hasPermission('MedicalRecords.ViewOwn')) this.showDocuments.set(true);
    else void this.load();
  }
  ngOnDestroy(): void {
    this.sequence++;
  }
  async load(): Promise<void> {
    if (!this.session.hasPermission('MedicalRecords.ViewOwn')) return;
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.entries.set([]);
    this.overview.set(null);
    try {
      const overview = await firstValueFrom(this.api.patientOverview());
      if (sequence !== this.sequence) return;
      this.overview.set(overview);
      this.entries.set(overview.timeline.items);
      this.cursor = overview.timeline.nextCursor;
      this.hasMore.set(overview.timeline.hasMore);
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
      this.showDocuments.set(true);
    }
  }
  private fail(error: unknown): void {
    this.failed.set(true);
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      this.cursor = null;
      this.hasMore.set(false);
      this.overview.set(null);
      this.entries.set([]);
      this.showDocuments.set(false);
    }
  }
}
