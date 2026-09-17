import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlatformFooter } from './platform-footer';

describe('PlatformFooter', () => {
  let component: PlatformFooter;
  let fixture: ComponentFixture<PlatformFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformFooter],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformFooter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the platform footer component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand title and copyright notice', () => {
    const el: HTMLElement = fixture.nativeElement;
    const brandName = el.querySelector('.brand-name');
    expect(brandName).toBeTruthy();

    const copyright = el.querySelector('.copyright-text');
    expect(copyright).toBeTruthy();
  });

  it('should render operational status indicator and security badge', () => {
    const el: HTMLElement = fixture.nativeElement;
    const statusPill = el.querySelector('.status-pill');
    expect(statusPill).toBeTruthy();

    const securityPill = el.querySelector('.security-pill');
    expect(securityPill).toBeTruthy();

    const pulseDot = el.querySelector('.pulse-dot');
    expect(pulseDot).toBeTruthy();
  });

  it('should render quick navigation buttons and open modal when clicked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const navButtons = el.querySelectorAll<HTMLButtonElement>('.footer-nav-btn');
    expect(navButtons.length).toBeGreaterThanOrEqual(3);

    // Click on Privacy Policy button
    navButtons[0].click();
    fixture.detectChanges();

    const modal = el.querySelector('.footer-modal-panel');
    expect(modal).toBeTruthy();

    const closeBtn = el.querySelector<HTMLButtonElement>('.modal-close-btn');
    expect(closeBtn).toBeTruthy();
    closeBtn?.click();
    fixture.detectChanges();

    expect(el.querySelector('.footer-modal-panel')).toBeNull();
  });
});
