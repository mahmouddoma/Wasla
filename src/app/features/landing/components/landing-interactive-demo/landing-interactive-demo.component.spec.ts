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

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('updates synchronized role inspector when selecting an appointment', async () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('مريم عادل حسن');

    el.querySelector<HTMLButtonElement>('#demo-apt-apt-2')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('محمود سامي إبراهيم (#15)');
    expect(el.textContent).toContain('تم تأكيد الحضور وتحصيل رسم الاستشارة');
  });

  it('advances queue simulation when calling the next ticket', async () => {
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('#demo-mode-queue')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('#14 — مريم عادل حسن');

    el.querySelector<HTMLButtonElement>('#demo-call-next-btn')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('#15 — محمود سامي إبراهيم');
  });
});
