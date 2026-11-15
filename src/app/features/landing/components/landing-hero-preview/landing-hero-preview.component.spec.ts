import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LandingHeroPreviewComponent } from './landing-hero-preview.component';

describe('LandingHeroPreviewComponent', () => {
  let fixture: ComponentFixture<LandingHeroPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingHeroPreviewComponent],
    }).compileComponents();

    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(LandingHeroPreviewComponent);
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('switches between dashboard, queue, and encounter preview tabs', async () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#hero-preview-tab-dashboard')?.getAttribute('aria-selected')).toBe('true');
    expect(el.textContent).toContain('مريم عادل حسن');

    el.querySelector<HTMLButtonElement>('#hero-preview-tab-queue')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('#hero-preview-tab-queue')?.getAttribute('aria-selected')).toBe('true');
    expect(el.textContent).toContain('تذكرة #14');

    el.querySelector<HTMLButtonElement>('#hero-preview-tab-encounter')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('#hero-preview-tab-encounter')?.getAttribute('aria-selected')).toBe('true');
    expect(el.textContent).toContain('روشتة إلكترونية');
  });
});
