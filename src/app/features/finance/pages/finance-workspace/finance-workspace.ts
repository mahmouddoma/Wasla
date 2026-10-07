import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import {
  AdminRevenueAggregates,
  CorrectionAudit,
  DoctorRevenueDashboard,
  FinanceApi,
  FinancialActor,
  FinancialTransactionItem,
  FinancialTransactionQuery,
  PageResult,
  PaymentDetail,
  PaymentMethod,
  PaymentReceipt,
  RefundPaymentResponse,
  RefundReasonCode,
  RefundReceipt,
} from '../../../../domains/finance';
import { PatientSearchItem, PatientsApi } from '../../../../domains/patients';
import { ReceptionPracticeContext } from '../../../../domains/reception-practices';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';

export type WorkspaceView = 'transactions' | 'revenue';
export type QuickPeriod = 'today' | 'month' | 'custom';
export type Receipt = PaymentReceipt | RefundReceipt;
export type DrawerMode = 'detail' | 'refund' | 'paymentCorrection' | 'refundCorrection';

@Component({
  selector: 'app-finance-workspace',
  imports: [FormField, TranslatePipe, PageHeader, SideDrawer, RouterLink],
  templateUrl: './finance-workspace.html',
  styleUrl: './finance-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceWorkspace implements OnInit {
  private readonly api = inject(FinanceApi);
  private readonly doctorPractices = inject(DoctorPracticesApi);
  private readonly reception = inject(ReceptionPracticeContext);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly patientsApi = inject(PatientsApi);
  protected readonly language = inject(LanguageService);

  private initialized = false;
  private scopeGeneration = 0;
  private listSequence = 0;
  private detailSequence = 0;
  private receiptSequence = 0;
  private readonly intents = new Map<string, string>();

  protected readonly actor = signal<FinancialActor>('Doctor');
  protected readonly view = signal<WorkspaceView>('transactions');
  protected readonly practices = signal<
    readonly { id: string; nameAr: string; nameEn: string | null }[]
  >([]);
  protected readonly practiceId = signal('');
  protected readonly page = signal<PageResult<FinancialTransactionItem>>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  protected readonly detail = signal<PaymentDetail | null>(null);
  protected readonly receipt = signal<Receipt | null>(null);
  protected readonly refundDone = signal<RefundPaymentResponse | null>(null);
  protected readonly dashboard = signal<DoctorRevenueDashboard | null>(null);
  protected readonly aggregates = signal<AdminRevenueAggregates | null>(null);

  protected readonly activePeriod = signal<QuickPeriod>('today');
  protected readonly showAdvancedFilters = signal(false);
  protected readonly drawerMode = signal<DrawerMode>('detail');
  protected readonly showMoreActions = signal(false);
  protected readonly conflictNotice = signal<string | null>(null);

  // Loading states
  protected readonly listLoading = signal(false);
  protected readonly listFailed = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly receiptLoading = signal(false);
  protected readonly busy = signal(false);
  protected readonly messages = signal<readonly string[]>([]);

  // Patient search state (conditional)
  protected readonly selectedPatient = signal<PatientSearchItem | null>(null);
  protected readonly patientSearchQuery = signal('');
  protected readonly patientSearchResults = signal<PatientSearchItem[]>([]);
  protected readonly patientSearching = signal(false);

  protected readonly filterModel = signal({
    fromDate: '',
    toDate: '',
    transactionType: '',
    transactionNumber: '',
    ticketNumber: '',
    patientId: '',
    method: '',
  });
  protected readonly filters = form(this.filterModel);

  protected readonly refundModel = signal({
    refundMethod: 'Cash' as PaymentMethod,
    refundReasonCode: 'PatientRequestedCancellation' as RefundReasonCode,
    reason: '',
    referenceNumber: '',
    notes: '',
  });
  protected readonly refundForm = form(this.refundModel, (path) => {
    required(path.refundMethod, { message: 'finance.validation.methodRequired' });
    required(path.refundReasonCode, { message: 'finance.validation.reasonCodeRequired' });
    required(path.reason, {
      when: ({ valueOf }) => valueOf(path.refundReasonCode) === 'Other',
      message: 'finance.validation.reasonRequired',
    });
  });

  protected readonly paymentCorrectionModel = signal({
    paymentMethod: 'Cash' as PaymentMethod,
    referenceNumber: '',
    notes: '',
    correctionReason: '',
  });
  protected readonly paymentCorrectionForm = form(this.paymentCorrectionModel, (path) =>
    required(path.correctionReason, { message: 'finance.validation.correctionReasonRequired' }),
  );

  protected readonly refundCorrectionModel = signal({
    refundMethod: 'Cash' as PaymentMethod,
    refundReasonCode: 'PatientRequestedCancellation' as RefundReasonCode,
    reason: '',
    referenceNumber: '',
    notes: '',
    correctionReason: '',
  });
  protected readonly refundCorrectionForm = form(this.refundCorrectionModel, (path) => {
    required(path.correctionReason, { message: 'finance.validation.correctionReasonRequired' });
    required(path.reason, {
      when: ({ valueOf }) => valueOf(path.refundReasonCode) === 'Other',
      message: 'finance.validation.reasonRequired',
    });
  });

  readonly canView = computed(() => {
    if (this.actor() === 'Reception') {
      const pid = this.practiceId();
      return (
        !!pid &&
        pid === this.reception.currentPracticeId() &&
        this.reception.allowsInPractice(pid, PERMISSIONS.practicePaymentsView)
      );
    }
    return true;
  });

  readonly canCorrect = computed(() => {
    if (this.actor() === 'Doctor') return true;
    if (this.actor() === 'Reception') {
      const pid = this.detail()?.practice.id ?? this.practiceId();
      return (
        this.canView() &&
        this.reception.allowsInPractice(pid, PERMISSIONS.practicePaymentsCorrect)
      );
    }
    return false;
  });

  readonly canRefund = computed(() => {
    const detail = this.detail();
    if (!detail?.canRefund) return false;
    if (this.actor() === 'Doctor') return true;
    if (this.actor() === 'Reception') {
      const pid = detail.practice.id ?? this.practiceId();
      return (
        this.canView() &&
        this.reception.allowsInPractice(pid, PERMISSIONS.practicePaymentsRefund)
      );
    }
    return false;
  });

  readonly canSearchPatient = computed(() => {
    return (
      this.actor() === 'Reception' &&
      this.session.hasPermission(PERMISSIONS.patientsSearchBasic) &&
      this.reception.allows(PERMISSIONS.patientsSearchBasic)
    );
  });

  protected readonly isStaff = computed(
    () => this.actor() === 'Doctor' || this.actor() === 'Reception',
  );
  protected readonly isDoctor = computed(() => this.actor() === 'Doctor');
  protected readonly isReception = computed(() => this.actor() === 'Reception');
  protected readonly isPatient = computed(() => this.actor() === 'Patient');
  protected readonly isAdmin = computed(() => this.actor() === 'Admin');

  protected readonly isDrawerOpen = computed(
    () =>
      !!this.detail() ||
      !!this.receipt() ||
      !!this.refundDone() ||
      this.detailLoading() ||
      this.receiptLoading(),
  );

  protected readonly hasActiveFilters = computed(() => {
    const f = this.filterModel();
    return Boolean(
      f.transactionType || f.method || f.transactionNumber || f.ticketNumber || f.patientId,
    );
  });

  protected readonly reasonCodes: readonly RefundReasonCode[] = [
    'PatientRequestedCancellation',
    'DoctorUnavailable',
    'DuplicatePayment',
    'WrongPaymentMethod',
    'OperationalError',
    'Other',
  ];

  constructor() {
    effect(() => {
      const id = this.reception.currentPracticeId();
      if (this.initialized && this.actor() === 'Reception' && id !== this.practiceId()) {
        untracked(() => {
          void this.onReceptionPracticeChanged(id);
        });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const initialActor = (this.route.snapshot.data['actor'] as FinancialActor | undefined) ?? 'Doctor';
    const initialView = (this.route.snapshot.data['view'] as WorkspaceView | undefined) ?? 'transactions';
    this.actor.set(initialActor);
    this.view.set(initialView);

    // Default period: Reception is daily-work focused (Today), Doctor/Admin/Patient month-to-date
    if (initialActor === 'Reception') {
      this.activePeriod.set('today');
      this.setPeriodDates('today');
    } else {
      this.activePeriod.set('month');
      this.setPeriodDates('month');
    }

    try {
      if (initialActor === 'Doctor') {
        const docPractices = (await firstValueFrom(this.doctorPractices.list())).filter(
          (item) => item.isActive,
        );
        this.practices.set(docPractices);
        const queryPid = this.route.snapshot.queryParamMap.get('practiceId');
        const selected = docPractices.some((p) => p.id === queryPid)
          ? queryPid!
          : docPractices[0]?.id || '';
        this.practiceId.set(selected);
      } else if (initialActor === 'Reception') {
        await this.reception.ensureLoaded();
        // NEVER auto-select another clinic for Reception. Use reception.currentPracticeId() only!
        this.practiceId.set(this.reception.currentPracticeId());
      }

      this.initialized = true;

      // Only load if valid
      if (this.actor() !== 'Reception' || (this.practiceId() && this.canView())) {
        await this.load(1);
      }

      const paymentId = this.route.snapshot.queryParamMap.get('paymentId');
      if (paymentId && this.practiceId() && this.isStaff()) {
        await this.openPayment(paymentId, this.practiceId());
      }
    } catch (error) {
      await this.handleFailure(error, this.scopeGeneration, this.practiceId());
    }
  }

  protected label(item: { nameAr?: string; nameEn?: string | null }): string {
    return this.language.currentLang() === 'en'
      ? item.nameEn || item.nameAr || ''
      : item.nameAr || item.nameEn || '';
  }

  protected setQuickPeriod(period: QuickPeriod): void {
    if (this.activePeriod() === period) return;
    this.activePeriod.set(period);
    this.setPeriodDates(period);
    void this.load(1);
  }

  private setPeriodDates(period: QuickPeriod): void {
    const today = new Date();
    if (period === 'today') {
      const todayStr = this.dateString(today);
      this.filterModel.update((f) => ({ ...f, fromDate: todayStr, toDate: todayStr }));
    } else if (period === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      this.filterModel.update((f) => ({
        ...f,
        fromDate: this.dateString(firstOfMonth),
        toDate: this.dateString(today),
      }));
    }
  }

  protected toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update((v) => !v);
  }

  // Doctor local clinic selector
  protected async selectDoctorPractice(event: Event): Promise<void> {
    const id = (event.target as HTMLSelectElement).value;
    if (id === this.practiceId()) return;
    this.scopeGeneration++;
    this.listSequence++;
    this.detailSequence++;
    this.receiptSequence++;
    this.intents.clear();
    this.practiceId.set(id);
    this.detail.set(null);
    this.receipt.set(null);
    this.refundDone.set(null);
    this.detailLoading.set(false);
    this.receiptLoading.set(false);
    this.drawerMode.set('detail');
    this.showMoreActions.set(false);
    this.conflictNotice.set(null);
    this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    await this.load(1);
  }

  // Reception practice switch
  private async onReceptionPracticeChanged(newPracticeId: string): Promise<void> {
    this.scopeGeneration++;
    this.listSequence++;
    this.detailSequence++;
    this.receiptSequence++;
    this.intents.clear();
    this.practiceId.set(newPracticeId);
    this.detail.set(null);
    this.receipt.set(null);
    this.refundDone.set(null);
    this.detailLoading.set(false);
    this.receiptLoading.set(false);
    this.drawerMode.set('detail');
    this.showMoreActions.set(false);
    this.selectedPatient.set(null);
    this.messages.set([]);
    this.listFailed.set(false);
    this.conflictNotice.set(null);
    this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });

    if (newPracticeId && this.canView()) {
      await this.load(1);
    } else {
      this.listLoading.set(false);
    }
  }

  protected loadFromSearch(): void {
    void this.load(1);
  }

  protected resetFilters(): void {
    if (this.actor() === 'Reception') {
      this.activePeriod.set('today');
      this.setPeriodDates('today');
    } else {
      this.activePeriod.set('month');
      this.setPeriodDates('month');
    }
    this.selectedPatient.set(null);
    this.filterModel.update((val) => ({
      ...val,
      transactionType: '',
      transactionNumber: '',
      ticketNumber: '',
      patientId: '',
      method: '',
    }));
    void this.load(1);
  }

  protected retryLoad(): void {
    void this.load(this.page().pageNumber);
  }

  protected async load(pageNumber = 1): Promise<void> {
    if (this.actor() === 'Reception' && (!this.practiceId() || !this.canView())) {
      this.listLoading.set(false);
      return;
    }

    const generation = this.scopeGeneration;
    const seq = ++this.listSequence;
    const expectedPracticeId = this.practiceId();

    this.listLoading.set(true);
    this.listFailed.set(false);
    this.messages.set([]);

    try {
      const filters = this.filterModel();

      if (this.view() === 'revenue') {
        if (this.isAdmin()) {
          const aggregates = await firstValueFrom(
            this.api.adminRevenue(filters.fromDate, filters.toDate),
          );
          if (generation === this.scopeGeneration && seq === this.listSequence) {
            this.aggregates.set(aggregates);
          }
        } else {
          const dashboard = await firstValueFrom(
            this.api.doctorRevenue(filters.fromDate, filters.toDate, expectedPracticeId),
          );
          if (
            generation === this.scopeGeneration &&
            seq === this.listSequence &&
            expectedPracticeId === this.practiceId()
          ) {
            this.dashboard.set(dashboard);
          }
        }
        return;
      }

      const query: FinancialTransactionQuery = {
        ...filters,
        transactionType: filters.transactionType as FinancialTransactionQuery['transactionType'],
        method: filters.method as FinancialTransactionQuery['method'],
        practiceId: this.actor() === 'Doctor' ? expectedPracticeId : undefined,
        pageNumber,
        pageSize: 20,
      };

      const request = this.isPatient()
        ? this.api.myTransactions(query)
        : this.actor() === 'Doctor'
          ? this.api.doctorTransactions(query)
          : this.api.practiceTransactions(expectedPracticeId, query);

      const page = await firstValueFrom(request);

      if (
        generation === this.scopeGeneration &&
        seq === this.listSequence &&
        (this.actor() !== 'Reception' || expectedPracticeId === this.practiceId())
      ) {
        this.page.set(page);
      }
    } catch (error) {
      if (
        generation === this.scopeGeneration &&
        seq === this.listSequence &&
        (this.actor() !== 'Reception' || expectedPracticeId === this.practiceId())
      ) {
        this.listFailed.set(true);
        await this.handleFailure(error, generation, expectedPracticeId);
      }
    } finally {
      if (generation === this.scopeGeneration && seq === this.listSequence) {
        this.listLoading.set(false);
      }
    }
  }

  protected async inspect(item: FinancialTransactionItem): Promise<void> {
    if (this.isPatient()) {
      await this.openReceipt(item);
      return;
    }
    const paymentId = item.transactionType === 'Payment' ? item.transactionId : item.paymentId;
    if (paymentId) {
      await this.openPayment(paymentId, item.doctorPracticeId);
    }
  }

  protected async openPayment(
    paymentId: string,
    practiceId = this.practiceId(),
    preserveDraft = false,
  ): Promise<void> {
    if (this.actor() === 'Reception' && (!this.canView() || practiceId !== this.practiceId())) {
      return;
    }

    const generation = this.scopeGeneration;
    const seq = ++this.detailSequence;
    this.detailLoading.set(true);

    try {
      const value = await firstValueFrom(this.api.paymentDetail(practiceId, paymentId));

      if (
        generation !== this.scopeGeneration ||
        seq !== this.detailSequence ||
        practiceId !== this.practiceId() ||
        !this.canView()
      ) {
        return;
      }

      this.detail.set(value);
      this.receipt.set(null);
      this.refundDone.set(null);

      if (!preserveDraft) {
        this.drawerMode.set('detail');
        this.showMoreActions.set(false);
        this.conflictNotice.set(null);
        this.paymentCorrectionModel.set({
          paymentMethod: value.payment.paymentMethod,
          referenceNumber: value.payment.referenceNumber || '',
          notes: value.payment.notes || '',
          correctionReason: '',
        });
        if (value.refund) {
          this.refundCorrectionModel.set({
            refundMethod: value.refund.refundMethod,
            refundReasonCode: value.refund.refundReasonCode,
            reason: value.refund.reason || '',
            referenceNumber: value.refund.referenceNumber || '',
            notes: value.refund.notes || '',
            correctionReason: '',
          });
        }
        this.refundModel.set({
          refundMethod: value.payment.paymentMethod,
          refundReasonCode: 'PatientRequestedCancellation',
          reason: '',
          referenceNumber: '',
          notes: '',
        });
      }
    } catch (error) {
      if (
        generation === this.scopeGeneration &&
        seq === this.detailSequence &&
        practiceId === this.practiceId()
      ) {
        await this.handleFailure(error, generation, practiceId);
      }
    } finally {
      if (generation === this.scopeGeneration && seq === this.detailSequence) {
        this.detailLoading.set(false);
      }
    }
  }

  protected async openReceipt(item: FinancialTransactionItem): Promise<void> {
    if (
      this.actor() === 'Reception' &&
      (!this.canView() || item.doctorPracticeId !== this.practiceId())
    ) {
      return;
    }

    const generation = this.scopeGeneration;
    const seq = ++this.receiptSequence;
    this.receiptLoading.set(true);

    try {
      let receiptData: Receipt;
      if (item.transactionType === 'Payment') {
        receiptData = await firstValueFrom(
          this.isPatient()
            ? this.api.myPaymentReceipt(item.transactionId)
            : this.api.practicePaymentReceipt(item.doctorPracticeId, item.transactionId),
        );
      } else {
        receiptData = await firstValueFrom(
          this.isPatient()
            ? this.api.myRefundReceipt(item.transactionId)
            : this.api.practiceRefundReceipt(item.doctorPracticeId, item.transactionId),
        );
      }

      if (
        generation !== this.scopeGeneration ||
        seq !== this.receiptSequence ||
        (this.actor() === 'Reception' && item.doctorPracticeId !== this.practiceId())
      ) {
        return;
      }

      this.receipt.set(receiptData);
      this.detail.set(null);
      this.refundDone.set(null);
    } catch (error) {
      if (generation === this.scopeGeneration && seq === this.receiptSequence) {
        await this.handleFailure(error, generation, item.doctorPracticeId);
      }
    } finally {
      if (generation === this.scopeGeneration && seq === this.receiptSequence) {
        this.receiptLoading.set(false);
      }
    }
  }

  protected async openDetailReceipt(kind: 'Payment' | 'Refund'): Promise<void> {
    const value = this.detail();
    if (!value || !this.canView()) return;

    const generation = this.scopeGeneration;
    const seq = ++this.receiptSequence;
    this.receiptLoading.set(true);

    try {
      let receiptData: Receipt;
      if (kind === 'Payment') {
        receiptData = await firstValueFrom(
          this.api.practicePaymentReceipt(value.practice.id, value.payment.id),
        );
      } else if (value.refund) {
        receiptData = await firstValueFrom(
          this.api.practiceRefundReceipt(value.practice.id, value.refund.id),
        );
      } else {
        return;
      }

      if (
        generation !== this.scopeGeneration ||
        seq !== this.receiptSequence ||
        value.practice.id !== this.practiceId()
      ) {
        return;
      }

      this.receipt.set(receiptData);
    } catch (error) {
      if (generation === this.scopeGeneration && seq === this.receiptSequence) {
        await this.handleFailure(error, generation, value.practice.id);
      }
    } finally {
      if (generation === this.scopeGeneration && seq === this.receiptSequence) {
        this.receiptLoading.set(false);
      }
    }
  }

  protected async openRefundDoneReceipt(): Promise<void> {
    const done = this.refundDone();
    if (!done) return;
    const practiceId = this.practiceId();
    const generation = this.scopeGeneration;
    const seq = ++this.receiptSequence;
    this.receiptLoading.set(true);
    try {
      const receiptData = await firstValueFrom(
        this.api.practiceRefundReceipt(practiceId, done.refundId),
      );
      if (generation !== this.scopeGeneration || seq !== this.receiptSequence) return;
      this.receipt.set(receiptData);
      this.refundDone.set(null);
    } catch (error) {
      if (generation === this.scopeGeneration && seq === this.receiptSequence) {
        await this.handleFailure(error, generation, practiceId);
      }
    } finally {
      if (generation === this.scopeGeneration && seq === this.receiptSequence) {
        this.receiptLoading.set(false);
      }
    }
  }

  protected closeReceipt(): void {
    this.receipt.set(null);
    if (!this.detail() && !this.refundDone()) {
      this.closeDrawer();
    }
  }

  protected startRefund(): void {
    this.drawerMode.set('refund');
  }

  protected startPaymentCorrection(): void {
    this.drawerMode.set('paymentCorrection');
    this.showMoreActions.set(false);
  }

  protected startRefundCorrection(): void {
    this.drawerMode.set('refundCorrection');
    this.showMoreActions.set(false);
  }

  protected cancelDrawerAction(): void {
    this.drawerMode.set('detail');
    this.conflictNotice.set(null);
  }

  protected toggleMoreActions(): void {
    this.showMoreActions.update((v) => !v);
  }

  protected refund(): void {
    submit(this.refundForm, async () => {
      const detail = this.detail();
      if (!detail || !this.canRefund() || this.busy()) return;

      const value = this.refundModel();
      const payload = {
        refundMethod: value.refundMethod,
        refundReasonCode: value.refundReasonCode,
        reason: value.refundReasonCode === 'Other' ? value.reason.trim() || null : null,
        referenceNumber: value.referenceNumber.trim() || null,
        notes: value.notes.trim() || null,
      };

      const normalizedPayload = JSON.stringify(payload);
      const key = this.getIntentKey(
        'refund',
        detail.practice.id,
        detail.payment.id,
        detail.payment.rowVersion,
        normalizedPayload,
      );

      this.busy.set(true);
      const generation = this.scopeGeneration;
      const expectedPracticeId = detail.practice.id;
      const expectedPaymentId = detail.payment.id;

      try {
        const response = await firstValueFrom(
          this.api.refundPayment(detail.practice.id, detail.payment.id, payload, key),
        );
        this.clearIntent(
          'refund',
          detail.practice.id,
          detail.payment.id,
          detail.payment.rowVersion,
          normalizedPayload,
        );
        this.toast.success('finance.refund.success');

        if (
          generation === this.scopeGeneration &&
          (this.actor() !== 'Reception' || expectedPracticeId === this.practiceId())
        ) {
          this.refundDone.set(response);
          this.detail.set(null);
          this.receipt.set(null);
          this.drawerMode.set('detail');
          await this.load(this.page().pageNumber);
        }
      } catch (error) {
        if (
          generation !== this.scopeGeneration ||
          (this.actor() === 'Reception' && expectedPracticeId !== this.practiceId())
        ) {
          return;
        }

        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.toast.error('finance.refund.conflict');
          await this.openPayment(expectedPaymentId, expectedPracticeId);
          return;
        }

        await this.handleFailure(error, generation, expectedPracticeId);
      } finally {
        this.busy.set(false);
      }
    });
  }

  protected correctPayment(): void {
    submit(this.paymentCorrectionForm, async () => {
      const detail = this.detail();
      if (!detail || detail.isRefunded || !this.canCorrect() || this.busy()) return;

      const value = this.paymentCorrectionModel();
      const payload = {
        paymentMethod: value.paymentMethod,
        referenceNumber: value.referenceNumber.trim() || null,
        notes: value.notes.trim() || null,
        correctionReason: value.correctionReason.trim(),
        rowVersion: detail.payment.rowVersion,
      };

      const normalizedPayload = JSON.stringify({
        method: payload.paymentMethod,
        ref: payload.referenceNumber,
        notes: payload.notes,
        reason: payload.correctionReason,
      });

      const key = this.getIntentKey(
        'correctPayment',
        detail.practice.id,
        detail.payment.id,
        detail.payment.rowVersion,
        normalizedPayload,
      );

      this.busy.set(true);
      const generation = this.scopeGeneration;
      const expectedPracticeId = detail.practice.id;
      const expectedPaymentId = detail.payment.id;

      try {
        await firstValueFrom(
          this.api.correctPayment(detail.practice.id, detail.payment.id, payload, key),
        );
        this.clearIntent(
          'correctPayment',
          detail.practice.id,
          detail.payment.id,
          detail.payment.rowVersion,
          normalizedPayload,
        );
        this.toast.success('finance.correction.success');

        if (
          generation === this.scopeGeneration &&
          (this.actor() !== 'Reception' || expectedPracticeId === this.practiceId())
        ) {
          this.conflictNotice.set(null);
          this.drawerMode.set('detail');
          this.showMoreActions.set(false);
          await this.openPayment(expectedPaymentId, expectedPracticeId);
          await this.load(this.page().pageNumber);
        }
      } catch (error) {
        if (
          generation !== this.scopeGeneration ||
          (this.actor() === 'Reception' && expectedPracticeId !== this.practiceId())
        ) {
          return;
        }

        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.conflictNotice.set('finance.correction.conflict');
          this.toast.error('finance.correction.conflict');
          await this.openPayment(expectedPaymentId, expectedPracticeId, /* preserveDraft */ true);
          return;
        }

        await this.handleFailure(error, generation, expectedPracticeId);
      } finally {
        this.busy.set(false);
      }
    });
  }

  protected correctRefund(): void {
    submit(this.refundCorrectionForm, async () => {
      const detail = this.detail();
      if (!detail?.refund || !this.canCorrect() || this.busy()) return;

      const value = this.refundCorrectionModel();
      const payload = {
        refundMethod: value.refundMethod,
        refundReasonCode: value.refundReasonCode,
        reason: value.refundReasonCode === 'Other' ? value.reason.trim() || null : null,
        referenceNumber: value.referenceNumber.trim() || null,
        notes: value.notes.trim() || null,
        correctionReason: value.correctionReason.trim(),
        rowVersion: detail.refund.rowVersion,
      };

      const normalizedPayload = JSON.stringify({
        method: payload.refundMethod,
        code: payload.refundReasonCode,
        reason: payload.reason,
        ref: payload.referenceNumber,
        notes: payload.notes,
        corrReason: payload.correctionReason,
      });

      const key = this.getIntentKey(
        'correctRefund',
        detail.practice.id,
        detail.refund.id,
        detail.refund.rowVersion,
        normalizedPayload,
      );

      this.busy.set(true);
      const generation = this.scopeGeneration;
      const expectedPracticeId = detail.practice.id;
      const expectedPaymentId = detail.payment.id;

      try {
        await firstValueFrom(
          this.api.correctRefund(detail.practice.id, detail.refund.id, payload, key),
        );
        this.clearIntent(
          'correctRefund',
          detail.practice.id,
          detail.refund.id,
          detail.refund.rowVersion,
          normalizedPayload,
        );
        this.toast.success('finance.correction.success');

        if (
          generation === this.scopeGeneration &&
          (this.actor() !== 'Reception' || expectedPracticeId === this.practiceId())
        ) {
          this.conflictNotice.set(null);
          this.drawerMode.set('detail');
          this.showMoreActions.set(false);
          await this.openPayment(expectedPaymentId, expectedPracticeId);
          await this.load(this.page().pageNumber);
        }
      } catch (error) {
        if (
          generation !== this.scopeGeneration ||
          (this.actor() === 'Reception' && expectedPracticeId !== this.practiceId())
        ) {
          return;
        }

        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.conflictNotice.set('finance.correction.conflict');
          this.toast.error('finance.correction.conflict');
          await this.openPayment(expectedPaymentId, expectedPracticeId, /* preserveDraft */ true);
          return;
        }

        await this.handleFailure(error, generation, expectedPracticeId);
      } finally {
        this.busy.set(false);
      }
    });
  }

  protected closeDrawer(): void {
    if (this.busy()) return;
    this.detail.set(null);
    this.receipt.set(null);
    this.refundDone.set(null);
    this.drawerMode.set('detail');
    this.showMoreActions.set(false);
    this.conflictNotice.set(null);
  }

  protected print(): void {
    window.print();
  }

  protected onPatientQueryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.patientSearchQuery.set(input.value);
  }

  // Optional Patient Search Methods
  protected async searchPatients(): Promise<void> {
    const q = this.patientSearchQuery().trim();
    if (!q || !this.canSearchPatient()) return;
    this.patientSearching.set(true);
    try {
      const res = await firstValueFrom(
        this.patientsApi.search({
          name: q,
          doctorPracticeId: this.practiceId(),
          pageNumber: 1,
          pageSize: 5,
        }),
      );
      this.patientSearchResults.set(res.items);
    } catch {
      this.patientSearchResults.set([]);
    } finally {
      this.patientSearching.set(false);
    }
  }

  protected selectPatient(pat: PatientSearchItem): void {
    this.selectedPatient.set(pat);
    this.filterModel.update((f) => ({ ...f, patientId: pat.patientId }));
    this.patientSearchResults.set([]);
    this.patientSearchQuery.set('');
    void this.load(1);
  }

  protected clearSelectedPatient(): void {
    this.selectedPatient.set(null);
    this.filterModel.update((f) => ({ ...f, patientId: '' }));
    void this.load(1);
  }

  // Formatting helpers
  protected receiptNumber(receipt: Receipt): string {
    return 'paymentTransactionNumber' in receipt
      ? receipt.paymentTransactionNumber
      : receipt.refundTransactionNumber;
  }

  protected receiptMethod(receipt: Receipt): string {
    return 'paymentMethod' in receipt ? receipt.paymentMethod : receipt.refundMethod;
  }

  protected formatAuditEntries(entries: readonly CorrectionAudit[]) {
    return entries.map((entry) => {
      const diffs: { labelKey: string; oldVal: string; newVal: string }[] = [];
      if (entry.oldValues && entry.newValues) {
        const fields = [
          'paymentMethod',
          'refundMethod',
          'referenceNumber',
          'notes',
          'refundReasonCode',
          'reason',
        ];
        for (const field of fields) {
          const oldV = entry.oldValues[field];
          const newV = entry.newValues[field];
          if (oldV !== undefined || newV !== undefined) {
            diffs.push({
              labelKey: `finance.audit.field.${field}`,
              oldVal: this.formatAuditValue(field, oldV),
              newVal: this.formatAuditValue(field, newV),
            });
          }
        }
      }
      return {
        ...entry,
        diffs,
      };
    });
  }

  private formatAuditValue(field: string, val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    if (field === 'paymentMethod' || field === 'refundMethod') {
      return this.language.t(`finance.method.${val}`);
    }
    if (field === 'refundReasonCode') {
      return this.language.t(`finance.reason.${val}`);
    }
    return String(val);
  }

  private getIntentKey(
    operation: 'refund' | 'correctPayment' | 'correctRefund',
    practiceId: string,
    targetId: string,
    rowVersion: string,
    normalizedPayload: string,
  ): string {
    const signature = `${operation}:${practiceId}:${targetId}:${rowVersion}:${normalizedPayload}`;
    let key = this.intents.get(signature);
    if (!key) {
      key = createIdempotencyKey();
      this.intents.set(signature, key);
    }
    return key;
  }

  private clearIntent(
    operation: 'refund' | 'correctPayment' | 'correctRefund',
    practiceId: string,
    targetId: string,
    rowVersion: string,
    normalizedPayload: string,
  ): void {
    const signature = `${operation}:${practiceId}:${targetId}:${rowVersion}:${normalizedPayload}`;
    this.intents.delete(signature);
  }

  private dateString(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private async handleFailure(
    error: unknown,
    generation: number,
    practiceId: string,
  ): Promise<void> {
    if (
      generation !== this.scopeGeneration ||
      (this.actor() === 'Reception' && practiceId !== this.practiceId())
    ) {
      return; // Stale error discarded
    }

    if (
      error instanceof HttpErrorResponse &&
      error.status === 403 &&
      this.actor() === 'Reception'
    ) {
      await this.reception.refresh();
      if (generation !== this.scopeGeneration || practiceId !== this.practiceId()) {
        return;
      }
      this.detail.set(null);
      this.receipt.set(null);
      this.refundDone.set(null);
      this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
      this.messages.set(['reception.accessChanged']);
      this.toast.error('reception.accessChanged');
      return;
    }

    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    const msg = messages.length ? messages[0] : 'finance.loadFailed';
    this.messages.set(messages.length ? messages : ['finance.loadFailed']);
    this.toast.error(msg);
  }
}
