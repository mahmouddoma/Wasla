import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { MobileNavigation } from './mobile-navigation';

describe('MobileNavigation', () => {
  let fixture: ComponentFixture<MobileNavigation>;
  let router: Router;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavigation],
      providers: [
        provideRouter([
          { path: 'home', children: [{ path: 'detail', children: [] }] },
          { path: 'other', children: [] },
        ]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(MobileNavigation);
    fixture.componentRef.setInput('items', [
      {
        id: 'workspace',
        labelKey: 'sidebar.workspace',
        mobileLabelKey: 'navigation.workspace',
        route: '/home',
        icon: 'home',
      },
    ]);
    fixture.componentRef.setInput('menuId', 'test-menu');
    fixture.detectChanges();
  });
  afterEach(() => localStorage.removeItem('wasla_language'));

  it('renders supplied shortcuts with bilingual compact labels', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(root.querySelector('a')?.textContent).toContain('الرئيسية');
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    expect(root.querySelector('a')?.textContent).toContain('Home');
    expect(root.querySelector('button')?.textContent).toContain('More');
  });
  it('emits More and reflects drawer accessibility state', () => {
    const more = vi.fn();
    fixture.componentInstance.more.subscribe(more);
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-controls')).toBe('test-menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    expect(more).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('menuExpanded', true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.classList.contains('active')).toBe(true);
  });
  it('keeps a shortcut active on nested pages and selects More on other pages', async () => {
    await router.navigateByUrl('/home/detail?tab=history');
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a')?.getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('button')?.classList.contains('active')).toBe(false);
    await router.navigateByUrl('/other');
    fixture.detectChanges();
    expect(root.querySelector('button')?.classList.contains('active')).toBe(true);
  });
  it('emits navigation so the parent closes its drawer', () => {
    const navigate = vi.fn();
    fixture.componentInstance.navigate.subscribe(navigate);
    (fixture.nativeElement as HTMLElement).querySelector('a')!.click();
    expect(navigate).toHaveBeenCalledOnce();
  });
});
