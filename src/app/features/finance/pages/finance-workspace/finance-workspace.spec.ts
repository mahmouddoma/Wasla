import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import {
  FinanceApi,
  FinancialTransactionItem,
  PaymentDetail,
  PaymentReceipt,
  RefundReceipt,
} from '../../../../domains/finance';
import {
  ReceptionPractice,
  ReceptionPracticeContext,
  ReceptionPracticesApi,
} from '../../../../domains/reception-practices';
import { FinanceWorkspace } from './finance-workspace';

interface MockFinanceApi {
  practiceTransactions: ReturnType<typeof vi.fn>;
  doctorTransactions: ReturnType<typeof vi.fn>;
  myTransactions: ReturnType<typeof vi.fn>;
  paymentDetail: ReturnType<typeof vi.fn>;
  refundPayment: ReturnType<typeof vi.fn>;
  correctPayment: ReturnType<typeof vi.fn>;
  correctRefund: ReturnType<typeof vi.fn>;
  practicePaymentReceipt: ReturnType<typeof vi.fn>;
  practiceRefundReceipt: ReturnType<typeof vi.fn>;
  myPaymentReceipt: ReturnType<typeof vi.fn>;
  myRefundReceipt: ReturnType<typeof vi.fn>;
  doctorRevenue: ReturnType<typeof vi.fn>;
  adminRevenueAggregates: ReturnType<typeof vi.fn>;
}

function createMockFinanceApi(overrides: Partial<MockFinanceApi> = {}): MockFinanceApi {
  return {
    practiceTransactions: vi.fn(),
    doctorTransactions: vi.fn(),
    myTransactions: vi.fn(),
    paymentDetail: vi.fn(),
    refundPayment: vi.fn(),
    correctPayment: vi.fn(),
    correctRefund: vi.fn(),
    practicePaymentReceipt: vi.fn(),
    practiceRefundReceipt: vi.fn(),
    myPaymentReceipt: vi.fn(),
    myRefundReceipt: vi.fn(),
    doctorRevenue: vi.fn(),
    adminRevenueAggregates: vi.fn(),
    ...overrides,
  };
}

type MockReceptionContext = Partial<Record<keyof ReceptionPracticeContext, ReturnType<typeof vi.fn> | (() => unknown)>>;

function makeItem(id: string): FinancialTransactionItem {
  return {
    transactionId: id,
    transactionNumber: 'TX-' + id,
    doctorPracticeId: 'p1',
    practiceNameAr: 'عيادة',
    practiceNameEn: 'Clinic',
    patientId: 'pt-1',
    patientNameAr: 'مريض',
    patientNameEn: 'Patient',
    doctorId: 'd-1',
    doctorNameAr: 'طبيب',
    doctorNameEn: 'Doctor',
    ticketNumber: 1,
    transactionType: 'Payment',
    amount: 100,
    currencyCode: 'EGP',
    method: 'Cash',
    occurredOnUtc: '2026-10-07T10:00:00Z',
    businessDate: '2026-10-07',
  };
}

const samplePayment: PaymentDetail = {
  practice: { id: 'p1', nameAr: 'عيادة الأمل', nameEn: 'Hope Clinic' },
  patient: { id: 'patient-1', nameAr: 'أحمد محمد', nameEn: 'Ahmed Mohamed' },
  doctor: { id: 'doctor-1', nameAr: 'د. سمير', nameEn: 'Dr. Samir' },
  payment: {
    id: 'pay-1',
    transactionNumber: 'PAY-1001',
    ticketId: 'ticket-1',
    amount: 300,
    currencyCode: 'EGP',
    status: 'Paid',
    paymentMethod: 'Cash',
    businessDate: '2026-10-07',
    collectedOnUtc: '2026-10-07T09:00:00Z',
    collectedByDisplayName: 'موظف الاستقبال',
    rowVersion: 'v1',
  },
  refund: null,
  ticketNumber: 12,
  isRefunded: false,
  canRefund: true,
  refundableAmount: 300,
  paymentCorrections: [],
  refundCorrections: [],
};

