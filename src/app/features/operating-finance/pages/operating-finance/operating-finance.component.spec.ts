import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OperatingFinanceComponent } from './operating-finance.component';
import { Phase18Api } from '../../../../domains/phase18';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ToastService } from '../../../../core/notifications/toast.service';
const obligation = {
  id: 'obligation-id',
  planId: 'plan-id',
  amount: 50,
  amountPolicy: 'Fixed' as const,
  rowVersion: 'rv1',
  descriptionAr: 'مصروف تجريبي',
  allocations: [{ practiceId: 'p1', percentage: 100 }],
  availableActions: [{ allowed: true, route: '/expenses/obligations/obligation-id/settle' }],
};
describe('Operating finance', () => {
  const api = { call: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  let component: OperatingFinanceComponent;
  let grants: boolean;
  beforeEach(() => {
    vi.resetAllMocks();
    grants = true;
    api.call.mockReturnValue(of({ items: [] }));
    TestBed.configureTestingModule({
      imports: [OperatingFinanceComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { view: 'expenses' } } } },
        { provide: Phase18Api, useValue: api },
        { provide: AuthSession, useValue: { hasPermission: () => grants } },
        { provide: ToastService, useValue: toast },
      ],
    });
    component = TestBed.createComponent(OperatingFinanceComponent).componentInstance;
    component.options.set({
      practices: [
        { id: 'p1', nameAr: 'عيادة أولى' },
        { id: 'p2', nameAr: 'عيادة ثانية' },
      ],
      paymentMethods: [{ code: 'Cash' }],
      receptions: [{ id: 'staff' }],
      defaultReportTimeZoneId: 'Africa/Cairo',
    });
  });
  it('does not fabricate rows when finance cannot load', async () => {
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.load();
    expect(component.plans()).toEqual([]);
    expect(component.failed()).toBe(true);
  });
  it('marks the current section and keeps the add action separate', () => {
    const fixture = TestBed.createComponent(OperatingFinanceComponent);
    vi.spyOn(fixture.componentInstance, 'ngOnInit').mockImplementation(() => {});
    fixture.componentInstance.tab.set('plans');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.finance-tab.is-active')?.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(element.querySelector('.finance-create')).not.toBeNull();
    expect(element.querySelectorAll('.finance-tab.is-active')).toHaveLength(1);
  });
  it('titles the create drawer and closes it when creation is cancelled', () => {
    const fixture = TestBed.createComponent(OperatingFinanceComponent);
    vi.spyOn(fixture.componentInstance, 'ngOnInit').mockImplementation(() => {});
    fixture.componentInstance.openCreate('createPlan');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.drawer-titles h2')?.textContent?.trim()).toBe(
      fixture.componentInstance.language.t('doctorRemediation.createPlan'),
    );
    expect(element.querySelector('.finance-form h3')).toBeNull();
    element.querySelector<HTMLButtonElement>('.form-actions button[type="button"]')?.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });
  it('settles an obligation using its own ID and current rowVersion', async () => {
    component.selectedObligation.set(obligation);
    component.prepare('settle');
    component.draft.paymentConfirmed = true;
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.submit();
    expect(api.call).toHaveBeenCalledWith(
      'P18-043',
      expect.objectContaining({
        path: { id: 'obligation-id' },
        body: expect.objectContaining({
          rowVersion: 'rv1',
          paidBusinessDate: expect.any(String),
          amount: 50,
        }),
      }),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(component.mode()).toBe('settle');
    expect(component.selectedObligation()?.amount).toBe(50);
  });
  it('preserves the idempotency key on an uncertain retry', async () => {
    component.selectedObligation.set(obligation);
    component.prepare('settle');
    component.draft.paymentConfirmed = true;
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await component.submit();
    await component.submit();
    expect(api.call.mock.calls[0][1].idempotencyKey).toBe(api.call.mock.calls[1][1].idempotencyKey);
  });
  it('blocks double-submit and missing capability', async () => {
    component.selectedObligation.set(obligation);
    component.prepare('settle');
    component.draft.paymentConfirmed = true;
    const result = new Subject<object>();
    api.call.mockReturnValue(result);
    const pending = component.submit();
    void component.submit();
    expect(api.call).toHaveBeenCalledTimes(1);
    result.error(new HttpErrorResponse({ status: 503 }));
    await pending;
    component.selectedObligation.set({ ...obligation, availableActions: [] });
    await component.submit();
    expect(api.call).toHaveBeenCalledTimes(1);
  });
  it('ends a salary plan without cancelling an obligation', async () => {
    component.salary.set(true);
    component.selectedPlan.set({
      id: 'salary-plan',
      rowVersion: 'plan-rv',
      availableActions: [{ allowed: true, route: '/reception-salary-plans/salary-plan/end' }],
    });
    component.prepare('end');
    component.draft.reason = 'End contract';
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.submit();
    expect(api.call).toHaveBeenCalledWith(
      'P18-062',
      expect.objectContaining({ path: { id: 'salary-plan' } }),
    );
    expect(api.call).not.toHaveBeenCalledWith('P18-084', expect.anything());
  });
  it('adjusts a salary obligation with its own identifier and source revision', async () => {
    component.salary.set(true);
    component.selectedObligation.set({
      ...obligation,
      dueBusinessDate: '2026-10-29',
      availableActions: [{ code: 'Correct', allowed: true }],
    });
    component.prepare('correctObligation');
    component.draft.amount = '60';
    component.draft.reason = 'Contract correction';
    api.call.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 422, error: { errors: { amount: ['Review amount'] } } }),
      ),
    );
    await component.submit();
    expect(api.call).toHaveBeenCalledWith(
      'P18-083',
      expect.objectContaining({
        path: { id: 'obligation-id' },
        body: expect.objectContaining({
          amount: 60,
          rowVersion: 'rv1',
          dueBusinessDate: '2026-10-29',
        }),
      }),
    );
    expect(component.draft.amount).toBe('60');
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('requires and sends the actual expense reason before writing', async () => {
    component.prepare('createExpense');
    component.draft.allocations = [{ practiceId: 'p1', percentage: 100 }];
    component.draft.descriptionAr = 'مستلزمات';
    component.draft.amount = '1.00';
    await component.submit();
    expect(api.call).not.toHaveBeenCalled();
    component.draft.reason = 'Supplies';
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.submit();
    expect(api.call).toHaveBeenCalledWith(
      'P18-032',
      expect.objectContaining({
        body: expect.objectContaining({ reason: 'Supplies', paidNow: false }),
      }),
    );
    expect(component.draft.reason).toBe('Supplies');
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('never invents a reception employee when creating a salary plan', async () => {
    component.salary.set(true);
    component.openCreate('createPlan');
    component.draft.amount = '100';
    component.draft.effectiveFrom = '2026-10-29';
    await component.submit();
    expect(api.call).not.toHaveBeenCalled();
    expect(component.draft.receptionId).toBe('');
  });

  it('records salary against the salary obligation with the settlement permission', async () => {
    component.salary.set(true);
    component.selectedObligation.set({
      ...obligation,
      kind: 'Salary',
      availableActions: [{ code: 'Settle', allowed: true }],
    });
    component.prepare('settle');
    component.draft.paymentConfirmed = true;
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.submit();
    expect(api.call).toHaveBeenCalledWith(
      'P18-086',
      expect.objectContaining({
        path: { id: 'obligation-id' },
        body: expect.objectContaining({ amount: 50, rowVersion: 'rv1' }),
        idempotencyKey: expect.any(String),
      }),
    );
    api.call.mockClear();
    vi.spyOn(TestBed.inject(AuthSession), 'hasPermission').mockImplementation(
      (code) => code !== 'SalarySettlements.RecordOwn',
    );
    await component.submit();
    expect(api.call).not.toHaveBeenCalled();
  });

  it('loads salary receipt JSON and history and reverses using the associated obligation version', async () => {
    component.salary.set(true);
    const payment = {
      id: 'salary-payment',
      amount: 50,
      receiptNumber: 'SAL-1',
      obligationRowVersion: 'obligation-rv',
      availableActions: [{ code: 'Reverse', allowed: true }],
    };
    api.call.mockImplementation((endpoint: string) =>
      of(endpoint === 'P18-088' ? { items: [] } : payment),
    );
    await component.openSettlement('salary-payment');
    expect(api.call.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'P18-087',
      'P18-089',
      'P18-088',
    ]);
    expect(component.receipt()?.receiptNumber).toBe('SAL-1');
    component.prepare('reverse');
    component.draft.reason = 'Wrong payment';
    api.call.mockClear().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.submit();
    expect(api.call).toHaveBeenCalledWith(
      'P18-090',
      expect.objectContaining({
        path: { id: 'salary-payment' },
        body: expect.objectContaining({ rowVersion: 'obligation-rv', reason: 'Wrong payment' }),
      }),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('creates PaidNow atomically with an independent payment date and no separate settlement request', async () => {
    component.openCreate('createExpense');
    Object.assign(component.draft, {
      amount: '1500',
      descriptionAr: 'صيانة',
      reason: 'Maintenance',
      allocations: [
        { practiceId: 'p1', percentage: 60 },
        { practiceId: 'p2', percentage: 40 },
      ],
      paidNow: true,
      paymentConfirmed: true,
      reference: 'QA-ref',
    });
    api.call.mockImplementation((endpoint: string) => {
      if (endpoint === 'P18-032')
        return of({ id: 'new-expense', resourceType: 'Expense', settlementId: 'expense-payment' });
      if (['P18-027', 'P18-029'].includes(endpoint))
        return of({ id: 'expense-payment', receiptNumber: 'EXP-1' });
      return of({ items: [] });
    });
    await component.submit();
    expect(api.call).toHaveBeenCalledWith(
      'P18-032',
      expect.objectContaining({
        body: expect.objectContaining({
          paidNow: true,
          allocations: [
            { practiceId: 'p1', percentage: 60 },
            { practiceId: 'p2', percentage: 40 },
          ],
          payment: expect.objectContaining({
            amount: 1500,
            reference: 'QA-ref',
            paidBusinessDate: component.draft.paymentDate,
          }),
        }),
      }),
    );
    expect(
      api.call.mock.calls.filter(([endpoint]) => ['P18-043', 'P18-086'].includes(endpoint)),
    ).toHaveLength(0);
    expect(component.receipt()?.receiptNumber).toBe('EXP-1');
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate, unrelated and non-100-percent allocations without writing', async () => {
    component.openCreate('createExpense');
    Object.assign(component.draft, {
      amount: '100',
      descriptionAr: 'مستلزمات',
      reason: 'Supplies',
    });
    for (const rows of [
      [],
      [{ practiceId: 'p1', percentage: 99 }],
      [
        { practiceId: 'p1', percentage: 50 },
        { practiceId: 'p1', percentage: 50 },
      ],
      [{ practiceId: 'other', percentage: 100 }],
    ]) {
      component.setAllocations(rows);
      await component.submit();
    }
    expect(api.call).not.toHaveBeenCalled();
    component.setAllocations([
      { practiceId: 'p1', percentage: 33.33 },
      { practiceId: 'p2', percentage: 66.67 },
    ]);
    expect(component.validAllocations()).toBe(true);
  });

  it('rejects unconfirmed, future, unsupported and unexplained backdated payments', async () => {
    component.selectedObligation.set(obligation);
    component.prepare('settle');
    await component.submit();
    component.draft.paymentConfirmed = true;
    component.draft.businessDate = '2999-01-01';
    await component.submit();
    component.draft.businessDate = '2020-01-01';
    await component.submit();
    component.draft.backdateReason = 'Late recording';
    component.options.set({ paymentMethods: [] });
    await component.submit();
    expect(api.call).not.toHaveBeenCalled();
    expect(component.messages()).toContain('operating.invalidPayment');
  });

  it('keeps multi-practice allocations when revising a plan', () => {
    component.selectedPlan.set({
      id: 'plan',
      rowVersion: 'rv',
      availableActions: [{ code: 'Revise', allowed: true }],
      revisions: [
        {
          amount: 100,
          allocations: [
            { practiceId: 'p1', percentage: 60 },
            { practiceId: 'p2', percentage: 40 },
          ],
        },
      ],
    });
    component.editPlan();
    expect(component.draft.allocations).toEqual([
      { practiceId: 'p1', percentage: 60 },
      { practiceId: 'p2', percentage: 40 },
    ]);
  });

  it('loads server overview and paginated financial movements without deriving totals', async () => {
    api.call.mockReturnValueOnce(of({ metrics: [{ metricCode: 'PaidOperatingExpenses', value: 90 }], dataStatus: 'Partial' }));
    await component.switchTab('overview');
    expect(api.call).toHaveBeenCalledWith('P18-036', expect.anything());
    expect(component.overview()?.metrics?.[0].value).toBe(90);
    api.call.mockReturnValueOnce(of({ items: [{ id: 'movement', amount: 90, movementType: 'Settlement' }], totalCount: 40 }));
    await component.switchTab('transactions');
    expect(api.call).toHaveBeenCalledWith('P18-044', expect.anything());
    expect(component.movements()).toHaveLength(1); expect(component.total()).toBe(40);
  });

  it('pages history using the selected salary settlement identifier', async () => {
    component.salary.set(true); component.settlement.set({ id: 'settlement' }); component.historyTotal.set(21);
    api.call.mockReturnValueOnce(of({ items: [{ id: 'history-entry' }], totalCount: 21 }));
    await component.loadHistoryPage(2);
    expect(api.call).toHaveBeenCalledWith('P18-088', { path: { id: 'settlement' }, query: { pageNumber: 2, pageSize: 20 } });
    expect(component.historyPage()).toBe(2); expect(component.history()[0].id).toBe('history-entry');
  });
});

describe('Recurring Expense Plan CRUD', () => {
  it('should open and close recurring expense plan drawer with default values', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Phase18Api, useValue: { call: () => of({ items: [] }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { actor: 'Doctor', view: 'expenses' },
              queryParamMap: { get: () => null },
            },
          },
        },

        { provide: AuthSession, useValue: { hasPermission: () => true } },
      ],
    });

    const fixture = TestBed.createComponent(OperatingFinanceComponent);
    const comp = fixture.componentInstance;
    await fixture.whenStable();

    expect(comp.drawer()).toBe(false);

    comp.openCreate('createPlan');
    expect(comp.drawer()).toBe(true);
    expect(comp.selectedPlan()).toBeNull();
    expect(comp.draft.category).toBe('Other');
    expect(comp.draft.cadence).toBe('Monthly');

    comp.close();
    expect(comp.drawer()).toBe(false);
  });

  it('should populate drawer when editing an existing plan', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Phase18Api, useValue: { call: () => of({ items: [] }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { actor: 'Doctor', view: 'expenses' },
              queryParamMap: { get: () => null },
            },
          },
        },

        { provide: AuthSession, useValue: { hasPermission: () => true } },
      ],
    });

    const fixture = TestBed.createComponent(OperatingFinanceComponent);
    const comp = fixture.componentInstance;
    await fixture.whenStable();

    const samplePlan = {
      id: 'plan-99',
      category: 'Rent',
      cadence: 'Monthly',
      dueDay: 5,
      amount: 5000,
      amountPolicy: 'Fixed',
      effectiveFrom: '2026-10-01',
      descriptionAr: 'إيجار الشهر',
    };

    comp.selectedPlan.set({
      ...samplePlan,
      rowVersion: 'rv1',
      availableActions: [{ code: 'Revise', allowed: true }],
      revisions: [{ amount: 5000, dueDay: 5, category: 'Rent' }],
    });
    comp.drawer.set(true);
    comp.editPlan();
    expect(comp.drawer()).toBe(true);
    expect(comp.selectedPlan()).toEqual(expect.objectContaining({ id: samplePlan.id }));
    expect(comp.draft.category).toBe('Rent');
    expect(comp.draft.amount).toBe('5000');
    expect(comp.draft.dueDay).toBe(5);
  });
});
