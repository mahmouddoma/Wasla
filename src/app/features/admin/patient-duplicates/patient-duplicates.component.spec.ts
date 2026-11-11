import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { PatientDuplicateDetails, PatientDuplicateStatus, PatientDuplicatesPage, PatientIdentityApi } from '../../../domains/patient-identity';
import { PatientDuplicatesComponent } from './patient-duplicates.component';

describe('PatientDuplicatesComponent', () => {
  const detail: PatientDuplicateDetails = {
    caseId: 'case-1', status: 'NeedsMoreEvidence', rowVersion: 'rv1', createdOnUtc: '2026-11-09T10:00:00Z', matchIndicators: 'PhoneOrDemographics',
    patientA: { id: 'patient-a', nameAr: 'Synthetic A', dateOfBirth: '1990-01-01', gender: 'Male', emailMasked: 'a***@example.invalid' },
    patientB: { id: 'patient-b', nameAr: 'Synthetic B', dateOfBirth: '1990-01-01', gender: 'Male', emailMasked: 'b***@example.invalid' },
  };
  const row = { caseId: 'case-1', firstPatientId: 'patient-a', secondPatientId: 'patient-b', status: 'NeedsMoreEvidence' as const, createdOnUtc: detail.createdOnUtc, rowVersion: 'rv1' };
  const grants = signal(['PatientDuplicates.View', 'PatientDuplicates.Resolve']);
  const api = {
    adminDuplicates: vi.fn<(page?: number, size?: number, status?: PatientDuplicateStatus) => Observable<PatientDuplicatesPage>>(),
    adminDuplicateDetails: vi.fn<() => Observable<PatientDuplicateDetails>>(),
    resolveDuplicate: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks(); grants.set(['PatientDuplicates.View', 'PatientDuplicates.Resolve']);
    api.adminDuplicates.mockImplementation((page = 1) => of({ items: [row], pageNumber: page, pageSize: 20, totalCount: 25 }));
    api.adminDuplicateDetails.mockReturnValue(of(detail));
    api.resolveDuplicate.mockReturnValue(of({ caseId: 'case-1', status: 'DistinctPatients', rowVersion: 'rv2' }));
    TestBed.configureTestingModule({ imports: [PatientDuplicatesComponent], providers: [
      { provide: PatientIdentityApi, useValue: api }, { provide: ToastService, useValue: toast },
      { provide: AuthSession, useValue: { user: () => ({ userType: 'SuperAdmin' }), hasPermission: (permission: string) => grants().includes(permission) } },
    ] });
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  async function create() {
    const fixture = TestBed.createComponent(PatientDuplicatesComponent);
    await fixture.whenStable(); fixture.detectChanges();
    return fixture;
  }
  it('loads a permission-scoped queue with supported filters and real page numbers, without exposing identifiers', async () => {
    const fixture = await create();
    expect(api.adminDuplicates).toHaveBeenCalledWith(1, 20, 'NeedsMoreEvidence');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('patient-a');
    await fixture.componentInstance['load'](2);
    expect(api.adminDuplicates).toHaveBeenLastCalledWith(2, 20, 'NeedsMoreEvidence');
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'DistinctPatients'; select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.adminDuplicates).toHaveBeenLastCalledWith(1, 20, 'DistinctPatients');
  });
  it('opens a detail drawer and submits only an explicit reasoned classification with version and idempotency', async () => {
    const fixture = await create();
    await fixture.componentInstance['inspect']('case-1'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.duplicate-comparison').textContent).toContain('Synthetic A');
    await fixture.componentInstance['resolve'](new Event('submit'));
    expect(api.resolveDuplicate).not.toHaveBeenCalled();
    fixture.componentInstance['model'].set({ resolution: 'DistinctPatients', reason: 'Original identity evidence confirms different people' });
    await fixture.componentInstance['resolve'](new Event('submit'));
    expect(api.resolveDuplicate).toHaveBeenCalledWith('case-1', { resolution: 'DistinctPatients', reason: 'Original identity evidence confirms different people', rowVersion: 'rv1' }, expect.any(String));
    expect(toast.success).toHaveBeenCalled();
    expect(fixture.componentInstance['drawerOpen']()).toBe(false);
  });
  it('reloads a conflicted case and requires a fresh decision against the new version', async () => {
    const fixture = await create(); await fixture.componentInstance['inspect']('case-1');
    fixture.componentInstance['model'].set({ resolution: 'ConfirmedDuplicate', reason: 'Verified evidence' });
    api.resolveDuplicate.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.adminDuplicateDetails.mockReturnValueOnce(of({ ...detail, rowVersion: 'rv2' }));
    await fixture.componentInstance['resolve'](new Event('submit'));
    expect(toast.error).toHaveBeenCalled();
    expect(fixture.componentInstance['selected']()?.rowVersion).toBe('rv2');
    expect(fixture.componentInstance['model']().resolution).toBe('');
    expect(api.resolveDuplicate).toHaveBeenCalledTimes(1);
  });
  it('does not read without view permission or classify without resolve permission', async () => {
    grants.set([]); const denied = await create();
    expect(api.adminDuplicates).not.toHaveBeenCalled();
    expect(denied.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    grants.set(['PatientDuplicates.View']); const fixture = await create();
    await fixture.componentInstance['inspect']('case-1'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    fixture.componentInstance['model'].set({ resolution: 'DistinctPatients', reason: 'Evidence' });
    await fixture.componentInstance['resolve'](new Event('submit'));
    expect(api.resolveDuplicate).not.toHaveBeenCalled();
  });
  it('renders an illustrated empty state and clears private metadata after an authorization failure', async () => {
    api.adminDuplicates.mockReturnValueOnce(of({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }));
    const fixture = await create();
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
    await fixture.componentInstance['inspect']('case-1');
    api.adminDuplicates.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    await fixture.componentInstance['load'](); fixture.detectChanges();
    expect(fixture.componentInstance['selected']()).toBeNull();
    expect(fixture.nativeElement.querySelector('.duplicate-comparison')).toBeNull();
  });
});
