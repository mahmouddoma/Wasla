import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PracticeAllocationComponent } from './practice-allocation.component';
import { AuthSession } from '../../../../core/auth/auth-session';
import {
  SubscriptionsApi,
  SubscriptionState,
  PracticeAllocationDetails,
} from '../../../../domains/subscriptions';
import { ToastService } from '../../../../core/notifications/toast.service';
import { contractFixture } from '../../../../../testing/subscriptions';
describe('PracticeAllocationComponent', () => {
  const source = contractFixture('source'),
    target = contractFixture('target');
  const allocation: PracticeAllocationDetails = {
    practiceId: 'clinic',
    allocation: {
      id: 'allocation',
      doctorPracticeId: 'clinic',
      subscriptionContractId: 'source',
      rowVersion: 'fresh',
      allocatedFromUtc: '2026-01-01',
      releasedAtUtc: null,
    },
    effectivePeriod: source.periods[0].subscription,
    contractUsage: source.usage,
    activeReceptionIds: [],
  };
  const api = {
    moveAllocation: vi.fn(),
    releaseAllocation: vi.fn(),
    allocationReceptionOptions: vi.fn(() => of([])),
  };
  const state = {
    refresh: vi.fn(async () => null),
    refreshPractice: vi.fn(async () => allocation),
    availableContracts: () => [source, target],
    contracts: () => [source, target],
    currentDetails: (c: typeof source) => c.periods[0],
    effective: () => true,
    invalidate: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    api.moveAllocation.mockReturnValue(of(allocation));
    api.releaseAllocation.mockReturnValue(of({ ...allocation, allocation: null }));
    TestBed.configureTestingModule({
      imports: [PracticeAllocationComponent],
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: { hasPermission: () => true } },
        { provide: SubscriptionsApi, useValue: api },
        { provide: SubscriptionState, useValue: state },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  async function start() {
    const f = TestBed.createComponent(PracticeAllocationComponent);
    f.componentRef.setInput('practice', {
      id: 'clinic',
      rowVersion: 'practice-version',
      nameAr: 'Clinic',
      isActive: true,
    });
    await f.whenStable();
    return f;
  }
  it('renders the current allocation and loads the exact practice', async () => {
    const f = await start();
    expect(f.componentInstance.value()?.allocation?.id).toBe('allocation');
    expect(state.refreshPractice).toHaveBeenCalledWith('clinic');
    expect(f.nativeElement.querySelector('.allocation-panel')).not.toBeNull();
  });
  it('requires an explicit destination and sends allocation revision with only retained profiles', async () => {
    const f = await start(),
      c = f.componentInstance;
    await c.open('move');
    await c.confirm();
    expect(api.moveAllocation).not.toHaveBeenCalled();
    c.targetId.set('target');
    c.selectedStaff.set(['reception-profile']);
    await c.confirm();
    expect(api.moveAllocation).toHaveBeenCalledWith(
      'clinic',
      {
        targetSubscriptionContractId: 'target',
        continuedReceptionIds: ['reception-profile'],
        rowVersion: 'fresh',
      },
      expect.any(String),
    );
    expect(toast.success).toHaveBeenCalledWith('subscriptions.allocationSaved');
  });
  it('releases allocation without deleting a practice and refreshes both contract and practice', async () => {
    const f = await start(),
      c = f.componentInstance;
    await c.open('release');
    c.reason = 'Stop new operations';
    await c.confirm();
    expect(api.releaseAllocation).toHaveBeenCalledWith(
      'clinic',
      { rowVersion: 'fresh', reason: 'Stop new operations' },
      expect.any(String),
    );
    expect(state.invalidate).toHaveBeenCalledOnce();
    expect(state.refreshPractice).toHaveBeenCalledTimes(2);
  });
  it('keeps the same key on uncertain retries without claiming success', async () => {
    const f = await start(),
      c = f.componentInstance;
    await c.open('release');
    api.releaseAllocation.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await c.confirm();
    await c.confirm();
    expect(api.releaseAllocation.mock.calls[0][2]).toBe(api.releaseAllocation.mock.calls[1][2]);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
