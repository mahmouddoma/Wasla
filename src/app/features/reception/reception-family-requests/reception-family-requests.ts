import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { FamiliesApi } from '../../../core/families/families-api';
import {
  FamilyRequestDetails,
  FamilyRequestPage,
  FamilyRequestStatus,
  FamilyRequestType,
  FamilyRole,
} from '../../../core/families/family.models';
import { openPrivateMedia } from '../../../core/media/private-media';
import { PatientSearchItem } from '../../../core/patients/patient.models';
import { PatientPicker } from '../../../shared/patient-picker/patient-picker';

@Component({
  selector: 'app-reception-family-requests',
  imports: [FormField, RouterLink, PatientPicker],
  templateUrl: './reception-family-requests.html',
  styleUrls: ['../../healthcare-workspace.css', './reception-family-requests.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionFamilyRequests {
  private readonly api = inject(FamiliesApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly requester = signal<PatientSearchItem | null>(null);
  protected readonly target = signal<PatientSearchItem | null>(null);
  protected readonly selectedRequest = signal<FamilyRequestDetails | null>(null);
  protected readonly result = signal<FamilyRequestPage | null>(null);
  protected readonly requestModel = signal({
    requestType: 'CreateFamily' as FamilyRequestType,
    familyId: '',
    requesterClaimedRole: 'Father' as Exclude<FamilyRole, 'Child'>,
    targetClaimedRole: 'Child' as FamilyRole,
    documentTypes: '',
  });
  protected readonly requestForm = form(this.requestModel, (field) => {
    required(field.familyId, {
      message: 'Family ID مطلوب لإضافة عضو.',
      when: ({ valueOf }) => valueOf(field.requestType) === 'AddFamilyMember',
    });
    required(field.documentTypes, { message: 'حدد نوعاً لكل مستند.' });
  });
  protected readonly filterModel = signal({
    search: '',
    status: '' as FamilyRequestStatus | '',
    requestType: '' as FamilyRequestType | '',
    pageSize: 20,
  });
  protected readonly filterForm = form(this.filterModel, (field) => {
    maxLength(field.search, 200, { message: 'الحد الأقصى للبحث 200 حرف.' });
    min(field.pageSize, 1);
    max(field.pageSize, 100);
  });
  protected readonly evidenceFiles = signal<File[]>([]);
  protected readonly revisionFiles = signal<File[]>([]);
  protected readonly revisionTypes = signal('');
  protected readonly pageNumber = signal(1);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly successMessage = signal('');
  protected readonly canCreate = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsCreateAssisted,
  );
  protected readonly canView = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsViewAssisted,
  );
  protected readonly canResubmit = this.session.hasPermission(
    PERMISSIONS.familyRelationshipRequestsResubmitAssisted,
  );
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.result()?.totalCount ?? 0) / this.filterModel().pageSize)),
  );

  constructor() {
    void this.loadRequests();
  }

  protected async submitRequest(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.requestForm, async () => {
      const requester = this.requester();
      const target = this.target();
      if (!requester || !target) {
        this.messages.set(['اختر مقدم الطلب والمريض المستهدف من نتائج البحث.']);
        return;
      }
      if (requester.patientId === target.patientId) {
        this.messages.set(['مقدم الطلب والمريض المستهدف يجب أن يكونا ملفين مختلفين.']);
        return;
      }
      const documentTypes = splitTypes(this.requestModel().documentTypes);
      if (!this.evidenceFiles().length || documentTypes.length !== this.evidenceFiles().length) {
        this.messages.set(['أرفق دليلاً واحداً على الأقل وحدد نوعاً لكل ملف.']);
        return;
      }
      this.submitting.set(true);
      this.resetFeedback();
      try {
        const details = await firstValueFrom(
          this.api.submitAssisted({
            ...this.requestModel(),
            requesterPatientId: requester.patientId,
            targetPatientId: target.patientId,
            evidenceFiles: this.evidenceFiles(),
            documentTypes,
          }),
        );
        this.selectedRequest.set(details);
        this.successMessage.set('تم تقديم الطلب للمراجعة بحالة Pending؛ لم تتم الموافقة عليه.');
        await this.loadRequests(1);
      } catch (error) {
        this.messages.set(flattenErrors(error));
      } finally {
        this.submitting.set(false);
      }
    });
  }

  protected async loadRequests(pageNumber = 1, event?: Event): Promise<void> {
    event?.preventDefault();
    if (!this.canView || this.filterForm().invalid()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.messages.set([]);
    try {
      this.pageNumber.set(pageNumber);
      this.result.set(
        await firstValueFrom(this.api.assistedRequests({ ...this.filterModel(), pageNumber })),
      );
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async openRequest(requestId: string): Promise<void> {
    this.resetFeedback();
    try {
      this.selectedRequest.set(await firstValueFrom(this.api.assistedDetails(requestId)));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    }
  }

  protected async openDocument(documentId: string): Promise<void> {
    const request = this.selectedRequest();
    if (!request) return;
    try {
      openPrivateMedia(
        await firstValueFrom(this.api.assistedDocument(request.requestId, documentId)),
      );
    } catch (error) {
      this.messages.set(flattenErrors(error));
    }
  }

  protected async resubmit(): Promise<void> {
    const request = this.selectedRequest();
    if (!request || request.status !== 'ModificationRequested' || !this.canResubmit) return;
    const documentTypes = splitTypes(this.revisionTypes());
    if (!this.revisionFiles().length || documentTypes.length !== this.revisionFiles().length) {
      this.messages.set(['أرفق أدلة جديدة وحدد نوعاً لكل ملف.']);
      return;
    }
    this.submitting.set(true);
    this.resetFeedback();
    try {
      this.selectedRequest.set(
        await firstValueFrom(
          this.api.resubmitAssisted(request.requestId, {
            evidenceFiles: this.revisionFiles(),
            documentTypes,
            rowVersion: request.rowVersion,
          }),
        ),
      );
      this.successMessage.set('تم حفظ revision جديدة وإعادة الطلب إلى Pending.');
      await this.loadRequests(this.pageNumber());
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.openRequest(request.requestId);
        this.messages.update((items) => [
          ...items,
          'تم تحميل أحدث نسخة. راجعها قبل إعادة المحاولة.',
        ]);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected filesChanged(event: Event, revision = false): void {
    const files = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
    if (revision) this.revisionFiles.set(files);
    else this.evidenceFiles.set(files);
  }

  protected revisionTypesChanged(event: Event): void {
    this.revisionTypes.set((event.currentTarget as HTMLInputElement).value);
  }

  protected closeDetails(): void {
    this.selectedRequest.set(null);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
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
