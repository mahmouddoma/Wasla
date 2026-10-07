import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, map, Observable } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { openPrivateMedia } from '../../../../core/media/private-media';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { DiagnosticKind, DiagnosticHistoryResponse } from '../../../../domains/medical-catalog';
import {
  DiagnosticActor,
  DiagnosticAttachmentResponse,
  DiagnosticQuery,
  DiagnosticRequestStateResponse,
  DiagnosticResultMutationResponse,
  DiagnosticResultResponse,
  DiagnosticSubmissionResponse,
  DiagnosticSubmissionSummaryClinicalPage,
  DiagnosticUpload,
  DiagnosticVersionResponse,
  DiagnosticsApi,
} from '../../../../domains/diagnostics';
import { ResultUploadComponent } from '../../components/result-upload/result-upload.component';

type View = 'requests' | 'results' | 'submissions';
interface ListRow {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly date: string | null;
  readonly reference: 'order' | 'report' | null;
}
interface Directory {
  readonly items: readonly ListRow[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
}
@Component({
  selector: 'app-diagnostic-workspace',
  imports: [
    FormsModule,
    TranslatePipe,
    LocalizedDatePipe,
    PageHeader,
    SideDrawer,
    ResultUploadComponent,
  ],
  templateUrl: './diagnostic-workspace.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './diagnostic-workspace.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticWorkspaceComponent implements OnInit {
  private readonly api = inject(DiagnosticsApi);
  private readonly auth = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  readonly kind = this.route.snapshot.data['kind'] as DiagnosticKind;
  readonly actor = this.route.snapshot.data['actor'] as DiagnosticActor;
  readonly doctor = this.actor === 'Doctor';
  readonly view = signal<View>('requests');
  readonly status = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly query = signal<DiagnosticQuery>({
    PageNumber: 1,
    PageSize: 20,
    EncounterId: this.route.snapshot.queryParamMap.get('encounterId') ?? undefined,
    PracticeId: this.route.snapshot.queryParamMap.get('practiceId') ?? undefined,
  });
  readonly page = signal<Directory>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
  readonly request = signal<DiagnosticRequestStateResponse | null>(null);
  readonly result = signal<DiagnosticResultResponse | null>(null);
  readonly submission = signal<DiagnosticSubmissionResponse | null>(null);
  readonly patientSubmissions = signal<DiagnosticSubmissionSummaryClinicalPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly versions = signal<readonly DiagnosticVersionResponse[]>([]);
  readonly version = signal<DiagnosticVersionResponse | null>(null);
  readonly history = signal<readonly DiagnosticHistoryResponse[]>([]);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly opened = signal(false);
  readonly uploadOpen = signal(false);
  readonly correction = signal(false);
  readonly pending = signal<'cancel' | 'void' | 'reject' | 'withdraw' | 'accept' | null>(null);
  readonly cancellingItemId = signal<string | null>(null);
  readonly reason = signal('');
  readonly coverage = signal<readonly string[]>([]);
  readonly messages = signal<readonly string[]>([]);
  readonly title = computed(
    () =>
      `diagnostics.${this.kind}${this.view() === 'requests' ? 'Requests' : this.view() === 'results' ? 'Results' : 'Submissions'}`,
  );
  readonly views = computed<readonly View[]>(() =>
    (['requests', 'results', ...(this.doctor ? ['submissions'] : [])] as View[]).filter((view) =>
      this.allowedView(view),
    ),
  );
  readonly statuses = computed(() =>
    this.view() === 'requests'
      ? ['Requested', 'PartiallyCompleted', 'Completed', 'Cancelled']
      : this.view() === 'results'
        ? ['Finalized', 'Voided']
        : ['PendingReview', 'Accepted', 'Rejected', 'Withdrawn'],
  );
  private listSequence = 0;
  private detailSequence = 0;
  private intent: { signature: string; key: string; files: readonly File[] } | null = null;
  ngOnInit() {
    const initial = this.views()[0];
    if (initial) {
      this.view.set(initial);
      void this.load();
    }
  }
  allowed(scope: string, action: string) {
    return (
      this.session.user()?.userType === this.actor &&
      this.session.hasPermission(`${this.kind === 'lab' ? 'Lab' : 'Radiology'}${scope}.${action}`)
    );
  }
  allowedView(view: View) {
    return this.allowed(
      view === 'requests' ? 'Requests' : view === 'results' ? 'Results' : 'ResultSubmissions',
      this.doctor
        ? 'ViewOwn'
        : view === 'requests'
          ? 'ViewOwnIssued'
          : view === 'results'
            ? 'ViewOwnCurrent'
            : 'ViewOwn',
    );
  }
  async switchView(view: View) {
    if (this.busy() || !this.allowedView(view)) return;
    this.close();
    this.view.set(view);
    this.status.set('');
    await this.load();
  }
  async load(pageNumber = 1) {
    if (this.busy() || !this.allowedView(this.view())) return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    const query = {
      ...this.query(),
      PageNumber: pageNumber,
      Status: this.view() === 'submissions' ? undefined : this.status() || undefined,
      FromUtc: this.from() ? `${this.from()}T00:00:00Z` : undefined,
      ToUtc: this.to() ? `${this.to()}T23:59:59Z` : undefined,
    };
    try {
      let directory: Directory;
      if (this.view() === 'requests') {
        const page = await firstValueFrom(this.api.requests(this.kind, this.actor, query));
        directory = {
          ...page,
          items: (page.items ?? []).map((i) => ({
            id: i.requestId,
            title: '',
            reference: 'order',
            status: i.status,
            date: i.requestedAtUtc,
          })),
        };
      } else if (this.view() === 'results') {
        const page = await firstValueFrom(this.api.results(this.kind, this.actor, query));
        directory = {
          ...page,
          items: (page.items ?? []).map((i) => ({
            id: i.resultId,
            title: i.current?.externalProviderName ?? '',
            reference: 'report',
            status: i.current?.status ?? '',
            date: i.current?.externalReportDate ?? null,
          })),
        };
      } else {
        const page = await firstValueFrom(
          this.api.inbox(this.kind, query, this.status() || undefined),
        );
        directory = {
          ...page,
          items: (page.items ?? []).map((i) => ({
            id: i.submissionId,
            title: '',
            reference: 'report',
            status: i.status,
            date: i.submittedAtUtc,
          })),
        };
      }
      if (sequence === this.listSequence) this.page.set(directory);
    } catch (error) {
      if (sequence === this.listSequence) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (sequence === this.listSequence) this.loading.set(false);
    }
  }
  async inspect(id: string, type: View = this.view()) {
    if (this.busy() || !this.allowedView(type)) return;
    const sequence = ++this.detailSequence;
    this.clearDetail();
    this.opened.set(true);
    this.detailLoading.set(true);
    try {
      if (type === 'requests') {
        const request = await firstValueFrom(this.api.request(this.kind, this.actor, id));
        if (sequence === this.detailSequence) this.request.set(request);
      } else if (type === 'results') {
        const result = await firstValueFrom(this.api.result(this.kind, this.actor, id));
        if (sequence === this.detailSequence) {
          this.result.set(result);
          this.version.set(result.current);
        }
      } else {
        const submission = await firstValueFrom(this.api.submission(this.kind, this.actor, id));
        if (sequence === this.detailSequence) {
          this.submission.set(submission);
          if (this.allowedView('requests')) {
            const request = await firstValueFrom(
              this.api.request(this.kind, this.actor, submission.requestId),
            );
            if (sequence === this.detailSequence) this.request.set(request);
          }
        }
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  async loadHistory() {
    const r = this.request();
    if (!r?.requestId || !this.doctor || !this.allowedView('requests')) return;
    const sequence = this.detailSequence;
    try {
      const history = await firstValueFrom(this.api.history(this.kind, r.requestId));
      if (sequence === this.detailSequence) this.history.set(history);
    } catch (error) {
      this.failure(error);
    }
  }
  async loadVersions() {
    const r = this.result();
    if (!r || !this.doctor || !this.allowedView('results')) return;
    const sequence = this.detailSequence;
    try {
      const versions = await firstValueFrom(this.api.versions(this.kind, r.resultId));
      if (sequence === this.detailSequence) this.versions.set(versions);
    } catch (error) {
      this.failure(error);
    }
  }
  async inspectVersion(number: number) {
    const r = this.result();
    if (!r || !this.doctor || !this.allowedView('results')) return;
    const sequence = this.detailSequence;
    try {
      const version = await firstValueFrom(this.api.version(this.kind, r.resultId, number));
      if (sequence === this.detailSequence) this.version.set(version);
    } catch (error) {
      this.failure(error);
    }
  }
  async loadSubmissions(pageNumber = 1) {
    const r = this.request();
    if (!r?.requestId || this.doctor || !this.allowed('ResultSubmissions', 'ViewOwn')) return;
    const sequence = this.detailSequence;
    try {
      const page = await firstValueFrom(this.api.submissions(this.kind, r.requestId, pageNumber));
      if (sequence === this.detailSequence) this.patientSubmissions.set(page);
    } catch (error) {
      this.failure(error);
    }
  }
  async openUpload(correction = false) {
    if (this.busy()) return;
    if (correction) {
      if (
        !this.doctor ||
        !this.result()?.capabilities?.canCorrect ||
        !this.allowed('Results', 'CorrectOwn')
      )
        return;
      if (!this.request()) {
        if (!this.allowedView('requests')) return;
        try {
          this.request.set(
            await firstValueFrom(this.api.request(this.kind, this.actor, this.result()!.requestId)),
          );
        } catch (error) {
          this.failure(error);
          return;
        }
      }
    } else if (
      this.doctor
        ? !this.request()?.capabilities?.canUploadResult || !this.allowed('Results', 'UploadOwn')
        : !this.allowed('ResultSubmissions', 'CreateOwn') ||
          this.request()?.status === 'Draft' ||
          this.request()?.status === 'Cancelled'
    )
      return;
    this.correction.set(correction);
    this.uploadOpen.set(true);
    this.pending.set(null);
    this.intent = null;
  }
  canCancel(id: string | null) {
    const r = this.request();
    return (
      this.doctor &&
      this.allowed('Requests', 'CancelOwn') &&
      !!(id
        ? r?.items?.find((i) => i.itemId === id)?.capabilities?.canCancel
        : r?.capabilities?.canCancelRemaining)
    );
  }
  prepare(
    action: 'cancel' | 'void' | 'reject' | 'withdraw' | 'accept',
    itemId: string | null = null,
  ) {
    if (this.busy() || !this.canAct(action, itemId)) return;
    this.pending.set(action);
    this.cancellingItemId.set(itemId);
    this.reason.set('');
    this.coverage.set([]);
    this.intent = null;
    this.uploadOpen.set(false);
  }
  canAct(
    action: 'cancel' | 'void' | 'reject' | 'withdraw' | 'accept',
    itemId: string | null = this.cancellingItemId(),
  ) {
    if (action === 'cancel') return this.canCancel(itemId);
    if (action === 'void')
      return (
        this.doctor && this.allowed('Results', 'VoidOwn') && !!this.result()?.capabilities?.canVoid
      );
    if (action === 'withdraw')
      return (
        !this.doctor &&
        this.allowed('ResultSubmissions', 'WithdrawOwn') &&
        !!this.submission()?.capabilities?.canWithdraw
      );
    return (
      this.doctor &&
      this.allowed('ResultSubmissions', 'ReviewOwn') &&
      !!this.submission()?.capabilities?.[action === 'accept' ? 'canAccept' : 'canReject']
    );
  }
  toggleCoverage(id: string) {
    if (
      !this.busy() &&
      this.request()?.items?.some((i) => i.itemId === id && i.status === 'Requested')
    )
      this.coverage.update((ids) =>
        ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
      );
  }
  async execute() {
    const action = this.pending();
    if (!action || this.busy() || !this.canAct(action)) return;
    if (action === 'accept' ? !this.coverage().length : !this.reason().trim()) return;
    const request = this.request(),
      result = this.result(),
      submission = this.submission();
    const version =
      action === 'void'
        ? result?.rowVersion
        : action === 'accept' || action === 'reject' || action === 'withdraw'
          ? submission?.rowVersion
          : request?.rowVersion;
    const body = {
      rowVersion: version ?? null,
      reason: this.reason().trim(),
      targetCatalogId: null,
    };
    const key = this.key(
      JSON.stringify({
        action,
        body,
        coverage: this.coverage(),
        item: this.cancellingItemId(),
        requestId: request?.requestId,
        resultId: result?.resultId,
        submissionId: submission?.submissionId,
      }),
    );
    if (action === 'cancel') {
      if (!request?.requestId) return;
      await this.mutate(() =>
        this.api
          .cancel(this.kind, request.requestId!, this.cancellingItemId(), body)
          .pipe(mapRequest()),
      );
    } else if (action === 'void')
      await this.mutate(() => this.api.voidResult(this.kind, result!.resultId, body, key));
    else if (action === 'withdraw')
      await this.mutate(() => this.api.withdraw(this.kind, submission!.submissionId, body));
    else if (action === 'reject')
      await this.mutate(() =>
        this.api.reject(this.kind, submission!.submissionId, {
          rowVersion: submission!.rowVersion,
          patientVisibleReason: this.reason().trim(),
        }),
      );
    else {
      const accept =
        this.kind === 'lab'
          ? { coveredLabRequestItemIds: this.coverage(), rowVersion: submission!.rowVersion }
          : { coveredRadiologyRequestItemIds: this.coverage(), rowVersion: submission!.rowVersion };
      await this.mutate(() => this.api.accept(this.kind, submission!.submissionId, accept, key));
    }
  }
  async upload(upload: DiagnosticUpload) {
    if (this.busy() || !this.uploadOpen()) return;
    const correction = this.correction(),
      request = this.request(),
      result = this.result();
    if (
      correction
        ? !this.canActCorrection()
        : this.doctor
          ? !request?.capabilities?.canUploadResult || !this.allowed('Results', 'UploadOwn')
          : !this.allowed('ResultSubmissions', 'CreateOwn')
    )
      return;
    const id = correction ? result?.resultId : request?.requestId;
    if (!id) return;
    const key = this.key(
      JSON.stringify({ ...upload, attachments: undefined, id, correction }),
      upload.attachments,
    );
    await this.mutate(() => this.api.upload(this.kind, this.actor, id, upload, key, correction));
  }
  canActCorrection() {
    return (
      this.doctor &&
      this.allowed('Results', 'CorrectOwn') &&
      !!this.result()?.capabilities?.canCorrect
    );
  }
  async download(file: DiagnosticAttachmentResponse, type: 'results' | 'result-submissions') {
    if (this.busy() || !this.allowedView(type === 'results' ? 'results' : 'submissions')) return;
    const id = type === 'results' ? this.result()?.resultId : this.submission()?.submissionId;
    if (!id) return;
    try {
      openPrivateMedia(
        await firstValueFrom(
          this.api.download(
            this.kind,
            this.actor,
            type,
            id,
            file.attachmentId,
            this.version()?.versionNumber,
          ),
        ),
      );
    } catch (error) {
      this.failure(error);
      if (error instanceof HttpErrorResponse && error.status === 404)
        await this.inspect(id, type === 'results' ? 'results' : 'submissions');
    }
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.opened.set(false);
      this.clearDetail();
    }
  }
  private clearDetail() {
    this.request.set(null);
    this.result.set(null);
    this.submission.set(null);
    this.versions.set([]);
    this.version.set(null);
    this.history.set([]);
    this.patientSubmissions.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    this.pending.set(null);
    this.uploadOpen.set(false);
    this.messages.set([]);
    this.intent = null;
  }
  private key(signature: string, files: readonly File[] = []) {
    if (
      signature !== this.intent?.signature ||
      files.length !== this.intent.files.length ||
      files.some((f, i) => f !== this.intent!.files[i])
    )
      this.intent = { signature, files, key: createIdempotencyKey() };
    return this.intent.key;
  }
  private async mutate(operation: () => Observable<DiagnosticResultMutationResponse>) {
    this.busy.set(true);
    let saved = false;
    try {
      const response = await firstValueFrom(operation());
      if (response.request) this.request.set(response.request);
      if (response.result) {
        this.result.set(response.result);
        this.version.set(response.result.current);
      }
      if (response.submission) this.submission.set(response.submission);
      this.pending.set(null);
      this.uploadOpen.set(false);
      this.intent = null;
      saved = true;
      this.toast.success('diagnostics.saved');
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.intent = null;
        this.pending.set(null);
        this.uploadOpen.set(false);
        await this.refresh();
      }
    } finally {
      this.busy.set(false);
    }
    if (saved) await this.load(this.page().pageNumber);
  }
  private async refresh() {
    try {
      if (this.request()?.requestId)
        this.request.set(
          await firstValueFrom(this.api.request(this.kind, this.actor, this.request()!.requestId!)),
        );
      if (this.result()) {
        this.result.set(
          await firstValueFrom(this.api.result(this.kind, this.actor, this.result()!.resultId)),
        );
        this.version.set(this.result()!.current);
      }
      if (this.submission())
        this.submission.set(
          await firstValueFrom(
            this.api.submission(this.kind, this.actor, this.submission()!.submissionId),
          ),
        );
    } catch (error) {
      this.failure(error);
    }
  }
  private failure(error: unknown, mutation = false) {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['diagnostics.failed']);
    if (mutation) this.toast.error(this.messages()[0]);
    if (parsed.status === 403)
      void firstValueFrom(this.auth.currentUser())
        .then((u) => {
          this.session.complete(u);
          this.clearDetail();
        })
        .catch(() => {});
  }
}
function mapRequest() {
  return map((request: DiagnosticRequestStateResponse): DiagnosticResultMutationResponse => ({
    request,
    result: null,
    submission: null,
  }));
}
