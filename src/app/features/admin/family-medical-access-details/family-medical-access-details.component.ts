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
import { openPrivateMedia } from '../../../core/media/private-media';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  FamilyMedicalCase,
  FamilyMedicalDocument,
  FamilyMedicalHistoryItem,
} from '../../../domains/families';

type ReviewAction = 'modification' | 'approve' | 'reject';

@Component({
  selector: 'app-family-medical-access-details',
  imports: [FormField, TranslatePipe],
  templateUrl: './family-medical-access-details.component.html',
  styleUrls: ['./family-medical-access-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyMedicalAccessDetailsComponent {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(FamiliesApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly reviewDialog = viewChild<ElementRef<HTMLDialogElement>>('reviewDialog');

  readonly requestIdInput = input<string | null>(null);
  readonly isDrawer = input<boolean>(false);
  readonly closed = output<void>();
  readonly reviewed = output<void>();

  protected readonly details = signal<FamilyMedicalCase | null>(null);
  protected readonly history = signal<FamilyMedicalHistoryItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly historyLoading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly documentLoadingId = signal('');
  protected readonly messages = signal<string[]>([]);
  protected readonly action = signal<ReviewAction>('approve');
  protected readonly reviewModel = signal({ text: '' });
  protected readonly reviewForm = form(this.reviewModel, (field) => {
    required(field.text, { message: 'review.reasonRequired' });
    maxLength(field.text, 2000, { message: 'validation.max2000' });
  });

  protected readonly canDecide = this.session.hasPermission(
    PERMISSIONS.familyMedicalAccessRequestsDecide,
  );
  protected readonly canRequestModification = this.session.hasPermission(
    PERMISSIONS.familyMedicalAccessRequestsRequestModification,
  );
  protected readonly canViewDocuments = this.session.hasPermission(
    PERMISSIONS.familyMedicalAccessRequestsViewAdminDocuments,
  );

  protected readonly isPending = computed(
    () =>
      this.details()?.status === 'Pending' ||
      this.details()?.status === 'ModificationRequested',
  );

  constructor() {
    effect(() => {
      const id = this.requestIdInput();
      if (id) {
        untracked(() => void this.load(id));
      } else {
        untracked(() => {
          this.details.set(null);
          this.history.set([]);
          this.loading.set(false);
        });
      }
    });
  }

  protected async load(requestId: string): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      const details = await firstValueFrom(this.api.adminMedicalAccessRequest(requestId));
      this.details.set(details);
      void this.loadHistory(requestId);
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadHistory(requestId: string): Promise<void> {
    this.historyLoading.set(true);
    try {
      const res = await firstValueFrom(this.api.adminMedicalAccessHistory(requestId));
      this.history.set(res.items ?? []);
    } catch {
      // Non-blocking history load
      this.history.set([]);
    } finally {
      this.historyLoading.set(false);
    }
  }

  protected openActionDialog(actionType: ReviewAction): void {
    this.action.set(actionType);
    this.reviewModel.set({ text: '' });
    this.reviewForm().reset();
    this.messages.set([]);
    this.reviewDialog()?.nativeElement.showModal();
  }

  protected closeActionDialog(): void {
    this.reviewDialog()?.nativeElement.close();
  }

  protected async submitDecision(): Promise<void> {
    const caseDetails = this.details();
    if (!caseDetails) return;

    const actionType = this.action();
    const reasonText = this.reviewModel().text.trim();

    // Validation: modification and reject require text
    if ((actionType === 'modification' || actionType === 'reject') && !reasonText) {
      this.messages.set([this.uiLanguage.t('review.reasonRequired')]);
      return;
    }

    this.submitting.set(true);
    this.messages.set([]);
    const idempotencyKey = crypto.randomUUID();

    try {
      if (actionType === 'approve') {
        await firstValueFrom(
          this.api.approveMedicalAccessRequest(caseDetails.requestId, {
            rowVersion: caseDetails.rowVersion,
            reason: reasonText || undefined,
            idempotencyKey,
          }),
        );
        this.toast.success(this.uiLanguage.t('review.approvedSuccess'));
      } else if (actionType === 'reject') {
        await firstValueFrom(
          this.api.rejectMedicalAccessRequest(caseDetails.requestId, {
            rowVersion: caseDetails.rowVersion,
            reason: reasonText,
            idempotencyKey,
          }),
        );
        this.toast.success(this.uiLanguage.t('review.rejectedSuccess'));
      } else if (actionType === 'modification') {
        await firstValueFrom(
          this.api.requestMedicalAccessModification(caseDetails.requestId, {
            rowVersion: caseDetails.rowVersion,
            message: reasonText,
            idempotencyKey,
          }),
        );
        this.toast.success(this.uiLanguage.t('review.modificationRequestedSuccess'));
      }

      this.closeActionDialog();
      this.reviewed.emit();
      await this.load(caseDetails.requestId);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.toast.error(this.uiLanguage.t('common.conflictState'));
        await this.load(caseDetails.requestId);
      } else {
        this.messages.set(parseApiErrors(error).messages);
        this.toast.error(this.uiLanguage.t('common.actionFailed'));
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected async downloadDocument(doc: FamilyMedicalDocument): Promise<void> {
    const caseDetails = this.details();
    if (!caseDetails || !this.canViewDocuments) return;

    this.documentLoadingId.set(doc.documentId);
    try {
      const response = await firstValueFrom(
        this.api.adminMedicalAccessDocument(caseDetails.requestId, doc.documentId),
      );
      if (response.body) {
        openPrivateMedia(response);
      }
    } catch {
      this.toast.error(this.uiLanguage.t('common.downloadFailed'));
    } finally {
      this.documentLoadingId.set('');
    }
  }
}
