import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  OnDestroy,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SideDrawer } from '../side-drawer/side-drawer';

/** Displays only an authenticated Blob supplied by its owner; URLs never leave this view. */
@Component({
  selector: 'app-pdf-viewer',
  imports: [TranslatePipe, SideDrawer],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfViewerComponent implements OnDestroy {
  readonly blob = input<Blob | null>(null);
  readonly closed = output<void>();
  readonly source = signal<SafeResourceUrl | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  private objectUrl: string | null = null;
  constructor() {
    effect(() => {
      this.release();
      const blob = this.blob();
      if (!blob || !blob.type.includes('application/pdf') || !blob.size) return;
      this.objectUrl = URL.createObjectURL(blob);
      this.source.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
    });
  }
  close(): void {
    this.release();
    this.closed.emit();
  }
  ngOnDestroy(): void {
    this.release();
  }
  private release(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.source.set(null);
  }
}
