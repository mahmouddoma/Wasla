import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { MedicalRecordAccessLogEntry, MedicalRecordsApi } from '../../../domains/medical-records';

@Component({
  selector: 'app-record-access-log',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './record-access-log.component.html',
  styleUrl: './record-access-log.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordAccessLogComponent {
  private readonly api = inject(MedicalRecordsApi);
  private readonly session = inject(AuthSession);
  protected readonly language = inject(LanguageService);
  protected readonly items = signal<readonly MedicalRecordAccessLogEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly denied = signal(false);
  protected readonly hasMore = signal(false);
  private cursor: string | null = null;
  private sequence = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.sequence++);
    void this.load();
  }

  async load(append = false): Promise<void> {
    if (append && (this.loading() || !this.cursor || !this.hasMore())) return;
    if (!this.session.hasPermission('MedicalRecords.ViewOwn')) {
      this.denied.set(true);
      this.items.set([]);
      return;
    }
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    if (!append) {
      this.cursor = null;
      this.hasMore.set(false);
      this.items.set([]);
    }
    try {
      const page = await firstValueFrom(this.api.patientAccessLog(this.cursor ?? undefined));
      if (sequence !== this.sequence) return;
      const items = new Map(this.items().map((item) => [item.entryId, item]));
      for (const item of page.items ?? []) items.set(item.entryId, item);
      this.items.set([...items.values()]);
      this.cursor = page.nextCursor ?? null;
      this.hasMore.set(page.hasMore && !!this.cursor);
    } catch (error) {
      if (sequence !== this.sequence) return;
      this.failed.set(true);
      if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
        this.items.set([]);
        this.cursor = null;
        this.hasMore.set(false);
        this.denied.set(true);
      }
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }

  protected actorLabel(category: string | null): string {
    return this.safeLabel('recordAccess.actor', category, 'recordAccess.actor.other');
  }
  protected actionLabel(action: string | null): string {
    return this.safeLabel('recordAccess.action', action, 'recordAccess.action.other');
  }
  private safeLabel(namespace: string, value: string | null, fallback: string): string {
    const key = `${namespace}.${value}`;
    const translated = this.language.t(key);
    return translated === key ? this.language.t(fallback) : translated;
  }
}