const sampleRefundReceipt: RefundReceipt = {
  refundTransactionNumber: 'REF-2001',
  originalPaymentTransactionNumber: 'PAY-1001',
  patientId: 'patient-1',
  patientNameAr: 'أحمد محمد',
  patientNameEn: 'Ahmed Mohamed',
  doctorId: 'doctor-1',
  doctorNameAr: 'د. سمير',
  doctorNameEn: 'Dr. Samir',
  doctorPracticeId: 'p1',
  practiceNameAr: 'عيادة الأمل',
  practiceNameEn: 'Hope Clinic',
  ticketNumber: 12,
  amount: 300,
  currencyCode: 'EGP',
  refundMethod: 'Cash',
  refundReasonCode: 'PatientRequestedCancellation',
  refundReason: null,
  referenceNumber: null,
  refundedOnUtc: '2026-10-07T11:00:00Z',
  businessDate: '2026-10-07',
  recordedByDisplayName: 'موظف الاستقبال',
};

const samplePaymentReceipt: PaymentReceipt = {
  paymentTransactionNumber: 'PAY-1001',
  patientId: 'patient-1',
  patientNameAr: 'أحمد محمد',
  patientNameEn: 'Ahmed Mohamed',
  doctorId: 'doctor-1',
  doctorNameAr: 'د. سمير',
  doctorNameEn: 'Dr. Samir',
  doctorPracticeId: 'p1',
  practiceNameAr: 'عيادة الأمل',
  practiceNameEn: 'Hope Clinic',
  ticketNumber: 12,
  amount: 300,
  currencyCode: 'EGP',
  paymentMethod: 'Cash',
  referenceNumber: null,
  paidOnUtc: '2026-10-07T09:00:00Z',
  businessDate: '2026-10-07',
  recordedByDisplayName: 'موظف الاستقبال',
};

describe('FinanceWorkspace — Patient Actor & Baseline', () => {
  let fixture: ComponentFixture<FinanceWorkspace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Patient' }, queryParamMap: { get: () => null } },
          },
        },
        {
          provide: FinanceApi,
          useValue: {
            myTransactions: vi.fn(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 })),
            myPaymentReceipt: vi.fn(() => of(samplePaymentReceipt)),
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [],
            currentPracticeId: () => '',
            select: vi.fn(),
            ensureLoaded: async () => undefined,
            allowsInPractice: () => false,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FinanceWorkspace);
    fixture.detectChanges();
  });

  it('renders accessible transactions list for Patient and hides staff actions', async () => {
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
    // Patient should not see refund or correction triggers
    expect(fixture.nativeElement.querySelector('.btn-refund-launch')).toBeNull();
  });
});

