import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/notifications/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly toast = inject(ToastService);
}
