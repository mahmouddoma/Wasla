import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import {
  CommercialCatalog,
  LegacyTransitionBatch,
  SubscriptionsApi,
  SubscriptionChangeRequest,
  SubscriptionDetails,
  SubscriptionListQuery,
  SubscriptionPage,
  SubscriptionSelection,
  isAvailableSelection,
} from '../../../../domains/subscriptions';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { PlanSelectorComponent } from '../../components/plan-selector/plan-selector.component';

type AdminAction = 'activate' | 'renew' | 'extend' | 'approve' | 'reject' | 'enroll';
@Component({
  selector: 'app-admin-subscriptions',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    TranslatePipe,
    PageHeader,
    SideDrawer,
    PlanSelectorComponent,
  ],
  templateUrl: './admin-subscriptions.component.html',
  styleUrls: ['../../subscriptions.css', './admin-subscriptions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSubscriptionsComponent {
  readonly operations = ['activate', 'extend', 'renew'] as const;
  readonly language = inject(LanguageService);
  readonly session = inject(AuthSession);
  private readonly api = inject(SubscriptionsApi);
  private readonly toast = inject(ToastService);
  readonly page = signal<SubscriptionPage | null>(null);
  readonly details = signal<SubscriptionDetails | null>(null);
  readonly catalog = signal<CommercialCatalog | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal(false);
  readonly detailError = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly action = signal<AdminAction | null>(null);
  readonly selectedChange = signal<SubscriptionChangeRequest | null>(null);
  readonly batch = signal<LegacyTransitionBatch | null>(null);
  readonly renewalSelection = signal<SubscriptionSelection | null>(null);
  readonly paymentUncertain = signal(false);
  query: SubscriptionListQuery = {
    pageNumber: 1,
    pageSize: 20,
    search:
      inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap.get('search') ?? undefined,
  };
  reason = '';
  additionalDays = 1;
  amountReceived: number | null = null;
  reference = '';
  notes = '';
  private intentKey = '';
  private intentBody = '';
  private listGeneration = 0;
  private detailGeneration = 0;
  constructor() {
    void this.load();
    void this.loadCatalog();
  }
  private async loadCatalog(): Promise<void> {
    try {
      this.catalog.set(await firstValueFrom(this.api.catalog()));
    } catch {
      this.catalog.set(null);
    }
  }
  async load(reset = false): Promise<void> {
    if (reset) this.query.pageNumber = 1;
    const generation = ++this.listGeneration;
    this.loading.set(true);
    this.error.set(false);
    try {
      const page = await firstValueFrom(this.api.list({ ...this.query }));
      if (generation === this.listGeneration) this.page.set(page);
    } catch {
      if (generation === this.listGeneration) this.error.set(true);
    } finally {
      if (generation === this.listGeneration) this.loading.set(false);
    }
  }
  clearFilters(): void {
    this.query = { pageNumber: 1, pageSize: 20 };
    void this.load();
  }
  async inspect(id: string): Promise<void> {
    if (!this.session.hasPermission('Subscriptions.ViewDetails') || this.busy()) return;
    const generation = ++this.detailGeneration;
    this.selectedId.set(id);
    this.details.set(null);
    this.action.set(null);
    this.detailLoading.set(true);
    this.detailError.set(false);
    try {
      const details = await firstValueFrom(this.api.details(id));
      if (generation === this.detailGeneration) {
        this.details.set(details);
        this.paymentUncertain.set(false);
      }
    } catch {
      if (generation === this.detailGeneration) this.detailError.set(true);
    } finally {
      if (generation === this.detailGeneration) this.detailLoading.set(false);
    }
  }
  close(): void {
    if (this.busy()) return;
    ++this.detailGeneration;
    this.selectedId.set(null);
    this.details.set(null);
    this.action.set(null);
  }
  next(delta: number): void {
    this.query.pageNumber += delta;
    void this.load();
  }
  can(action: AdminAction): boolean {
    const current = this.details()?.subscription;
    const permissions: Record<AdminAction, string> = {
      activate: 'Subscriptions.Activate',
      renew: 'Subscriptions.Renew',
      extend: 'Subscriptions.ExtendTrial',
      approve: 'Subscriptions.ReviewChangeRequests',
      reject: 'Subscriptions.ReviewChangeRequests',
      enroll: 'Subscriptions.EnrollLegacyTransition',
    };
    if (!this.session.hasPermission(permissions[action])) return false;
    if (action === 'enroll') return this.batch()?.status !== 'Completed';
    if (!current) return false;
    if (action === 'activate')
      return (
        current.kind === 'Paid' &&
        current.status === 'Pending' &&
        this.details()?.doctor?.approvalStatus === 'Approved'
      );
    if (action === 'extend') return current.kind === 'Trial' && current.status === 'Active';
    if (action === 'renew')
      return current.kind === 'Paid' && ['Active', 'Expired'].includes(current.status);
    return true;
  }
  begin(action: AdminAction, change: SubscriptionChangeRequest | null = null): void {
    if (
      !this.can(action) ||
      this.busy() ||
      this.paymentUncertain() ||
      (change && change.status !== 'Pending')
    )
      return;
    this.action.set(action);
    this.selectedChange.set(change);
    this.reason = '';
    this.additionalDays = 1;
    this.amountReceived = null;
    this.reference = '';
    this.notes = '';
    this.renewalSelection.set(null);
  }
  requiresPayment(): boolean {
    return (
      this.action() === 'activate' ||
      this.action() === 'renew' ||
      (this.action() === 'approve' &&
        ['UpgradePlan', 'IncreaseBookingPracticeLimit'].includes(
          this.selectedChange()?.changeType ?? '',
        ))
    );
  }
  valid(): boolean {
    if (!this.action() || !this.can(this.action()!)) return false;
    if (this.action() !== 'enroll' && !this.details()?.rowVersion) return false;
    const selection = this.renewalSelection();
    if (
      this.action() === 'renew' &&
      selection &&
      (!isAvailableSelection(this.catalog(), selection) ||
        selection.productCode !== this.details()?.subscription?.productCode)
    )
      return false;
    if (['reject', 'extend'].includes(this.action()!) && !this.reason.trim()) return false;
    if (
      this.action() === 'extend' &&
      (!Number.isInteger(this.additionalDays) || this.additionalDays <= 0)
    )
      return false;
    if (this.requiresPayment()) {
      if (
        !this.catalog()?.paymentMethods.cash ||
        this.amountReceived === null ||
        this.amountReceived <= 0
      )
        return false;
      const expected =
        this.action() === 'approve'
          ? this.selectedChange()?.differenceAmount
          : this.action() === 'activate'
            ? this.details()?.subscription?.priceAmount
            : null;
      if (expected != null && this.amountReceived !== expected) return false;
    }
    return true;
  }
  async confirm(): Promise<void> {
    const action = this.action();
    if (!action || !this.valid() || this.busy()) return;
    const id = this.selectedId();
    const details = this.details();
    const change = this.selectedChange();
    if (action !== 'enroll' && (!id || !details)) return;
    this.busy.set(true);
    try {
      if (action === 'enroll') {
        this.batch.set(await firstValueFrom(this.api.enrollLegacyTransition()));
      } else {
        const rowVersion = details!.rowVersion;
        const payment = {
          rowVersion,
          paymentMethod: 'Cash' as const,
          amountReceived: this.amountReceived!,
          reference: this.reference.trim() || null,
          notes: this.notes.trim() || null,
        };
        const selection = action === 'renew' ? this.renewalSelection() : null;
        const signature = JSON.stringify({ id, action, change: change?.id, payment, selection });
        if (signature !== this.intentBody) {
          this.intentBody = signature;
          this.intentKey = crypto.randomUUID();
        }
        let request: Observable<SubscriptionDetails>;
        if (action === 'activate') request = this.api.activate(id!, payment, this.intentKey);
        else if (action === 'renew')
          request = this.api.renew(
            id!,
            {
              ...payment,
              ...(selection
                ? {
                    targetPlanCode: selection.planCode,
                    targetBillingCycle: selection.billingCycle,
                    targetPracticeCount: selection.selectedPracticeCount,
                  }
                : {}),
            },
            this.intentKey,
          );
        else if (action === 'extend')
          request = this.api.extendTrial(id!, {
            rowVersion,
            additionalDays: this.additionalDays,
            reason: this.reason.trim(),
          });
        else if (action === 'reject' && change)
          request = this.api.rejectChange(id!, change.id, {
            rowVersion,
            changeRowVersion: change.rowVersion,
            reason: this.reason.trim(),
          });
        else if (action === 'approve' && change)
          request = this.api.approveChange(
            id!,
            change.id,
            {
              rowVersion,
              changeRowVersion: change.rowVersion,
              ...(this.requiresPayment() ? payment : {}),
            },
            this.intentKey,
          );
        else return;
        await firstValueFrom(request);
        await this.inspectAfterMutation(id!);
      }
      this.action.set(null);
      this.toast.success(this.language.t('subscriptions.saved'));
      await this.load();
    } catch (error) {
      const parsed = parseApiErrors(error);
      if (parsed.status === 0 && this.requiresPayment()) this.paymentUncertain.set(true);
      this.toast.error(this.language.t(parsed.messages[0] ?? 'common.requestFailed'));
      if (parsed.status === 409 && id) {
        await this.inspectAfterMutation(id);
        this.action.set(null);
      }
      if (parsed.status === 422) await this.loadCatalog();
    } finally {
      this.busy.set(false);
    }
  }
  private async inspectAfterMutation(id: string): Promise<void> {
    // A refresh failure must never turn a successful payment into a failed payment message.
    try {
      this.details.set(await firstValueFrom(this.api.details(id)));
    } catch {
      this.details.set(null);
      this.detailError.set(true);
    }
  }
}
