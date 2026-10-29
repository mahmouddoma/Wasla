import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { Phase18Api, Phase18Responses } from '../../../../domains/phase18';
import type { components } from '../../../../domains/phase18';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';

type Schema = components['schemas'];
type Plan = Schema['OperatingPlanResponse'];
type Obligation = Schema['OperatingObligationResponse'];
type Command = Schema['OperatingFinanceWriteResponse'];
type Tab = 'expenses' | 'plans' | 'obligations';
type Mode =
  | 'view'
  | 'createPlan'
  | 'editPlan'
  | 'createExpense'
  | 'settle'
  | 'correctObligation'
  | 'confirmActual'
  | 'cancel'
  | 'end'
  | 'pause'
  | 'resume'
  | 'reverse';

@Component({
  selector: 'app-operating-finance',
  imports: [FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './operating-finance.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './operating-finance.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.dir]': 'language.dir()' },
})
export class OperatingFinanceComponent implements OnInit, OnDestroy {
  private readonly api = inject(Phase18Api);
  private readonly session = inject(AuthSession);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  readonly salary = signal(false);
  readonly tab = signal<Tab>('plans');
  readonly plans = signal<Plan[]>([]);
  readonly obligations = signal<Obligation[]>([]);
  readonly selectedPlan = signal<Plan | null>(null);
  readonly selectedObligation = signal<Obligation | null>(null);
  readonly settlement = signal<Schema['OperatingSettlementResponse'] | null>(null);
  readonly receipt = signal<Phase18Responses['P18-029'] | null>(null);
  readonly history = signal<Schema['OperatingHistoryResponse'][]>([]);
  readonly options = signal<Schema['OperatingFinanceOptions'] | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly drawer = signal(false);
  readonly mode = signal<Mode>('view');
  readonly messages = signal<readonly string[]>([]);
  readonly fields = signal<Readonly<Record<string, string[]>>>({});
  readonly page = signal(1);
  readonly total = signal(0);
  readonly planScope = signal('');
  readonly canManage = computed(() =>
    this.can(this.salary() ? 'SalaryPlans.ManageOwn' : 'FinancialExpenses.ManageOwn'),
  );
  readonly canReadPlans = computed(() =>
    this.can(this.salary() ? 'SalaryPlans.ViewOwn' : 'FinancialExpenses.ViewOwn'),
  );
  readonly canReadObligations = computed(() =>
    this.can(this.salary() ? 'SalaryObligations.ViewOwn' : 'FinancialExpenses.ViewOwn'),
  );
  draft = this.emptyDraft();
  filters = { practiceId: '', fromDate: '', toDate: '' };
  readonly retryBlocked = signal(false);
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private sequence = 0;
  private detailSequence = 0;
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  ngOnInit(): void {
    this.salary.set(this.route.snapshot.data['view'] === 'salaries');
    this.tab.set(this.canReadPlans() ? 'plans' : 'obligations');
    void this.load();
    this.api
      .call('P18-045', {})
      .subscribe({ next: (value) => this.options.set(value), error: () => {} });
  }
  ngOnDestroy(): void {
    clearTimeout(this.retryTimer);
    this.destroyed = true;
    this.sequence++;
    this.detailSequence++;
    this.intents.clear();
  }
  stateLabel(state: string | undefined): string {
    const key = 'doctorRemediation.state.' + state;
    const value = this.language.t(key);
    return value === key ? this.language.t('doctorRemediation.unavailable') : value;
  }
  can(permission: string): boolean {
    return this.session.hasPermission(permission);
  }
  text(ar: string | null | undefined, en: string | null | undefined): string {
    return (
      (this.language.isRtl() ? ar || en : en || ar) ||
      this.language.t('doctorRemediation.unavailable')
    );
  }
  revision(plan: Plan): Schema['OperatingPlanRevisionResponse'] | null {
    return (plan.revisions || []).reduce<Schema['OperatingPlanRevisionResponse'] | null>(
      (latest, current) =>
        !latest || (current.revisionNumber ?? -1) > (latest.revisionNumber ?? -1)
          ? current
          : latest,
      null,
    );
  }
  staffName(id: string | null | undefined): string {
    const staff = this.options()?.receptions?.find((r) => r.id === id);
    return this.text(staff?.nameAr, staff?.nameEn);
  }
  async switchTab(tab: Tab): Promise<void> {
    if (this.busy()) return;
    this.tab.set(tab);
    this.planScope.set('');
    this.close();
    await this.load();
  }
  async load(page = 1): Promise<void> {
    if (this.retryBlocked()) return;
    const seq = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.messages.set([]);
    this.page.set(page);
    this.plans.set([]);
    this.obligations.set([]);
    const query = { ...this.filters, pageNumber: page, pageSize: 20 };
    try {
      if (this.tab() === 'plans') {
        if (!this.canReadPlans()) return;
        const result = await firstValueFrom(
          this.api.call(this.salary() ? 'P18-058' : 'P18-064', { query }),
        );
        if (seq === this.sequence && !this.destroyed) {
          this.plans.set(this.validate(result.items));
          this.total.set(result.totalCount ?? 0);
        }
      } else {
        if (!this.canReadObligations()) return;
        const result = await firstValueFrom(
          this.planScope()
            ? this.api.call('P18-070', { path: { id: this.planScope() }, query })
            : this.api.call(
                this.salary() ? 'P18-081' : this.tab() === 'expenses' ? 'P18-031' : 'P18-037',
                { query },
              ),
        );
        if (seq === this.sequence && !this.destroyed) {
          this.obligations.set(this.validate(result.items));
          this.total.set(result.totalCount ?? 0);
        }
      }
    } catch (error) {
      if (seq === this.sequence) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (seq === this.sequence) this.loading.set(false);
    }
  }
  private validate<T extends { id?: string }>(items: T[] | null | undefined): T[] {
    if (!Array.isArray(items)) {
      if (items == null) return [];
      throw new Error('Invalid finance contract');
    }
    if (items.some((item) => !item.id)) throw new Error('Invalid finance contract');
    return items;
  }
  async inspectPlan(plan: Plan): Promise<void> {
    if (!plan.id || !this.canReadPlans()) return;
    const seq = this.beginDetail();
    try {
      const [detail, history] = await Promise.all([
        firstValueFrom(
          this.api.call(this.salary() ? 'P18-060' : 'P18-066', { path: { id: plan.id } }),
        ),
        firstValueFrom(
          this.api.call(this.salary() ? 'P18-063' : 'P18-069', {
            path: { id: plan.id },
            query: { pageNumber: 1, pageSize: 20 },
          }),
        ),
      ]);
      if (seq === this.detailSequence && !this.destroyed) {
        this.selectedPlan.set(detail);
        this.history.set(history.items || []);
      }
    } catch (error) {
      if (seq === this.detailSequence) this.failure(error);
    } finally {
      if (seq === this.detailSequence) this.detailLoading.set(false);
    }
  }
  async viewObligations(plan: Plan): Promise<void> {
    if (!plan.id || !this.canReadObligations()) return;
    this.close();
    this.planScope.set(plan.id);
    this.tab.set('obligations');
    await this.load();
  }
  async inspectObligation(obligation: Obligation): Promise<void> {
    if (!obligation.id || !this.canReadObligations()) return;
    const seq = this.beginDetail();
    try {
      const [detail, history] = await Promise.all([
        firstValueFrom(
          this.api.call(this.salary() ? 'P18-082' : 'P18-038', { path: { id: obligation.id } }),
        ),
        firstValueFrom(
          this.api.call(this.salary() ? 'P18-085' : 'P18-042', {
            path: { id: obligation.id },
            query: { pageNumber: 1, pageSize: 20 },
          }),
        ),
      ]);
      if (seq === this.detailSequence && !this.destroyed) {
        this.selectedObligation.set(detail);
        this.history.set(history.items || []);
      }
    } catch (error) {
      if (seq === this.detailSequence) this.failure(error);
    } finally {
      if (seq === this.detailSequence) this.detailLoading.set(false);
    }
  }
  private beginDetail(): number {
    this.clearDetail();
    this.drawer.set(true);
    this.detailLoading.set(true);
    return ++this.detailSequence;
  }
  allowed(
    resource: { availableActions?: Schema['ReportAction'][] | null },
    suffix: string,
    permission: string,
  ): boolean {
    return (
      this.can(permission) &&
      (resource.availableActions || []).some(
        (a) =>
          a.allowed === true &&
          (a.code ===
            (
              {
                '': 'Revise',
                '/end': 'End',
                '/pause': 'Pause',
                '/resume': 'Resume',
                '/settle': 'Settle',
                '/confirm-actual': 'ConfirmActual',
                '/correct': 'Correct',
                '/cancel': 'Cancel',
                '/reverse': 'Reverse',
              } as Readonly<Record<string, string>>
            )[suffix] ||
            (!!suffix && a.route?.endsWith(suffix))),
      )
    );
  }
  planAction(operation: 'end' | 'pause' | 'resume'): boolean {
    const plan = this.selectedPlan();
    return (
      !!plan?.rowVersion &&
      this.canManage() &&
      this.allowed(
        plan,
        '/' + operation,
        this.salary() ? 'SalaryPlans.ManageOwn' : 'FinancialExpenses.ManageOwn',
      )
    );
  }
  obligationAction(operation: 'settle' | 'confirm-actual' | 'cancel' | 'correct'): boolean {
    const obligation = this.selectedObligation();
    if (!obligation?.rowVersion || (this.salary() && !['cancel', 'correct'].includes(operation)))
      return false;
    return this.allowed(
      obligation,
      '/' + operation,
      this.salary()
        ? 'SalaryPlans.ManageOwn'
        : operation === 'settle'
          ? 'FinancialExpenses.SettleOwn'
          : 'FinancialExpenses.ManageOwn',
    );
  }
  openCreate(kind: 'createPlan' | 'createExpense'): void {
    if (!this.canManage()) return;
    this.clearDetail();
    this.draft = this.emptyDraft();
    this.mode.set(kind);
    this.drawer.set(true);
  }
  editPlan(): void {
    const plan = this.selectedPlan(),
      revision = plan && this.revision(plan);
    if (
      !plan?.rowVersion ||
      !revision ||
      !this.canManage() ||
      !this.allowed(
        plan,
        '',
        this.salary() ? 'SalaryPlans.ManageOwn' : 'FinancialExpenses.ManageOwn',
      )
    )
      return;
    this.draft = {
      ...this.emptyDraft(),
      amount: String(revision.amount ?? ''),
      dueDay: revision.dueDay ?? 1,
      effectiveFrom: plan.effectiveFrom || '',
      effectiveTo: plan.effectiveTo || '',
      receptionId: plan.receptionId || '',
      category: revision.category || 'Other',
      cadence: revision.cadence || 'Monthly',
      amountPolicy: revision.amountPolicy || 'Fixed',
      descriptionAr: revision.descriptionAr || '',
      descriptionEn: revision.descriptionEn || '',
    };
    this.mode.set('editPlan');
  }
  prepare(mode: Mode): void {
    const obligation = this.selectedObligation();
    this.draft = {
      ...this.emptyDraft(),
      amount: String(obligation?.amount ?? ''),
      ...(mode === 'correctObligation'
        ? {
            businessDate: obligation?.dueBusinessDate || '',
            category: obligation?.category || 'Other',
            descriptionAr: obligation?.descriptionAr || '',
            descriptionEn: obligation?.descriptionEn || '',
          }
        : {}),
    };
    this.messages.set([]);
    this.fields.set({});
    this.mode.set(mode);
  }
  async submit(): Promise<void> {
    if (this.busy() || this.retryBlocked()) return;
    const plan = this.selectedPlan(),
      obligation = this.selectedObligation(),
      mode = this.mode();
    const amount = Number(this.draft.amount);
    const signature = JSON.stringify({
      mode,
      plan: plan?.id,
      obligation: obligation?.id,
      draft: this.draft,
    });
    let key = this.intents.get(signature);
    if (!key) {
      key = createIdempotencyKey();
      this.intents.set(signature, key);
    }
    const path = { id: plan?.id || obligation?.id || '' };
    let command: Observable<Command>;
    const allocations = this.draft.practiceId
      ? [{ practiceId: this.draft.practiceId, percentage: 100 }]
      : mode === 'editPlan' && plan
        ? this.revision(plan)?.allocations?.map((a) => ({
            practiceId: a.practiceId,
            percentage: a.percentage,
          }))
        : mode === 'correctObligation'
          ? obligation?.allocations?.map((a) => ({
              practiceId: a.practiceId,
              percentage: a.percentage,
            }))
          : undefined;
    if (mode === 'createPlan' || mode === 'editPlan') {
      if (
        !this.canManage() ||
        !this.validMoney() ||
        !this.draft.effectiveFrom ||
        (!this.draft.reason.trim() && mode === 'editPlan') ||
        (this.salary() && !this.options()?.receptions?.some((r) => r.id === this.draft.receptionId))
      )
        return;
      const body: Schema['OperatingPlanRequest'] = {
        amount,
        dueDay: this.draft.dueDay,
        effectiveFrom: this.draft.effectiveFrom,
        effectiveTo: this.draft.effectiveTo || null,
        receptionId: this.salary() ? this.draft.receptionId : null,
        category: this.draft.category,
        cadence: this.draft.cadence,
        amountPolicy: this.draft.amountPolicy,
        descriptionAr: this.draft.descriptionAr,
        descriptionEn: this.draft.descriptionEn,
        allocations,
        rowVersion: mode === 'editPlan' ? plan?.rowVersion : undefined,
        reason: this.draft.reason || undefined,
      };
      if (mode === 'editPlan' && (!plan?.id || !plan.rowVersion)) return;
      command = this.api.call(
        mode === 'editPlan'
          ? this.salary()
            ? 'P18-061'
            : 'P18-067'
          : this.salary()
            ? 'P18-059'
            : 'P18-065',
        { path, body, idempotencyKey: key },
      );
    } else if (mode === 'createExpense') {
      if (
        !this.canManage() ||
        this.salary() ||
        !this.validMoney() ||
        !this.draft.reason.trim() ||
        !this.draft.businessDate
      )
        return;
      command = this.api.call('P18-032', {
        body: {
          amount,
          category: this.draft.category,
          businessDate: this.draft.businessDate,
          dueBusinessDate: this.draft.businessDate,
          descriptionAr: this.draft.descriptionAr,
          descriptionEn: this.draft.descriptionEn,
          allocations,
          paidNow: false,
          reason: this.draft.reason.trim(),
        },
        idempotencyKey: key,
      });
    } else if (['end', 'pause', 'resume'].includes(mode)) {
      if (
        !plan?.id ||
        !this.planAction(mode as 'end' | 'pause' | 'resume') ||
        !this.draft.reason.trim()
      )
        return;
      command = this.api.call(
        mode === 'end'
          ? this.salary()
            ? 'P18-062'
            : 'P18-068'
          : mode === 'pause'
            ? 'P18-071'
            : 'P18-072',
        {
          path: { id: plan.id },
          body: { rowVersion: plan.rowVersion, reason: this.draft.reason.trim() },
          idempotencyKey: key,
        },
      );
    } else if (mode === 'settle') {
      if (
        !obligation?.id ||
        !this.obligationAction('settle') ||
        !this.validMoney() ||
        amount !== obligation.amount ||
        (obligation.amountPolicy === 'Variable' && obligation.actualAmountConfirmed !== true)
      )
        return;
      command = this.api.call('P18-043', {
        path: { id: obligation.id },
        body: {
          amount,
          paidBusinessDate: this.draft.businessDate,
          paymentMethod: this.draft.paymentMethod,
          rowVersion: obligation.rowVersion,
          reportTimeZoneId: this.options()?.defaultReportTimeZoneId,
        },
        idempotencyKey: key,
      });
    } else if (mode === 'correctObligation') {
      if (
        !obligation?.id ||
        !this.obligationAction('correct') ||
        !this.validMoney() ||
        !this.draft.reason.trim() ||
        !this.draft.businessDate
      )
        return;
      command = this.api.call(this.salary() ? 'P18-083' : 'P18-039', {
        path: { id: obligation.id },
        body: {
          amount,
          dueBusinessDate: this.draft.businessDate,
          category: this.draft.category,
          descriptionAr: this.draft.descriptionAr,
          descriptionEn: this.draft.descriptionEn,
          rowVersion: obligation.rowVersion,
          reason: this.draft.reason.trim(),
          allocations,
        },
        idempotencyKey: key,
      });
    } else if (mode === 'confirmActual') {
      if (
        !obligation?.id ||
        !this.obligationAction('confirm-actual') ||
        !this.validMoney() ||
        !this.draft.reason.trim()
      )
        return;
      command = this.api.call('P18-041', {
        path: { id: obligation.id },
        body: { amount, rowVersion: obligation.rowVersion, reason: this.draft.reason.trim() },
        idempotencyKey: key,
      });
    } else if (mode === 'cancel') {
      if (!obligation?.id || !this.obligationAction('cancel') || !this.draft.reason.trim()) return;
      command = this.api.call(this.salary() ? 'P18-084' : 'P18-040', {
        path: { id: obligation.id },
        body: { rowVersion: obligation.rowVersion, reason: this.draft.reason.trim() },
        idempotencyKey: key,
      });
    } else if (mode === 'reverse') {
      const settlement = this.settlement();
      if (
        !settlement?.id ||
        !settlement.obligationRowVersion ||
        !this.allowed(settlement, '/reverse', 'FinancialExpenses.ReverseOwn') ||
        !this.draft.reason.trim()
      )
        return;
      command = this.api.call('P18-030', {
        path: { id: settlement.id },
        body: {
          businessDate: this.draft.businessDate,
          rowVersion: settlement.obligationRowVersion,
          reason: this.draft.reason.trim(),
        },
        idempotencyKey: key,
      });
    } else return;
    this.busy.set(true);
    this.messages.set([]);
    this.fields.set({});
    try {
      const result = await firstValueFrom(command);
      if (this.destroyed) return;
      if (!result.id || !result.resourceType) throw new Error('Invalid command response');
      this.intents.delete(signature);
      this.toast.success(this.language.t('doctorRemediation.saved'));
      this.mode.set('view');
      await this.load(this.page());
      if (result.settlementId) await this.openSettlement(result.settlementId);
      else if (obligation) await this.inspectObligation(obligation);
      else if (plan) await this.inspectPlan(plan);
      else {
        this.drawer.set(false);
        this.clearDetail();
      }
    } catch (error) {
      this.failure(error);
      if (parseApiErrors(error).status === 409) {
        const draft = { ...this.draft };
        if (obligation) await this.inspectObligation(obligation);
        else if (plan) await this.inspectPlan(plan);
        this.draft = draft;
        this.mode.set(mode);
        this.messages.set(['doctorRemediation.conflict']);
      }
    } finally {
      this.busy.set(false);
    }
  }
  async openSettlement(id: string): Promise<void> {
    const seq = this.beginDetail();
    try {
      const [detail, receipt, history] = await Promise.all([
        firstValueFrom(this.api.call('P18-027', { path: { id } })),
        firstValueFrom(this.api.call('P18-029', { path: { id } })),
        firstValueFrom(this.api.call('P18-028', { path: { id } })),
      ]);
      if (seq === this.detailSequence && !this.destroyed) {
        this.settlement.set(detail);
        this.receipt.set(receipt);
        this.history.set(history.items || []);
      }
    } catch (error) {
      if (seq === this.detailSequence) this.failure(error);
    } finally {
      if (seq === this.detailSequence) this.detailLoading.set(false);
    }
  }
  validMoney(): boolean {
    return /^\d+(\.\d{1,2})?$/.test(this.draft.amount) && Number(this.draft.amount) > 0;
  }
  close(): void {
    if (this.busy()) return;
    this.detailSequence++;
    this.drawer.set(false);
    this.clearDetail();
  }
  private clearDetail(): void {
    this.selectedPlan.set(null);
    this.selectedObligation.set(null);
    this.settlement.set(null);
    this.receipt.set(null);
    this.history.set([]);
    this.fields.set({});
    this.mode.set('view');
  }
  private failure(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      const header = error.headers.get('Retry-After');
      const wait =
        header && Number.isFinite(Number(header))
          ? Number(header) * 1000
          : header
            ? Math.max(0, Date.parse(header) - Date.now())
            : 30000;
      this.retryBlocked.set(true);
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(
        () => this.retryBlocked.set(false),
        Number.isFinite(wait) ? wait : 30000,
      );
    }
    const parsed = parseApiErrors(error);
    this.fields.set(parsed.fields);
    this.messages.set(
      parsed.status === 409
        ? ['doctorRemediation.conflict']
        : [...parsed.messages, ...Object.values(parsed.fields).flat()],
    );
    this.toast.error(this.language.t(this.messages()[0] || 'common.requestFailed'));
    if ([401, 403].includes(parsed.status)) {
      this.sequence++;
      this.detailSequence++;
      this.loading.set(false);
      this.detailLoading.set(false);
      this.plans.set([]);
      this.obligations.set([]);
      this.clearDetail();
      this.drawer.set(false);
      this.intents.clear();
    }
  }
  private emptyDraft() {
    return {
      amount: '',
      dueDay: 1,
      effectiveFrom: '',
      effectiveTo: '',
      businessDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(
        new Date(),
      ),
      category: 'Other' as Schema['ExpenseCategoryCode'],
      cadence: 'Monthly' as Schema['ExpenseCadence'],
      amountPolicy: 'Fixed' as Schema['ExpenseAmountPolicy'],
      paymentMethod: 'Cash' as Schema['OperatingPaymentMethod'],
      receptionId: '',
      practiceId: '',
      descriptionAr: '',
      descriptionEn: '',
      reason: '',
    };
  }
}
