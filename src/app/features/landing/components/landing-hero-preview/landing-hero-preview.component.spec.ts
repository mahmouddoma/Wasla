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

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wasla_lang');
    }
  });

  it('renders realistic Wasla clinic dashboard with clinic header, KPIs, and appointment rows', async () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('عيادة النور الطبية');
    expect(el.textContent).toContain('18');
    expect(el.textContent).toContain('4');
    expect(el.textContent).toContain('11');
    expect(el.textContent).toContain('محمود عبد الرحمن');
    expect(el.textContent).toContain('آية إبراهيم منصور');
    expect(el.textContent).toContain('أحمد علي الشافعي');
  });
});
