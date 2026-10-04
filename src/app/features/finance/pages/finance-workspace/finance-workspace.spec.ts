import { AuthSession } from '../../../../core/auth/auth-session';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { FinanceApi, PaymentDetail } from '../../../../domains/finance';
import {
  ReceptionPracticesApi,
  ReceptionPractice,
  ReceptionPracticeContext,
} from '../../../../domains/reception-practices';
import { FinanceWorkspace } from './finance-workspace';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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
    const detail: PaymentDetail = {
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
});
