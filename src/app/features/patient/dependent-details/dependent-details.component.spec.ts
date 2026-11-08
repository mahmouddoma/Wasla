import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { FamilyWorkspaceApi } from '../../../domains/families';
import { FinanceApi } from '../../../domains/finance';
import { ToastService } from '../../../core/notifications/toast.service';
import { childFixture } from '../../../../testing/family-workspace';
import { DependentDetailsComponent } from './dependent-details.component';

describe('DependentDetailsComponent', () => {
  const api = { profile: vi.fn(), activeTickets: vi.fn(), updatePhone: vi.fn() };
  const finance = { dependentTransactions: vi.fn(), dependentPaymentReceipt: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    api.profile.mockReturnValue(
      of({
        patientId: 'child',
        nameAr: 'طفل',
        nameEn: null,
        dateOfBirth: '2020-01-01',
        phoneNumber: null,
        hasProfileImage: false,
        rowVersion: 'AAAA',
        contacts: [],
      }),
    );
    TestBed.configureTestingModule({
      imports: [DependentDetailsComponent],
      providers: [
        { provide: FamilyWorkspaceApi, useValue: api },
        { provide: FinanceApi, useValue: finance },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  it('does not infer profile or ticket access from booking capability', async () => {
    const fixture = TestBed.createComponent(DependentDetailsComponent);
    fixture.componentRef.setInput('child', childFixture({ canBook: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.activeTickets).not.toHaveBeenCalled();
  });
  it('loads the selected child profile and hides editing when contacts are read only', async () => {
    const fixture = TestBed.createComponent(DependentDetailsComponent);
    fixture.componentRef.setInput('child', childFixture({ canViewProfile: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.profile).toHaveBeenCalledWith('child');
    expect(fixture.nativeElement.querySelector('input[type=tel]')).toBeNull();
  });
  it('keeps receipt reads independent from transaction reads', async () => {
    const fixture = TestBed.createComponent(DependentDetailsComponent);
    fixture.componentRef.setInput(
      'child',
      childFixture({ canViewTransactions: true, canViewReceipts: false }),
    );
    fixture.detectChanges();
    await fixture.componentInstance.openReceipt({ transactionId: 'p' } as never);
    expect(finance.dependentPaymentReceipt).not.toHaveBeenCalled();
  });
  it('purges profile data and reports scope revocation', async () => {
    api.profile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const fixture = TestBed.createComponent(DependentDetailsComponent);
    fixture.componentRef.setInput('child', childFixture({ canViewProfile: true }));
    const revoked = vi.fn();
    fixture.componentInstance.invalidated.subscribe(revoked);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.profile()).toBeNull();
    expect(revoked).toHaveBeenCalled();
  });
});
