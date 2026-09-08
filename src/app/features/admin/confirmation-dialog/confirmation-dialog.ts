import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialog {
  dialogId = input.required<string>();
  opened = input(false);
  busy = input(false);
  title = input.required<string>();
  description = input.required<string>();
  confirmLabel = input.required<string>();
  danger = input(false);
  messages = input<readonly string[]>([]);
  confirmed = output<void>();
  dismissed = output<void>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  constructor() {
    effect(() => {
      const opened = this.opened();
      const dialog = this.dialogElement();
      if (!dialog) return;
      if (opened && !dialog.open) {
        dialog.showModal();
        queueMicrotask(() => dialog.querySelector<HTMLButtonElement>('[data-cancel]')?.focus());
      } else if (!opened && dialog.open) {
        dialog.close();
      }
    });
  }

  protected close(): void {
    if (this.busy()) return;
    this.dialogElement()?.close();
    this.dismissed.emit();
  }

  protected onCancel(event: Event): void {
    if (this.busy()) {
      event.preventDefault();
      return;
    }
    this.dismissed.emit();
  }

  private dialogElement(): HTMLDialogElement | null {
    return this.host.nativeElement.querySelector('dialog');
  }
}
