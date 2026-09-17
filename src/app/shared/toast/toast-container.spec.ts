import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/notifications/toast.service';
import { ToastContainer } from './toast-container';

describe('ToastContainer', () => {
  it('renders success and error semantics and dismisses the selected notification', async () => {
    TestBed.configureTestingModule({imports:[ToastContainer]});
    const fixture=TestBed.createComponent(ToastContainer);
    const toast=TestBed.inject(ToastService);
    await fixture.whenStable();
    const element: HTMLElement=fixture.nativeElement;
    expect(fixture.componentInstance).toBeTruthy();
    expect(element.querySelectorAll('.toast-message')).toHaveLength(0);
    toast.success('Saved',60000);toast.error('Rejected',60000);
    await fixture.whenStable();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Saved');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Rejected');
    element.querySelector<HTMLButtonElement>('.toast-close')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.toast-message')).toHaveLength(1);
    expect(toast.messages()[0].message).toBe('Rejected');
    toast.dismiss(toast.messages()[0].id);
    await fixture.whenStable();
    expect(element.querySelectorAll('.toast-message')).toHaveLength(0);
  });
});
