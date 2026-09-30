import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HelpSupportComponent } from './help-support.component';
import { ToastService } from '../../../../core/notifications/toast.service';

describe('HelpSupportComponent', () => {
  let component: HelpSupportComponent;
  let fixture: ComponentFixture<HelpSupportComponent>;
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpSupportComponent],
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpSupportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the help and support component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the role cards and contact channels', () => {
    const el: HTMLElement = fixture.nativeElement;
    const roleCards = el.querySelectorAll('.role-card');
    expect(roleCards.length).toBe(3);

    const contactChannels = el.querySelector('.contact-channels-card');
    expect(contactChannels).toBeTruthy();
  });

  it('should toggle FAQ accordion on click', () => {
    const el: HTMLElement = fixture.nativeElement;
    const faqTriggers = el.querySelectorAll<HTMLButtonElement>('.faq-trigger');
    expect(faqTriggers.length).toBeGreaterThan(0);

    // Initial first item open
    expect(el.querySelector('.faq-answer')).toBeTruthy();

    // Click to toggle first item closed
    faqTriggers[0].click();
    fixture.detectChanges();
    expect(component['openFaq']()).toBeNull();
  });
});
