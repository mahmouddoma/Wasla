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
  DiagnosticKind,
  MedicalCatalogApi,
  MedicalCatalogRequestResponse,
  MedicalCatalogRequestResponseClinicalPage,
  MedicalCatalogResponse,
} from '../../../../domains/medical-catalog';

@Component({
  selector: 'app-medical-catalog-requests',
  imports: [FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './requests.component.html',
  styleUrls: ['../../../../shared/styles/directory-workspace.css', './requests.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogRequestsComponent implements OnInit {
  private readonly api = inject(MedicalCatalogApi);
  private readonly auth = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  readonly kind = this.route.snapshot.data['kind'] as DiagnosticKind;
  readonly doctor = this.route.snapshot.data['actor'] === 'Doctor';
  readonly title = `diagnostics.${this.kind}CatalogRequests`;
  readonly reviewActions = ['request-more-info', 'approve', 'reject'] as const;
  readonly page = signal<MedicalCatalogRequestResponseClinicalPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly detail = signal<MedicalCatalogRequestResponse | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly opened = signal(false);
  readonly creating = signal(false);
  readonly editing = signal(false);
  readonly status = signal('');
  readonly name = signal('');
  readonly specimen = signal('');
  readonly note = signal('');
  readonly reason = signal('');
  readonly reviewAction = signal<'request-more-info' | 'approve' | 'reject' | null>(null);
  readonly targetSearch = signal('');
  readonly targets = signal<readonly MedicalCatalogResponse[]>([]);
  readonly targetId = signal('');
  readonly approvedNameAr = signal('');
  readonly approvedNameEn = signal('');
  readonly messages = signal<readonly string[]>([]);
  private listSequence = 0;
  private detailSequence = 0;
  private lastDetailId = '';
  retryDetail() {
    if (this.lastDetailId) void this.inspect(this.lastDetailId);
  }
  private targetSequence = 0;
  private intent: { signature: string; key: string } | null = null;
  ngOnInit() {
    void this.load();
  }
  allowed(action: string) {
    return (
      this.session.user()?.userType === (this.doctor ? 'Doctor' : 'MedicalCatalogManager') &&
      this.session.hasPermission(
        `${this.kind === 'lab' ? 'Lab' : 'Radiology'}CatalogRequests.${action}`,
      )
    );
  }
  async load(pageNumber = 1) {
    if (!this.allowed(this.doctor ? 'ViewOwn' : 'View') || this.busy()) return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(
        this.api.requests(this.kind, pageNumber, this.doctor, this.status()),
      );
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
  async inspect(id: string) {
    if (!this.allowed(this.doctor ? 'ViewOwn' : 'View') || this.busy()) return;
    this.lastDetailId = id;
    const sequence = ++this.detailSequence;
    this.detail.set(null);
    this.creating.set(false);
    this.editing.set(false);
    this.reviewAction.set(null);
    this.opened.set(true);
    this.detailLoading.set(true);
    try {
      const detail = await firstValueFrom(this.api.request(this.kind, id, this.doctor));
      if (sequence === this.detailSequence) {
        this.detail.set(detail);
        this.name.set(detail.name ?? '');
        this.specimen.set(detail.specimen ?? '');
        this.note.set(detail.catalogClarificationNote ?? '');
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  create() {
    if (this.busy() || !this.doctor || !this.allowed('CreateOwn')) return;
    this.detail.set(null);
    this.name.set('');
    this.specimen.set('');
    this.note.set('');
    this.creating.set(true);
    this.editing.set(true);
    this.opened.set(true);
    this.intent = null;
  }
  edit() {
    if (
      this.busy() ||
      !this.doctor ||
      !this.allowed('UpdateOwn') ||
      !this.detail()?.capabilities?.canEdit
    )
      return;
    this.editing.set(true);
  }
  async save() {
    if (
      this.busy() ||
      !this.doctor ||
      !this.name().trim() ||
      !this.allowed(this.creating() ? 'CreateOwn' : 'UpdateOwn')
    )
      return;
    const data =
      this.kind === 'lab'
        ? {
            testName: this.name().trim(),
            specimen: this.specimen().trim() || null,
            catalogClarificationNote: this.note().trim() || null,
          }
        : {
            procedureName: this.name().trim(),
            specimen: this.specimen().trim() || null,
            catalogClarificationNote: this.note().trim() || null,
          };
    const detail = this.detail();
    if (!this.creating() && !detail?.capabilities?.canEdit) return;
    const signature = JSON.stringify(data);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    await this.mutate(() =>
      this.creating()
        ? this.api.createRequest(this.kind, data as never, this.intent!.key)
        : this.api.updateRequest(this.kind, detail!.requestId, {
            data,
            rowVersion: detail!.rowVersion,
          } as never),
    );
  }
  prepare(action: 'request-more-info' | 'approve' | 'reject') {
    if (this.busy() || this.doctor || !this.canReview(action)) return;
    this.reviewAction.set(action);
    this.reason.set('');
    this.targetId.set('');
    this.approvedNameAr.set('');
    this.approvedNameEn.set(this.detail()?.name ?? '');
    if (action === 'approve') void this.loadTargets();
  }
  canReview(action: 'request-more-info' | 'approve' | 'reject') {
    const capability = {
      'request-more-info': this.detail()?.capabilities?.canRequestMoreInfo,
      approve: this.detail()?.capabilities?.canApprove,
      reject: this.detail()?.capabilities?.canReject,
    }[action];
    return this.allowed('Review') && !!capability;
  }
  async loadTargets() {
    if (this.doctor || this.reviewAction() !== 'approve') return;
    const sequence = ++this.targetSequence;
    try {
      const page = await firstValueFrom(
        this.api.list(this.kind, {
          search: this.targetSearch(),
          status: 'Active',
          pageNumber: 1,
          pageSize: 20,
        }),
      );
      if (sequence === this.targetSequence) this.targets.set(page.items ?? []);
    } catch (error) {
      this.failure(error);
    }
  }
  async review() {
    const detail = this.detail(),
      action = this.reviewAction();
    if (this.busy() || this.doctor || !detail || !action || !this.canReview(action)) return;
    if (action !== 'approve' && !this.reason().trim()) return;
    if (
      action === 'approve' &&
      !this.targetId() &&
      !this.approvedNameEn().trim() &&
      !this.approvedNameAr().trim()
    )
      return;
    if (
      this.targetId() &&
      !this.targets().some((t) => t.catalogId === this.targetId() && t.status === 'Active')
    )
      return;
    const approvedData =
      action === 'approve' && !this.targetId()
        ? {
            displayNameAr: this.approvedNameAr().trim() || null,
            displayNameEn: this.approvedNameEn().trim() || null,
            aliasesAr: null,
            aliasesEn: null,
            internalNote: null,
          }
        : null;
    const body = {
      rowVersion: detail.rowVersion,
      reason: this.reason().trim() || null,
      canonicalCatalogId: this.targetId() || null,
      ...(approvedData ? { approvedData } : {}),
    };
    const signature = JSON.stringify({ id: detail.requestId, action, body });
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    await this.mutate(() =>
      this.api.review(
        this.kind,
        detail.requestId,
        action,
        body,
        action === 'approve' ? this.intent!.key : undefined,
      ),
    );
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.targetSequence++;
      this.opened.set(false);
      this.detail.set(null);
      this.reviewAction.set(null);
    }
  }
  private async mutate(request: () => Observable<MedicalCatalogRequestResponse>) {
    this.busy.set(true);
    let saved = false;
    try {
      this.detail.set(await firstValueFrom(request()));
      this.creating.set(false);
      this.editing.set(false);
      this.reviewAction.set(null);
      this.intent = null;
      saved = true;
      this.toast.success('diagnostics.saved');
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409 && this.detail()) {
        this.intent = null;
        this.reviewAction.set(null);
        try {
          this.detail.set(
            await firstValueFrom(
              this.api.request(this.kind, this.detail()!.requestId, this.doctor),
            ),
          );
          this.editing.set(false);
        } catch (refreshError) {
          this.failure(refreshError);
        }
      }
    } finally {
      this.busy.set(false);
    }
    if (saved) await this.load(this.page().pageNumber);
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