describe('Reception Finance — Clinic Context & Permissions', () => {
  let grants: string[];
  let selectedClinicId: string;
  let api: {
    practiceTransactions: ReturnType<typeof vi.fn>;
    paymentDetail: ReturnType<typeof vi.fn>;
    refundPayment: ReturnType<typeof vi.fn>;
    correctPayment: ReturnType<typeof vi.fn>;
    correctRefund: ReturnType<typeof vi.fn>;
    practicePaymentReceipt: ReturnType<typeof vi.fn>;
    practiceRefundReceipt: ReturnType<typeof vi.fn>;
  };
  let receptionContext: {
    refresh: ReturnType<typeof vi.fn>;
    practices: ReturnType<typeof vi.fn>;
    currentPracticeId: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    ensureLoaded: ReturnType<typeof vi.fn>;
    allowsInPractice: ReturnType<typeof vi.fn>;
    allows: ReturnType<typeof vi.fn>;
  };

  const makePractice = (id: string, name: string): ReceptionPractice => ({
    id,
    nameAr: name,
    nameEn: name,
    doctorNameAr: null,
    doctorNameEn: null,
    isActive: true,
    permissionCodes: grants,
  });

  beforeEach(() => {
    grants = [];
    selectedClinicId = 'p1';
    api = {
      practiceTransactions: vi.fn(() =>
        of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
      ),
      paymentDetail: vi.fn(() => of(samplePayment)),
      refundPayment: vi.fn(() =>
        of({
          refundId: 'ref-1',
          transactionNumber: 'REF-2001',
          originalPaymentTransactionNumber: 'PAY-1001',
          amount: 300,
          currencyCode: 'EGP',
          refundedOnUtc: '2026-10-07T11:00:00Z',
          businessDate: '2026-10-07',
        }),
      ),
      correctPayment: vi.fn(() =>
        of({
          correctionId: 'cor-1',
          transactionId: 'pay-1',
          transactionNumber: 'PAY-1001',
          correctedOnUtc: '2026-10-07T10:00:00Z',
        }),
      ),
      correctRefund: vi.fn(() =>
        of({
          correctionId: 'cor-2',
          transactionId: 'ref-1',
          transactionNumber: 'REF-2001',
          correctedOnUtc: '2026-10-07T12:00:00Z',
        }),
      ),
      practicePaymentReceipt: vi.fn(() => of(samplePaymentReceipt)),
      practiceRefundReceipt: vi.fn(() => of(sampleRefundReceipt)),
    };

    receptionContext = {
      refresh: vi.fn(async () => undefined),
      practices: vi.fn(() => [makePractice('p1', 'Clinic 1'), makePractice('p2', 'Clinic 2')]),
      currentPracticeId: vi.fn(() => selectedClinicId),
      select: vi.fn(),
      ensureLoaded: vi.fn(async () => undefined),
      allowsInPractice: vi.fn((pid: string, perm: string) => grants.includes(perm)),
      allows: vi.fn((perm: string) => grants.includes(perm)),
    };

    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: FinanceApi, useValue: api },
        { provide: ReceptionPracticeContext, useValue: receptionContext },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });

  async function createComponent() {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('uses global Reception clinic and does not display a local Reception clinic selector', async () => {
    grants = ['PracticePayments.View'];
    const fixture = await createComponent();
    expect(fixture.componentInstance['practiceId']()).toBe('p1');
    // Reception never sees local clinic selector
    expect(fixture.nativeElement.querySelector('#doctor-practice-select')).toBeNull();
    // Opening Finance must never call select to auto-change clinic
    expect(receptionContext.select).not.toHaveBeenCalled();
  });

  it('shows choose clinic state when currentPracticeId is empty and sends no request', async () => {
    selectedClinicId = '';
    const fixture = await createComponent();
    expect(api.practiceTransactions).not.toHaveBeenCalled();
    const empty = fixture.nativeElement.querySelector('.state-empty-display');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('اختر العيادة');
  });

  it('shows no-view guidance when clinic is selected but lacks PracticePayments.View', async () => {
    grants = [];
    selectedClinicId = 'p1';
    const fixture = await createComponent();
    expect(api.practiceTransactions).not.toHaveBeenCalled();
    const empty = fixture.nativeElement.querySelector('.state-empty-display');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('غير متاح لك في هذه العيادة');
  });

  it('sends request when clinic has PracticePayments.View with default Today period', async () => {
    grants = ['PracticePayments.View'];
    selectedClinicId = 'p1';
    await createComponent();
    expect(api.practiceTransactions).toHaveBeenCalledWith('p1', expect.objectContaining({
      fromDate: expect.any(String),
      toDate: expect.any(String),
    }));
  });

  it('clears active detail, receipt and list on clinic switch A -> B', async () => {
    grants = ['PracticePayments.View'];
    const fixture = await createComponent();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);
    c['refundDone'].set({
      refundId: 'r1',
      transactionNumber: 'REF-1',
      originalPaymentTransactionNumber: 'PAY-1',
      amount: 300,
      currencyCode: 'EGP',
      refundedOnUtc: '',
      businessDate: '',
    });

    // Switch to Clinic B
    await c['onReceptionPracticeChanged']('p2');
    expect(c['practiceId']()).toBe('p2');
    expect(c['detail']()).toBeNull();
    expect(c['receipt']()).toBeNull();
    expect(c['refundDone']()).toBeNull();
  });

  it('A -> B -> A does not restore stale state from first visit', async () => {
    grants = ['PracticePayments.View'];
    const fixture = await createComponent();
    const c = fixture.componentInstance;
    const initialGeneration = c['scopeGeneration'];

    await c['onReceptionPracticeChanged']('p2');
    expect(c['scopeGeneration']).toBeGreaterThan(initialGeneration);

    await c['onReceptionPracticeChanged']('p1');
    expect(c['detail']()).toBeNull();
    expect(c['receipt']()).toBeNull();
  });
});

