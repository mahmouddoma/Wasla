import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthSession } from '../../../core/auth/auth-session';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { Phase18Part2Api } from '../../../domains/phase18';
import { components } from '../../../domains/phase18/phase18-part2-openapi.types';
import { firstValueFrom } from 'rxjs';

type ArchiveHealth = components['schemas']['ArchiveHealth'];
type ArchiveRunItem = components['schemas']['ArchiveRunItem'];
type ArchiveExceptionItem = components['schemas']['ArchiveExceptionItem'];
type PlatformTicketMetadata = components['schemas']['PlatformTicketMetadata'];
type PlatformReservationMetadata = components['schemas']['PlatformReservationMetadata'];
type SafeAuditEvent = components['schemas']['SafeAuditEvent'];
type ArchiveOperationsOptions = components['schemas']['ArchiveOperationsOptions'];
type AuditOptions = components['schemas']['AuditOptions'];
type PracticeOption = components['schemas']['PracticeOption'];

@Component({
  selector: 'app-archive-operations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './archive-operations.component.html',
  styleUrl: './archive-operations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveOperationsComponent implements OnInit {
  private readonly api = inject(Phase18Part2Api);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);
  protected readonly session = inject(AuthSession);

  // Tabs
  readonly activeTab = signal<'operations' | 'archives' | 'audit'>('operations');
  readonly loading = signal(false);

  // Operations tab state
  readonly health = signal<ArchiveHealth | null>(null);
  readonly runs = signal<ArchiveRunItem[]>([]);
  readonly runsCursor = signal<string | null>(null);
  readonly runsHasMore = signal(false);
  readonly exceptions = signal<ArchiveExceptionItem[]>([]);
  readonly exceptionsCursor = signal<string | null>(null);
  readonly exceptionsHasMore = signal(false);
  readonly operationsOptions = signal<ArchiveOperationsOptions | null>(null);

  // Detail drawers
  readonly selectedRun = signal<ArchiveRunItem | null>(null);
  readonly selectedException = signal<ArchiveExceptionItem | null>(null);

  // Worker controls dialogs
  readonly pauseModalOpen = signal(false);
  readonly resumeModalOpen = signal(false);
  readonly controlReason = signal('');
  readonly isMutating = signal(false);

  // Platform Archives tab state
  readonly archiveEntity = signal<'tickets' | 'reservations'>('tickets');
  readonly archivedTickets = signal<PlatformTicketMetadata[]>([]);
  readonly archivedReservations = signal<PlatformReservationMetadata[]>([]);
  readonly selectedArchivedTicket = signal<PlatformTicketMetadata | null>(null);
  readonly selectedArchivedReservation = signal<PlatformReservationMetadata | null>(null);
  readonly practiceOptions = signal<PracticeOption[]>([]);
  readonly archiveSearchQuery = signal('');
  readonly archivePracticeFilter = signal('');
  readonly archiveStatusFilter = signal('');
  readonly archiveCursor = signal<string | null>(null);
  readonly archiveHasMore = signal(false);

  // Platform Audit tab state
  readonly auditEvents = signal<SafeAuditEvent[]>([]);
  readonly selectedAuditEvent = signal<SafeAuditEvent | null>(null);
  readonly auditOptions = signal<AuditOptions | null>(null);
  readonly auditCursor = signal<string | null>(null);
  readonly auditHasMore = signal(false);
  readonly sensitiveSearchOpen = signal(false);
  readonly sensitiveSearchReason = signal('');
  readonly sensitiveSearchResults = signal<SafeAuditEvent[]>([]);
  readonly sensitiveSearching = signal(false);

  // Computed helper
  readonly isWorkerActive = computed(() => this.health()?.control.state === 'Active');
  readonly canPauseWorker = computed(() => this.health()?.control.canPause ?? false);
  readonly canResumeWorker = computed(() => this.health()?.control.canResume ?? false);

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  async setTab(tab: 'operations' | 'archives' | 'audit'): Promise<void> {
    this.activeTab.set(tab);
    if (tab === 'operations' && !this.health()) {
      await this.loadOperationsData();
    } else if (
      tab === 'archives' &&
      this.archivedTickets().length === 0 &&
      this.archivedReservations().length === 0
    ) {
      await this.loadArchivesData();
    } else if (tab === 'audit' && this.auditEvents().length === 0) {
      await this.loadAuditData();
    }
  }

  async loadInitialData(): Promise<void> {
    this.loading.set(true);
    try {
      await this.loadOperationsData();
    } finally {
      this.loading.set(false);
    }
  }

  async loadOperationsData(): Promise<void> {
    try {
      const [health, runsPage, exceptionsPage, options] = await Promise.all([
        firstValueFrom(this.api.call('P18.2-16')),
        firstValueFrom(this.api.call('P18.2-17', { query: { pageSize: 20 } })),
        firstValueFrom(this.api.call('P18.2-19', { query: { pageSize: 20 } })),
        firstValueFrom(this.api.call('P18.2-35')),
      ]);
      this.health.set(health);
      this.runs.set(runsPage.items ?? []);
      this.runsCursor.set(runsPage.nextCursor ?? null);
      this.runsHasMore.set(runsPage.hasMore);
      this.exceptions.set(exceptionsPage.items ?? []);
      this.exceptionsCursor.set(exceptionsPage.nextCursor ?? null);
      this.exceptionsHasMore.set(exceptionsPage.hasMore);
      this.operationsOptions.set(options);
    } catch {
      this.toast.error(
        this.language.t('common.errorLoading') || 'Error loading archive operations data',
      );
    }
  }

  async refreshHealth(): Promise<void> {
    try {
      const health = await firstValueFrom(this.api.call('P18.2-16'));
      this.health.set(health);
    } catch {
      // safe fallback
    }
  }

  async inspectRun(run: ArchiveRunItem): Promise<void> {
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-18', { pathParams: { runId: run.runId } }),
      );
      this.selectedRun.set(detail);
    } catch {
      this.selectedRun.set(run);
    }
  }

  async inspectException(exc: ArchiveExceptionItem): Promise<void> {
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-20', { pathParams: { exceptionId: exc.exceptionId } }),
      );
      this.selectedException.set(detail);
    } catch {
      this.selectedException.set(exc);
    }
  }

  openPauseDialog(): void {
    this.controlReason.set('');
    this.pauseModalOpen.set(true);
  }

  openResumeDialog(): void {
    this.controlReason.set('');
    this.resumeModalOpen.set(true);
  }

  async executePause(): Promise<void> {
    const reason = this.controlReason().trim();
    const currentHealth = this.health();
    if (!reason || !currentHealth) return;

    this.isMutating.set(true);
    try {
      await firstValueFrom(
        this.api.call('P18.2-21', {
          body: {
            reason,
            rowVersion: currentHealth.control.rowVersion,
          },
        }),
      );
      this.toast.success(this.language.t('archive.pauseSuccess'));
      this.pauseModalOpen.set(false);
      await this.refreshHealth();
    } catch (err) {
      this.toast.error(this.language.t('common.actionFailed') || 'Failed to pause archive worker');
      await this.refreshHealth();
    } finally {
      this.isMutating.set(false);
    }
  }

  async executeResume(): Promise<void> {
    const reason = this.controlReason().trim();
    const currentHealth = this.health();
    if (!reason || !currentHealth) return;

    this.isMutating.set(true);
    try {
      await firstValueFrom(
        this.api.call('P18.2-22', {
          body: {
            reason,
            rowVersion: currentHealth.control.rowVersion,
          },
        }),
      );
      this.toast.success(this.language.t('archive.resumeSuccess'));
      this.resumeModalOpen.set(false);
      await this.refreshHealth();
    } catch (err) {
      this.toast.error(this.language.t('common.actionFailed') || 'Failed to resume archive worker');
      await this.refreshHealth();
    } finally {
      this.isMutating.set(false);
    }
  }

  async setArchiveEntity(entity: 'tickets' | 'reservations'): Promise<void> {
    this.archiveEntity.set(entity);
    this.archiveCursor.set(null);
    await this.loadArchivesData();
  }

  async loadArchivesData(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.practiceOptions().length === 0) {
        const practices = await firstValueFrom(
          this.api.call('P18.2-34', { query: { pageSize: 50 } }),
        );
        this.practiceOptions.set(practices.items ?? []);
      }

      const entity = this.archiveEntity();
      const query: Record<string, string | number | boolean | null | undefined> = {
        pageSize: 20,
      };
      if (this.archiveSearchQuery().trim()) {
        if (entity === 'tickets')
          query['ticketNumber'] = Number(this.archiveSearchQuery().trim()) || undefined;
        else query['reference'] = this.archiveSearchQuery().trim();
      }
      if (this.archivePracticeFilter()) query['doctorPracticeId'] = this.archivePracticeFilter();
      if (this.archiveStatusFilter()) query['status'] = this.archiveStatusFilter();

      if (entity === 'tickets') {
        const res = await firstValueFrom(this.api.call('P18.2-13', { query }));
        this.archivedTickets.set(res.items ?? []);
        this.archiveCursor.set(res.nextCursor ?? null);
        this.archiveHasMore.set(res.hasMore);
      } else {
        const res = await firstValueFrom(this.api.call('P18.2-14', { query }));
        this.archivedReservations.set(res.items ?? []);
        this.archiveCursor.set(res.nextCursor ?? null);
        this.archiveHasMore.set(res.hasMore);
      }
    } catch {
      this.toast.error(this.language.t('common.errorLoading') || 'Error loading archived records');
    } finally {
      this.loading.set(false);
    }
  }

  async inspectPlatformTicket(item: PlatformTicketMetadata): Promise<void> {
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-15', { pathParams: { ticketId: item.ticketId } }),
      );
      this.selectedArchivedTicket.set(detail);
    } catch {
      this.selectedArchivedTicket.set(item);
    }
  }

  async inspectPlatformReservation(item: PlatformReservationMetadata): Promise<void> {
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-31', { pathParams: { reservationId: item.reservationId } }),
      );
      this.selectedArchivedReservation.set(detail);
    } catch {
      this.selectedArchivedReservation.set(item);
    }
  }

  async loadAuditData(): Promise<void> {
    this.loading.set(true);
    try {
      const [events, options] = await Promise.all([
        firstValueFrom(this.api.call('P18.2-28', { query: { pageSize: 25 } })),
        firstValueFrom(this.api.call('P18.2-38')),
      ]);
      this.auditEvents.set(events.items ?? []);
      this.auditCursor.set(events.nextCursor ?? null);
      this.auditHasMore.set(events.hasMore);
      this.auditOptions.set(options);
    } catch {
      this.toast.error(this.language.t('common.errorLoading') || 'Error loading audit trail');
    } finally {
      this.loading.set(false);
    }
  }

  async inspectAuditEvent(event: SafeAuditEvent): Promise<void> {
    if (!event.eventKey) {
      this.selectedAuditEvent.set(event);
      return;
    }
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-29', { pathParams: { eventKey: event.eventKey } }),
      );
      this.selectedAuditEvent.set(detail);
    } catch {
      this.selectedAuditEvent.set(event);
    }
  }

  async executeSensitiveSearch(): Promise<void> {
    const reason = this.sensitiveSearchReason().trim();
    if (!reason) return;

    this.sensitiveSearching.set(true);
    try {
      const results = await firstValueFrom(
        this.api.call('P18.2-30', {
          body: {
            reason,
            filters: {
              pageSize: 20,
            },
          },
        }),
      );
      this.sensitiveSearchResults.set(results.items ?? []);
    } catch {
      this.toast.error(this.language.t('common.errorLoading') || 'Failed sensitive access search');
    } finally {
      this.sensitiveSearching.set(false);
    }
  }

  formatDate(utcStr?: string | null): string {
    if (!utcStr) return '—';
    try {
      const d = new Date(utcStr);
      return new Intl.DateTimeFormat(this.language.currentLang() === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return utcStr;
    }
  }

  label(item?: { nameAr?: string | null; nameEn?: string | null } | null): string {
    if (!item) return '';
    return this.language.currentLang() === 'en'
      ? item.nameEn || item.nameAr || ''
      : item.nameAr || '';
  }
}
