import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthSession } from '../../../core/auth/auth-session';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Phase18Part2Api } from '../../../domains/phase18';
import type { componentsPart2 as components } from '../../../domains/phase18';
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
  imports: [CommonModule, FormsModule, TranslatePipe, PageHeader],
  templateUrl: './archive-operations.component.html',
  styleUrl: './archive-operations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveOperationsComponent implements OnInit {
  private readonly api = inject(Phase18Part2Api);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);
  protected readonly session = inject(AuthSession);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readSequence = 0;
  private detailSequence = 0;
  readonly canReadOperations = computed(() => this.session.hasPermission(PERMISSIONS.archiveOperationsView));
  readonly canReadTickets = computed(() => this.session.hasPermission(PERMISSIONS.archivePlatformView));
  readonly canReadReservations = computed(() => this.session.hasPermission(PERMISSIONS.archiveReservationsPlatformView));
  readonly canReadAudit = computed(() => this.session.hasPermission(PERMISSIONS.auditEventsView));
  readonly canSearchSensitive = computed(() => this.session.hasPermission(PERMISSIONS.auditSensitiveRestrictedView));
  readonly auditAction = signal('');
  readonly auditOutcome = signal('');

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

  constructor() {
    inject(DestroyRef).onDestroy(() => { ++this.readSequence; ++this.detailSequence; });
  }

  async ngOnInit(): Promise<void> {
    const tab = this.route.snapshot.data['archiveTab'];
    if (tab === 'archives' || tab === 'audit') this.activeTab.set(tab);
    if (!this.canReadTickets()) this.archiveEntity.set('reservations');
    await this.loadInitialData();
  }

  async setTab(tab: 'operations' | 'archives' | 'audit'): Promise<void> {
    if (!this.allowed(tab)) return;
    await this.router.navigate(['/admin', tab === 'operations' ? 'archive-operations' : tab]);
    ++this.readSequence;
    ++this.detailSequence;
    this.selectedArchivedTicket.set(null);
    this.selectedArchivedReservation.set(null);
    this.selectedAuditEvent.set(null);
    this.sensitiveSearchResults.set([]);
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
    if (!this.allowed(this.activeTab())) return;
    this.loading.set(true);
    try {
      if (this.activeTab() === 'archives') await this.loadArchivesData();
      else if (this.activeTab() === 'audit') await this.loadAuditData();
      else await this.loadOperationsData();
    } finally {
      this.loading.set(false);
    }
  }

  async loadOperationsData(): Promise<void> {
    if (!this.canReadOperations()) return;
    try {
      const [health, runsPage, exceptionsPage, options] = await Promise.all([
        firstValueFrom(this.api.call('P18.2-16')),
        this.session.hasPermission(PERMISSIONS.archiveOperationsRuns) ? firstValueFrom(this.api.call('P18.2-17', { query: { pageSize: 20 } })) : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
        this.session.hasPermission(PERMISSIONS.archiveOperationsFailures) ? firstValueFrom(this.api.call('P18.2-19', { query: { pageSize: 20 } })) : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
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
    if (!this.session.hasPermission(PERMISSIONS.archiveOperationsRuns)) return;
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
    if (!this.session.hasPermission(PERMISSIONS.archiveOperationsFailures)) return;
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
    if (!reason || !currentHealth || this.isMutating()) return;

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
    if (!reason || !currentHealth || this.isMutating()) return;

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
    if (entity === 'tickets' ? !this.canReadTickets() : !this.canReadReservations()) return;
    this.archiveEntity.set(entity);
    this.archiveCursor.set(null);
    await this.loadArchivesData();
  }

  async loadArchivesData(append = false): Promise<void> {
    if (!this.allowed('archives') || (append && (!this.archiveHasMore() || this.loading()))) return;
    const sequence = ++this.readSequence;
    if (!append) { this.archiveCursor.set(null); this.archivedTickets.set([]); this.archivedReservations.set([]); }
    this.selectedArchivedTicket.set(null);
    this.selectedArchivedReservation.set(null);
    this.loading.set(true);
    try {
      if (this.practiceOptions().length === 0) {
        const practices = await firstValueFrom(
          this.api.call('P18.2-34', { query: { pageSize: 50 } }),
        );
        this.practiceOptions.set(practices.items ?? []);
      }
      if (sequence !== this.readSequence) return;

      const entity = this.archiveEntity();
      const query: Record<string, string | number | boolean | null | undefined> = {
        pageSize: 20,
        cursor: append ? this.archiveCursor() : undefined,
      };
      if (this.archiveSearchQuery().trim()) {
        if (entity === 'tickets')
          query['ticketNumber'] = Number(this.archiveSearchQuery().trim()) || undefined;
        else query['reference'] = this.archiveSearchQuery().trim();
      }
      if (this.archivePracticeFilter()) query['practiceId'] = this.archivePracticeFilter();
      if (this.archiveStatusFilter()) query['status'] = this.archiveStatusFilter();

      if (entity === 'tickets') {
        const res = await firstValueFrom(this.api.call('P18.2-13', { query }));
        if (sequence !== this.readSequence) return;
        this.archivedTickets.update(items => append ? [...new Map([...items, ...(res.items ?? [])].map(item => [item.ticketId, item])).values()] : res.items ?? []);
        this.archiveCursor.set(res.nextCursor ?? null);
        this.archiveHasMore.set(res.hasMore);
      } else {
        const res = await firstValueFrom(this.api.call('P18.2-14', { query }));
        if (sequence !== this.readSequence) return;
        this.archivedReservations.update(items => append ? [...new Map([...items, ...(res.items ?? [])].map(item => [item.reservationId, item])).values()] : res.items ?? []);
        this.archiveCursor.set(res.nextCursor ?? null);
        this.archiveHasMore.set(res.hasMore);
      }
    } catch {
      this.toast.error(this.language.t('common.errorLoading') || 'Error loading archived records');
    } finally {
      if (sequence === this.readSequence) this.loading.set(false);
    }
  }

  async inspectPlatformTicket(item: PlatformTicketMetadata): Promise<void> {
    if (!this.canReadTickets()) return;
    const detailSequence = ++this.detailSequence;
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-15', { pathParams: { ticketId: item.ticketId } }),
      );
      if (detailSequence === this.detailSequence) this.selectedArchivedTicket.set(detail);
    } catch {
      this.selectedArchivedTicket.set(null);
      this.toast.error(this.language.t('common.errorLoading'));
    }
  }

  async inspectPlatformReservation(item: PlatformReservationMetadata): Promise<void> {
    if (!this.canReadReservations()) return;
    const detailSequence = ++this.detailSequence;
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-31', { pathParams: { reservationId: item.reservationId } }),
      );
      if (detailSequence === this.detailSequence) this.selectedArchivedReservation.set(detail);
    } catch {
      this.selectedArchivedReservation.set(null);
      this.toast.error(this.language.t('common.errorLoading'));
    }
  }

  async loadAuditData(append = false): Promise<void> {
    if (!this.canReadAudit() || (append && (!this.auditHasMore() || this.loading()))) return;
    const sequence = ++this.readSequence;
    if (!append) { this.auditCursor.set(null); this.auditEvents.set([]); }
    this.selectedAuditEvent.set(null);
    this.loading.set(true);
    try {
      const [events, options] = await Promise.all([
        firstValueFrom(this.api.call('P18.2-28', { query: { pageSize: 25, cursor: append ? this.auditCursor() : undefined,
          action: this.auditAction() || undefined, outcome: this.auditOutcome() || undefined } })),
        firstValueFrom(this.api.call('P18.2-38')),
      ]);
      if (sequence !== this.readSequence) return;
      this.auditEvents.update(items => append ? [...new Map([...items, ...(events.items ?? [])].map(item => [item.eventKey, item])).values()] : events.items ?? []);
      this.auditCursor.set(events.nextCursor ?? null);
      this.auditHasMore.set(events.hasMore);
      this.auditOptions.set(options);
    } catch {
      this.toast.error(this.language.t('common.errorLoading') || 'Error loading audit trail');
    } finally {
      if (sequence === this.readSequence) this.loading.set(false);
    }
  }

  async inspectAuditEvent(event: SafeAuditEvent): Promise<void> {
    if (!this.canReadAudit()) return;
    const detailSequence = ++this.detailSequence;
    if (!event.eventKey) {
      this.selectedAuditEvent.set(null);
      return;
    }
    try {
      const detail = await firstValueFrom(
        this.api.call('P18.2-29', { pathParams: { eventKey: event.eventKey } }),
      );
      if (detailSequence === this.detailSequence) this.selectedAuditEvent.set(detail);
    } catch {
      this.selectedAuditEvent.set(null);
      this.toast.error(this.language.t('common.errorLoading'));
    }
  }

  async executeSensitiveSearch(): Promise<void> {
    const reason = this.sensitiveSearchReason().trim();
    if (!reason || !this.canSearchSensitive() || this.sensitiveSearching()) return;

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

  calculateDuration(startedAtUtc?: string | null, endedAtUtc?: string | null): string {
    if (!startedAtUtc || !endedAtUtc) return '—';
    const start = new Date(startedAtUtc).getTime();
    const end = new Date(endedAtUtc).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return '—';

    const diffMs = end - start;
    const isAr = this.language.currentLang() === 'ar';

    if (diffMs < 1000) {
      return isAr ? '< 1 ثانية' : '< 1s';
    }
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 60) {
      return isAr ? `${diffSec} ثانية` : `${diffSec}s`;
    }
    const mins = Math.floor(diffSec / 60);
    const remSec = diffSec % 60;
    if (remSec === 0) {
      return isAr ? `${mins} دقيقة` : `${mins}m`;
    }
    return isAr ? `${mins} دقيقة و ${remSec} ثانية` : `${mins}m ${remSec}s`;
  }

  getOutcomeStatusClass(outcome?: string | null): string {
    if (!outcome) return 'status-neutral';
    switch (outcome) {
      case 'Completed':
      case 'Succeeded':
      case 'Success':
      case 'Active':
        return 'status-success';
      case 'CompletedWithExceptions':
      case 'Pending':
        return 'status-warning';
      case 'Failed':
      case 'Cancelled':
        return 'status-failed';
      default:
        return 'status-neutral';
    }
  }

  formatOutcome(outcome?: string | null): string {
    if (!outcome) return '—';
    const isAr = this.language.currentLang() === 'ar';
    const map: Record<string, { ar: string; en: string }> = {
      Succeeded: { ar: 'ناجح', en: 'Succeeded' },
      Success: { ar: 'ناجح', en: 'Success' },
      Completed: { ar: 'مكتمل', en: 'Completed' },
      CompletedWithExceptions: { ar: 'مكتمل مع استثناءات', en: 'Completed with Exceptions' },
      Cancelled: { ar: 'ملغى', en: 'Cancelled' },
      Failed: { ar: 'فشل', en: 'Failed' },
      Pending: { ar: 'قيد الانتظار', en: 'Pending' },
      Active: { ar: 'نشط', en: 'Active' },
      Paused: { ar: 'متوقف مؤقتاً', en: 'Paused' },
    };
    return map[outcome] ? (isAr ? map[outcome].ar : map[outcome].en) : outcome;
  }

  formatEntityType(entity?: string | null): string {
    if (!entity) return '—';
    const isAr = this.language.currentLang() === 'ar';
    const map: Record<string, { ar: string; en: string }> = {
      OperationalDay: { ar: 'اليوم التشغيلي', en: 'Operational Day' },
      Ticket: { ar: 'تذكرة كشف', en: 'Ticket' },
      Reservation: { ar: 'حجز عيادة', en: 'Reservation' },
      Doctor: { ar: 'طبيب', en: 'Doctor' },
      Practice: { ar: 'عيادة', en: 'Practice' },
      Patient: { ar: 'مريض', en: 'Patient' },
      Encounter: { ar: 'كشف طبي', en: 'Encounter' },
      Subscription: { ar: 'اشتراك', en: 'Subscription' },
    };
    return map[entity] ? (isAr ? map[entity].ar : map[entity].en) : entity;
  }

  formatAction(action?: string | null): string {
    if (!action) return '—';
    const isAr = this.language.currentLang() === 'ar';
    const map: Record<string, { ar: string; en: string }> = {
      OperationalDayClosed: { ar: 'إغلاق اليوم التشغيلي', en: 'Operational Day Closed' },
      OperationalDayOpened: { ar: 'فتح اليوم التشغيلي', en: 'Operational Day Opened' },
      TicketArchived: { ar: 'أرشفة تذكرة كشف', en: 'Ticket Archived' },
      ReservationArchived: { ar: 'أرشفة حجز', en: 'Reservation Archived' },
      TicketCreated: { ar: 'إنشاء تذكرة كشف', en: 'Ticket Created' },
      ReservationCreated: { ar: 'إنشاء حجز', en: 'Reservation Created' },
      LoginSucceeded: { ar: 'تسجيل دخول ناجح', en: 'Login Succeeded' },
      LoginFailed: { ar: 'فشل تسجيل الدخول', en: 'Login Failed' },
      SensitiveAccessLogged: { ar: 'تسجيل وصول حساس', en: 'Sensitive Access Logged' },
    };
    if (map[action]) return isAr ? map[action].ar : map[action].en;
    return action.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  formatActor(actor?: string | null): string {
    if (!actor) return '—';
    const isAr = this.language.currentLang() === 'ar';
    const map: Record<string, { ar: string; en: string }> = {
      System: { ar: 'النظام الآلي', en: 'System' },
      SuperAdmin: { ar: 'المشرف العام', en: 'Super Admin' },
      Admin: { ar: 'المسؤول', en: 'Admin' },
      Doctor: { ar: 'طبيب', en: 'Doctor' },
      Receptionist: { ar: 'موظف الاستقبال', en: 'Receptionist' },
      Patient: { ar: 'مريض', en: 'Patient' },
    };
    return map[actor] ? (isAr ? map[actor].ar : map[actor].en) : actor;
  }

  private allowed(tab: 'operations' | 'archives' | 'audit'): boolean {
    return tab === 'operations' ? this.canReadOperations() : tab === 'audit' ? this.canReadAudit() : this.canReadTickets() || this.canReadReservations();
  }

  label(item?: { nameAr?: string | null; nameEn?: string | null } | null): string {
    if (!item) return '';
    return this.language.currentLang() === 'en'
      ? item.nameEn || item.nameAr || ''
      : item.nameAr || '';
  }
}
