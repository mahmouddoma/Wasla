import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { MedicalRecordAccessLogEntry, MedicalRecordsApi } from '../../../domains/medical-records';

export type AccessFilterRole = 'all' | 'doctor' | 'reception' | 'user' | 'download';

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
  protected readonly activeFilter = signal<AccessFilterRole>('all');
  private cursor: string | null = null;
  private sequence = 0;

  protected readonly stats = computed(() => {
    const list = this.items();
    let doctors = 0;
    let reception = 0;
    let users = 0;
    let downloads = 0;

    for (const item of list) {
      const actor = this.canonicalActor(item.actorCategory);
      const action = this.canonicalAction(item.action);
      if (actor === 'Doctor') doctors++;
      else if (actor === 'Reception') reception++;
      else if (actor === 'User' || actor === 'Patient') users++;

      if (action === 'Download') downloads++;
    }

    return {
      total: list.length,
      doctors,
      reception,
      users,
      downloads,
    };
  });

  protected readonly filteredItems = computed(() => {
    const filter = this.activeFilter();
    const list = this.items();
    if (filter === 'all') return list;

    return list.filter((item) => {
      const actor = this.canonicalActor(item.actorCategory);
      const action = this.canonicalAction(item.action);

      if (filter === 'doctor') return actor === 'Doctor';
      if (filter === 'reception') return actor === 'Reception';
      if (filter === 'user') return actor === 'User' || actor === 'Patient';
      if (filter === 'download') return action === 'Download';
      return true;
    });
  });

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

  protected setFilter(filter: AccessFilterRole): void {
    this.activeFilter.set(filter);
  }

  protected canonicalActor(category: string | null): string {
    if (!category) return 'other';
    const normalized = category.trim().toLowerCase().replace(/[-_\s]/g, '');
    if (['doctor', 'treatingdoctor', 'physician', 'doc'].includes(normalized)) return 'Doctor';
    if (['reception', 'receptionist', 'clinicassistant', 'assistant', 'clerk', 'nurse'].includes(normalized)) return 'Reception';
    if (['patient', 'user', 'self', 'me', 'owner', 'accountowner', 'client'].includes(normalized)) return 'User';
    if (['superadmin', 'admin', 'administrator', 'system', 'platform'].includes(normalized)) return 'SuperAdmin';
    if (['emergency', 'er', 'ems'].includes(normalized)) return 'Emergency';
    return category;
  }

  protected canonicalAction(action: string | null): string {
    if (!action) return 'other';
    const normalized = action.trim().toLowerCase().replace(/[-_\s]/g, '');
    if (['view', 'read', 'browse', 'inspect', 'show', 'access', 'timeline', 'overview', 'recordaccess'].includes(normalized)) return 'View';
    if (['download', 'export', 'getfile', 'attachment', 'documentdownload'].includes(normalized)) return 'Download';
    if (['prescription', 'prescriptionview', 'rx'].includes(normalized)) return 'PrescriptionView';
    if (['lab', 'labview', 'test', 'result'].includes(normalized)) return 'LabView';
    if (['radiology', 'radiologyview', 'scan'].includes(normalized)) return 'RadiologyView';
    if (['search', 'query', 'filter'].includes(normalized)) return 'Search';
    return action;
  }

  protected actorLabel(category: string | null): string {
    if (!category) return this.language.t('recordAccess.actor.other');
    // First try exact key match
    const exactKey = `recordAccess.actor.${category}`;
    const exactTranslated = this.language.t(exactKey);
    if (exactTranslated !== exactKey) return exactTranslated;

    // Try canonical mapped key
    const canonical = this.canonicalActor(category);
    const canonicalKey = `recordAccess.actor.${canonical}`;
    const canonicalTranslated = this.language.t(canonicalKey);
    if (canonicalTranslated !== canonicalKey) return canonicalTranslated;

    return this.language.t('recordAccess.actor.other');
  }

  protected actionLabel(action: string | null): string {
    if (!action) return this.language.t('recordAccess.action.other');
    // First try exact key match
    const exactKey = `recordAccess.action.${action}`;
    const exactTranslated = this.language.t(exactKey);
    if (exactTranslated !== exactKey) return exactTranslated;

    // Try canonical mapped key
    const canonical = this.canonicalAction(action);
    const canonicalKey = `recordAccess.action.${canonical}`;
    const canonicalTranslated = this.language.t(canonicalKey);
    if (canonicalTranslated !== canonicalKey) return canonicalTranslated;

    return this.language.t('recordAccess.action.other');
  }

  protected actorIcon(category: string | null): string {
    const actor = this.canonicalActor(category);
    switch (actor) {
      case 'Doctor':
        return 'fa-solid fa-user-doctor';
      case 'Reception':
        return 'fa-solid fa-hospital-user';
      case 'User':
      case 'Patient':
        return 'fa-solid fa-circle-user';
      case 'SuperAdmin':
        return 'fa-solid fa-shield-halved';
      case 'Emergency':
        return 'fa-solid fa-kit-medical';
      default:
        return 'fa-solid fa-user-shield';
    }
  }

  protected actorThemeClass(category: string | null): string {
    const actor = this.canonicalActor(category);
    switch (actor) {
      case 'Doctor':
        return 'actor-doctor';
      case 'Reception':
        return 'actor-reception';
      case 'User':
      case 'Patient':
        return 'actor-user';
      case 'SuperAdmin':
        return 'actor-admin';
      case 'Emergency':
        return 'actor-emergency';
      default:
        return 'actor-default';
    }
  }

  protected actionIcon(action: string | null): string {
    const act = this.canonicalAction(action);
    switch (act) {
      case 'View':
        return 'fa-regular fa-eye';
      case 'Download':
        return 'fa-solid fa-file-arrow-down';
      case 'PrescriptionView':
        return 'fa-solid fa-prescription-bottle-medical';
      case 'LabView':
        return 'fa-solid fa-vial-virus';
      case 'RadiologyView':
        return 'fa-solid fa-x-ray';
      case 'Search':
        return 'fa-solid fa-magnifying-glass';
      default:
        return 'fa-solid fa-clock-rotate-left';
    }
  }

  protected actionThemeClass(action: string | null): string {
    const act = this.canonicalAction(action);
    switch (act) {
      case 'View':
        return 'action-view';
      case 'Download':
        return 'action-download';
      case 'PrescriptionView':
        return 'action-prescription';
      case 'LabView':
      case 'RadiologyView':
        return 'action-medical';
      default:
        return 'action-default';
    }
  }

  protected formatRelativeDate(isoStr: string | null | undefined): string {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
      if (isToday) return this.language.t('recordAccess.timeToday');

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate();
      if (isYesterday) return this.language.t('recordAccess.timeYesterday');

      return '';
    } catch {
      return '';
    }
  }
}
