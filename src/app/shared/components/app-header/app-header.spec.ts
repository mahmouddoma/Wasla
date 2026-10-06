import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser } from '../../../core/auth/auth.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { AppHeader } from './app-header';

describe('AppHeader', () => {
  let fixture: ComponentFixture<AppHeader>;
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
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(AppHeader);
    fixture.componentRef.setInput('user', user);
    fixture.componentRef.setInput('home', '/workspace/reception');
    fixture.componentRef.setInput('menuId', 'test-sidebar');
    fixture.detectChanges();
  });
  afterEach(() => {
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
  it('copies the account ID and shows feedback after clipboard success', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    openProfile();
    root().querySelector<HTMLButtonElement>('.info-row-copyable')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledWith('user-1');
    expect(root().querySelector('.copied-pill')).not.toBeNull();
  });
  it('updates labels and direction when language changes', () => {
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    expect(root().querySelector('header')?.getAttribute('dir')).toBe('ltr');
    expect(root().querySelector('.btn-topbar-logout')?.getAttribute('aria-label')).toBe('Sign Out');
  });
});
