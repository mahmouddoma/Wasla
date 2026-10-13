import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { openPrivateMedia } from '../../../core/media/private-media';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  EVIDENCE_FILE_ACCEPT,
  getEvidenceFileValidationError,
} from '../../../core/validation/evidence-files';
import {
  FamiliesApi,
  FamilyMedicalAccessRequestStatus,
  FamilyMedicalAccessRequestType,
  FamilyMedicalAccessStatus,
  FamilyMedicalCase,
  FamilyMedicalDocument,
  FamilyMedicalHistoryItem,
  FamilyMedicalPage,
} from '../../../domains/families';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';

@Component({
  selector: 'app-patient-medical-access',
  imports: [FormField, PageHeader, SideDrawer, TranslatePipe],
  templateUrl: './patient-medical-access.component.html',
  styleUrls: ['./patient-medical-access.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientMedicalAccessComponent {
  protected readonly uiLanguage = inject(LanguageService);
  protected readonly evidenceFileAccept = EVIDENCE_FILE_ACCEPT;

  private readonly api = inject(FamiliesApi);
  private readonly toast = inject(ToastService);
  private readonly newRequestDialog = viewChild<ElementRef<HTMLDialogElement>>('newRequestDialog');
  private readonly resubmitDialog = viewChild<ElementRef<HTMLDialogElement>>('resubmitDialog');

  protected readonly status = signal<FamilyMedicalAccessRequestStatus | ''>('');
  protected readonly requestType = signal<FamilyMedicalAccessRequestType | ''>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;

  protected readonly listResult = signal<FamilyMedicalPage<FamilyMedicalCase> | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly messages = signal<string[]>([]);

  // Selected for drawer details
  protected readonly selectedCase = signal<FamilyMedicalCase | null>(null);
  protected readonly selectedHistory = signal<FamilyMedicalHistoryItem[]>([]);
  protected readonly drawerOpen = signal(false);
  protected readonly documentLoadingId = signal('');

  // Child check
  protected readonly checkChildId = signal('');
  protected readonly childStatus = signal<FamilyMedicalAccessStatus | null>(null);
  protected readonly checkingChild = signal(false);

  // New request form
  protected readonly newRequestModel = signal({
    requestType: 'Restriction' as FamilyMedicalAccessRequestType,
    childPatientId: '',
    affectedAdultPatientId: '',
    reason: '',
    documentTypes: '',
  });
  protected readonly newRequestForm = form(this.newRequestModel, (field) => {
    required(field.childPatientId, { message: 'validation.required' });
    required(field.affectedAdultPatientId, { message: 'validation.required' });
    required(field.reason, { message: 'review.reasonRequired' });
    maxLength(field.reason, 2000, { message: 'validation.max2000' });
  });
  protected readonly newRequestFiles = signal<File[]>([]);

  // Resubmit form
  protected readonly resubmitModel = signal({
    reason: '',
    documentTypes: '',
  });
  protected readonly resubmitForm = form(this.resubmitModel, (field) => {
    required(field.reason, { message: 'review.reasonRequired' });
    maxLength(field.reason, 2000, { message: 'validation.max2000' });
  });
  protected readonly resubmitFiles = signal<File[]>([]);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.listResult()?.totalCount ?? 0) / this.pageSize)),
  );

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      const page = await firstValueFrom(
        this.api.myMedicalAccessRequests({
          status: this.status() || undefined,
          requestType: this.requestType() || undefined,
          pageNumber: this.pageNumber(),
          pageSize: this.pageSize,
        }),
      );
      this.listResult.set(page);
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
      this.listResult.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected async openDetailsDrawer(item: FamilyMedicalCase): Promise<void> {
    this.selectedCase.set(item);
    this.drawerOpen.set(true);
    try {
      const [fullCase, historyRes] = await Promise.all([
        firstValueFrom(this.api.myMedicalAccessRequest(item.requestId)),
        firstValueFrom(this.api.myMedicalAccessHistory(item.requestId)),
      ]);
      this.selectedCase.set(fullCase);
      this.selectedHistory.set(historyRes.items ?? []);
    } catch {
      // Keep item fallback
    }
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedCase.set(null);
    this.selectedHistory.set([]);
  }

  protected async checkDependentAccess(childId: string): Promise<void> {
    if (!childId.trim()) return;
    this.checkingChild.set(true);
    try {
      const res = await firstValueFrom(this.api.childMedicalAccess(childId.trim()));
      this.childStatus.set(res);
    } catch {
      this.childStatus.set(null);
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
    } finally {
      this.checkingChild.set(false);
    }
  }

  protected openNewRequestModal(): void {
    this.newRequestModel.set({
      requestType: 'Restriction',
      childPatientId: this.checkChildId(),
      affectedAdultPatientId: '',
      reason: '',
      documentTypes: '',
    });
    this.newRequestForm().reset();
    this.newRequestFiles.set([]);
    this.messages.set([]);
    this.newRequestDialog()?.nativeElement.showModal();
  }

  protected closeNewRequestModal(): void {
    this.newRequestDialog()?.nativeElement.close();
  }

  protected onNewFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    const err = getEvidenceFileValidationError(files, this.uiLanguage.currentLang());
    if (err) {
      this.toast.error(err);
      return;
    }
    this.newRequestFiles.set(files);
  }

  protected async submitNewRequest(): Promise<void> {
    const model = this.newRequestModel();
    if (!model.childPatientId || !model.affectedAdultPatientId || !model.reason.trim()) {
      this.messages.set([this.uiLanguage.t('validation.required')]);
      return;
    }

    this.submitting.set(true);
    this.messages.set([]);
    try {
      const docTypes = model.documentTypes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await firstValueFrom(
        this.api.createMedicalAccessRequest({
          requestType: model.requestType,
          childPatientId: model.childPatientId.trim(),
          affectedAdultPatientId: model.affectedAdultPatientId.trim(),
          reason: model.reason.trim(),
          evidenceFiles: this.newRequestFiles(),
          documentTypes: docTypes.length ? docTypes : ['Evidence'],
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      this.toast.success(this.uiLanguage.t('common.savedSuccessfully'));
      this.closeNewRequestModal();
      await this.load();
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
      this.toast.error(this.uiLanguage.t('common.actionFailed'));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async withdrawRequest(item: FamilyMedicalCase): Promise<void> {
    if (!confirm(this.uiLanguage.t('common.confirmAction'))) return;
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.api.withdrawMedicalAccessRequest(item.requestId, item.rowVersion, crypto.randomUUID()),
      );
      this.toast.success(this.uiLanguage.t('common.savedSuccessfully'));
      this.closeDrawer();
      await this.load();
    } catch (error) {
      this.toast.error(this.uiLanguage.t('common.actionFailed'));
    } finally {
      this.submitting.set(false);
    }
  }

  protected openResubmitModal(item: FamilyMedicalCase): void {
    this.selectedCase.set(item);
    this.resubmitModel.set({
      reason: item.reason,
      documentTypes: '',
    });
    this.resubmitForm().reset();
    this.resubmitFiles.set([]);
    this.resubmitDialog()?.nativeElement.showModal();
  }

  protected closeResubmitModal(): void {
    this.resubmitDialog()?.nativeElement.close();
  }

  protected onResubmitFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    const err = getEvidenceFileValidationError(files, this.uiLanguage.currentLang());
    if (err) {
      this.toast.error(err);
      return;
    }
    this.resubmitFiles.set(files);
  }

  protected async submitResubmit(): Promise<void> {
    const current = this.selectedCase();
    if (!current) return;
    const model = this.resubmitModel();

    this.submitting.set(true);
    try {
      const docTypes = model.documentTypes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await firstValueFrom(
        this.api.resubmitMedicalAccessRequest(current.requestId, {
          rowVersion: current.rowVersion,
          reason: model.reason.trim(),
          evidenceFiles: this.resubmitFiles(),
          documentTypes: docTypes.length ? docTypes : ['UpdatedEvidence'],
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      this.toast.success(this.uiLanguage.t('common.savedSuccessfully'));
      this.closeResubmitModal();
      this.closeDrawer();
      await this.load();
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
      this.toast.error(this.uiLanguage.t('common.actionFailed'));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async downloadDoc(doc: FamilyMedicalDocument): Promise<void> {
    const current = this.selectedCase();
    if (!current) return;
    this.documentLoadingId.set(doc.documentId);
    try {
      const res = await firstValueFrom(
        this.api.myMedicalAccessDocument(current.requestId, doc.documentId),
      );
      if (res.body) {
        openPrivateMedia(res);
      }
    } catch {
      this.toast.error(this.uiLanguage.t('common.downloadFailed'));
    } finally {
      this.documentLoadingId.set('');
    }
  }

  protected setFilter(filter: 'status' | 'requestType', event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (filter === 'status') {
      this.status.set(value as FamilyMedicalAccessRequestStatus | '');
    } else {
      this.requestType.set(value as FamilyMedicalAccessRequestType | '');
    }
    this.pageNumber.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    void this.load();
  }
}
