import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { FamiliesApi } from '../../../domains/families';
import {
  FamilyRequestDetails,
  FamilyRequestPage,
  FamilyRequestStatus,
  FamilyRequestType,
  FamilyRole,
} from '../../../domains/families';
import { openPrivateMedia } from '../../../core/media/private-media';
import {
  EVIDENCE_FILE_ACCEPT,
  getEvidenceFileValidationError,
} from '../../../core/validation/evidence-files';
import { PatientSearchItem } from '../../../domains/patients';
import { PatientPicker } from '../components/patient-picker/patient-picker';
@Component({
  selector: 'app-reception-family-requests',
  imports: [FormField, RouterLink, PatientPicker, TranslatePipe],
  templateUrl: './reception-family-requests.html',
  styleUrls: ['../../healthcare-workspace.css', './reception-family-requests.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionFamilyRequests {
  private readonly toast = inject(ToastService);

  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(FamiliesApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly evidenceFileAccept = EVIDENCE_FILE_ACCEPT;
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
      message: 'family.idRequired',
      when: ({ valueOf }) => valueOf(field.requestType) === 'AddFamilyMember',
    });
    required(field.documentTypes, { message: 'ui.full.731' });
  });
  protected readonly filterModel = signal({
    search: '',
    status: '' as FamilyRequestStatus | '',
    requestType: '' as FamilyRequestType | '',
    pageSize: 20,
  });
  protected readonly filterForm = form(this.filterModel, (field) => {
    maxLength(field.search, 200, { message: 'validation.searchLength' });
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
        this.messages.set([this.uiLanguage.t('ui.full.732')]);
        return;
      }
      if (requester.patientId === target.patientId) {
        this.messages.set([this.uiLanguage.t('ui.full.733')]);
        return;
      }
      const documentTypes = splitTypes(this.requestModel().documentTypes);
      const fileError = getEvidenceFileValidationError(this.evidenceFiles(), this.uiLanguage.currentLang());
      if (fileError) {
        this.messages.set([fileError]);
        return;
      }
      if (!this.evidenceFiles().length || documentTypes.length !== this.evidenceFiles().length) {
        this.messages.set([this.uiLanguage.t('ui.full.734')]);
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
        this.successMessage.set(this.uiLanguage.t('family.assistedSubmitted'));
        this.toast.success(this.successMessage());
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
    const fileError = getEvidenceFileValidationError(this.revisionFiles(), this.uiLanguage.currentLang());
    if (fileError) {
      this.messages.set([fileError]);
      return;
    }
    if (!this.revisionFiles().length || documentTypes.length !== this.revisionFiles().length) {
      this.messages.set([this.uiLanguage.t('ui.full.735')]);
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
      this.successMessage.set(this.uiLanguage.t('family.assistedResubmitted'));
      this.toast.success(this.successMessage());
      await this.loadRequests(this.pageNumber());
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.openRequest(request.requestId);
        this.messages.update((items) => [
          ...items,
          this.uiLanguage.t('ui.full.736'),
        ]);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected filesChanged(event: Event, revision = false): void {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const fileError = getEvidenceFileValidationError(files, this.uiLanguage.currentLang());
    this.resetFeedback();
    if (fileError) {
      input.value = '';
      if (revision) this.revisionFiles.set([]);
      else this.evidenceFiles.set([]);
      this.messages.set([fileError]);
      return;
    }
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
