import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthLayout } from './auth-layout';

describe('AuthLayout', () => {
  let fixture: ComponentFixture<AuthLayout>;
  let component: AuthLayout;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AuthLayout],
      providers: [provideRouter([])],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(AuthLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    component['stopAutoSlide']();
    localStorage.removeItem('wasla_lang');
  });

  it('creates component and renders brand and language switcher', () => {
    expect(component).toBeTruthy();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('app-language-switcher')).not.toBeNull();
    expect(element.querySelector('.auth-panel')).not.toBeNull();
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('navigates slides forward and backward correctly', () => {
    expect(component.activeSlideIndex()).toBe(0);

    component.nextSlide();
    expect(component.activeSlideIndex()).toBe(1);

    component.prevSlide();
    expect(component.activeSlideIndex()).toBe(0);

    // Test loop backwards from 0 to last
    component.prevSlide();
    expect(component.activeSlideIndex()).toBe(component.slides.length - 1);

    component.setSlide(2);
    expect(component.activeSlideIndex()).toBe(2);
  });

  it('toggles pause state when interacting with story slider', () => {
    expect(component.isPaused()).toBe(false);

    component.pauseRotation();
    expect(component.isPaused()).toBe(true);

    component.resumeRotation();
    expect(component.isPaused()).toBe(false);
  });

  it('translates every existing slide when switching language without resetting selection', async () => {
    component.setSlide(2);
    const arabicTitles = component.slides.map(slide => slide.title);
    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    expect(component.activeSlideIndex()).toBe(2);
    component.slides.forEach((slide, index) => {
      expect(slide.title).not.toBe(arabicTitles[index]);
      expect(slide.title + slide.description + slide.imageAlt).not.toMatch(/[\u0600-\u06ff]/);
    });
  });
});
