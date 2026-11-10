import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { createIdempotencyKey } from '../../core/http/create-idempotency-key';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ToastService } from '../../core/notifications/toast.service';
import { openPrivateMedia } from '../../core/media/private-media';
import { MedicalRecordsApi, SharedRecordSchemas as Schemas } from '../../domains/medical-records';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SideDrawer } from '../../shared/components/side-drawer/side-drawer';

type AccessRequest = Schemas['HiddenAccessResponse'];
type TimelineEntry = Schemas['TimelineEntry'];

@Component({
  selector: 'app-medical-sharing',
  imports: [DatePipe, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './medical-sharing.component.html',
  styleUrl: './medical-sharing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedicalSharingComponent {
  readonly mode = input<'inbox' | 'treating' | 'visibility'>('inbox');
  readonly practiceId = input('');
  readonly ticketId = input('');
  readonly activeTreatment = input(false);
  readonly ownEncounterId = input('');
  readonly visibilityContext = input<{
    visibility?: 'Visible' | 'Hidden';
    rowVersion: string;
    canChangeVisibility?: boolean;
  } | null>(null);
  readonly visibilityChanged = output<void>();
  readonly nextVisibility = signal<'Visible' | 'Hidden'>('Hidden');
  readonly language = inject(LanguageService);
  readonly session = inject(AuthSession);
  private readonly api = inject(MedicalRecordsApi);
  private readonly toast = inject(ToastService);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly unavailable = signal(false);
  readonly busy = signal(false);
  readonly requests = signal<readonly AccessRequest[]>([]);
  readonly selected = signal<AccessRequest | null>(null);
  readonly history = signal<readonly Schemas['RequestHistoryResponse'][]>([]);
  readonly overview = signal<Schemas['DoctorSharedMedicalRecordOverviewResponse'] | null>(null);
  readonly entries = signal<readonly TimelineEntry[]>([]);
  readonly encounter = signal<Schemas['DoctorSharedMedicalRecordEncounterResponse'] | null>(null);
  readonly recordItem = signal<Schemas['DoctorSharedMedicalRecordItemResponse'] | null>(null);
  readonly visibilityHistory = signal<Schemas['VisibilityHistoryResponseRecordPage'] | null>(null);
  readonly pendingCount = signal<number | null>(null);
  readonly hasMore = signal(false);
  readonly timelineHasMore = signal(false);
  readonly status = signal('');
  readonly reason = signal('');
  readonly hiddenTarget = signal<Schemas['HiddenTimelineEntry'] | null>(null);
  private cursor: string | null = null;
  private timelineCursor: string | null = null;
  private generation = 0;
  private sequence = 0;
  private detailSequence = 0;
  private intent: { signature: string; key: string } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      ++this.generation;
      ++this.sequence;
      ++this.detailSequence;
      this.clear();
    });
    effect(() => {
      this.mode();
      this.practiceId();
      this.ticketId();
      this.activeTreatment();
      this.ownEncounterId();
      this.visibilityContext();
      this.session.token();
      untracked(() => {
        ++this.generation;
        ++this.sequence;
        ++this.detailSequence;
        this.clear();
        if (this.allowed()) void this.load();
        else this.unavailable.set(true);
      });
    });
  }
  private allowed(): boolean {
    if (this.mode() === 'visibility')
      return (
        !!this.ownEncounterId() &&
        !!this.practiceId() &&
        (this.session.hasPermission('MedicalEncounterVisibility.ViewHistoryOwn') ||
          this.session.hasPermission('MedicalEncounterVisibility.UpdateOwn'))
      );
    return this.mode() === 'inbox'
      ? this.session.hasPermission('HiddenEncounterAccessRequests.ViewIncoming')
      : this.activeTreatment() &&
          !!this.practiceId() &&
          !!this.ticketId() &&
          this.session.hasPermission('MedicalRecords.ViewTreatingPatient');
  }
  async load(append = false): Promise<void> {
    if (!this.allowed() || (append && (!this.hasMore() || this.loading()))) return;
    const generation = this.generation,
      sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.unavailable.set(false);
    this.close();
    if (!append) {
      this.cursor = null;
      this.requests.set([]);
      this.hasMore.set(false);
    }
    try {
      if (this.mode() === 'visibility') return;
      if (this.mode() === 'inbox') {
        const [page, summary] = await Promise.all([
          firstValueFrom(
            this.api.doctorAccessInbox(
              this.status() || undefined,
              append ? (this.cursor ?? undefined) : undefined,
            ),
          ),
          firstValueFrom(this.api.doctorAccessInboxSummary()),
        ]);
        if (!this.current(generation, sequence)) return;
        this.requests.update((items) =>
          append ? this.dedup([...items, ...(page.items ?? [])]) : (page.items ?? []),
        );
        this.cursor = page.nextCursor;
        this.hasMore.set(page.hasMore);
        this.pendingCount.set(summary.pendingCount);
      } else {
        if (!append) {
          const overview = await firstValueFrom(
            this.api.doctorTreatingOverview(this.practiceId(), this.ticketId()),
          );
          if (!this.current(generation, sequence)) return;
          this.overview.set(overview);
          this.entries.set(overview.timeline.items ?? []);
          this.timelineCursor = overview.timeline.nextCursor;
          this.timelineHasMore.set(overview.timeline.hasMore);
        }
        if (this.session.hasPermission('HiddenEncounterAccessRequests.ViewSent')) {
          const page = await firstValueFrom(
            this.api.doctorTreatingAccessRequests(
              this.practiceId(),
              this.ticketId(),
              append ? (this.cursor ?? undefined) : undefined,
            ),
          );
          if (!this.current(generation, sequence)) return;
          this.requests.update((items) =>
            append ? this.dedup([...items, ...(page.items ?? [])]) : (page.items ?? []),
          );
          this.cursor = page.nextCursor;
          this.hasMore.set(page.hasMore);
        }
      }
    } catch (error) {
      if (this.current(generation, sequence)) this.failure(error);
    } finally {
      if (this.current(generation, sequence)) this.loading.set(false);
    }
  }
  async loadTimeline(): Promise<void> {
    if (!this.allowed() || !this.timelineHasMore() || !this.timelineCursor || this.loading())
      return;
    const generation = this.generation,
      sequence = ++this.sequence;
    this.loading.set(true);
    try {
      const page = await firstValueFrom(
        this.api.doctorTreatingTimeline(
          this.practiceId(),
          this.ticketId(),
          undefined,
          undefined,
          undefined,
          this.timelineCursor,
        ),
      );
      if (!this.current(generation, sequence)) return;
      this.entries.update((items) => [
        ...new Map([...items, ...(page.items ?? [])].map((item) => [item.entryId, item])).values(),
      ]);
      this.timelineCursor = page.nextCursor;
      this.timelineHasMore.set(page.hasMore);
    } catch (error) {
      if (this.current(generation, sequence)) this.failure(error);
    } finally {
      if (this.current(generation, sequence)) this.loading.set(false);
    }
  }
  async inspect(request: AccessRequest): Promise<void> {
    if (!this.allowed() || this.busy()) return;
    this.close();
    const generation = this.generation,
      sequence = ++this.detailSequence;
    try {
      const details =
        this.mode() === 'inbox'
          ? await firstValueFrom(this.api.doctorAccessRequestDetails(request.requestId))
          : await firstValueFrom(
              this.api.doctorTreatingAccessRequestDetails(
                this.practiceId(),
                this.ticketId(),
                request.requestId,
              ),
            );
      if (generation !== this.generation || sequence !== this.detailSequence) return;
      this.selected.set(details);
      if (
        this.mode() === 'inbox' &&
        this.session.hasPermission('HiddenEncounterAccessRequests.ViewHistoryOwn')
      ) {
        const history = await firstValueFrom(
          this.api.doctorAccessRequestHistory(request.requestId),
        );
        if (generation === this.generation && sequence === this.detailSequence)
          this.history.set(history);
      }
    } catch (error) {
      if (generation === this.generation && sequence === this.detailSequence) this.failure(error);
    }
  }
  async decide(action: 'approve' | 'reject' | 'revoke'): Promise<void> {
    const item = this.selected();
    const capability =
      action === 'approve'
        ? item?.capabilities.canApprove
        : action === 'reject'
          ? item?.capabilities.canReject
          : item?.capabilities.canRevoke;
    const permission =
      action === 'revoke'
        ? 'HiddenEncounterAccessRequests.RevokeOwn'
        : 'HiddenEncounterAccessRequests.DecideOwn';
    if (
      this.mode() !== 'inbox' ||
      !item?.rowVersion ||
      !capability ||
      !this.session.hasPermission(permission) ||
      this.busy() ||
      this.unavailable()
    )
      return;
    const generation = this.generation;
    this.busy.set(true);
    try {
      const body = { rowVersion: item.rowVersion };
      const response =
        action === 'approve'
          ? await firstValueFrom(
              this.api.doctorApproveAccessRequest(
                item.requestId,
                body,
                this.key([action, item.requestId, body]),
              ),
            )
          : action === 'reject'
            ? await firstValueFrom(this.api.doctorRejectAccessRequest(item.requestId, body))
            : await firstValueFrom(this.api.doctorRevokeAccessGrant(item.requestId, body));
      if (generation !== this.generation) return;
      this.intent = null;
      this.selected.set(response);
      this.requests.update((items) =>
        items.map((item) => (item.requestId === response.requestId ? response : item)),
      );
      this.toast.success(this.language.t('common.savedSuccessfully'));
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.close();
        this.busy.set(false);
        await this.inspect(item);
        this.toast.error(this.language.t('common.conflictState'));
      } else this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  hidden(entry: TimelineEntry): Schemas['HiddenTimelineEntry'] | null {
    return 'hiddenEncounterToken' in entry ? entry : null;
  }
  clinical(entry: TimelineEntry): Schemas['ClinicalTimelineEntry'] | null {
    return 'sourceId' in entry ? entry : null;
  }
  requestHidden(entry: Schemas['HiddenTimelineEntry']): void {
    if (
      !this.allowed() ||
      !this.overview()?.capabilities.canRequestHiddenAccess ||
      !this.session.hasPermission('HiddenEncounterAccessRequests.Create') ||
      !entry.hiddenEncounterToken
    )
      return;
    this.hiddenTarget.set(entry);
    this.reason.set('');
  }
  async sendRequest(): Promise<void> {
    const target = this.hiddenTarget();
    if (
      !target?.hiddenEncounterToken ||
      !this.reason().trim() ||
      !this.allowed() ||
      this.busy() ||
      !this.overview()?.capabilities.canRequestHiddenAccess
    )
      return;
    const generation = this.generation;
    this.busy.set(true);
    try {
      const body = {
        hiddenEncounterToken: target.hiddenEncounterToken,
        reason: this.reason().trim(),
      };
      const response = await firstValueFrom(
        this.api.doctorCreateAccessRequest(
          this.practiceId(),
          this.ticketId(),
          body,
          this.key(body),
        ),
      );
      if (generation !== this.generation) return;
      this.requests.update((items) => this.dedup([response, ...items]));
      this.hiddenTarget.set(null);
      this.reason.set('');
      this.intent = null;
      this.toast.success(this.language.t('common.savedSuccessfully'));
    } catch (error) {
      if (generation === this.generation) this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  async openEncounter(entry: Schemas['ClinicalTimelineEntry']): Promise<void> {
    if (!this.allowed() || !entry.encounterId || !entry.capabilities.canViewDetails) return;
    const generation = this.generation,
      sequence = ++this.detailSequence;
    this.encounter.set(null);
    try {
      const encounter = await firstValueFrom(
        this.api.doctorTreatingEncounter(this.practiceId(), this.ticketId(), entry.encounterId),
      );
      if (generation === this.generation && sequence === this.detailSequence)
        this.encounter.set(encounter);
    } catch (error) {
      if (generation === this.generation && sequence === this.detailSequence) this.failure(error);
    }
  }
  async inspectVisibility(append = false): Promise<void> {
    if (
      !this.ownEncounterId() ||
      !this.practiceId() ||
      !this.session.hasPermission('MedicalEncounterVisibility.ViewHistoryOwn')
    )
      return;
    const generation = this.generation;
    try {
      const history = await firstValueFrom(
        this.api.doctorEncounterVisibilityHistory(
          this.practiceId(),
          this.ownEncounterId(),
          append ? (this.visibilityHistory()?.nextCursor ?? undefined) : undefined,
        ),
      );
      if (generation === this.generation)
        this.visibilityHistory.update((previous) =>
          append && previous
            ? { ...history, items: [...(previous.items ?? []), ...(history.items ?? [])] }
            : history,
        );
    } catch (error) {
      if (generation === this.generation) this.failure(error);
    }
  }
  async changeVisibility(): Promise<void> {
    const context = this.visibilityContext();
    if (
      !context?.rowVersion ||
      context.canChangeVisibility !== true ||
      !this.ownEncounterId() ||
      !this.practiceId() ||
      !this.session.hasPermission('MedicalEncounterVisibility.UpdateOwn') ||
      this.busy() ||
      this.unavailable()
    )
      return;
    const generation = this.generation;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.doctorUpdateEncounterVisibility(this.practiceId(), this.ownEncounterId(), {
          visibility: this.nextVisibility(),
          rowVersion: context.rowVersion,
        }),
      );
      if (generation !== this.generation) return;
      this.toast.success(this.language.t('common.savedSuccessfully'));
      this.visibilityChanged.emit();
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.visibilityChanged.emit();
        this.toast.error(this.language.t('common.conflictState'));
      } else this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  selectVisibility(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'Visible' || value === 'Hidden') this.nextVisibility.set(value);
  }
  async openItem(entry: Schemas['ClinicalTimelineEntry']): Promise<void> {
    if (!this.allowed() || !entry.resourceType || !entry.capabilities.canViewDetails) return;
    const generation = this.generation,
      sequence = ++this.detailSequence;
    this.recordItem.set(null);
    try {
      const item = await firstValueFrom(
        this.api.doctorTreatingItem(
          this.practiceId(),
          this.ticketId(),
          entry.resourceType,
          entry.sourceId,
        ),
      );
      if (generation === this.generation && sequence === this.detailSequence)
        this.recordItem.set(item);
    } catch (error) {
      if (generation === this.generation && sequence === this.detailSequence) this.failure(error);
    }
  }
  async openAttachment(attachment: Schemas['RecordAttachment']): Promise<void> {
    const item = this.recordItem();
    if (
      !this.allowed() ||
      !attachment.canDownload ||
      !item?.resourceType ||
      !item.capabilities.canViewAttachments ||
      !item.attachments?.some((candidate) => candidate.attachmentId === attachment.attachmentId)
    )
      return;
    const generation = this.generation,
      sequence = this.detailSequence;
    try {
      const response = await firstValueFrom(
        this.api.doctorTreatingAttachment(
          this.practiceId(),
          this.ticketId(),
          item.resourceType,
          item.sourceId,
          attachment.attachmentId,
        ),
      );
      if (generation === this.generation && sequence === this.detailSequence)
        openPrivateMedia(response);
    } catch (error) {
      if (generation === this.generation && sequence === this.detailSequence) this.failure(error);
    }
  }
  contentLines(): readonly string[] {
    const content = this.recordItem()?.safeContent;
    if (!content) return [];
    if ('items' in content)
      return (content.items ?? []).map((item) =>
        'medicationName' in item
          ? [item.medicationName, item.scientificName].filter(Boolean).join(' · ')
          : [this.language.isRtl() ? item.nameAr : item.nameEn || item.nameAr, item.instructions]
              .filter(Boolean)
              .join(' · '),
      );
    return [content.externalProviderName, content.externalReportDate].filter(
      (value): value is string => !!value,
    );
  }
  updateReason(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }
  filterStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    void this.load();
  }
  partyName(party: Schemas['ClinicalPartyResponse'] | null | undefined): string {
    return (
      (this.language.isRtl() ? party?.nameAr : party?.nameEn || party?.nameAr) ||
      this.language.t('familyPolicy.memberUnavailable')
    );
  }
  close(): void {
    if (this.busy()) return;
    ++this.detailSequence;
    this.selected.set(null);
    this.history.set([]);
    this.encounter.set(null);
    this.recordItem.set(null);
    this.hiddenTarget.set(null);
    this.visibilityHistory.set(null);
  }
  private clear(): void {
    this.recordItem.set(null);
    this.requests.set([]);
    this.entries.set([]);
    this.selected.set(null);
    this.history.set([]);
    this.overview.set(null);
    this.encounter.set(null);
    this.hiddenTarget.set(null);
    this.visibilityHistory.set(null);
    this.pendingCount.set(null);
    this.cursor = null;
    this.timelineCursor = null;
    this.hasMore.set(false);
    this.timelineHasMore.set(false);
  }
  private current(generation: number, sequence: number): boolean {
    return generation === this.generation && sequence === this.sequence && this.allowed();
  }
  private failure(error: unknown): void {
    this.failed.set(true);
    if (error instanceof HttpErrorResponse && [401, 403, 404, 422, 503].includes(error.status)) {
      this.clear();
      this.unavailable.set(true);
    }
  }
  private dedup(items: readonly AccessRequest[]): AccessRequest[] {
    return [...new Map(items.map((item) => [item.requestId, item])).values()];
  }
  private key(value: unknown): string {
    const signature = JSON.stringify([this.mode(), this.practiceId(), this.ticketId(), value]);
    if (signature !== this.intent?.signature)
      this.intent = { signature, key: createIdempotencyKey() };
    return this.intent.key;
  }
}
