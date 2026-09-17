import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { ModalFocus } from '../../directives/modal-focus';

@Component({
  selector: 'app-side-drawer',
  imports: [ModalFocus],
  templateUrl: './side-drawer.html',
  styleUrl: './side-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideDrawer {
  protected readonly language = inject(LanguageService);
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
