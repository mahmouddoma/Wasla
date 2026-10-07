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
  CatalogPresentation,
  DiagnosticKind,
  MedicalCatalogApi,
  MedicalCatalogResponse,
  MedicalCatalogResponseClinicalPage,
} from '../../../../domains/medical-catalog';

const EMPTY_FORM: CatalogPresentation = {
  displayNameAr: '',
  displayNameEn: '',
  aliasesAr: '',
  aliasesEn: '',
  internalNote: '',
};
@Component({
  selector: 'app-medical-catalog',
  imports: [FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './catalog.component.html',
  styleUrls: ['../../../../shared/styles/directory-workspace.css', './catalog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(MedicalCatalogApi);
  private readonly auth = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  readonly kind = inject(ActivatedRoute).snapshot.data['kind'] as DiagnosticKind;
  readonly title = `diagnostics.${this.kind}Catalog`;
  readonly presentationFields: readonly (keyof CatalogPresentation)[] = [
    'displayNameAr',
    'displayNameEn',
    'aliasesAr',
    'aliasesEn',
    'internalNote',
  ];
  readonly search = signal('');
  readonly status = signal('');
  readonly page = signal<MedicalCatalogResponseClinicalPage>({
    items: [],
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
  });
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly opened = signal(false);
  readonly detailLoading = signal(false);
  readonly detail = signal<MedicalCatalogResponse | null>(null);
  readonly editing = signal(false);
  readonly creating = signal(false);
  readonly model = signal<CatalogPresentation>({ ...EMPTY_FORM });
  readonly action = signal<'activate' | 'deactivate' | 'merge' | null>(null);
  readonly reason = signal('');
  readonly targets = signal<MedicalCatalogResponseClinicalPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly targetSearch = signal('');
  readonly targetId = signal('');
  readonly targetLoading = signal(false);
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
      this.session.user()?.userType === 'MedicalCatalogManager' &&
      this.session.hasPermission(`${this.kind === 'lab' ? 'Lab' : 'Radiology'}Catalog.${action}`)
    );
  }
  label(item: MedicalCatalogResponse) {
    return this.language.currentLang() === 'ar'
      ? item.nameAr || item.nameEn
      : item.nameEn || item.nameAr;
  }
  async load(pageNumber = 1) {
    if (!this.allowed('View') || this.busy()) return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(
        this.api.list(this.kind, {
          search: this.search(),
          status: this.status(),
          pageNumber,
          pageSize: 20,
        }),
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
    if (!this.allowed('View') || this.busy()) return;
    this.reset();
    this.opened.set(true);
    this.detailLoading.set(true);
    this.lastDetailId = id;
    const sequence = ++this.detailSequence;
    try {
      const detail = await firstValueFrom(this.api.details(this.kind, id));
      if (sequence === this.detailSequence) {
        this.detail.set(detail);
        this.model.set({ ...detail.presentation });
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  create() {
    if (this.busy() || !this.allowed('Create')) return;
    this.reset();
    this.creating.set(true);
    this.editing.set(true);
    this.opened.set(true);
  }
  edit() {
    if (!this.allowed('Update') || !this.detail()?.capabilities?.canEdit || this.busy()) return;
    this.action.set(null);
    this.editing.set(true);
  }
  field(key: keyof CatalogPresentation, value: string) {
    this.model.update((m) => ({ ...m, [key]: value }));
  }
  async save() {
    const d = this.detail(),
      creating = this.creating();
    if (
      this.busy() ||
      !this.allowed(creating ? 'Create' : 'Update') ||
      (!creating && !d?.capabilities?.canEdit)
    )
      return;
    if (!this.model().displayNameEn?.trim() && !this.model().displayNameAr?.trim()) {
      this.messages.set(['diagnostics.invalid']);
      return;
    }
    await this.mutate(() =>
      creating
        ? this.api.create(this.kind, this.model())
        : this.api.update(this.kind, d!.catalogId, {
            data: this.model(),
            rowVersion: d!.rowVersion,
          }),
    );
  }
  prepare(action: 'activate' | 'deactivate' | 'merge') {
    const d = this.detail();
    if (
      this.busy() ||
      !d ||
      !this.allowed({ activate: 'Activate', deactivate: 'Deactivate', merge: 'Merge' }[action]) ||
      !d.capabilities?.[
        { activate: 'canActivate', deactivate: 'canDeactivate', merge: 'canMerge' }[
          action
        ] as 'canActivate'
      ]
    )
      return;
    this.action.set(action);
    this.editing.set(false);
    this.reason.set('');
    this.targetId.set('');
    this.intent = null;
    if (action === 'merge') void this.loadTargets();
  }
  async loadTargets(pageNumber = 1) {
    if (this.action() !== 'merge') return;
    const sequence = ++this.targetSequence;
    this.targetLoading.set(true);
    try {
      const page = await firstValueFrom(
        this.api.list(this.kind, {
          search: this.targetSearch(),
          status: 'Active',
          pageNumber,
          pageSize: 20,
        }),
      );
      if (sequence === this.targetSequence) this.targets.set(page);
    } catch (error) {
      this.failure(error);
    } finally {
      if (sequence === this.targetSequence) this.targetLoading.set(false);
    }
  }
  async execute() {
    const d = this.detail(),
      action = this.action();
    if (!d || !action || this.busy() || !this.reason().trim()) return;
    const permissions = { activate: 'Activate', deactivate: 'Deactivate', merge: 'Merge' };
    const capability = {
      activate: d.capabilities?.canActivate,
      deactivate: d.capabilities?.canDeactivate,
      merge: d.capabilities?.canMerge,
    }[action];
    if (!this.allowed(permissions[action]) || !capability) return;
    if (
      action === 'merge' &&
      !this.targets().items?.some(
        (t) =>
          t.catalogId === this.targetId() && t.catalogId !== d.catalogId && t.status === 'Active',
      )
    )
      return;
    const body = {
      rowVersion: d.rowVersion,
      reason: this.reason().trim(),
      targetCatalogId: action === 'merge' ? this.targetId() : null,
    };
    const signature = JSON.stringify({ id: d.catalogId, action, body });
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    await this.mutate(() =>
      this.api.action(
        this.kind,
        d.catalogId,
        action,
        body,
        action === 'merge' ? this.intent!.key : undefined,
      ),
    );
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.targetSequence++;
      this.opened.set(false);
      this.reset();
    }
  }
  private reset() {
    this.detail.set(null);
    this.editing.set(false);
    this.creating.set(false);
    this.action.set(null);
    this.model.set({ ...EMPTY_FORM });
    this.messages.set([]);
    this.intent = null;
  }
  private async mutate(request: () => Observable<MedicalCatalogResponse>) {
    this.busy.set(true);
    let saved = false;
    try {
      const detail = await firstValueFrom(request());
      this.detail.set(detail);
      this.model.set({ ...detail.presentation });
      this.creating.set(false);
      this.editing.set(false);
      this.action.set(null);
      this.intent = null;
      saved = true;
      this.toast.success('diagnostics.saved');
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409 && this.detail()) {
        this.intent = null;
        try {
          this.detail.set(
            await firstValueFrom(this.api.details(this.kind, this.detail()!.catalogId)),
          );
          this.editing.set(false);
          this.action.set(null);
          this.model.set({ ...this.detail()!.presentation });
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
