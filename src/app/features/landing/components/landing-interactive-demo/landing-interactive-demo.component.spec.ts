import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LandingInteractiveDemoComponent } from './landing-interactive-demo.component';

describe('LandingInteractiveDemoComponent', () => {
  let fixture: ComponentFixture<LandingInteractiveDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingInteractiveDemoComponent],
    }).compileComponents();

    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(LandingInteractiveDemoComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wasla_lang');
    }
  });

  it('switches between interactive tabs and updates benefits content', async () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('إدارة الحجوزات بكل سهولة');

    el.querySelector<HTMLButtonElement>('#demo-mode-clinical')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('سجل طبي وكشف متكامل');

    el.querySelector<HTMLButtonElement>('#demo-mode-finance')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('متابعة دقيقة لحسابات العيادة');
  });

  it('advances queue simulation when calling the next ticket in queue tab', async () => {
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('#demo-mode-queue')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('#14');
    expect(el.textContent).toContain('محمود عبد الرحمن');

    const callNextBtn = el.querySelector<HTMLButtonElement>('#demo-call-next-btn');
    expect(callNextBtn).not.toBeNull();
    callNextBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('#15');
    expect(el.textContent).toContain('آية إبراهيم منصور');
  });
});
