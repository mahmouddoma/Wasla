import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { DoctorRegistration } from './doctor-registration';

describe('DoctorRegistration', () => {
  let fixture: ComponentFixture<DoctorRegistration>;
  let component: DoctorRegistration;
  const api = {
    registerDoctor: vi.fn(() => of(undefined)),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    api.registerDoctor.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      imports: [DoctorRegistration],
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(DoctorRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('creates component and renders all registration fields', () => {
    expect(component).toBeTruthy();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('form')).not.toBeNull();
    expect(element.querySelectorAll('app-file-upload').length).toBe(5);
  });

  it('rejects submission when mandatory files are missing', async () => {
    component['model'].set({
      userName: 'dr_john',
      email: 'dr_john@example.com',
      phoneNumber: '01012345678',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      nameAr: 'د. جون سميث',
      nameEn: 'Dr. John Smith',
      dateOfBirth: '1985-05-15',
      gender: 'Male',
    });
    fixture.detectChanges();

    await component['onSubmit'](new Event('submit', { cancelable: true }));

    expect(api.registerDoctor).not.toHaveBeenCalled();
    expect(component['filesError']()).toContain('أرفق الوجهين');
  });

  it('submits doctor registration with valid model and files, notifies and navigates', async () => {
    const dummyFile = new File(['content'], 'dummy.png', { type: 'image/png' });
    component['model'].set({
      userName: 'dr_john',
      email: 'dr_john@example.com',
      phoneNumber: '01012345678',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      nameAr: 'د. جون سميث',
      nameEn: 'Dr. John Smith',
      dateOfBirth: '1985-05-15',
      gender: 'Male',
    });
    component['personalIdFrontImage'].set(dummyFile);
    component['personalIdBackImage'].set(dummyFile);
    component['syndicateCardFrontImage'].set(dummyFile);
    fixture.detectChanges();

    await component['onSubmit'](new Event('submit', { cancelable: true }));

    expect(api.registerDoctor).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { status: 'doctor-registered' },
    });
  });

  it('handles server errors gracefully and maps error messages', async () => {
    const dummyFile = new File(['content'], 'dummy.png', { type: 'image/png' });
    component['model'].set({
      userName: 'dr_john',
      email: 'dr_john@example.com',
      phoneNumber: '01012345678',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      nameAr: 'د. جون سميث',
      nameEn: 'Dr. John Smith',
      dateOfBirth: '1985-05-15',
      gender: 'Male',
    });
    component['personalIdFrontImage'].set(dummyFile);
    component['personalIdBackImage'].set(dummyFile);
    component['syndicateCardFrontImage'].set(dummyFile);
    fixture.detectChanges();

    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Username is taken',
        errors: {
          UserName: ['The username is already taken.'],
        },
      },
    });
    api.registerDoctor.mockReturnValue(throwError(() => errorResponse));

    await component['onSubmit'](new Event('submit', { cancelable: true }));

    expect(component['fieldErrors']()['username']).toEqual(['The username is already taken.']);
    expect(component['serverError']('username')).toBe('The username is already taken.');
  });

  it('toggles password visibility', () => {
    expect(component['showPasswords']()).toBe(false);
    component['togglePasswords']();
    expect(component['showPasswords']()).toBe(true);
  });
});
