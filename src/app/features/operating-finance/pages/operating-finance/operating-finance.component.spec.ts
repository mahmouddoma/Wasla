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
  });
  it('does not fabricate rows when finance cannot load', async () => {
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.load();
    expect(component.plans()).toEqual([]);
    expect(component.failed()).toBe(true);
  });
  it('settles an obligation using its own ID and current rowVersion', async () => {
    component.selectedObligation.set(obligation);
    component.prepare('settle');
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
    api.call.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await component.submit();
    await component.submit();
    expect(api.call.mock.calls[0][1].idempotencyKey).toBe(api.call.mock.calls[1][1].idempotencyKey);
  });
  it('blocks double-submit and missing capability', async () => {
    component.selectedObligation.set(obligation);
    component.prepare('settle');
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
