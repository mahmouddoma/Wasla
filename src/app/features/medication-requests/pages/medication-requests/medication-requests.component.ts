import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { DrugCatalogApi, DrugCatalogItem, DrugData } from '../../../../domains/drug-catalog';
import {
  MedicationRequestsApi,
  MedicationRequest,
  MedicationRequestPage,
  MedicationRequestQuery,
  MedicationRequestStatus,
} from '../../../../domains/medication-requests';
@Component({
  selector: 'app-medication-requests',
  imports: [LocalizedDatePipe, ReactiveFormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './medication-requests.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './medication-requests.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedicationRequestsComponent implements OnInit {
  private readonly api = inject(MedicationRequestsApi);
  private readonly catalog = inject(DrugCatalogApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly language = inject(LanguageService);
  readonly manager = this.route.snapshot.data['actor'] === 'DrugCatalogManager';
  readonly statuses: readonly MedicationRequestStatus[] = [
    'Pending',
    'NeedsMoreInfo',
    'Approved',
    'Rejected',
  ];
  readonly fields = [
    'medicationName',
    'scientificName',
    'manufacturer',
    'strength',
    'dosageForm',
    'route',
    'drugClass',
    'doctorNote',
  ] as const;
  readonly approvalFields = [
    'commercialNameEn',
    'commercialNameAr',
    'scientificName',
    'manufacturer',
    'drugClass',
    'route',
    'strengthText',
    'dosageForm',
  ] as const;
  readonly form = this.fb.group({
    medicationName: ['', Validators.required],
    scientificName: [''],
    manufacturer: [''],
    strength: [''],
    dosageForm: [''],
    route: [''],
    drugClass: [''],
    doctorNote: [''],
  });
  readonly approved = this.fb.group({
    commercialNameEn: ['', Validators.required],
    commercialNameAr: [''],
    scientificName: [''],
    manufacturer: [''],
    drugClass: [''],
    route: [''],
    strengthText: [''],
    dosageForm: [''],
    priceEgp: this.fb.control<number | null>(null, Validators.min(0)),
  });
  readonly query = signal<MedicationRequestQuery>({ pageNumber: 1, pageSize: 20 });
  readonly page = signal<MedicationRequestPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly detail = signal<MedicationRequest | null>(null);
  readonly opened = signal(false);
  readonly editing = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly detailLoading = signal(false);
  readonly messages = signal<string[]>([]);
  readonly review = signal<'approve' | 'reject' | 'request-more-info' | null>(null);
  readonly reason = signal('');
  readonly duplicate = signal<DrugCatalogItem | null>(null);
  readonly matches = signal<readonly DrugCatalogItem[]>([]);
  readonly matchSearch = signal('');
  readonly matchPage = signal(1);
  readonly matchTotal = signal(0);
  private listSequence = 0;
  private detailSequence = 0;
  private matchSequence = 0;
  private intent: { signature: string; key: string } | null = null;
  ngOnInit() {
    void this.load();
  }
  allowed(action: string) {
    return (
      this.session.user()?.userType === (this.manager ? 'DrugCatalogManager' : 'Doctor') &&
      this.session.hasPermission('DrugCatalogRequests.' + action)
    );
  }
  canEdit() {
    return (
      !this.manager &&
      this.allowed('UpdateOwn') &&
      ['Pending', 'NeedsMoreInfo'].includes(this.detail()?.status || '')
    );
  }
  canReview() {
    return (
      this.manager &&
      this.allowed('Review') &&
      ['Pending', 'NeedsMoreInfo'].includes(this.detail()?.status || '')
    );
  }
  value(event: Event) {
    return (event.target as HTMLInputElement).value;
  }
  async load(pageNumber = 1) {
    if (this.busy() || !this.allowed(this.manager ? 'View' : 'ViewOwn')) return;
    this.query.update((query) => ({ ...query, pageNumber }));
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(
        this.manager ? this.api.list(this.query()) : this.api.mine(this.query()),
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
  filter(key: 'status' | 'search' | 'doctorId', event: Event) {
    const value = this.value(event);
    if (key === 'status' && value && !this.statuses.includes(value as MedicationRequestStatus))
      return;
    this.query.update((query) => ({ ...query, [key]: value || undefined }));
    void this.load();
  }
  async inspect(id: string) {
    if (!this.allowed(this.manager ? 'View' : 'ViewOwn') || this.busy()) return;
    this.close();
    this.opened.set(true);
    this.detailLoading.set(true);
    const sequence = ++this.detailSequence;
    try {
      const detail = await firstValueFrom(
        this.manager ? this.api.details(id) : this.api.myDetails(id),
      );
      if (sequence === this.detailSequence) this.detail.set(detail);
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  create() {
    if (!this.manager && this.allowed('CreateOwn') && !this.busy()) {
      this.close();
      this.form.reset();
      this.editing.set(true);
      this.opened.set(true);
    }
  }
  edit() {
    const detail = this.detail();
    if (!detail || !this.canEdit() || this.busy()) return;
    this.form.reset({
      medicationName: detail.medicationName,
      scientificName: detail.scientificName ?? '',
      manufacturer: detail.manufacturer ?? '',
      strength: detail.strength ?? '',
      dosageForm: detail.dosageForm ?? '',
      route: detail.route ?? '',
      drugClass: detail.drugClass ?? '',
      doctorNote: detail.doctorNote ?? '',
    });
    this.editing.set(true);
  }
  close() {
    if (this.busy()) return;
    this.detailSequence++;
    this.matchSequence++;
    this.opened.set(false);
    this.detail.set(null);
    this.editing.set(false);
    this.messages.set([]);
    this.review.set(null);
    this.duplicate.set(null);
    this.matches.set([]);
    this.intent = null;
  }
  async save() {
    const detail = this.detail();
    if (this.busy() || this.manager || (detail ? !this.canEdit() : !this.allowed('CreateOwn')))
      return;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.form.getRawValue().medicationName.trim()) {
      this.messages.set(['medications.invalidForm']);
      return;
    }
    const data = {
      ...this.form.getRawValue(),
      medicationName: this.form.getRawValue().medicationName.trim(),
    };
    await this.mutate(() =>
      detail ? this.api.update(detail.requestId, data, detail.rowVersion) : this.api.create(data),
    );
  }
  prepareReview(action: 'approve' | 'reject' | 'request-more-info') {
    const detail = this.detail();
    if (!detail || !this.canReview() || this.busy()) return;
    this.review.set(action);
    this.reason.set('');
    this.duplicate.set(null);
    this.intent = null;
    this.approved.reset({
      commercialNameEn: detail.medicationName,
      commercialNameAr: '',
      scientificName: detail.scientificName ?? '',
      manufacturer: detail.manufacturer ?? '',
      drugClass: detail.drugClass ?? '',
      route: detail.route ?? '',
      strengthText: detail.strength ?? '',
      dosageForm: detail.dosageForm ?? '',
      priceEgp: null,
    });
    if (action === 'reject') {
      this.matchSearch.set(detail.medicationName);
      void this.searchMatches();
    }
  }
  async searchMatches(pageNumber = 1) {
    if (!this.manager || !this.canReview() || !this.session.hasPermission('DrugCatalog.View'))
      return;
    const sequence = ++this.matchSequence;
    try {
      const page = await firstValueFrom(
        this.catalog.list({
          status: 'Active',
          search: this.matchSearch(),
          pageNumber,
          pageSize: 20,
        }),
      );
      if (sequence === this.matchSequence) {
        this.matches.set(page.items);
        this.matchPage.set(page.pageNumber);
        this.matchTotal.set(page.totalCount);
      }
    } catch (error) {
      if (sequence === this.matchSequence) this.failure(error);
    }
  }
  chooseDuplicate(item: DrugCatalogItem) {
    if (
      item.status === 'Active' &&
      this.matches().some((match) => match.drugCatalogId === item.drugCatalogId) &&
      !this.busy()
    )
      this.duplicate.set(item);
  }
  async decide() {
    const detail = this.detail(),
      action = this.review();
    if (!detail || !action || !this.canReview() || this.busy()) return;
    const body = { rowVersion: detail.rowVersion, reason: this.reason().trim() };
    if (!body.reason) {
      this.messages.set(['medications.invalidForm']);
      return;
    }
    if (action === 'approve') {
      if (this.approved.invalid) {
        this.messages.set(['medications.invalidForm']);
        return;
      }
      const value = this.approved.getRawValue();
      const approvedData: DrugData = { ...value, commercialNameEn: value.commercialNameEn.trim() };
      const signature = JSON.stringify({ id: detail.requestId, ...body, approvedData });
      if (this.intent?.signature !== signature)
        this.intent = { signature, key: createIdempotencyKey() };
      const key = this.intent.key;
      await this.mutate(() => this.api.approve(detail.requestId, { ...body, approvedData }, key));
    } else
      await this.mutate(() =>
        action === 'reject'
          ? this.api.reject(detail.requestId, {
              ...body,
              ...(this.duplicate()
                ? { duplicateOfDrugCatalogId: this.duplicate()!.drugCatalogId }
                : {}),
            })
          : this.api.requestMoreInfo(detail.requestId, body),
      );
  }
  private async mutate(request: () => Observable<MedicationRequest>) {
    this.busy.set(true);
    this.messages.set([]);
    let saved = false;
    try {
      this.detail.set(await firstValueFrom(request()));
      this.editing.set(false);
      this.review.set(null);
      this.intent = null;
      saved = true;
      this.toast.success('medications.saved');
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409 && this.detail()) {
        try {
          this.detail.set(
            await firstValueFrom(
              this.manager
                ? this.api.details(this.detail()!.requestId)
                : this.api.myDetails(this.detail()!.requestId),
            ),
          );
          this.editing.set(false);
          this.review.set(null);
          this.intent = null;
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
    const parsed = parseApiErrors(error),
      messages =
        parsed.status === 404
          ? ['medications.notFound']
          : [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages);
    if (mutation) this.toast.error(messages[0] || 'medications.failed');
  }
}
