import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { EncountersApi } from '../../../../domains/encounters';

@Component({
  selector: 'app-create-followup-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './create-followup-dialog.component.html',
  styleUrl: './create-followup-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFollowupDialogComponent {
  private readonly encountersApi = inject(EncountersApi);
  private readonly toast = inject(ToastService);
  private readonly language = inject(LanguageService);

  readonly opened = input<boolean>(false);
  readonly practiceId = input<string>('');
  readonly encounterId = input<string>('');
  readonly isHistoricalPractice = input<boolean>(false);

  readonly closed = output<void>();
  readonly created = output<string>();

  readonly validUntil = signal<string>(this.defaultDate());
  readonly submitting = signal<boolean>(false);

  private defaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }

  submit(): void {
    if (this.isHistoricalPractice()) {
      this.toast.error(this.language.t('doctorPatients.toasts.followUpClosedPractice'));
      return;
    }
    const pid = this.practiceId();
    const eid = this.encounterId();
    const date = this.validUntil();

    if (!pid || !eid || !date) {
      this.toast.error(this.language.t('doctorPatients.toasts.followUpDateRequired'));
      return;
    }

    this.submitting.set(true);
    this.encountersApi.createFollowUp(pid, eid, date).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.toast.success(this.language.t('doctorPatients.toasts.followUpCreatedSuccess'));
        this.created.emit(res.eligibilityId);
        this.closed.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.language.t('doctorPatients.toasts.followUpCreateFailed'));
      },
    });
  }

  cancel(): void {
    if (!this.submitting()) {
      this.closed.emit();
    }
  }
}

