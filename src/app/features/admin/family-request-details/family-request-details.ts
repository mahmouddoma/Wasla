import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { FamiliesApi } from '../../../core/families/families-api';
import { FamilyRequestDetails } from '../../../core/families/family.models';
import { openPrivateMedia } from '../../../core/media/private-media';

type ReviewAction = 'modification' | 'approve' | 'reject';

@Component({
  selector: 'app-family-request-details',
  imports: [FormField, RouterLink],
  templateUrl: './family-request-details.html',
  styleUrl: './family-request-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyRequestDetailsPage {
  private readonly api = inject(FamiliesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly reviewDialog = viewChild<ElementRef<HTMLDialogElement>>('reviewDialog');
  protected readonly details = signal<FamilyRequestDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly documentLoadingId = signal('');
  protected readonly messages = signal<string[]>([]);
  protected readonly successMessage = signal('');
  protected readonly action = signal<ReviewAction>('approve');
  protected readonly reviewModel = signal({ text: '' });
  protected readonly reviewForm = form(this.reviewModel, (field) => {
    required(field.text, { message: 'اكتب الرسالة أو سبب الرفض.' });
    maxLength(field.text, 2000, { message: 'الحد الأقصى 2000 حرف.' });
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

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const requestId = this.route.snapshot.paramMap.get('requestId');
    if (!requestId) {
      this.messages.set(['معرّف الطلب غير موجود.']);
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
      modification: 'طلب تعديل على المستندات',
      approve: 'اعتماد العلاقة العائلية',
      reject: 'رفض الطلب نهائياً',
    }[this.action()];
  }

  private async executeAction(): Promise<void> {
    const request = this.details();
    if (!request || this.submitting() || !this.isPending()) return;
    this.submitting.set(true);
    this.messages.set([]);
    this.successMessage.set('');
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
      this.successMessage.set(
        action === 'approve'
          ? 'تم اعتماد الطلب.'
          : action === 'modification'
            ? 'تم طلب تعديل؛ الحالة ليست رفضاً نهائياً.'
            : 'تم رفض الطلب نهائياً بدون تعديل عضوية العائلة.',
      );
      await this.load();
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.closeAction();
        await this.load();
        this.messages.update((items) => [
          ...items,
          'راجع أحدث حالة وRowVersion قبل اتخاذ قرار جديد؛ لم تتم إعادة المحاولة تلقائياً.',
        ]);
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
