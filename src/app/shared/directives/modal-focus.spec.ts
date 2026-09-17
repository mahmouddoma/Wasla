import { TestBed } from '@angular/core/testing';
import { SideDrawer } from '../components/side-drawer/side-drawer';

describe('ModalFocus', () => {
  it('focuses the modal, wraps Tab in both directions and restores the opener', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const fixture = TestBed.createComponent(SideDrawer);
    try {
      fixture.componentRef.setInput('opened', true);
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;
      const first = element.querySelector<HTMLButtonElement>('.drawer-close-btn')!;
      const last = document.createElement('button');
      const disabled = document.createElement('button');
      disabled.disabled = true;
      element.querySelector('.drawer-body')!.append(last, disabled);
      expect(document.activeElement).toBe(first);
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
      expect(document.activeElement).toBe(last);
      last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      expect(document.activeElement).toBe(first);
      fixture.componentRef.setInput('opened', false);
      await fixture.whenStable();
      expect(document.activeElement).toBe(opener);
    } finally {
      fixture.destroy();
      opener.remove();
    }
  });

  it('keeps focus on the modal when it has no enabled controls', async () => {
    const fixture = TestBed.createComponent(SideDrawer);
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    const panel = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="dialog"]')!;
    expect(document.activeElement).toBe(panel);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(panel);
  });
});
