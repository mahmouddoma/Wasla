import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
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
    const invalid = getEvidenceFileValidationError(files);
    if (invalid) {
      this.error.set('diagnostics.unsupportedFile');
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
    if (!this.busy())
      this.covered.update((ids) => (ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]));
  }
  submit() {
    if (this.busy()) return;
    if (
      !this.files().length ||
      (this.doctor() && !this.covered().length) ||
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
}
