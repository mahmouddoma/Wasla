import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyPolicyComponent } from './privacy-policy.component';

describe('PrivacyPolicyComponent', () => {
  let component: PrivacyPolicyComponent;
  let fixture: ComponentFixture<PrivacyPolicyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the privacy policy component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the privacy policy title and subtitle', () => {
    const el: HTMLElement = fixture.nativeElement;
    const title = el.querySelector('.legal-title');
    expect(title).toBeTruthy();

    const subtitle = el.querySelector('.legal-subtitle');
    expect(subtitle).toBeTruthy();
  });

  it('should render all legal articles with headings', () => {
    const el: HTMLElement = fixture.nativeElement;
    const articles = el.querySelectorAll('.legal-article');
    expect(articles.length).toBeGreaterThanOrEqual(6);
  });
});
