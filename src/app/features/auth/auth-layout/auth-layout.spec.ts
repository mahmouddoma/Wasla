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

  it('creates component and renders router outlet', () => {
    expect(component).toBeTruthy();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('binds direction from language service', () => {
    const element: HTMLElement = fixture.nativeElement;
    const root = element.querySelector('.auth-layout-root');
    expect(root?.getAttribute('dir')).toBe('rtl');
  });
});
