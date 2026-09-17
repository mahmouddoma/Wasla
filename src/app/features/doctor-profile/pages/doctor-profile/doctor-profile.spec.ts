import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import { DoctorSpecializationRequest } from '../../../../domains/doctor-profile';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorProfile } from './doctor-profile';

describe('DoctorProfile specialization mutations', () => {
  it('keeps legacy not-found handling independent of the selected UI language', () => {
    const component = fixture.componentInstance;
    const error = new HttpErrorResponse({ status: 400, error: { detail: 'الموقع غير موجود' } });
    TestBed.inject(LanguageService).setLanguage('ar');
    expect(component['isNotFound'](error)).toBe(true);
    TestBed.inject(LanguageService).setLanguage('en');
    expect(component['isNotFound'](error)).toBe(true);
  });
  let fixture: ComponentFixture<DoctorProfile>;
  const request: DoctorSpecializationRequest = {
    requestId: 'request-1', type: 'Initial', status: 'PendingReview', currentRevisionNumber: 1,
    latestRevision: [], latestModificationMessage: null, rowVersion: 'AQID',
  };
  const api = {
    submitSpecializations: vi.fn(() => of(request)),
    resubmitSpecializations: vi.fn(() => of(request)),
    specializationHistory: vi.fn(() => of([])),
  };
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    api.submitSpecializations.mockReturnValue(of(request));
    TestBed.configureTestingModule({ imports: [DoctorProfile], providers: [provideRouter([]),
      { provide: DoctorProfileApi, useValue: api }, { provide: ToastService, useValue: toast },
      { provide: AuthSession, useValue: { hasPermission: (permission: string) =>
        permission === PERMISSIONS.doctorSpecializationsSubmitOwn || permission === PERMISSIONS.doctorSpecializationsResubmitOwn } },
    ] });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(DoctorProfile);
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('renders the profile and prevents an invalid selection from reaching the API', async () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-public-profile-manager')).not.toBeNull();
    await fixture.componentInstance['saveSpecializations']();
    expect(api.submitSpecializations).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(TestBed.inject(LanguageService).t('doctor.specializationsInvalid'));
  });

  it('preserves the initial request and refreshes history after success', async () => {
    const selected = [{ medicalSpecializationId: 'specialty-1', isPrimary: true }];
    fixture.componentInstance['selected'].set(selected);
    await fixture.componentInstance['saveSpecializations']();
    expect(api.submitSpecializations).toHaveBeenCalledWith({ specializations: selected });
    expect(api.resubmitSpecializations).not.toHaveBeenCalled();
    expect(fixture.componentInstance['openRequest']()).toEqual(request);
    expect(api.specializationHistory).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith(TestBed.inject(LanguageService).t('doctor.specializationsSubmitted'));
  });

  it('preserves optimistic concurrency on resubmission and uses the active language for feedback', async () => {
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.componentInstance['openRequest'].set({ ...request, status: 'ModificationRequested' });
    const selected = [{ medicalSpecializationId: 'specialty-2', isPrimary: true }];
    fixture.componentInstance['selected'].set(selected);
    await fixture.componentInstance['saveSpecializations']();
    expect(api.resubmitSpecializations).toHaveBeenCalledWith({ specializations: selected, rowVersion: 'AQID' });
    expect(api.submitSpecializations).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Specialization request resubmitted successfully.');
  });

  it('retains the proposal and releases busy state on server rejection', async () => {
    const selected = [{ medicalSpecializationId: 'specialty-1', isPrimary: true }];
    fixture.componentInstance['selected'].set(selected);
    api.submitSpecializations.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    await fixture.componentInstance['saveSpecializations']();
    expect(fixture.componentInstance['selected']()).toEqual(selected);
    expect(fixture.componentInstance['openRequest']()).toBeNull();
    expect(fixture.componentInstance['isSpecializationSubmitting']()).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(TestBed.inject(LanguageService).t('doctor.specializationsFailed'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
