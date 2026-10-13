import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamiliesApi, FamilyMedicalEligibilityReview } from '../../../domains/families';

type EligibilityAction = 'approve' | 'reject' | 'revoke';

@Component({
  selector: 'app-family-medical-eligibility-details',
  imports: [FormField, TranslatePipe],
  templateUrl: './family-medical-eligibility-details.component.html',
  styleUrls: ['./family-medical-eligibility-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyMedicalEligibilityDetailsComponent {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(FamiliesApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly actionDialog = viewChild<ElementRef<HTMLDialogElement>>('actionDialog');

  readonly reviewIdInput = input<string | null>(null);
  readonly isDrawer = input<boolean>(false);
  readonly closed = output<void>();
  readonly reviewed = output<void>();

  protected readonly details = signal<FamilyMedicalEligibilityReview | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly action = signal<EligibilityAction>('approve');
  protected readonly noteModel = signal({ text: '' });
  protected readonly noteForm = form(this.noteModel, (field) => {
    required(field.text, { message: 'review.reasonRequired' });
    maxLength(field.text, 2000, { message: 'validation.max2000' });
  });

  protected readonly canDecide = this.session.hasPermission(
    PERMISSIONS.familyMedicalAccessEligibilityDecide,
  );
  protected readonly canRevoke = this.session.hasPermission(
    PERMISSIONS.familyMedicalAccessEligibilityRevoke,
  );

  protected readonly isPending = computed(() => this.details()?.status === 'Pending');
  protected readonly isApproved = computed(() => this.details()?.status === 'Approved');

  constructor() {
    effect(() => {
      const id = this.reviewIdInput();
      if (id) {
        untracked(() => void this.load(id));
      } else {
        untracked(() => {
          this.details.set(null);
          this.loading.set(false);
        });
      }
    });
  }

  protected async load(reviewId: string): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      const res = await firstValueFrom(this.api.medicalEligibilityReview(reviewId));
      this.details.set(res);
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
    } finally {
      this.loading.set(false);
    }
  }

  protected openActionModal(actionType: EligibilityAction): void {
    this.action.set(actionType);
    this.noteModel.set({ text: '' });
    this.noteForm().reset();
    this.messages.set([]);
    this.actionDialog()?.nativeElement.showModal();
  }

  protected closeActionModal(): void {
    this.actionDialog()?.nativeElement.close();
  }

  protected async submitAction(): Promise<void> {
    const item = this.details();
    if (!item) return;

    const actionType = this.action();
    const reasonText = this.noteModel().text.trim();

    if ((actionType === 'reject' || actionType === 'revoke') && !reasonText) {
      this.messages.set([this.uiLanguage.t('review.reasonRequired')]);
      return;
    }

    this.submitting.set(true);
    this.messages.set([]);
    const idempotencyKey = crypto.randomUUID();

    try {
      if (actionType === 'approve') {
        await firstValueFrom(
          this.api.approveMedicalEligibility(item.reviewId, {
            rowVersion: item.rowVersion,
            reason: reasonText || undefined,
            idempotencyKey,
          }),
        );
        this.toast.success(this.uiLanguage.t('review.approvedSuccess'));
      } else if (actionType === 'reject') {
        await firstValueFrom(
          this.api.rejectMedicalEligibility(item.reviewId, {
            rowVersion: item.rowVersion,
            reason: reasonText,
            idempotencyKey,
          }),
        );
        this.toast.success(this.uiLanguage.t('review.rejectedSuccess'));
      } else if (actionType === 'revoke') {
        await firstValueFrom(
          this.api.revokeMedicalEligibility(item.reviewId, {
            rowVersion: item.rowVersion,
            reason: reasonText,
            idempotencyKey,
          }),
        );
        this.toast.success(this.uiLanguage.t('review.revokeSuccess'));
      }

      this.closeActionModal();
      this.reviewed.emit();
      await this.load(item.reviewId);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.toast.error(this.uiLanguage.t('common.conflictState'));
        await this.load(item.reviewId);
      } else {
        this.messages.set(parseApiErrors(error).messages);
        this.toast.error(this.uiLanguage.t('common.actionFailed'));
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
