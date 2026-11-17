import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser } from '../../../core/auth/auth.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { AppHeader } from './app-header';
import { HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { PatientsApi } from '../../../domains/patients/patients-api';

describe('AppHeader', () => {
  let fixture: ComponentFixture<AppHeader>;
  const patientsApi = { profileImage: vi.fn(() => new Subject<HttpResponse<Blob>>()) };
  const user: CurrentUser = {
    applicationUserId: 'user-1',
    userName: 'منى أحمد',
    email: 'mona@example.com',
    phoneNumber: '01012345678',
    roles: ['Reception'],
    userType: 'Reception',
    permissions: [],
    isFirstLogin: false,
    doctorId: null,
    patientId: null,
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHeader],
      providers: [provideRouter([]), { provide: PatientsApi, useValue: patientsApi }],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(AppHeader);
    fixture.componentRef.setInput('user', user);
    fixture.componentRef.setInput('home', '/workspace/reception');
    fixture.componentRef.setInput('menuId', 'test-sidebar');
    fixture.detectChanges();
  });
  afterEach(() => {
    TestBed.inject(LanguageService).setLanguage('ar');
    localStorage.removeItem('wasla_lang');
    vi.unstubAllGlobals();
  });
  const root = () => fixture.nativeElement as HTMLElement;
  const openProfile = () => {
    root().querySelector<HTMLButtonElement>('.btn-user-avatar-trigger')!.click();
    fixture.detectChanges();
  };

  it('renders the same brand, account, language and logout controls', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(root().querySelector('.header-brand')?.getAttribute('href')).toBe(
      '/workspace/reception',
    );
    expect(root().querySelector('.avatar-letter')?.textContent).toContain('م');
    expect(root().querySelector('app-language-switcher')).not.toBeNull();
    expect(root().querySelector('.btn-topbar-logout')).not.toBeNull();
    expect(root().querySelector('.user-popover-card')).toBeNull();
  });
  it('emits menu toggles and reflects the drawer state', () => {
    const toggle = vi.fn();
    fixture.componentInstance.menuToggle.subscribe(toggle);
    const button = root().querySelector<HTMLButtonElement>('.btn-mobile-menu')!;
    expect(button.getAttribute('aria-controls')).toBe('test-sidebar');
    button.click();
    expect(toggle).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('menuExpanded', true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
  it('shows current account information and closes on Escape or outside click', () => {
    openProfile();
    expect(root().querySelector('[role="dialog"]')?.textContent).toContain('mona@example.com');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(root().querySelector('[role="dialog"]')).toBeNull();
    openProfile();
    document.body.click();
    fixture.detectChanges();
    expect(root().querySelector('[role="dialog"]')).toBeNull();
  });
  it('keeps the profile open while interacting with it', () => {
    openProfile();
    root().querySelector<HTMLElement>('[role="dialog"]')!.click();
    fixture.detectChanges();
    expect(root().querySelector('[role="dialog"]')).not.toBeNull();
  });
  it('emits logout from both header and account menu', () => {
    const logout = vi.fn();
    fixture.componentInstance.logout.subscribe(logout);
    root().querySelector<HTMLButtonElement>('.btn-topbar-logout')!.click();
    openProfile();
    root().querySelector<HTMLButtonElement>('.btn-popover-logout')!.click();
    expect(logout).toHaveBeenCalledTimes(2);
  });
  it('does not expose internal technical user ID to the user in profile popover', () => {
    openProfile();
    expect(root().querySelector('.info-row-copyable')).toBeNull();
    expect(root().querySelector('[role="dialog"]')?.textContent).not.toContain('user-1');
  });
  it('updates labels and direction when language changes', () => {
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    expect(root().querySelector('header')?.getAttribute('dir')).toBe('ltr');
    expect(root().querySelector('.btn-topbar-logout')?.getAttribute('aria-label')).toBe('Sign Out');
  });

  it('renders the guest navigation and auth actions when user is null', () => {
    fixture.componentRef.setInput('user', null);
    fixture.detectChanges();

    const links = root().querySelectorAll('.header-role-nav .header-nav-link');
    expect(links.length).toBe(4);
    expect(root().querySelector('#header-login-btn')).not.toBeNull();
    expect(root().querySelector('#header-start-cta')).not.toBeNull();

    // Test guest mobile drawer toggle
    const mobileBtn = root().querySelector<HTMLButtonElement>('.btn-guest-mobile-menu');
    expect(mobileBtn).not.toBeNull();
    expect(root().querySelector('#header-guest-mobile-drawer')).toBeNull();

    mobileBtn!.click();
    fixture.detectChanges();
    expect(root().querySelector('#header-guest-mobile-drawer')).not.toBeNull();
  });

  describe('patient avatar lifetime', () => {
    let pending: Subject<HttpResponse<Blob>>;
    const patient = { ...user, userType: 'Patient' as const, patientId: 'patient-A' };
    const image = () => new HttpResponse({ body: new Blob(['image'], { type: 'image/png' }) });
    beforeEach(() => {
      vi.stubGlobal('URL', class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:current-avatar');
        static override revokeObjectURL = vi.fn();
      });
      pending = new Subject<HttpResponse<Blob>>();
      patientsApi.profileImage.mockReturnValueOnce(pending);
      fixture.componentRef.setInput('user', patient);
      fixture.detectChanges();
    });

    it.each(['patient', 'anonymous', 'destroy'] as const)('cancels old requests on %s', (change) => {
      if (change === 'destroy') fixture.destroy();
      else {
        fixture.componentRef.setInput('user', change === 'anonymous' ? null : { ...patient, patientId: 'B', applicationUserId: 'B' });
        fixture.detectChanges();
      }
      expect(pending.observed).toBe(false);
      pending.next(image());
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(fixture.componentInstance['avatarUrl']()).toBeNull();
    });

    it('clears the old avatar immediately, preserves the newer success on an old error, and revokes on destroy', () => {
      const calls = patientsApi.profileImage.mock.calls.length;
      pending.next(image());
      fixture.detectChanges();
      expect(patientsApi.profileImage.mock.calls.length).toBe(calls);
      expect(fixture.componentInstance['avatarUrl']()).toBe('blob:current-avatar');
      const next = new Subject<HttpResponse<Blob>>();
      patientsApi.profileImage.mockReturnValueOnce(next);
      fixture.componentRef.setInput('user', { ...patient, patientId: 'B', applicationUserId: 'B' });
      fixture.detectChanges();
      expect(fixture.componentInstance['avatarUrl']()).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:current-avatar');
      next.next(image());
      pending.error(new Error('old failure'));
      expect(fixture.componentInstance['avatarUrl']()).toBe('blob:current-avatar');
      fixture.destroy();
      expect(next.observed).toBe(false);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    });
  });
});
