import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Owns keyboard focus for a modal that is mounted only while open. */
@Directive({
  selector: '[appModalFocus]',
  host: { tabindex: '-1', '(keydown)': 'onKeydown($event)' },
})
export class ModalFocus {
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private previousFocus: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => {
      const active = this.document.activeElement;
      this.previousFocus = active instanceof HTMLElement ? active : null;
      (this.focusableElements()[0] ?? this.element).focus();
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.previousFocus?.isConnected) this.previousFocus.focus();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const elements = this.focusableElements();
    const first = elements[0];
    const last = elements.at(-1);
    const active = this.document.activeElement;
    if (!first || !last) {
      event.preventDefault();
      this.element.focus();
    } else if (event.shiftKey && (active === first || active === this.element)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === this.element)) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(this.element.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]',
    )).filter(element => {
      if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const style = this.document.defaultView?.getComputedStyle(element);
      return style?.display !== 'none' && style?.visibility !== 'hidden';
    });
  }
}