describe('Async & Race Hardening', () => {
  let grants: string[];
  let api: MockFinanceApi;
  let receptionContext: MockReceptionContext;

  beforeEach(() => {
    grants = ['PracticePayments.View', 'PracticePayments.Refund', 'PracticePayments.Correct'];
    api = createMockFinanceApi({
      practiceTransactions: vi.fn(),
      paymentDetail: vi.fn(),
      practicePaymentReceipt: vi.fn(),
      practiceRefundReceipt: vi.fn(),
      refundPayment: vi.fn(),
    });
    receptionContext = {
      refresh: vi.fn(async () => undefined),
      practices: () => [{ id: 'p1', isActive: true, permissionCodes: grants } as ReceptionPractice],
      currentPracticeId: () => 'p1',
      select: vi.fn(),
      ensureLoaded: async () => undefined,
      allowsInPractice: () => true,
      allows: () => true,
    };

    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: FinanceApi, useValue: api },
        { provide: ReceptionPracticeContext, useValue: receptionContext },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });

  it('ignores late transaction list response from Clinic A after switching to Clinic B', async () => {
    const listA$ = new Subject<{ items: FinancialTransactionItem[]; totalCount: number; pageNumber: number; pageSize: number }>();
    const listB$ = new Subject<{ items: FinancialTransactionItem[]; totalCount: number; pageNumber: number; pageSize: number }>();
    api.practiceTransactions!.mockReturnValueOnce(listA$).mockReturnValueOnce(listB$);

    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;

    // Trigger Clinic B switch
    const switchPromise = c['onReceptionPracticeChanged']('p2');

    // Late Clinic A emits
    listA$.next({
      items: [makeItem('tx-A')],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
    });
    listA$.complete();

    // Newer Clinic B emits
    listB$.next({
      items: [makeItem('tx-B')],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
    });
    listB$.complete();

    await switchPromise;
    expect(c['page']().items.some((i) => i.transactionId === 'tx-A')).toBe(false);
  });

  it('newer detail request wins over earlier pending detail request', async () => {
    api.practiceTransactions.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const detail1$ = new Subject<PaymentDetail>();
    const detail2$ = new Subject<PaymentDetail>();
    api.paymentDetail.mockReturnValueOnce(detail1$).mockReturnValueOnce(detail2$);

    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;

    const req1 = c['openPayment']('pay-1', 'p1');
    const req2 = c['openPayment']('pay-2', 'p1');

    // detail2 returns before detail1
    detail2$.next({ ...samplePayment, payment: { ...samplePayment.payment, id: 'pay-2' } });
    detail2$.complete();

    detail1$.next({ ...samplePayment, payment: { ...samplePayment.payment, id: 'pay-1' } });
    detail1$.complete();

    await req1;
    await req2;

    expect(c['detail']()?.payment.id).toBe('pay-2');
  });

  it('discards stale 403 error from Clinic A and does not refresh Reception context in Clinic B', async () => {
    api.practiceTransactions.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;

    // Switch to B
    await c['onReceptionPracticeChanged']('p2');

    // Stale 403 error arrives with old generation / clinic A
    await c['handleFailure'](new HttpErrorResponse({ status: 403 }), 1, 'p1');

    expect(receptionContext.refresh).not.toHaveBeenCalled();
    expect(c['messages']()).toEqual([]);
  });

  it('current-scope 403 triggers refresh and clears sensitive state', async () => {
    api.practiceTransactions.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);

    await c['handleFailure'](new HttpErrorResponse({ status: 403 }), c['scopeGeneration'], 'p1');

    expect(receptionContext.refresh).toHaveBeenCalledTimes(1);
    expect(c['detail']()).toBeNull();
    expect(c['messages']()).toContain('reception.accessChanged');
  });
});

