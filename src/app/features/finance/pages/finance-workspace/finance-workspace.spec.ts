import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../../core/notifications/toast.service';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { FinanceApi, PaymentDetail } from '../../../../domains/finance';
import {
  ReceptionPracticesApi,
  ReceptionPractice,
  ReceptionPracticeContext,
} from '../../../../domains/reception-practices';
import { FinanceWorkspace } from './finance-workspace';
import { ComponentFixture, TestBed } from '@angular/core/testing';

const samplePayment: PaymentDetail = {
  practice: { id: 'p1', nameAr: 'Clinic' },
  patient: { id: 'patient', nameAr: 'Patient' },
  doctor: { id: 'doctor', nameAr: 'Doctor' },
  payment: {
    id: 'payment',
    transactionNumber: 'PAY-1',
    ticketId: 'ticket',
    amount: 500,
    currencyCode: 'EGP',
    status: 'Paid',
    paymentMethod: 'Cash',
    businessDate: '2026-10-04',
    collectedOnUtc: '2026-10-04T09:00:00Z',
    rowVersion: 'v1',
  },
  refund: null,
  ticketNumber: 'T-1',
  isRefunded: false,
  canRefund: true,
  refundableAmount: 500,
  paymentCorrections: [],
  refundCorrections: [],
};

describe('FinanceWorkspace', () => {
  let fixture: ComponentFixture<FinanceWorkspace>;

  beforeEach(() => {
    TestBed.configureTestingModule({
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
            myTransactions: () => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [],
            currentPracticeId: () => '',
            select: () => undefined,
          },
        },
      ],
    });
    fixture = TestBed.createComponent(FinanceWorkspace);
  });

  it('renders an accessible empty financial history', async () => {
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });
});

describe('Reception finance authorization', () => {
  let grants: string[];
  const api = {
    practiceTransactions: vi.fn(() =>
      of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
    ),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    grants = [];
    const practice = (): ReceptionPractice => ({
      id: 'p1',
      nameAr: 'Clinic',
      nameEn: 'Clinic',
      doctorNameAr: null,
      doctorNameEn: null,
      isActive: true,
      permissionCodes: grants,
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
        { provide: DoctorPracticesApi, useValue: { list: vi.fn() } },
        { provide: ReceptionPracticesApi, useValue: { list: () => of([practice()]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });
  async function start() {
    const fixture = TestBed.createComponent(FinanceWorkspace);
    await fixture.whenStable();
    return fixture;
  }
  it('does not request transactions without assignment View', async () => {
    const fixture = await start();
    expect(api.practiceTransactions).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });
  it('requests transactions only for an assignment with View', async () => {
    grants = ['PracticePayments.View'];
    await start();
    expect(api.practiceTransactions).toHaveBeenCalledWith('p1', expect.any(Object));
  });
  it('requires Correct for correction and Refund plus server eligibility for refunds', async () => {
    grants = ['PracticePayments.View'];
    const fixture = await start();
    const component = fixture.componentInstance;
    const detail = samplePayment;
    component['detail'].set(detail);
    expect(component['canCorrect']()).toBe(false);
    expect(component['canRefund']()).toBe(false);
    grants = ['PracticePayments.View', 'PracticePayments.Correct', 'PracticePayments.Refund'];
    await TestBed.inject(ReceptionPracticeContext).refresh();
    expect(component['canCorrect']()).toBe(true);
    expect(component['canRefund']()).toBe(true);
    component['detail'].update((detail) => (detail ? { ...detail, canRefund: false } : null));
    expect(component['canRefund']()).toBe(false);
  });

  it('rejects invalid refund reasons without sending a mutation', async () => {
    grants = ['PracticePayments.View', 'PracticePayments.Refund'];
    const fixture = await start();
    const c = fixture.componentInstance;
    c['refundModel'].update((v) => ({ ...v, refundReasonCode: 'Other', reason: '' }));
    const mutation = vi.fn();
    Object.assign(TestBed.inject(FinanceApi), { refundPayment: mutation });
    c['refund']();
    await fixture.whenStable();
    expect(c['refundForm']().invalid()).toBe(true);
    expect(mutation).not.toHaveBeenCalled();
  });
  it('keeps financial mutations locked through refresh and sends one success toast', async () => {
    const fixture = await start();
    const c = fixture.componentInstance;
    const response = new Subject<void>();
    let finish!: () => void;
    const refresh = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const toast = vi.spyOn(TestBed.inject(ToastService), 'success');
    const saving = c['mutate'](response, 'finance.correction.success', refresh);
    await c['mutate'](of(undefined), 'finance.correction.success', refresh);
    response.next();
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(c['busy']()).toBe(true);
    finish();
    await saving;
    expect(c['busy']()).toBe(false);
    expect(toast).toHaveBeenCalledTimes(1);
  });
  it('shows a failure toast and releases financial controls after a failed mutation', async () => {
    const fixture = await start();
    const c = fixture.componentInstance;
    const refresh = vi.fn();
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    await c['mutate'](
      throwError(() => new HttpErrorResponse({ status: 503 })),
      'finance.correction.success',
      refresh,
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
    expect(c['busy']()).toBe(false);
  });

  it('corrects a payment once, preserves the draft on failure and refreshes on retry', async () => {
    grants = ['PracticePayments.View', 'PracticePayments.Correct'];
    const fixture = await start();
    const c = fixture.componentInstance;
    c['detail'].set(samplePayment);
    c['paymentCorrectionModel'].update((v) => ({ ...v, correctionReason: 'Changed method' }));
    const response = new Subject<void>();
    const correct = vi.fn((): Observable<void> => response);
    const details = vi.fn(() =>
      of({ ...samplePayment, payment: { ...samplePayment.payment, rowVersion: 'v2' } }),
    );
    Object.assign(TestBed.inject(FinanceApi), { correctPayment: correct, paymentDetail: details });
    const toast = vi.spyOn(TestBed.inject(ToastService), 'success');
    c['correctPayment']();
    await vi.waitFor(() => expect(correct).toHaveBeenCalledTimes(1));
    c['correctPayment']();
    expect(correct.mock.calls[0]).toEqual([
      'p1',
      'payment',
      expect.objectContaining({ correctionReason: 'Changed method', rowVersion: 'v1' }),
      expect.any(String),
    ]);
    response.error(new HttpErrorResponse({ status: 503 }));
    await vi.waitFor(() => expect(c['busy']()).toBe(false));
    expect(c['paymentCorrectionModel']().correctionReason).toBe('Changed method');
    expect(toast).not.toHaveBeenCalled();
    correct.mockImplementation(() => of(undefined));
    c['correctPayment']();
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith('finance.correction.success'));
    await fixture.whenStable();
    expect(correct).toHaveBeenCalledTimes(2);
    expect(details).toHaveBeenCalledWith('p1', 'payment');
    expect(c['detail']()?.payment.rowVersion).toBe('v2');
  });
});
