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
import { FamiliesApi } from '../../../core/families/families-api';
import { FamilyRequestDetails } from '../../../core/families/family.models';
import { openPrivateMedia } from '../../../core/media/private-media';
import { ToastService } from '../../../core/notifications/toast.service';

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
          ? 'تم اعتماد الطلب بنجاح.'
          : action === 'modification'
            ? 'تم إرسال طلب التعديل للأطراف المعنية بنجاح.'
            : 'تم رفض الطلب نهائياً.',
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
          'راجع أحدث حالة وRowVersion قبل اتخاذ قرار جديد؛ لم تتم إعادة المحاولة تلقائياً.',
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
      Father: 'أب',
      Mother: 'أم',
      Child: 'طفل',
      Guardian: 'ولي أمر',
      LegalGuardian: 'وصي قانوني',
      Other: 'أخرى',
    };
    return map[role] || role;
  }

  protected getRequestTypeLabel(type?: string | null): string {
    if (!type) return 'طلب علاقة';
    const map: Record<string, string> = {
      CreateFamily: 'إنشاء عائلة',
      AddFamilyMember: 'إضافة عضو',
    };
    return map[type] || type;
  }

  protected getStatusLabel(status?: string | null): string {
    if (!status) return '—';
    const map: Record<string, string> = {
      Pending: 'قيد المراجعة',
      ModificationRequested: 'مطلوب تعديل',
      Approved: 'معتمد',
      Rejected: 'مرفوض',
    };
    return map[status] || status;
  }

  protected getActionLabel(action: string): string {
    const map: Record<string, string> = {
      Submitted: 'تم تقديم الطلب',
      Resubmitted: 'تمت إعادة تقديم الطلب',
      ModificationRequested: 'طلب تعديل من الإدارة',
      Approved: 'تم الاعتماد والموافقة',
      Rejected: 'تم رفض الطلب',
    };
    return map[action] || action;
  }

  protected formatDate(value?: string | null): string {
    if (!value) return '—';
    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('ar-EG', {
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
