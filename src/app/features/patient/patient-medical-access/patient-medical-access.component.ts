import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { openPrivateMedia } from '../../../core/media/private-media';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  FamilyMedicalAccessRequestStatus,
  FamilyMedicalAccessRequestType,
  FamilyMedicalAccessStatus,
  FamilyMedicalCase,
  FamilyMedicalDocument,
  FamilyMedicalHistoryItem,
  FamilyMedicalPage,
  FamilyMember,
} from '../../../domains/families';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';

@Component({
  selector: 'app-patient-medical-access',
  imports: [DatePipe, PageHeader, SideDrawer, TranslatePipe],
  templateUrl: './patient-medical-access.component.html',
  styleUrls: ['./patient-medical-access.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientMedicalAccessComponent implements OnDestroy {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(FamiliesApi);
  private readonly toast = inject(ToastService);
  protected readonly members = signal<FamilyMember[]>([]);
  protected readonly children = computed(() =>
    this.members().filter((member) => member.role === 'Child'),
  );
  protected readonly canRequestAny = computed(
    () =>
      !!this.childStatus()?.canRequestRestriction || !!this.childStatus()?.canRequestRestoration,
  );
  private accessSequence = 0;
  private listSequence = 0;
  private detailSequence = 0;
  private membersSequence = 0;
  protected memberName(id: string): string {
    const member = this.members().find((item) => item.patientId === id);
    return member
      ? this.uiLanguage.isRtl()
        ? member.nameAr
        : member.nameEn || member.nameAr
      : this.uiLanguage.t('familyPolicy.memberUnavailable');
  }
  protected selectCheckChild(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    void this.checkDependentAccess(id);
  }
  protected async loadMembers(): Promise<void> {
    const sequence = ++this.membersSequence;
    this.membersLoading.set(true);
    this.membersFailed.set(false);
    this.members.set([]);
    this.checkChildId.set('');
    this.childStatus.set(null);
    this.checkingChild.set(false);
    ++this.accessSequence;
    try {
      const family = await firstValueFrom(this.api.mine());
      if (sequence === this.membersSequence) this.members.set(family.members ?? []);
    } catch {
      if (sequence === this.membersSequence) {
        this.members.set([]);
        this.membersFailed.set(true);
      }
    } finally {
      if (sequence === this.membersSequence) this.membersLoading.set(false);
    }
  }

  // Filters & Pagination
  protected readonly status = signal<FamilyMedicalAccessRequestStatus | ''>('');
  protected readonly requestType = signal<FamilyMedicalAccessRequestType | ''>('');
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;

  // List State
  protected readonly listResult = signal<FamilyMedicalPage<FamilyMedicalCase> | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly messages = signal<string[]>([]);

  // Master-Detail Active View / Form Mode
  protected readonly detailMode = signal<'view' | 'create' | null>(null);
  protected readonly selectedCase = signal<FamilyMedicalCase | null>(null);
  protected readonly selectedHistory = signal<FamilyMedicalHistoryItem[]>([]);
  protected readonly drawerOpen = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly historyFailed = signal(false);
  protected readonly detailMessages = signal<string[]>([]);
  protected readonly membersLoading = signal(true);
  protected readonly membersFailed = signal(false);
  protected readonly documentLoadingId = signal('');

  // Child Quick Status Check
  protected readonly checkChildId = signal('');
  protected readonly childStatus = signal<FamilyMedicalAccessStatus | null>(null);
  protected readonly checkingChild = signal(false);

  // Computed Properties
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.listResult()?.totalCount ?? 0) / this.pageSize)),
  );

  protected readonly detailTitle = computed(() => {
    const mode = this.detailMode();
    if (mode === 'create') {
      return this.uiLanguage.t('common.createRequest');
    }
    const current = this.selectedCase();
    if (current) {
      const typeText =
        current.requestType === 'Restriction'
          ? this.uiLanguage.t('review.restriction')
          : this.uiLanguage.t('review.restoration');
      return `${typeText} - #${current.revision}`;
    }
    return this.uiLanguage.t('review.medicalAccessRequests');
  });

  constructor() {
    void this.load();
    void this.loadMembers();
  }

  ngOnDestroy(): void {
    ++this.accessSequence;
    ++this.membersSequence;
    ++this.listSequence;
    ++this.detailSequence;
  }

  protected async load(): Promise<void> {
    const sequence = ++this.listSequence;
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
      if (sequence === this.listSequence) this.listResult.set(page);
    } catch (error) {
      if (sequence === this.listSequence) {
        this.messages.set(parseApiErrors(error).messages);
        this.listResult.set(null);
      }
    } finally {
      if (sequence === this.listSequence) this.loading.set(false);
    }
  }

  protected async openDetailsDrawer(item: FamilyMedicalCase): Promise<void> {
    if (this.submitting()) return;
    const sequence = ++this.detailSequence;
    this.selectedCase.set(null);
    this.selectedHistory.set([]);
    this.detailMessages.set([]);
    this.historyFailed.set(false);
    this.detailMode.set('view');
    this.drawerOpen.set(true);
    this.detailLoading.set(true);
    const [details, history] = await Promise.allSettled([
      firstValueFrom(this.api.myMedicalAccessRequest(item.requestId)),
      firstValueFrom(this.api.myMedicalAccessHistory(item.requestId)),
    ]);
    if (sequence !== this.detailSequence) return;
    if (details.status === 'fulfilled') this.selectedCase.set(details.value);
    else this.detailMessages.set(parseApiErrors(details.reason).messages);
    if (history.status === 'fulfilled') this.selectedHistory.set(history.value.items ?? []);
    else this.historyFailed.set(true);
    this.detailLoading.set(false);
  }

  protected closeDetail(): void {
    if (this.submitting()) return;
    ++this.detailSequence;
    this.detailLoading.set(false);
    this.detailMessages.set([]);
    this.detailMode.set(null);
    this.drawerOpen.set(false);
    this.selectedCase.set(null);
    this.selectedHistory.set([]);
  }

  protected async checkDependentAccess(childId: string): Promise<void> {
    const sequence = ++this.accessSequence;
    const child = this.children().find((member) => member.patientId === childId);
    this.checkChildId.set(child?.patientId ?? '');
    this.childStatus.set(null);
    this.checkingChild.set(false);
    if (!child) return;
    this.checkingChild.set(true);
    try {
      const res = await firstValueFrom(this.api.childMedicalAccess(childId.trim()));
      if (sequence === this.accessSequence) this.childStatus.set(res);
    } catch {
      if (sequence === this.accessSequence) {
        this.childStatus.set(null);
        this.toast.error(this.uiLanguage.t('common.failedToLoad'));
      }
    } finally {
      if (sequence === this.accessSequence) this.checkingChild.set(false);
    }
  }

  protected showEvidenceUnavailable(): void {
    if (this.submitting()) return;
    this.closeDetail();
    // Approved evidence options are not published by the current backend contract.
    // Do not collect documents or submit create/resubmit using guessed policy values.
    this.detailMode.set('create');
    this.drawerOpen.set(true);
  }

  protected async withdrawRequest(item: FamilyMedicalCase): Promise<void> {
    if (
      this.submitting() ||
      this.detailLoading() ||
      !item.capabilities.canWithdraw ||
      !item.rowVersion ||
      this.selectedCase()?.requestId !== item.requestId ||
      !confirm(this.uiLanguage.t('common.confirmAction'))
    )
      return;
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.api.withdrawMedicalAccessRequest(item.requestId, item.rowVersion, crypto.randomUUID()),
      );
      this.toast.success(this.uiLanguage.t('common.savedSuccessfully'));
      this.submitting.set(false);
      this.closeDetail();
      await this.load();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.toast.error(this.uiLanguage.t('common.conflictState'));
        this.submitting.set(false);
        await Promise.all([this.openDetailsDrawer(item), this.load()]);
      } else {
        this.detailMessages.set(parseApiErrors(error).messages);
        this.toast.error(this.uiLanguage.t('common.actionFailed'));
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected async downloadDoc(doc: FamilyMedicalDocument): Promise<void> {
    const current = this.selectedCase();
    if (
      !current ||
      this.documentLoadingId() ||
      !doc.canDownload ||
      !current.documents.some((item) => item.documentId === doc.documentId && item.canDownload)
    )
      return;
    this.documentLoadingId.set(doc.documentId);
    try {
      const res = await firstValueFrom(
        this.api.myMedicalAccessDocument(current.requestId, doc.documentId),
      );
      if (res.body && this.selectedCase()?.requestId === current.requestId) {
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
