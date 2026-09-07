import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUpload implements OnDestroy {
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly error = input('');
  readonly fileChange = output<File | undefined>();
  protected readonly fileName = signal('');
  protected readonly previewUrl = signal('');

  protected selectFile(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    this.revokePreview();
    this.fileName.set(file?.name ?? '');
    if (file?.type.startsWith('image/')) this.previewUrl.set(URL.createObjectURL(file));
    this.fileChange.emit(file);
  }

  protected removeFile(inputElement: HTMLInputElement): void {
    inputElement.value = '';
    this.fileName.set('');
    this.revokePreview();
    this.fileChange.emit(undefined);
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }
  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
    this.previewUrl.set('');
  }
}
