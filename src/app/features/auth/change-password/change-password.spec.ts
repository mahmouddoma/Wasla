import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { ChangePassword } from './change-password';

describe('ChangePassword', () => {
  let fixture: ComponentFixture<ChangePassword>;
  const api = { changePassword: vi.fn(() => of(undefined)) };
  const session = { clear: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    api.changePassword.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [ChangePassword],
      providers: [provideRouter([]), { provide: AuthApi, useValue: api },
        { provide: AuthSession, useValue: session }, { provide: ToastService, useValue: toast }],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ChangePassword);
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  async function fill(confirm = 'NewPassword1!'): Promise<void> {
    const values = ['OldPassword1!', 'NewPassword1!', confirm];
    const element: HTMLElement = fixture.nativeElement;
    element.querySelectorAll<HTMLInputElement>('input').forEach((input, index) => {
      input.value = values[index];
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await fixture.whenStable();
  }

  function save(): Promise<void> {
    return fixture.componentInstance['onSubmit'](new Event('submit', { cancelable: true }));
  }

  it('renders translated labels and toggles password visibility', async () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('تغيير كلمة المرور');
    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    expect(element.querySelector('h1')?.textContent).toContain('Change password');
    const button = element.querySelector<HTMLButtonElement>('.btn-toggle-pwd')!;
    expect(button.getAttribute('aria-label')).toBe('Show password');
    button.click();
    await fixture.whenStable();
    expect(element.querySelector('input')?.type).toBe('text');
    expect(button.getAttribute('aria-label')).toBe('Hide password');
  });

  it('preserves the request, clears the session, notifies and redirects after success', async () => {
    await fill();
    await save();
    expect(api.changePassword).toHaveBeenCalledWith({ currentPassword: 'OldPassword1!', newPassword: 'NewPassword1!', confirmPassword: 'NewPassword1!' });
    expect(session.clear).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith(TestBed.inject(LanguageService).t('changePassword.success'));
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { status: 'password-changed' } });
  });

  it('rejects mismatched confirmation and renders validation in the selected language', async () => {
    await fill('Different1!');
    await save();
    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    expect(api.changePassword).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password confirmation does not match.');
    expect(session.clear).not.toHaveBeenCalled();
  });

  it('shows error feedback without clearing the session or redirecting', async () => {
    api.changePassword.mockReturnValue(throwError(() => new Error('offline')));
    await fill();
    await save();
    await fixture.whenStable();
    expect(toast.error).toHaveBeenCalledWith(TestBed.inject(LanguageService).t('changePassword.failure'));
    expect(session.clear).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
  });

  it('disables submission while a request is pending and avoids duplicate requests', async () => {
    const pending = new Subject<undefined>();
    api.changePassword.mockReturnValue(pending);
    await fill();
    const saving = save();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#change-password-submit-btn')?.disabled).toBe(true);
    await save();
    expect(api.changePassword).toHaveBeenCalledOnce();
    pending.next(undefined);
    pending.complete();
    await saving;
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#change-password-submit-btn')?.disabled).toBe(false);
  });
});
