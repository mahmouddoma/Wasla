import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { ToastService } from '../../../../core/notifications/toast.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import {
  DrugCatalogApi,
  DrugCatalogDetails,
  DrugCatalogItem,
  DrugData,
  DrugPage,
  DrugQuery,
  DrugStatus,
} from '../../../../domains/drug-catalog';

const EMPTY_PAGE: DrugPage = { items: [], pageNumber: 1, pageSize: 20, totalCount: 0 };
type DrugAction = 'activate' | 'deactivate' | 'merge';
@Component({
  selector: 'app-drug-catalog',
  imports: [LocalizedDatePipe, ReactiveFormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './drug-catalog.component.html',
  styleUrls: ['../../../../shared/styles/directory-workspace.css', './drug-catalog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrugCatalogComponent implements OnInit {
  private readonly api = inject(DrugCatalogApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly route = inject(ActivatedRoute);
  readonly language = inject(LanguageService);
  readonly statuses: readonly DrugStatus[] = ['Active', 'NeedsReview', 'Inactive', 'Merged'];
  readonly textFields = [
    'commercialNameEn',
    'commercialNameAr',
    'scientificName',
    'manufacturer',
    'drugClass',
    'route',
    'strengthText',
    'dosageForm',
  ] as const;
  readonly query = signal<DrugQuery>({ pageNumber: 1, pageSize: 20 });
  readonly page = signal<DrugPage>(EMPTY_PAGE);
  readonly detail = signal<DrugCatalogDetails | null>(null);
  readonly opened = signal(false);
  readonly creating = signal(false);
  readonly editing = signal(false);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly messages = signal<string[]>([]);
  readonly pendingAction = signal<DrugAction | null>(null);
  readonly reason = signal('');
  readonly targets = signal<DrugPage>(EMPTY_PAGE);
  readonly targetSearch = signal('');
  readonly targetLoading = signal(false);
  readonly targetId = signal('');
  readonly form = this.fb.group({
    commercialNameEn: ['', [Validators.required, Validators.maxLength(200)]],
    commercialNameAr: [''],
    scientificName: [''],
    manufacturer: [''],
    drugClass: [''],
    route: [''],
    strengthText: [''],
    dosageForm: [''],
    priceEgp: this.fb.control<number | null>(null, Validators.min(0)),
  });
  private listSequence = 0;
  private detailSequence = 0;
  private targetSequence = 0;
  private mergeIntent: { signature: string; key: string } | null = null;
  ngOnInit() {
    void this.load();
    const drugId = this.route.snapshot.queryParamMap.get('drugId');
    if (drugId) void this.inspect(drugId);
  }
  allowed(action: string) {
    return (
      this.session.user()?.userType === 'DrugCatalogManager' &&
      this.session.hasPermission('DrugCatalog.' + action)
    );
  }
  name(item: DrugCatalogItem) {
    return this.language.currentLang() === 'ar'
      ? item.commercialNameAr || item.commercialNameEn
      : item.commercialNameEn;
  }
  historyLabel(action: string) {
    const key =
      (
        {
          Created: 'medications.add',
          Updated: 'medications.edit',
          Activated: 'medications.activate',
          Deactivated: 'medications.deactivate',
          Merged: 'medications.merge',
        } as Record<string, string>
      )[action] || 'medications.historyChanged';
    return this.language.t(key);
  }
  async load(pageNumber = this.query().pageNumber) {
    if (!this.allowed('View') || this.busy()) return;
    this.query.update((query) => ({ ...query, pageNumber }));
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(this.api.list(this.query()));
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
  filter(key: 'search' | 'status', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (key === 'status' && value && !this.statuses.includes(value as DrugStatus)) return;
    this.messages.set([]);
    this.query.update((query) => ({ ...query, [key]: value || undefined, pageNumber: 1 }));
    void this.load(1);
  }
  resetFilters() {
    this.query.set({ pageNumber: 1, pageSize: 20 });
    this.messages.set([]);
    void this.load();
  }
  async inspect(id: string) {
    if (!this.allowed('View') || this.busy()) return;
    this.resetDrawer();
    this.opened.set(true);
    this.detailLoading.set(true);
    const sequence = ++this.detailSequence;
    try {
      const detail = await firstValueFrom(this.api.details(id));
      if (sequence === this.detailSequence) {
        this.detail.set(detail);
        this.setForm(detail);
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  create() {
    if (!this.allowed('Create') || this.busy()) return;
    this.resetDrawer();
    this.creating.set(true);
    this.editing.set(true);
    this.opened.set(true);
  }
  edit() {
    const detail = this.detail();
    if (!detail || !this.allowed('Update') || detail.status === 'Merged' || this.busy()) return;
    this.setForm(detail);
    this.editing.set(true);
    this.reason.set('');
    this.pendingAction.set(null);
  }
  cancelEdit() {
    if (!this.busy()) {
      this.editing.set(false);
      if (this.detail()) this.setForm(this.detail()!);
    }
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.targetSequence++;
      this.opened.set(false);
      this.resetDrawer();
    }
  }
  async save() {
    const detail = this.detail(),
      creating = this.creating();
    if (
      this.busy() ||
      !this.allowed(creating ? 'Create' : 'Update') ||
      (!creating && (!detail || detail.status === 'Merged'))
    )
      return;
    this.form.markAllAsTouched();
    if (
      this.form.invalid ||
      !this.form.getRawValue().commercialNameEn.trim() ||
      (!creating && !this.reason().trim())
    ) {
      this.messages.set(['medications.invalidForm']);
      return;
    }
    const value = this.form.getRawValue();
    const data: DrugData = {
      ...value,
      commercialNameEn: value.commercialNameEn.trim(),
      commercialNameAr: value.commercialNameAr.trim() || null,
      scientificName: value.scientificName.trim() || null,
      manufacturer: value.manufacturer.trim() || null,
      drugClass: value.drugClass.trim() || null,
      route: value.route.trim() || null,
      strengthText: value.strengthText.trim() || null,
      dosageForm: value.dosageForm.trim() || null,
    };
    await this.mutate(() =>
      creating
        ? this.api.create(data)
        : this.api.update(detail!.drugCatalogId, data, {
            rowVersion: detail!.rowVersion,
            reason: this.reason().trim(),
          }),
    );
  }
  prepareAction(action: DrugAction) {
    const detail = this.detail();
    if (
      !detail ||
      detail.status === 'Merged' ||
      !this.allowed(this.actionPermission(action)) ||
      this.busy()
    )
      return;
    this.pendingAction.set(action);
    this.editing.set(false);
    this.reason.set('');
    this.targetId.set('');
    this.targetSearch.set('');
    this.mergeIntent = null;
    if (action === 'merge') void this.loadTargets(1);
  }
  async loadTargets(pageNumber = 1) {
    if (this.pendingAction() !== 'merge' || !this.allowed('Merge')) return;
    const sequence = ++this.targetSequence,
      source = this.detail()?.drugCatalogId;
    this.targetLoading.set(true);
    try {
      const page = await firstValueFrom(
        this.api.list({ search: this.targetSearch(), status: 'Active', pageNumber, pageSize: 20 }),
      );
      if (sequence === this.targetSequence && source === this.detail()?.drugCatalogId)
        this.targets.set(page);
    } catch (error) {
      if (sequence === this.targetSequence) this.failure(error);
    } finally {
      if (sequence === this.targetSequence) this.targetLoading.set(false);
    }
  }
  chooseTarget(id: string) {
    if (
      !this.busy() &&
      this.targets().items.some(
        (item) =>
          item.drugCatalogId === id &&
          item.status === 'Active' &&
          id !== this.detail()?.drugCatalogId,
      )
    )
      this.targetId.set(id);
  }
  setReason(event: Event) {
    this.reason.set((event.target as HTMLInputElement).value);
  }
  setTargetSearch(event: Event) {
    this.targetSearch.set((event.target as HTMLInputElement).value);
    void this.loadTargets();
  }
  cancelAction() {
    if (!this.busy()) {
      this.pendingAction.set(null);
      this.targetSequence++;
      this.targetLoading.set(false);
      this.mergeIntent = null;
    }
  }
  async executeAction() {
    const detail = this.detail(),
      action = this.pendingAction();
    if (
      !detail ||
      !action ||
      detail.status === 'Merged' ||
      !this.allowed(this.actionPermission(action)) ||
      this.busy()
    )
      return;
    const body = { rowVersion: detail.rowVersion, reason: this.reason().trim() };
    if (
      !body.reason ||
      (action === 'merge' && (!this.targetId() || this.targetId() === detail.drugCatalogId))
    ) {
      this.messages.set(['medications.invalidForm']);
      return;
    }
    if (action === 'merge') {
      const signature = JSON.stringify({
        source: detail.drugCatalogId,
        target: this.targetId(),
        ...body,
      });
      if (signature !== this.mergeIntent?.signature)
        this.mergeIntent = { signature, key: createIdempotencyKey() };
      const key = this.mergeIntent.key;
      await this.mutate(() => this.api.merge(detail.drugCatalogId, this.targetId(), body, key));
    } else {
      await this.mutate(() =>
        action === 'activate'
          ? this.api.activate(detail.drugCatalogId, body)
          : this.api.deactivate(detail.drugCatalogId, body),
      );
    }
  }
  private async mutate(request: () => Observable<DrugCatalogDetails>) {
    this.busy.set(true);
    this.messages.set([]);
    let saved = false;
    try {
      const response = await firstValueFrom(request());
      // Mutations may return a projection: reload details for current history and concurrency.
      this.detail.set(response);
      this.setForm(response);
      this.creating.set(false);
      this.editing.set(false);
      this.pendingAction.set(null);
      this.mergeIntent = null;
      saved = true;
      this.toast.success('medications.saved');
      try {
        const refreshed = await firstValueFrom(this.api.details(response.drugCatalogId));
        this.detail.set(refreshed);
        this.setForm(refreshed);
      } catch (refreshError) {
        this.failure(refreshError);
      }
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409 && this.detail()) {
        try {
          this.detail.set(await firstValueFrom(this.api.details(this.detail()!.drugCatalogId)));
          this.setForm(this.detail()!);
          this.editing.set(false);
          this.pendingAction.set(null);
          this.mergeIntent = null;
        } catch (refreshError) {
          this.failure(refreshError);
        }
      }
    } finally {
      this.busy.set(false);
    }
    if (saved) await this.load();
  }
  private setForm(item: DrugData) {
    this.form.reset({
      commercialNameEn: item.commercialNameEn,
      commercialNameAr: item.commercialNameAr ?? '',
      scientificName: item.scientificName ?? '',
      manufacturer: item.manufacturer ?? '',
      drugClass: item.drugClass ?? '',
      route: item.route ?? '',
      strengthText: item.strengthText ?? '',
      dosageForm: item.dosageForm ?? '',
      priceEgp: item.priceEgp,
    });
  }
  private actionPermission(action: DrugAction) {
    return { activate: 'Activate', deactivate: 'Deactivate', merge: 'Merge' }[action];
  }
  private resetDrawer() {
    this.detail.set(null);
    this.creating.set(false);
    this.editing.set(false);
    this.messages.set([]);
    this.pendingAction.set(null);
    this.reason.set('');
    this.targetId.set('');
    this.targets.set(EMPTY_PAGE);
    this.targetLoading.set(false);
    this.mergeIntent = null;
    this.form.reset();
  }
  private failure(error: unknown, mutation = false) {
    const parsed = parseApiErrors(error);
    const messages =
      parsed.status === 404
        ? ['medications.notFound']
        : [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages);
    if (mutation) this.toast.error(messages[0] || 'medications.failed');
  }
}
