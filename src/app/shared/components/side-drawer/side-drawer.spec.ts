import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SideDrawer } from './side-drawer';

describe('SideDrawer', () => {
  let component: SideDrawer;
  let fixture: ComponentFixture<SideDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideDrawer],
    }).compileComponents();

    fixture = TestBed.createComponent(SideDrawer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders its heading and emits close for the close button and Escape', async () => {
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('title', 'تفاصيل العيادة');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('تفاصيل العيادة');
    element.querySelector<HTMLButtonElement>('.drawer-close-btn')!.click();
    expect(closed).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toHaveBeenCalledTimes(2);
  });

  it('prevents close while busy and removes the panel when closed', async () => {
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.drawer-close-btn')!.click();
    element.querySelector<HTMLElement>('.drawer-backdrop')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('opened', false);
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });
});
