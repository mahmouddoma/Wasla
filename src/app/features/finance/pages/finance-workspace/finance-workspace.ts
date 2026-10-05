import { HttpErrorResponse } from '@angular/common/http';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterRenderEffect,
  computed,
  effect,
  untracked,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import {
  AdminRevenueAggregates,
  DoctorRevenueDashboard,
  FinanceApi,
  FinancialActor,
  FinancialTransactionItem,
  FinancialTransactionQuery,
  PageResult,
  PaymentDetail,
  PaymentReceipt,
  PaymentMethod,
  RefundReasonCode,
  RefundReceipt,
} from '../../../../domains/finance';
import { ReceptionPracticeContext } from '../../../../domains/reception-practices';

type WorkspaceView = 'transactions' | 'revenue';
type Receipt = PaymentReceipt | RefundReceipt;

import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-finance-workspace',
  imports: [FormField, TranslatePipe, PageHeader],
  templateUrl: './finance-workspace.html',
  styleUrl: './finance-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceWorkspace implements OnInit {
  private readonly api = inject(FinanceApi);
  private readonly doctorPractices = inject(DoctorPracticesApi);
  private readonly reception = inject(ReceptionPracticeContext);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly language = inject(LanguageService);
  private initialized = false;
  private sequence = 0;
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');

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
  protected readonly dashboard = signal<DoctorRevenueDashboard | null>(null);
  protected readonly aggregates = signal<AdminRevenueAggregates | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly messages = signal<readonly string[]>([]);

  protected readonly filterModel = signal({
    fromDate: '',
    toDate: '',
    transactionType: '',
    transactionNumber: '',
    ticketNumber: '',
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

  readonly canView = computed(
    () =>
      this.actor() !== 'Reception' ||
      (!!this.practiceId() &&
        this.reception.currentPracticeId() === this.practiceId() &&
        this.reception.allowsInPractice(this.practiceId(), PERMISSIONS.practicePaymentsView)),
  );
  readonly canCorrect = computed(
    () =>
      this.actor() === 'Doctor' ||
      (this.actor() === 'Reception' &&
        this.canView() &&
        this.reception.allowsInPractice(
          this.detail()?.practice.id ?? this.practiceId(),
          PERMISSIONS.practicePaymentsCorrect,
        )),
  );
  readonly canRefund = computed(
    () =>
      !!this.detail()?.canRefund &&
      (this.actor() === 'Doctor' ||
        (this.actor() === 'Reception' &&
          this.canView() &&
          this.reception.allowsInPractice(
            this.detail()?.practice.id ?? this.practiceId(),
            PERMISSIONS.practicePaymentsRefund,
          ))),
  );

  protected readonly isStaff = computed(
    () => this.actor() === 'Doctor' || this.actor() === 'Reception',
  );
  protected readonly isPatient = computed(() => this.actor() === 'Patient');
  protected readonly isAdmin = computed(() => this.actor() === 'Admin');
  protected readonly canSwitchView = computed(
    () => this.actor() === 'Doctor' || this.actor() === 'Admin',
  );
  protected readonly hasActiveFilters = computed(() => {
    const f = this.filterModel();
    return Boolean(f.transactionType || f.method || f.transactionNumber || f.ticketNumber);
  });

  constructor() {
    effect(() => {
      const id = this.reception.currentPracticeId();
      if (this.initialized && this.actor() === 'Reception' && id !== this.practiceId()) {
        untracked(() => {
          void this.changePractice(id);
        });
      }
    });
    afterRenderEffect(() => {
      const dialog = this.drawer()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  async ngOnInit(): Promise<void> {
    this.actor.set((this.route.snapshot.data['actor'] as FinancialActor | undefined) ?? 'Doctor');
    this.view.set(
      (this.route.snapshot.data['view'] as WorkspaceView | undefined) ?? 'transactions',
    );
    this.setDefaultDates();
    try {
      if (this.actor() === 'Doctor') {
        this.practices.set(
          (await firstValueFrom(this.doctorPractices.list())).filter((item) => item.isActive),
        );
      } else if (this.actor() === 'Reception') {
        await this.reception.ensureLoaded();
        this.practices.set(
          this.reception.practicesWithPermission(PERMISSIONS.practicePaymentsView),
        );
      }
      const requested =
        this.route.snapshot.queryParamMap.get('practiceId') ||
        (this.actor() === 'Reception' ? this.reception.currentPracticeId() : '');
      this.practiceId.set(
        this.practices().some((item) => item.id === requested)
          ? requested
          : this.practices()[0]?.id || '',
      );
      if (this.actor() === 'Reception') this.reception.select(this.practiceId());
      this.initialized = true;
      await this.load();
      const paymentId = this.route.snapshot.queryParamMap.get('paymentId');
      if (paymentId && this.practiceId() && this.isStaff())
        await this.openPayment(paymentId, this.practiceId());
    } catch (error) {
      await this.failure(error);
    }
  }

  protected label(item: { nameAr?: string; nameEn?: string | null }): string {
    return this.language.currentLang() === 'en'
      ? item.nameEn || item.nameAr || ''
      : item.nameAr || item.nameEn || '';
  }

  protected async selectPractice(event: Event): Promise<void> {
    await this.changePractice((event.target as HTMLSelectElement).value);
  }

  private async changePractice(id: string): Promise<void> {
    this.sequence++;
    this.practices.set(
      this.actor() === 'Reception'
        ? this.reception.practicesWithPermission(PERMISSIONS.practicePaymentsView)
        : this.practices(),
    );
    this.practiceId.set(id);
    this.detail.set(null);
    this.receipt.set(null);
    this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    if (this.actor() === 'Reception') this.reception.select(id);
    await this.load();
  }

  protected switchView(target: WorkspaceView): void {
    if (this.view() === target) return;
    this.view.set(target);
    void this.load(1);
  }

  protected loadFromForm(): void {
    void this.load(1);
  }

  protected resetFilters(): void {
    this.setDefaultDates();
    this.filterModel.update((val) => ({
      ...val,
      transactionType: '',
      transactionNumber: '',
      ticketNumber: '',
      method: '',
    }));
    void this.load(1);
  }

  protected async load(pageNumber = 1): Promise<void> {
    if (!this.canView()) {
      this.loading.set(false);
      return;
    }
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.messages.set([]);
    try {
      const filters = this.filterModel();
      if (this.view() === 'revenue') {
        if (this.isAdmin()) {
          this.aggregates.set(
            await firstValueFrom(this.api.adminRevenue(filters.fromDate, filters.toDate)),
          );
        } else {
          this.dashboard.set(
            await firstValueFrom(
              this.api.doctorRevenue(filters.fromDate, filters.toDate, this.practiceId()),
            ),
          );
        }
        return;
      }
      const query: FinancialTransactionQuery = {
        ...filters,
        transactionType: filters.transactionType as FinancialTransactionQuery['transactionType'],
        method: filters.method as FinancialTransactionQuery['method'],
        practiceId: this.actor() === 'Doctor' ? this.practiceId() : undefined,
        pageNumber,
        pageSize: 20,
      };
      const request = this.isPatient()
        ? this.api.myTransactions(query)
        : this.actor() === 'Doctor'
          ? this.api.doctorTransactions(query)
          : this.api.practiceTransactions(this.practiceId(), query);
      const page = await firstValueFrom(request);
      if (sequence === this.sequence && this.canView()) this.page.set(page);
    } catch (error) {
      if (sequence === this.sequence) await this.failure(error);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }

  protected async inspect(item: FinancialTransactionItem): Promise<void> {
    if (this.isPatient()) {
      await this.openReceipt(item);
      return;
    }
    const paymentId = item.transactionType === 'Payment' ? item.transactionId : item.paymentId;
    if (paymentId) await this.openPayment(paymentId, item.doctorPracticeId);
  }

  protected async openPayment(paymentId: string, practiceId = this.practiceId()): Promise<void> {
    if (this.actor() === 'Reception' && (!this.canView() || practiceId !== this.practiceId()))
      return;
    const sequence = this.sequence;
    this.loading.set(true);
    try {
      const value = await firstValueFrom(this.api.paymentDetail(practiceId, paymentId));
      if (sequence !== this.sequence || !this.canView()) return;
      this.detail.set(value);
      this.receipt.set(null);
      this.paymentCorrectionModel.set({
        paymentMethod: value.payment.paymentMethod,
        referenceNumber: value.payment.referenceNumber || '',
        notes: value.payment.notes || '',
        correctionReason: '',
      });
      if (value.refund)
        this.refundCorrectionModel.set({
          refundMethod: value.refund.refundMethod,
          refundReasonCode: value.refund.refundReasonCode,
          reason: value.refund.reason || '',
          referenceNumber: value.refund.referenceNumber || '',
          notes: value.refund.notes || '',
          correctionReason: '',
        });
    } catch (error) {
      await this.failure(error);
    } finally {
      this.loading.set(false);
    }
  }

  protected async openReceipt(item: FinancialTransactionItem): Promise<void> {
    if (
      this.actor() === 'Reception' &&
      (!this.canView() || item.doctorPracticeId !== this.practiceId())
    )
      return;
    this.loading.set(true);
    try {
      if (item.transactionType === 'Payment') {
        this.receipt.set(
          await firstValueFrom(
            this.isPatient()
              ? this.api.myPaymentReceipt(item.transactionId)
              : this.api.practicePaymentReceipt(item.doctorPracticeId, item.transactionId),
          ),
        );
      } else {
        this.receipt.set(
          await firstValueFrom(
            this.isPatient()
              ? this.api.myRefundReceipt(item.transactionId)
              : this.api.practiceRefundReceipt(item.doctorPracticeId, item.transactionId),
          ),
        );
      }
      this.detail.set(null);
    } catch (error) {
      await this.failure(error);
    } finally {
      this.loading.set(false);
    }
  }

  protected async openDetailReceipt(kind: 'Payment' | 'Refund'): Promise<void> {
    const value = this.detail();
    if (!value || !this.canView()) return;
    this.loading.set(true);
    try {
      if (kind === 'Payment') {
        this.receipt.set(
          await firstValueFrom(
            this.api.practicePaymentReceipt(value.practice.id, value.payment.id),
          ),
        );
      } else if (value.refund) {
        this.receipt.set(
          await firstValueFrom(this.api.practiceRefundReceipt(value.practice.id, value.refund.id)),
        );
      }
      this.detail.set(null);
    } catch (error) {
      await this.failure(error);
    } finally {
      this.loading.set(false);
    }
  }

  protected refund(): void {
    submit(this.refundForm, async () => {
      const detail = this.detail();
      if (!detail || !this.canRefund()) return;
      const value = this.refundModel();
      await this.mutate(
        this.api.refundPayment(
          detail.practice.id,
          detail.payment.id,
          {
            ...value,
            reason: value.reason.trim() || null,
            referenceNumber: value.referenceNumber.trim() || null,
            notes: value.notes.trim() || null,
          },
          createIdempotencyKey(),
        ),
        'finance.refund.success',
        () => this.openPayment(detail.payment.id, detail.practice.id),
      );
    });
  }

  protected correctPayment(): void {
    submit(this.paymentCorrectionForm, async () => {
      const detail = this.detail();
      if (!detail || detail.isRefunded || !this.canCorrect()) return;
      const value = this.paymentCorrectionModel();
      await this.mutate(
        this.api.correctPayment(
          detail.practice.id,
          detail.payment.id,
          {
            ...value,
            referenceNumber: value.referenceNumber.trim() || null,
            notes: value.notes.trim() || null,
            correctionReason: value.correctionReason.trim(),
            rowVersion: detail.payment.rowVersion,
          },
          createIdempotencyKey(),
        ),
        'finance.correction.success',
        () => this.openPayment(detail.payment.id, detail.practice.id),
      );
    });
  }

  protected correctRefund(): void {
    submit(this.refundCorrectionForm, async () => {
      const detail = this.detail();
      if (!detail?.refund || !this.canCorrect()) return;
      const value = this.refundCorrectionModel();
      await this.mutate(
        this.api.correctRefund(
          detail.practice.id,
          detail.refund.id,
          {
            ...value,
            reason: value.reason.trim() || null,
            referenceNumber: value.referenceNumber.trim() || null,
            notes: value.notes.trim() || null,
            correctionReason: value.correctionReason.trim(),
            rowVersion: detail.refund.rowVersion,
          },
          createIdempotencyKey(),
        ),
        'finance.correction.success',
        () => this.openPayment(detail.payment.id, detail.practice.id),
      );
    });
  }

  protected close(): void {
    if (this.busy()) return;
    this.detail.set(null);
    this.receipt.set(null);
  }

  protected print(): void {
    window.print();
  }

  protected receiptNumber(receipt: Receipt): string {
    return 'paymentTransactionNumber' in receipt
      ? receipt.paymentTransactionNumber
      : receipt.refundTransactionNumber;
  }

  protected receiptMethod(receipt: Receipt): string {
    return 'paymentMethod' in receipt ? receipt.paymentMethod : receipt.refundMethod;
  }

  protected reasonCodes: readonly RefundReasonCode[] = [
    'PatientRequestedCancellation',
    'DoctorUnavailable',
    'DuplicatePayment',
    'WrongPaymentMethod',
    'OperationalError',
    'Other',
  ];

  private async mutate<T>(
    request: import('rxjs').Observable<T>,
    successKey: string,
    refresh: () => Promise<void>,
  ): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await firstValueFrom(request);
      this.toast.success(successKey);
      await refresh();
      await this.load(this.page().pageNumber);
    } catch (error) {
      await this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }

  private setDefaultDates(): void {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    this.filterModel.update((value) => ({
      ...value,
      fromDate: this.date(from),
      toDate: this.date(today),
    }));
  }

  private date(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private async failure(error: unknown): Promise<void> {
    if (
      error instanceof HttpErrorResponse &&
      error.status === 403 &&
      this.actor() === 'Reception'
    ) {
      await this.reception.refresh();
      this.sequence++;
      this.practices.set(this.reception.practicesWithPermission(PERMISSIONS.practicePaymentsView));
      this.detail.set(null);
      this.receipt.set(null);
      this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
      this.messages.set(['reception.accessChanged']);
      this.toast.error('reception.accessChanged');
      return;
    }
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['finance.loadFailed']);
    this.toast.error(messages[0] || 'finance.loadFailed');
  }
}
