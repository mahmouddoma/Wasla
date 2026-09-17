import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
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
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { FamiliesApi } from '../../../domains/families';
import { FamilyRequestDetails } from '../../../domains/families';
import { openPrivateMedia } from '../../../core/media/private-media';
import { ToastService } from '../../../core/notifications/toast.service';

type ReviewAction = 'modification' | 'approve' | 'reject';

@Component({
  selector: 'app-family-request-details',
  imports: [FormField, RouterLink, TranslatePipe],
  templateUrl: './family-request-details.html',
  styleUrl: './family-request-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyRequestDetailsPage {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(FamiliesApi);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly reviewDialog = viewChild<ElementRef<HTMLDialogElement>>('reviewDialog');

  readonly requestIdInput = input<string | null>(null);
  readonly isDrawer = input<boolean>(false);
  readonly closed = output<void>();
  readonly reviewed = output<void>();

  private readonly routeId = this.route?.snapshot.paramMap.get('requestId') ?? null;
  protected readonly activeId = computed(() => this.requestIdInput() || this.routeId);

  protected readonly details = signal<FamilyRequestDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly documentLoadingId = signal('');
  protected readonly messages = signal<string[]>([]);
  protected readonly action = signal<ReviewAction>('approve');
  protected readonly reviewModel = signal({ text: '' });
  protected readonly reviewForm = form(this.reviewModel, (field) => {
    required(field.text, { message: 'review.reasonRequired' });
    maxLength(field.text, 2000, { message: 'validation.max2000' });
  });
  protected readonly isPending = computed(() => this.details()?.status === 'Pending');
  protected readonly canRequestModification = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsRequestModification,
  );
  protected readonly canApprove = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsApprove,
  );
  protected readonly canReject = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsReject,
  );

  protected readonly copiedText = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.activeId();
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

  protected async load(reqId?: string): Promise<void> {
    const requestId = reqId || this.activeId();
    if (!requestId) {
      this.messages.set([this.uiLanguage.t('review.requestIdMissing')]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.messages.set([]);
    try {
      this.details.set(await firstValueFrom(this.api.adminDetails(requestId)));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected openAction(action: ReviewAction): void {
    if (!this.isPending()) return;
    this.action.set(action);
    this.reviewModel.set({ text: '' });
    this.reviewForm().reset();
    this.reviewDialog()?.nativeElement.showModal();
  }

  protected closeAction(): void {
    this.reviewDialog()?.nativeElement.close();
  }

  protected async confirmAction(event: Event): Promise<void> {
    event.preventDefault();
    if (this.action() === 'approve') {
      await this.executeAction();
      return;
    }
    await submit(this.reviewForm, async () => this.executeAction());
  }

  protected async openDocument(documentId: string): Promise<void> {
    const request = this.details();
    if (!request || this.documentLoadingId()) return;
    this.documentLoadingId.set(documentId);
    this.messages.set([]);
    try {
      openPrivateMedia(await firstValueFrom(this.api.adminDocument(request.requestId, documentId)));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.documentLoadingId.set('');
    }
  }

  protected actionTitle(): string {
    return {
      modification: this.uiLanguage.t('review.requestDocumentChanges'),
      approve: this.uiLanguage.t('review.approveFamily'),
      reject: this.uiLanguage.t('review.rejectFinally'),
    }[this.action()];
  }

  private async executeAction(): Promise<void> {
    const request = this.details();
    if (!request || this.submitting() || !this.isPending()) return;
    this.submitting.set(true);
    this.messages.set([]);
    try {
      const rowVersion = request.rowVersion;
      const action = this.action();
      if (action === 'approve') {
        await firstValueFrom(this.api.approve(request.requestId, { rowVersion }));
      } else if (action === 'modification') {
        await firstValueFrom(
          this.api.requestModification(request.requestId, {
            message: this.reviewModel().text.trim(),
            rowVersion,
          }),
        );
      } else {
        await firstValueFrom(
          this.api.reject(request.requestId, {
            reason: this.reviewModel().text.trim(),
            rowVersion,
          }),
        );
      }
      this.closeAction();
      this.toast.success(
        action === 'approve'
          ? this.uiLanguage.t('review.approved')
          : action === 'modification'
            ? this.uiLanguage.t('review.changesSent')
            : this.uiLanguage.t('review.rejected'),
      );
      await this.load();
      this.reviewed.emit();
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.closeAction();
        await this.load();
        this.messages.update((items) => [
          ...items,
          this.uiLanguage.t('review.concurrencyHelp'),
        ]);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected async copyText(val: string, key = 'id'): Promise<void> {
    try {
      await navigator.clipboard.writeText(val);
      this.copiedText.set(key);
      setTimeout(() => {
        if (this.copiedText() === key) this.copiedText.set(null);
      }, 2000);
    } catch {
      // ignore
    }
  }

  protected getRoleLabel(role?: string | null): string {
    if (!role) return '—';
    const map: Record<string, string> = {
      Father: this.uiLanguage.t('family.father'),
      Mother: this.uiLanguage.t('family.mother'),
      Child: this.uiLanguage.t('family.child'),
      Guardian: this.uiLanguage.t('family.guardian'),
      LegalGuardian: this.uiLanguage.t('family.legalGuardian'),
      Other: this.uiLanguage.t('common.other'),
    };
    return map[role] || role;
  }

  protected getRequestTypeLabel(type?: string | null): string {
    if (!type) return this.uiLanguage.t('review.relationshipRequest');
    const map: Record<string, string> = {
      CreateFamily: this.uiLanguage.t('family.create'),
      AddFamilyMember: this.uiLanguage.t('family.addMember'),
    };
    return map[type] || type;
  }

  protected getStatusLabel(status?: string | null): string {
    if (!status) return '—';
    const map: Record<string, string> = {
      Pending: this.uiLanguage.t('common.pendingReview'),
      ModificationRequested: this.uiLanguage.t('common.modificationRequested'),
      Approved: this.uiLanguage.t('common.approved'),
      Rejected: this.uiLanguage.t('common.rejected'),
    };
    return map[status] || status;
  }

  protected getActionLabel(action: string): string {
    const map: Record<string, string> = {
      Submitted: this.uiLanguage.t('requests.submittedStatus'),
      Resubmitted: this.uiLanguage.t('requests.resubmittedStatus'),
      ModificationRequested: this.uiLanguage.t('requests.adminChangesStatus'),
      Approved: this.uiLanguage.t('requests.approvedStatus'),
      Rejected: this.uiLanguage.t('requests.rejectedStatus'),
    };
    return map[action] || action;
  }

  protected formatDate(value?: string | null): string {
    if (!value) return '—';
    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(this.uiLanguage.currentLang() === 'en' ? 'en' : 'ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(date);
    } catch {
      return value;
    }
  }
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
