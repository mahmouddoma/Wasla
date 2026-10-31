import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  DiagnosticAttachmentKind,
  DiagnosticItemResponse,
  DiagnosticUpload,
} from '../../../../domains/diagnostics';
import {
  EVIDENCE_FILE_ACCEPT,
  getEvidenceFileValidationError,
} from '../../../../core/validation/evidence-files';

@Component({
  selector: 'app-diagnostic-upload',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './result-upload.component.html',
  styleUrls: ['../../../../shared/styles/directory-workspace.css', './result-upload.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultUploadComponent {
  readonly language = inject(LanguageService);
  readonly doctor = input(false);
  readonly correction = input(false);
  readonly rowVersion = input<string | null>(null);
  readonly busy = input(false);
  readonly items = input<readonly DiagnosticItemResponse[]>([]);
  readonly requestStatus = input<string>('Requested');
  readonly previousCovered = input<readonly string[]>([]);
  readonly eligibleItems = computed(() =>
    this.items().filter(
      (item) =>
        item.status === 'Requested' ||
        (this.correction() &&
          item.status === 'Completed' &&
          this.previousCovered().includes(item.itemId)),
    ),
  );
  readonly submitted = output<DiagnosticUpload>();
  readonly cancelled = output<void>();
  readonly files = signal<readonly File[]>([]);
  readonly kinds = signal<readonly DiagnosticAttachmentKind[]>([]);
  readonly covered = signal<readonly string[]>([]);
  readonly provider = signal('');
  readonly date = signal('');
  readonly note = signal('');
  readonly reason = signal('');
  readonly error = signal('');
  readonly accept = EVIDENCE_FILE_ACCEPT;
  choose(event: Event) {
    if (this.busy()) return;
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    const invalid = this.fileError(files);
    if (invalid) {
      this.error.set(invalid);
      this.files.set([]);
      this.kinds.set([]);
      return;
    }
    this.files.set(files);
    this.kinds.set(files.map(() => 'Report'));
    this.error.set('');
  }
  setKind(index: number, value: string) {
    if (!this.busy() && (value === 'Report' || value === 'Image'))
      this.kinds.update((kinds) => kinds.map((kind, i) => (i === index ? value : kind)));
  }
  toggle(id: string) {
    if (!this.busy() && this.eligibleItems().some((item) => item.itemId === id))
      this.covered.update((ids) => (ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]));
  }
  submit() {
    if (this.busy()) return;
    const invalid = this.fileError(this.files());
    if (invalid) {
      this.error.set(invalid);
      return;
    }
    if (
      !this.files().length ||
      this.files().length !== this.kinds().length ||
      (this.doctor() &&
        (!this.rowVersion() ||
          this.requestStatus() === 'Draft' ||
          !this.covered().length ||
          this.covered().some((id) => !this.eligibleItems().some((item) => item.itemId === id)))) ||
      (this.correction() && !this.reason().trim())
    ) {
      this.error.set('diagnostics.uploadInvalid');
      return;
    }
    this.submitted.emit({
      attachments: this.files(),
      attachmentKinds: this.kinds(),
      coveredItemIds: this.covered(),
      providerName: this.provider().trim(),
      reportDate: this.date(),
      patientNote: this.note().trim(),
      rowVersion: this.rowVersion(),
      reason: this.reason().trim(),
    });
  }

  private fileError(files: readonly File[]): string | null {
    if (getEvidenceFileValidationError(files)) return 'diagnostics.unsupportedFile';
    if (files.length > 20) return 'diagnostics.fileCountLimit';
    if (files.some((file) => file.size === 0 || file.size > 10 * 1024 * 1024))
      return 'diagnostics.fileSizeLimit';
    if (files.reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024)
      return 'diagnostics.totalSizeLimit';
    return null;
  }
}
