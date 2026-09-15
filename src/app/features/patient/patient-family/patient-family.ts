import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { FamiliesApi } from '../../../core/families/families-api';
import { openPrivateMedia } from '../../../core/media/private-media';
import {
  EVIDENCE_FILE_ACCEPT,
  getEvidenceFileValidationError,
} from '../../../core/validation/evidence-files';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import {
  Family,
  FamilyRequestDetails,
  FamilyRequestPage,
  FamilyRequestStatus,
  FamilyRequestType,
  FamilyRole,
} from '../../../core/families/family.models';

@Component({
  selector: 'app-patient-family',
  imports: [FormField, RouterLink, NgClass, SideDrawer],
  templateUrl: './patient-family.html',
  styleUrl: './patient-family.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientFamily {
  private readonly api = inject(FamiliesApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly copiedId = signal(false);
  protected readonly evidenceFileAccept = EVIDENCE_FILE_ACCEPT;

  protected readonly family = signal<Family | null>(null);
  protected readonly requests = signal<FamilyRequestPage | null>(null);
  protected readonly selectedRequest = signal<FamilyRequestDetails | null>(null);
  protected readonly filterModel = signal({
    status: '' as FamilyRequestStatus | '',
    requestType: '' as FamilyRequestType | '',
    pageSize: 20,
  });
  protected readonly filterForm = form(this.filterModel);
  protected readonly requestModel = signal({
    requestType: 'CreateFamily' as FamilyRequestType,
    familyId: '',
    targetPatientId: '',
    requesterClaimedRole: 'Father' as Exclude<FamilyRole, 'Child'>,
    targetClaimedRole: 'Child' as FamilyRole,
    documentTypes: '',
  });
  protected readonly requestForm = form(this.requestModel, (field) => {
    required(field.targetPatientId, { message: 'ملف المريض المستهدف مطلوب.' });
    required(field.familyId, {
      message: 'Family ID مطلوب لإضافة عضو.',
      when: ({ valueOf }) => valueOf(field.requestType) === 'AddFamilyMember',
    });
    required(field.documentTypes, { message: 'نوع مستند لكل ملف مطلوب.' });
  });
  protected readonly evidenceFiles = signal<File[]>([]);
  protected readonly resubmitFiles = signal<File[]>([]);
  protected readonly resubmitDocumentTypes = signal('');
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly successMessage = signal('');
  protected readonly pageNumber = signal(1);
  protected readonly canViewFamily = this.session.hasPermission(PERMISSIONS.familiesViewOwn);
  protected readonly canCreateRequest = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsCreate,
  );
  protected readonly canViewRequests = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsViewOwn,
  );
  protected readonly canResubmit = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsResubmitOwn,
  );

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    await Promise.all([
      this.loadFamily(),
      this.canViewRequests ? this.loadRequests(1) : Promise.resolve(),
    ]);
    this.loading.set(false);
  }

  protected async loadRequests(pageNumber = 1, event?: Event): Promise<void> {
    event?.preventDefault();
    try {
      this.pageNumber.set(pageNumber);
      this.requests.set(
        await firstValueFrom(this.api.requests({ ...this.filterModel(), pageNumber })),
      );
    } catch (error) {
      this.messages.set(flattenErrors(error));
    }
  }

  protected async openRequest(requestId: string): Promise<void> {
    this.messages.set([]);
    try {
      this.selectedRequest.set(await firstValueFrom(this.api.details(requestId)));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    }
  }

  protected async submitRequest(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.requestForm, async () => {
      if (this.submitting() || !this.evidenceFiles().length) {
        if (!this.evidenceFiles().length) this.messages.set(['أرفق مستند إثبات واحداً على الأقل.']);
        return;
      }
      const fileError = getEvidenceFileValidationError(this.evidenceFiles());
      if (fileError) {
        this.messages.set([fileError]);
        return;
      }
      const documentTypes = splitTypes(this.requestModel().documentTypes);
      if (documentTypes.length !== this.evidenceFiles().length) {
        this.messages.set(['يجب إدخال نوع واحد مقابل كل ملف مرفق.']);
        return;
      }
      this.submitting.set(true);
      this.resetFeedback();
      try {
        const details = await firstValueFrom(
          this.api.submit({
            ...this.requestModel(),
            evidenceFiles: this.evidenceFiles(),
            documentTypes,
          }),
        );
        this.selectedRequest.set(details);
        this.successMessage.set('تم إرسال الطلب وأصبح Pending.');
        await this.loadRequests(1);
      } catch (error) {
        this.messages.set(flattenErrors(error));
      } finally {
        this.submitting.set(false);
      }
    });
  }

  protected async resubmit(): Promise<void> {
    const request = this.selectedRequest();
    if (!request || request.status !== 'ModificationRequested' || !this.canResubmit) return;
    const documentTypes = splitTypes(this.resubmitDocumentTypes());
    const fileError = getEvidenceFileValidationError(this.resubmitFiles());
    if (fileError) {
      this.messages.set([fileError]);
      return;
    }
    if (!this.resubmitFiles().length || documentTypes.length !== this.resubmitFiles().length) {
      this.messages.set(['أرفق أدلة جديدة وحدد نوعاً واحداً لكل ملف.']);
      return;
    }
    this.submitting.set(true);
    this.resetFeedback();
    try {
      const updated = await firstValueFrom(
        this.api.resubmit(request.requestId, {
          evidenceFiles: this.resubmitFiles(),
          documentTypes,
          rowVersion: request.rowVersion,
        }),
      );
      this.selectedRequest.set(updated);
      this.resubmitFiles.set([]);
      this.resubmitDocumentTypes.set('');
      this.successMessage.set('تم إنشاء revision جديدة وإعادة الطلب إلى Pending.');
      await this.loadRequests(this.pageNumber());
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.openRequest(request.requestId);
        this.messages.update((items) => [
          ...items,
          'تم تحميل أحدث RowVersion؛ راجع التفاصيل ثم أعد المحاولة.',
        ]);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected async openDocument(documentId: string): Promise<void> {
    const request = this.selectedRequest();
    if (!request) return;
    try {
      const response = await firstValueFrom(this.api.document(request.requestId, documentId));
      openPrivateMedia(response);
    } catch (error) {
      this.messages.set(flattenErrors(error));
    }
  }

  protected evidenceChanged(event: Event, resubmit = false): void {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const fileError = getEvidenceFileValidationError(files);
    this.resetFeedback();
    if (fileError) {
      input.value = '';
      if (resubmit) this.resubmitFiles.set([]);
      else this.evidenceFiles.set([]);
      this.messages.set([fileError]);
      return;
    }
    if (resubmit) this.resubmitFiles.set(files);
    else this.evidenceFiles.set(files);
  }

  protected copyFamilyId(id: string): void {
    if (!id) return;
    navigator.clipboard.writeText(id);
    this.copiedId.set(true);
    setTimeout(() => this.copiedId.set(false), 2000);
  }

  protected clearEvidenceFiles(input: HTMLInputElement): void {
    input.value = '';
    this.evidenceFiles.set([]);
  }

  protected clearResubmitFiles(input: HTMLInputElement): void {
    input.value = '';
    this.resubmitFiles.set([]);
  }

  protected resubmitTypesChanged(event: Event): void {
    this.resubmitDocumentTypes.set((event.currentTarget as HTMLInputElement).value);
  }

  protected getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      Pending: 'قيد المراجعة',
      ModificationRequested: 'مطلوب تعديل',
      Approved: 'معتمد',
      Rejected: 'مرفوض',
    };
    return map[status] || status;
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'Approved':
        return 'status-approved';
      case 'ModificationRequested':
        return 'status-action';
      case 'Pending':
        return 'status-pending';
      case 'Rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  protected getRequestTypeLabel(type: string): string {
    const map: Record<string, string> = {
      CreateFamily: 'إنشاء عائلة',
      AddFamilyMember: 'إضافة عضو',
    };
    return map[type] || type;
  }

  protected getRoleLabel(role: string): string {
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

  protected readonly copiedText = signal<string | null>(null);

  protected async copyText(val: string, key = 'id'): Promise<void> {
    try {
      await navigator.clipboard.writeText(val);
      this.copiedText.set(key);
      setTimeout(() => {
        if (this.copiedText() === key) this.copiedText.set(null);
      }, 2000);
    } catch {
      // ignore clipboard error
    }
  }

  protected getDrawerTitle(request: FamilyRequestDetails | null): string {
    if (!request) return 'تفاصيل الطلب';
    return request.requestType === 'CreateFamily'
      ? 'تفاصيل طلب إنشاء عائلة'
      : 'تفاصيل طلب إضافة عضو للعائلة';
  }

  protected getDrawerDescription(request: FamilyRequestDetails | null): string {
    if (!request) return '';
    const name = request.targetNameAr || request.requesterNameAr || '';
    return `النسخة #${request.currentRevisionNumber}${name ? ' · ' + name : ''}`;
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

  protected formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  }

  protected closeDetails(): void {
    this.selectedRequest.set(null);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  private async loadFamily(): Promise<void> {
    if (!this.canViewFamily) return;
    try {
      this.family.set(await firstValueFrom(this.api.mine()));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) this.family.set(null);
      else this.messages.set(flattenErrors(error));
    }
  }

  private resetFeedback(): void {
    this.messages.set([]);
    this.successMessage.set('');
  }
}

function splitTypes(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
