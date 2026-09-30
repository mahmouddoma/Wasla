import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TermsOfServiceComponent } from './terms-of-service.component';

describe('TermsOfServiceComponent', () => {
  let component: TermsOfServiceComponent;
  let fixture: ComponentFixture<TermsOfServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsOfServiceComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsOfServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the terms of service component', () => {
    expect(component).toBeTruthy();
  });

  it('should render terms title and emergency disclaimer article', () => {
    const el: HTMLElement = fixture.nativeElement;
    const title = el.querySelector('.legal-title');
    expect(title).toBeTruthy();

    const emergencyAlert = el.querySelector('.alert-item');
    expect(emergencyAlert).toBeTruthy();
  });

  it('should render all terms articles', () => {
    const el: HTMLElement = fixture.nativeElement;
    const articles = el.querySelectorAll('.legal-article');
    expect(articles.length).toBeGreaterThanOrEqual(6);
  });
});
