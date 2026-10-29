import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/notifications/toast.service';
import { ToastContainer } from './toast-container';
import { LanguageService } from '../../core/i18n/language.service';

describe('ToastContainer', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('switches notification language and direction while visible', async () => {
    const fixture = TestBed.createComponent(ToastContainer);
    const language = TestBed.inject(LanguageService);
    const toast = TestBed.inject(ToastService);
    toast.success('reservations.saved', 60000);
    for (const lang of ['ar', 'en'] as const) {
      language.setLanguage(lang);
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;
      expect(element.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
      expect(element.lang).toBe(lang);
      expect(element.querySelector('.toast-message-body')?.textContent).toContain(
        language.t('reservations.saved'),
      );
    }
    for (const message of toast.messages()) toast.dismiss(message.id);
  });
  it('renders success and error semantics and dismisses the selected notification', async () => {
    TestBed.configureTestingModule({ imports: [ToastContainer] });
    const fixture = TestBed.createComponent(ToastContainer);
    const toast = TestBed.inject(ToastService);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance).toBeTruthy();
    expect(element.querySelectorAll('.toast-message')).toHaveLength(0);
    toast.success('Saved', 60000);
    toast.error('Rejected', 60000);
    await fixture.whenStable();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Saved');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Rejected');
    element.querySelector<HTMLButtonElement>('.toast-close')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.toast-message')).toHaveLength(1);
    expect(toast.messages()[0].message).toBe('Rejected');
    toast.dismiss(toast.messages()[0].id);
    await fixture.whenStable();
    expect(element.querySelectorAll('.toast-message')).toHaveLength(0);
  });
});