describe('Load, Error & Empty States', () => {
  let api: MockFinanceApi;

  beforeEach(() => {
    api = createMockFinanceApi({
      practiceTransactions: vi.fn(),
    });
    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: FinanceApi, useValue: api },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [{ id: 'p1', isActive: true, permissionCodes: ['PracticePayments.View'] }],
            currentPracticeId: () => 'p1',
            select: vi.fn(),
            ensureLoaded: async () => undefined,
            allowsInPractice: () => true,
            allows: () => true,
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });

  it('distinguishes load failure from empty state and provides retry action', async () => {
    api.practiceTransactions.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c['listFailed']()).toBe(true);
    expect(fixture.nativeElement.querySelector('.state-error-display')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.cell-empty-table')).toBeNull();

    // Test retry
    api.practiceTransactions.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    c['retryLoad']();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(c['listFailed']()).toBe(false);
  });

  it('renders genuine empty today state without fake filter reset recommendation', async () => {
    api.practiceTransactions.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('لا توجد مدفوعات أو استردادات اليوم');
    expect(fixture.nativeElement.querySelector('.active-reset')).toBeNull();
  });

  it('renders filtered empty state with reset filters button when filters active', async () => {
    api.practiceTransactions.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['filterModel'].update((f) => ({ ...f, ticketNumber: '999' }));
    fixture.detectChanges();

    expect(c['hasActiveFilters']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('لا توجد عمليات مطابقة');
    expect(fixture.nativeElement.querySelector('.btn-deck-submit')).toBeTruthy();
  });
});

describe('Mutation Idempotency & Retained Intent Keys', () => {
  let api: MockFinanceApi;

  beforeEach(() => {
    api = createMockFinanceApi({
      practiceTransactions: vi.fn(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 })),
      paymentDetail: vi.fn(() => of(samplePayment)),
      refundPayment: vi.fn(),
      correctPayment: vi.fn(),
    });
    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: FinanceApi, useValue: api },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [{ id: 'p1', isActive: true, permissionCodes: ['PracticePayments.View', 'PracticePayments.Refund', 'PracticePayments.Correct'] }],
            currentPracticeId: () => 'p1',
            select: vi.fn(),
            ensureLoaded: async () => undefined,
            allowsInPractice: () => true,
            allows: () => true,
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });

  it('prevents rapid double-click submissions', async () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);

    const pending$ = new Subject<unknown>();
    api.refundPayment!.mockReturnValue(pending$);

    c['refund']();
    c['refund'](); // double click

    expect(api.refundPayment).toHaveBeenCalledTimes(1);
  });

  it('reuses same idempotency key for exact same intent retry after failure', async () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);

    api.refundPayment.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    c['refund']();
    await fixture.whenStable();

    const key1 = api.refundPayment.mock.calls[0][3];
    expect(key1).toBeTruthy();

    // Retry with exact same data
    api.refundPayment.mockReturnValueOnce(of({ refundId: 'r1', transactionNumber: 'REF-1', amount: 300, currencyCode: 'EGP' }));
    c['refund']();
    await fixture.whenStable();

    const key2 = api.refundPayment.mock.calls[1][3];
    expect(key2).toBe(key1);
  });

  it('creates a new idempotency key when payload or rowVersion changes', async () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);

    api.refundPayment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    c['refund']();
    await fixture.whenStable();

    const key1 = api.refundPayment.mock.calls[0][3];

    // Change payload (e.g. refund method)
    c['refundModel'].update((m) => ({ ...m, refundMethod: 'Card' }));
    c['refund']();
    await fixture.whenStable();

    const key2 = api.refundPayment.mock.calls[1][3];
    expect(key2).not.toBe(key1);
  });
});

