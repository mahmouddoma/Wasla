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
import {
  AllocationEditorComponent,
  AllocationDraft,
} from '../../components/allocation-editor/allocation-editor.component';

type Schema = components['schemas'];
type Plan = Schema['OperatingPlanResponse'];
type Obligation = Schema['OperatingObligationResponse'];
type Command = Schema['OperatingFinanceWriteResponse'];
type Tab = 'expenses' | 'plans' | 'obligations' | 'overview' | 'transactions';
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
  imports: [FormsModule, TranslatePipe, PageHeader, SideDrawer, AllocationEditorComponent],
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
  readonly overview = signal<Schema['ReportModel'] | null>(null);
  readonly movements = signal<Schema['OperatingMovementResponse'][]>([]);
  readonly selectedPlan = signal<Plan | null>(null);
  readonly selectedObligation = signal<Obligation | null>(null);
  readonly settlement = signal<Schema['OperatingSettlementResponse'] | null>(null);
  readonly receipt = signal<Phase18Responses['P18-029'] | null>(null);
  readonly history = signal<Schema['OperatingHistoryResponse'][]>([]);
  readonly historyPage = signal(1);
  readonly historyTotal = signal(0);
  readonly historyLoading = signal(false);
  readonly options = signal<Schema['OperatingFinanceOptions'] | null>(null);
  readonly optionsFailed = signal(false);
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
    void this.loadOptions();
  }
  async loadOptions(): Promise<void> {
    this.optionsFailed.set(false);
    try {
      const value = await firstValueFrom(this.api.call('P18-045', {}));
      if (!this.destroyed) this.options.set(value);
    } catch (error) {
      if (!this.destroyed) {
        this.optionsFailed.set(true);
        this.failure(error);
      }
    }
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
  practiceName(id: string | null | undefined): string {
    const practice = this.options()?.practices?.find((item) => item.id === id);
    return this.text(practice?.nameAr, practice?.nameEn);
  }
  dueStateLabel(state: string | null | undefined): string {
    return state && ['Upcoming', 'Due', 'Overdue'].includes(state)
      ? this.language.t('operating.due.' + state)
      : this.language.t('doctorRemediation.unavailable');
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
    this.overview.set(null);
    this.movements.set([]);
    const query = { ...this.filters, pageNumber: page, pageSize: 20 };
    try {
      if (this.tab() === 'overview' || this.tab() === 'transactions') {
        if (this.salary() || !this.can('FinancialExpenses.ViewOwn')) return;
        if (this.tab() === 'overview') {
          const report = await firstValueFrom(this.api.call('P18-036', { query }));
          if (seq === this.sequence && !this.destroyed) this.overview.set(report);
        } else {
          const page = await firstValueFrom(this.api.call('P18-044', { query }));
          if (seq === this.sequence && !this.destroyed) {
            this.movements.set(this.validate(page.items));
            this.total.set(page.totalCount ?? 0);
          }
        }
      } else if (this.tab() === 'plans') {
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
  money(value: number | null | undefined, currency = 'EGP'): string {
    return value == null
      ? this.language.t('doctorRemediation.unavailable')
      : new Intl.NumberFormat(this.language.isRtl() ? 'ar-EG' : 'en-GB', {
          style: 'currency',
          currency,
        }).format(value);
  }
  movementLabel(type: string | null | undefined): string {
    return type === 'Settlement' || type === 'Reversal'
      ? this.language.t('operating.movement.' + type)
      : this.language.t('doctorRemediation.unavailable');
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
        this.historyTotal.set(history.totalCount ?? history.items?.length ?? 0);
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
        this.historyTotal.set(history.totalCount ?? history.items?.length ?? 0);
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
      (!this.salary() || operation === 'end') &&
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
    if (!obligation?.rowVersion || (this.salary() && operation === 'confirm-actual')) return false;
    return this.allowed(
      obligation,
      '/' + operation,
      this.salary()
        ? operation === 'settle'
          ? 'SalarySettlements.RecordOwn'
          : 'SalaryPlans.ManageOwn'
        : operation === 'settle'
          ? 'FinancialExpenses.SettleOwn'
          : 'FinancialExpenses.ManageOwn',
    );
  }
  openCreate(kind: 'createPlan' | 'createExpense'): void {
    if (!this.canManage()) return;
    this.clearDetail();
    this.draft = this.emptyDraft();
    const practices = this.options()?.practices ?? [];
    if (practices.length === 1 && practices[0].id)
      this.draft.allocations = [{ practiceId: practices[0].id, percentage: 100 }];
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
      allocations: (revision.allocations ?? []).map((item) => ({
        practiceId: item.practiceId ?? '',
        percentage: item.percentage ?? 0,
      })),
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
            allocations: (obligation?.allocations ?? []).map((item) => ({
              practiceId: item.practiceId ?? '',
              percentage: item.percentage ?? 0,
            })),
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
      settlement: this.settlement()?.id,
      draft: this.draft,
    });
    let key = this.intents.get(signature);
    if (!key) {
      key = createIdempotencyKey();
      this.intents.set(signature, key);
    }
    const path = { id: plan?.id || obligation?.id || '' };
    let command: Observable<Command>;
    const allocations = this.draft.allocations;
    if (
      ['createPlan', 'editPlan', 'createExpense', 'correctObligation'].includes(mode) &&
      (!this.validAllocations() || !this.draft.descriptionAr.trim())
    ) {
      this.messages.set(['operating.invalidAllocationOrDescription']);
      return;
    }
    if (mode === 'createPlan' || mode === 'editPlan') {
      if (
        !this.canManage() ||
        !this.validMoney() ||
        !this.draft.effectiveFrom ||
        !Number.isInteger(this.draft.dueDay) ||
        this.draft.dueDay < 1 ||
        this.draft.dueDay > 31 ||
        (!!this.draft.effectiveTo && this.draft.effectiveTo < this.draft.effectiveFrom) ||
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
        cadence: this.salary() ? 'Monthly' : this.draft.cadence,
        amountPolicy: this.salary() ? 'Fixed' : this.draft.amountPolicy,
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
        !this.draft.businessDate ||
        !this.draft.dueBusinessDate
      )
        return;
      if (
        this.draft.paidNow &&
        (!this.can('FinancialExpenses.SettleOwn') || !this.validPayment(this.draft.paymentDate))
      )
        return;
      command = this.api.call('P18-032', {
        body: {
          amount,
          category: this.draft.category,
          businessDate: this.draft.businessDate,
          dueBusinessDate: this.draft.dueBusinessDate,
          descriptionAr: this.draft.descriptionAr,
          descriptionEn: this.draft.descriptionEn,
          allocations,
          paidNow: this.draft.paidNow,
          payment: this.draft.paidNow
            ? this.paymentBody(amount, null, this.draft.paymentDate)
            : undefined,
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
        !this.validPayment(this.draft.businessDate) ||
        (obligation.amountPolicy === 'Variable' && obligation.actualAmountConfirmed !== true)
      )
        return;
      command = this.api.call(this.salary() ? 'P18-086' : 'P18-043', {
        path: { id: obligation.id },
        body: this.paymentBody(amount, obligation.rowVersion, this.draft.businessDate),
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
        !this.allowed(
          settlement,
          '/reverse',
          this.salary() ? 'SalarySettlements.ReverseOwn' : 'FinancialExpenses.ReverseOwn',
        ) ||
        !this.draft.businessDate ||
        this.draft.businessDate > this.today() ||
        !this.draft.reason.trim()
      )
        return;
      command = this.api.call(this.salary() ? 'P18-090' : 'P18-030', {
        path: { id: settlement.id },
        body: {
          businessDate: this.draft.businessDate,
          rowVersion: settlement.obligationRowVersion,
          reason: this.draft.reason.trim(),
          reportTimeZoneId: this.options()?.defaultReportTimeZoneId,
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
      else if (mode === 'createPlan') await this.inspectPlan({ id: result.id });
      else if (mode === 'createExpense')
        await this.inspectObligation({ id: result.obligationId || result.id });
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
        firstValueFrom(this.api.call(this.salary() ? 'P18-087' : 'P18-027', { path: { id } })),
        firstValueFrom(this.api.call(this.salary() ? 'P18-089' : 'P18-029', { path: { id } })),
        firstValueFrom(this.api.call(this.salary() ? 'P18-088' : 'P18-028', { path: { id } })),
      ]);
      if (seq === this.detailSequence && !this.destroyed) {
        this.settlement.set(detail);
        this.receipt.set(receipt);
        this.history.set(history.items || []);
        this.historyTotal.set(history.totalCount ?? history.items?.length ?? 0);
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
  async loadHistoryPage(page: number): Promise<void> {
    if (this.historyLoading() || page < 1 || page > Math.ceil(this.historyTotal() / 20)) return;
    const plan = this.selectedPlan(),
      obligation = this.selectedObligation(),
      settlement = this.settlement();
    const id = plan?.id || obligation?.id || settlement?.id;
    if (!id) return;
    const sequence = this.detailSequence;
    this.historyLoading.set(true);
    try {
      const endpoint = plan
        ? this.salary()
          ? 'P18-063'
          : 'P18-069'
        : obligation
          ? this.salary()
            ? 'P18-085'
            : 'P18-042'
          : this.salary()
            ? 'P18-088'
            : 'P18-028';
      const result = await firstValueFrom(
        this.api.call(endpoint, { path: { id }, query: { pageNumber: page, pageSize: 20 } }),
      );
      if (sequence === this.detailSequence && !this.destroyed) {
        this.history.set(result.items ?? []);
        this.historyPage.set(page);
        this.historyTotal.set(result.totalCount ?? 0);
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.historyLoading.set(false);
    }
  }
  validAllocations(): boolean {
    const rows = this.draft.allocations;
    return (
      rows.length > 0 &&
      new Set(rows.map((row) => row.practiceId)).size === rows.length &&
      rows.every(
        (row) =>
          this.options()?.practices?.some((practice) => practice.id === row.practiceId) &&
          Number.isFinite(row.percentage) &&
          row.percentage > 0 &&
          row.percentage <= 100 &&
          /^\d+(\.\d{1,2})?$/.test(String(row.percentage)),
      ) &&
      rows.reduce((sum, row) => sum + Math.round(row.percentage * 100), 0) === 10000
    );
  }
  setAllocations(rows: AllocationDraft[]): void {
    this.draft.allocations = rows;
  }
  today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.options()?.defaultReportTimeZoneId || 'Africa/Cairo',
    }).format(new Date());
  }
  private validPayment(date: string): boolean {
    if (
      !date ||
      date > this.today() ||
      !this.draft.paymentConfirmed ||
      !this.options()?.paymentMethods?.some((method) => method.code === this.draft.paymentMethod) ||
      (date < this.today() && !this.draft.backdateReason.trim())
    ) {
      this.messages.set(['operating.invalidPayment']);
      return false;
    }
    return true;
  }
  private paymentBody(
    amount: number,
    rowVersion: string | null | undefined,
    date: string,
  ): Schema['OperatingSettlementRequest'] {
    return {
      amount,
      rowVersion,
      paidBusinessDate: date,
      paymentMethod: this.draft.paymentMethod,
      reference: this.draft.reference.trim() || null,
      backdateReason: this.draft.backdateReason.trim() || null,
      reportTimeZoneId: this.options()?.defaultReportTimeZoneId,
    };
  }
  close(): void {
    if (this.busy()) return;
    this.detailSequence++;
    this.drawer.set(false);
    this.clearDetail();
    this.draft = this.emptyDraft();
  }
  private clearDetail(): void {
    this.selectedPlan.set(null);
    this.selectedObligation.set(null);
    this.settlement.set(null);
    this.receipt.set(null);
    this.history.set([]);
    this.historyPage.set(1);
    this.historyTotal.set(0);
    this.historyLoading.set(false);
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
      this.draft = this.emptyDraft();
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
      allocations: [] as AllocationDraft[],
      dueBusinessDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(
        new Date(),
      ),
      paymentDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(
        new Date(),
      ),
      paidNow: false,
      paymentConfirmed: false,
      reference: '',
      backdateReason: '',
      descriptionAr: '',
      descriptionEn: '',
      reason: '',
    };
  }
}
