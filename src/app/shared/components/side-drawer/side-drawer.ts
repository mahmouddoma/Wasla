import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-side-drawer',
  templateUrl: './side-drawer.html',
  styleUrl: './side-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideDrawer {
  opened = input(false);
  busy = input(false);
  title = input('');
  description = input('');
  width = input('560px');
  closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.opened() && !this.busy()) {
      this.close();
    }
  }

  protected close(): void {
    if (this.busy()) return;
    this.closed.emit();
  }

  protected onBackdropClick(): void {
    this.close();
  }
}