describe('409 Concurrency Handling', () => {
  let api: MockFinanceApi;

  beforeEach(() => {
    api = createMockFinanceApi({
      practiceTransactions: vi.fn(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 })),
      paymentDetail: vi.fn(),
      correctPayment: vi.fn(),
      refundPayment: vi.fn(),
    });
    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: FinanceApi, useValue: api },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [{ id: 'p1', isActive: true, permissionCodes: ['PracticePayments.View', 'PracticePayments.Refund', 'PracticePayments.Correct'] }],
            currentPracticeId: () => 'p1',
            select: vi.fn(),
            ensureLoaded: async () => undefined,
            allowsInPractice: () => true,
            allows: () => true,
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });

  it('reloads fresh detail and preserves correction draft on 409 conflict', async () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);

    c['paymentCorrectionModel'].set({
      paymentMethod: 'Card',
      referenceNumber: 'REF-NEW',
      notes: 'Updated note',
      correctionReason: 'Wrong method entered',
    });

    api.correctPayment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.paymentDetail.mockReturnValue(
      of({
        ...samplePayment,
        payment: { ...samplePayment.payment, rowVersion: 'v2' },
      }),
    );

    c['correctPayment']();
    await fixture.whenStable();

    expect(api.paymentDetail).toHaveBeenCalledWith('p1', 'pay-1');
    expect(c['conflictNotice']()).toBe('finance.correction.conflict');
    // Draft preserved
    expect(c['paymentCorrectionModel']().paymentMethod).toBe('Card');
    expect(c['paymentCorrectionModel']().correctionReason).toBe('Wrong method entered');
  });

  it('reloads server truth on refund conflict and hides refund CTA if no longer refundable', async () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);

    api.refundPayment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.paymentDetail.mockReturnValue(
      of({
        ...samplePayment,
        isRefunded: true,
        canRefund: false,
        refundableAmount: 0,
      }),
    );

    c['refund']();
    await fixture.whenStable();

    expect(c['canRefund']()).toBe(false);
  });
});

describe('Refund Flow & Done State', () => {
  let api: MockFinanceApi;

  beforeEach(() => {
    api = createMockFinanceApi({
      practiceTransactions: vi.fn(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 })),
      paymentDetail: vi.fn(() => of(samplePayment)),
      refundPayment: vi.fn(() =>
        of({
          refundId: 'ref-1',
          transactionNumber: 'REF-2001',
          originalPaymentTransactionNumber: 'PAY-1001',
          amount: 300,
          currencyCode: 'EGP',
          refundedOnUtc: '2026-10-07T11:00:00Z',
          businessDate: '2026-10-07',
        }),
      ),
      practiceRefundReceipt: vi.fn(() => of(sampleRefundReceipt)),
    });
    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: FinanceApi, useValue: api },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [{ id: 'p1', isActive: true, permissionCodes: ['PracticePayments.View', 'PracticePayments.Refund'] }],
            currentPracticeId: () => 'p1',
            select: vi.fn(),
            ensureLoaded: async () => undefined,
            allowsInPractice: () => true,
            allows: () => true,
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });

  it('completes refund flow into Done state showing transaction number and receipt button', async () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);
    c['startRefund']();

    c['refund']();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(c['refundDone']()).toBeTruthy();
    expect(c['refundDone']()?.transactionNumber).toBe('REF-2001');
    expect(fixture.nativeElement.querySelector('.refund-done-sheet')).toBeTruthy();
  });
});

describe('Audit History Formatting', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: FinanceApi, useValue: { practiceTransactions: vi.fn(() => of({ items: [] })) } },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [{ id: 'p1', isActive: true, permissionCodes: ['PracticePayments.View'] }],
            currentPracticeId: () => 'p1',
            select: vi.fn(),
            ensureLoaded: async () => undefined,
            allowsInPractice: () => true,
            allows: () => true,
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });

  it('formats human readable diffs when oldValues and newValues are present', () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    const c = fixture.componentInstance;

    const audits = [
      {
        id: 'aud-1',
        correctionReason: 'Corrected payment method',
        correctedByDisplayName: 'Staff',
        correctedOnUtc: '2026-10-07T10:00:00Z',
        oldValues: { paymentMethod: 'Cash', referenceNumber: '' },
        newValues: { paymentMethod: 'Card', referenceNumber: 'POS-123' },
      },
    ];

    const formatted = c['formatAuditEntries'](audits);
    expect(formatted[0].diffs.length).toBe(2);
    expect(formatted[0].diffs[0].oldVal).toBe('نقدي');
    expect(formatted[0].diffs[0].newVal).toBe('بطاقة');
    expect(formatted[0].diffs[1].oldVal).toBe('—');
    expect(formatted[0].diffs[1].newVal).toBe('POS-123');
  });

  it('renders metadata without fabricated diff when oldValues/newValues are missing', () => {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    const c = fixture.componentInstance;

    const audits = [
      {
        id: 'aud-2',
        correctionReason: 'Note correction',
        correctedByDisplayName: 'Staff',
        correctedOnUtc: '2026-10-07T10:00:00Z',
      },
    ];

    const formatted = c['formatAuditEntries'](audits);
    expect(formatted[0].diffs).toEqual([]);
    expect(formatted[0].correctionReason).toBe('Note correction');
  });
});

describe('Doctor Finance & Revenue Route Consistency', () => {
  it('initializes in transactions view on /doctor/finance', async () => {
    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Doctor', view: 'transactions' }, queryParamMap: { get: () => null } },
          },
        },
        {
          provide: FinanceApi,
          useValue: {
            doctorTransactions: () => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
          },
        },
        { provide: ReceptionPracticeContext, useValue: { refresh: async () => undefined, practices: () => [], currentPracticeId: () => '', select: () => undefined } },
        { provide: DoctorPracticesApi, useValue: { list: () => of([{ id: 'd-p1', nameAr: 'عيادة دكتور', isActive: true }]) } },
        { provide: AuthSession, useValue: { hasPermission: () => true } },
      ],
    });

    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    expect(fixture.componentInstance['view']()).toBe('transactions');
    expect(fixture.componentInstance['actor']()).toBe('Doctor');
  });

  it('initializes in revenue view on /doctor/revenue and loads dashboard', async () => {
    const doctorRevenue = vi.fn(() => of({
      summary: { grossRevenue: 1000, totalRefunds: 100, netRevenue: 900, paymentCount: 5, refundCount: 1, currencyCode: 'EGP' },
      dailyTrend: [],
      byPractice: [],
      paymentMethods: [],
      refundMethods: [],
      bySegment: [],
      byVisitType: [],
    }));

    TestBed.configureTestingModule({
      imports: [FinanceWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Doctor', view: 'revenue' }, queryParamMap: { get: () => null } },
          },
        },
        {
          provide: FinanceApi,
          useValue: { doctorRevenue },
        },
        { provide: ReceptionPracticeContext, useValue: { refresh: async () => undefined, practices: () => [], currentPracticeId: () => '', select: () => undefined } },
        { provide: DoctorPracticesApi, useValue: { list: () => of([{ id: 'd-p1', nameAr: 'عيادة دكتور', isActive: true }]) } },
        { provide: AuthSession, useValue: { hasPermission: () => true } },
      ],
    });

    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    expect(fixture.componentInstance['view']()).toBe('revenue');
    expect(doctorRevenue).toHaveBeenCalled();
  });
});
