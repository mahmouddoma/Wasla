import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  FamilyMedicalDependent,
  FamilyMedicalRecordEncounter,
  FamilyMedicalRecordItem,
  FamilyMedicalRecordOverview,
  MedicalRecordFilterType,
  FamilyWorkspaceApi,
  FamilyWorkspaceChild,
  MedicalRecordTimelineEntry,
} from '../../../domains/families';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { HistoricalDocumentsComponent } from '../historical-documents/historical-documents.component';
import { DependentDiagnosticsComponent } from '../dependent-diagnostics/dependent-diagnostics.component';
import {
  ClinicalRecordEntry,
  isClinicalRecordEntry,
  isHistoricalRecordEntry,
} from '../../../domains/medical-records/patient-record.models';

@Component({
  selector: 'app-dependent-medical-record',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    PageHeader,
    SideDrawer,
    TranslatePipe,
    HistoricalDocumentsComponent,
    DependentDiagnosticsComponent,
  ],
  templateUrl: './dependent-medical-record.component.html',
  styleUrls: ['./dependent-medical-record.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependentMedicalRecordComponent implements OnDestroy {
  protected readonly uiLanguage = inject(LanguageService);
  private readonly api = inject(FamiliesApi);
  private readonly toast = inject(ToastService);
  private readonly workspaceApi = inject(FamilyWorkspaceApi);
  private readonly route = inject(ActivatedRoute);
  readonly isClinical = isClinicalRecordEntry;
  readonly isHistorical = isHistoricalRecordEntry;
  readonly workspaceChildren = signal<FamilyWorkspaceChild[]>([]);
  readonly documentId = signal<string | null>(null);
  readonly showDocuments = signal(false);

  // Responsive Master-Detail Split View (>= 1025px) vs Side Drawer (< 1025px)
  private readonly resizeListener = () => {
    if (typeof window !== 'undefined') {
      this.isDesktop.set(window.innerWidth >= 1025);
    }
  };

  readonly isDesktop = signal(
    typeof window !== 'undefined' ? window.innerWidth >= 1025 : true,
  );

  readonly hasActiveDetail = computed(
    () => this.encounterDrawerOpen() || this.itemDrawerOpen() || this.showDocuments(),
  );

  readonly activeDetailTitle = computed(() => {
    if (this.showDocuments()) return this.uiLanguage.t('historical.title');
    if (this.encounterDrawerOpen()) return this.uiLanguage.t('review.encounterDetails');
    if (this.itemDrawerOpen()) {
      const itm = this.selectedItem();
      if (!itm) return this.uiLanguage.t('review.itemDetails');
      if (itm.resourceType === 'lab-request') return this.uiLanguage.t('diagnostics.lab');
      if (itm.resourceType === 'radiology-request') return this.uiLanguage.t('diagnostics.radiology');
      return this.uiLanguage.t('medications.prescription');
    }
    return '';
  });

  closeAllDetails(): void {
    this.closeEncounterDrawer();
    this.closeItemDrawer();
    this.showDocuments.set(false);
  }
  readonly selectedCapabilities = computed(() =>
    this.workspaceChildren().find((child) => child.patientId === this.selectedDependentId()),
  );
  private sequence = 0;
  private encounterRequest = 0;
  private itemRequest = 0;
  private readonly mediaUrls = new Set<string>();
  private destroyed = false;
  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.destroyed = true;
    this.sequence++;
    this.closeEncounterDrawer();
    this.closeItemDrawer();
  }

  // Dependents List
  protected readonly dependents = signal<FamilyMedicalDependent[]>([]);
  protected readonly selectedDependentId = signal<string>('');
  protected readonly loadingDependents = signal<boolean>(true);

  // Overview & Timeline
  protected readonly overview = signal<FamilyMedicalRecordOverview | null>(null);
  protected readonly timelineEntries = signal<MedicalRecordTimelineEntry[]>([]);
  protected readonly loadingRecord = signal<boolean>(false);
  protected readonly loadingMore = signal<boolean>(false);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly hasMore = signal<boolean>(false);
  protected readonly messages = signal<string[]>([]);

  // Filter
  protected readonly filterType = signal<MedicalRecordFilterType | ''>('');
  protected readonly fromDate = signal<string>('');
  protected readonly toDate = signal<string>('');

  // Encounter Drawer (WAS-400)
  protected readonly encounterDrawerOpen = signal<boolean>(false);
  protected readonly selectedEncounter = signal<FamilyMedicalRecordEncounter | null>(null);
  protected readonly loadingEncounter = signal<boolean>(false);

  // Medical Item Details Drawer (WAS-401 & WAS-402)
  protected readonly itemDrawerOpen = signal<boolean>(false);
  protected readonly selectedItem = signal<FamilyMedicalRecordItem | null>(null);
  protected readonly loadingItem = signal<boolean>(false);
  protected readonly downloadingAttachmentId = signal<string>('');

  protected readonly selectedDependent = computed(
    () => this.dependents().find((d) => d.patientId === this.selectedDependentId()) ?? null,
  );

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener, { passive: true });
    }
    void this.loadDependents();
    void firstValueFrom(this.workspaceApi.workspace())
      .then((value) => {
        if (!this.destroyed) this.workspaceChildren.set(value.dependents);
      })
      .catch(() => {
        if (!this.destroyed) this.workspaceChildren.set([]);
      });
  }

  protected async loadDependents(): Promise<void> {
    this.loadingDependents.set(true);
    this.messages.set([]);
    try {
      const res = await firstValueFrom(this.api.medicalRecordDependents());
      const items = res.items ?? [];
      this.dependents.set(items);
      if (items.length > 0) {
        const requested = this.route.snapshot.queryParamMap.get('patientId');
        this.selectDependent(
          items.find((item) => item.patientId === requested)?.patientId ?? items[0].patientId,
        );
      }
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
    } finally {
      this.loadingDependents.set(false);
    }
  }

  protected selectDependent(dependentId: string): void {
    if (this.selectedDependentId() === dependentId && this.overview()) return;
    this.selectedDependentId.set(dependentId);
    this.closeEncounterDrawer();
    this.closeItemDrawer();
    this.showDocuments.set(false);
    this.documentId.set(null);
    void this.loadMedicalRecord(dependentId);
  }

  protected async loadMedicalRecord(dependentId: string): Promise<void> {
    if (!dependentId) return;
    this.loadingRecord.set(true);
    this.messages.set([]);
    const sequence = ++this.sequence;
    this.loadingMore.set(false);
    this.overview.set(null);
    this.timelineEntries.set([]);
    this.nextCursor.set(null);
    this.hasMore.set(false);
    try {
      const types = this.filterType() ? [this.filterType() as MedicalRecordFilterType] : undefined;
      const [overviewData, timelineData] = await Promise.all([
        firstValueFrom(
          this.api.dependentMedicalRecordOverview(dependentId, {
            types,
            fromDate: this.fromDate() || undefined,
            toDate: this.toDate() || undefined,
          }),
        ),
        firstValueFrom(
          this.api.dependentMedicalRecordTimeline(dependentId, {
            types,
            fromDate: this.fromDate() || undefined,
            toDate: this.toDate() || undefined,
            pageSize: 20,
          }),
        ),
      ]);

      if (sequence !== this.sequence) return;
      this.overview.set(overviewData);
      this.timelineEntries.set(timelineData.items ?? []);
      this.nextCursor.set(timelineData.nextCursor ?? null);
      this.hasMore.set(timelineData.hasMore ?? false);
    } catch (error) {
      if (sequence !== this.sequence) return;
      this.messages.set(parseApiErrors(error).messages);
      this.overview.set(null);
      this.timelineEntries.set([]);
    } finally {
      if (sequence === this.sequence) this.loadingRecord.set(false);
    }
  }

  protected async loadMoreTimeline(): Promise<void> {
    const dependentId = this.selectedDependentId();
    const cursor = this.nextCursor();
    if (!dependentId || !cursor || this.loadingMore()) return;

    this.loadingMore.set(true);
    const sequence = this.sequence;
    try {
      const types = this.filterType() ? [this.filterType() as MedicalRecordFilterType] : undefined;
      const timelineData = await firstValueFrom(
        this.api.dependentMedicalRecordTimeline(dependentId, {
          types,
          fromDate: this.fromDate() || undefined,
          toDate: this.toDate() || undefined,
          cursor,
          pageSize: 20,
        }),
      );

      if (sequence !== this.sequence || this.destroyed) return;
      this.timelineEntries.update((prev) => [...prev, ...(timelineData.items ?? [])]);
      this.nextCursor.set(timelineData.nextCursor ?? null);
      this.hasMore.set(timelineData.hasMore ?? false);
    } catch (error) {
      if (sequence !== this.sequence || this.destroyed) return;
      this.nextCursor.set(null);
      this.hasMore.set(false);
      if (error instanceof HttpErrorResponse && [400, 409].includes(error.status)) {
        await this.loadMedicalRecord(dependentId);
        return;
      }
      if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
        this.overview.set(null);
        this.timelineEntries.set([]);
        this.closeEncounterDrawer();
        this.closeItemDrawer();
        this.showDocuments.set(false);
      }
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
    } finally {
      if (sequence === this.sequence) this.loadingMore.set(false);
    }
  }

  protected onFilterChange(type: MedicalRecordFilterType | ''): void {
    this.filterType.set(type);
    void this.loadMedicalRecord(this.selectedDependentId());
  }

  protected onDateFilterChange(from: string, to: string): void {
    this.fromDate.set(from);
    this.toDate.set(to);
    void this.loadMedicalRecord(this.selectedDependentId());
  }

  // Encounter inspection drawer (WAS-400)
  protected async openEncounterDrawer(encounterId: string): Promise<void> {
    const dependentId = this.selectedDependentId();
    if (!dependentId || !encounterId) return;

    this.loadingEncounter.set(true);
    this.selectedEncounter.set(null);
    this.encounterDrawerOpen.set(true);
    const request = ++this.encounterRequest;

    try {
      const enc = await firstValueFrom(
        this.api.dependentMedicalRecordEncounter(dependentId, encounterId),
      );
      if (
        request !== this.encounterRequest ||
        dependentId !== this.selectedDependentId() ||
        this.destroyed
      )
        return;
      this.selectedEncounter.set(enc);
    } catch {
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
      if (request === this.encounterRequest) this.encounterDrawerOpen.set(false);
    } finally {
      if (request === this.encounterRequest) this.loadingEncounter.set(false);
    }
  }

  protected closeEncounterDrawer(): void {
    this.encounterRequest++;
    this.loadingEncounter.set(false);
    this.encounterDrawerOpen.set(false);
    this.selectedEncounter.set(null);
  }

  // Medical Item inspection drawer (WAS-401)
  protected async openItemDrawer(entry: ClinicalRecordEntry): Promise<void> {
    const dependentId = this.selectedDependentId();
    if (!dependentId || !entry.resourceType || !entry.sourceId) return;

    this.loadingItem.set(true);
    this.selectedItem.set(null);
    this.itemDrawerOpen.set(true);
    const request = ++this.itemRequest;

    try {
      const item = await firstValueFrom(
        this.api.dependentMedicalRecordItem(dependentId, entry.resourceType, entry.sourceId),
      );
      if (
        request !== this.itemRequest ||
        dependentId !== this.selectedDependentId() ||
        this.destroyed
      )
        return;
      this.selectedItem.set(item);
    } catch {
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
      if (request === this.itemRequest) this.itemDrawerOpen.set(false);
    } finally {
      if (request === this.itemRequest) this.loadingItem.set(false);
    }
  }

  protected closeItemDrawer(): void {
    this.itemRequest++;
    this.loadingItem.set(false);
    this.mediaUrls.forEach((url) => URL.revokeObjectURL(url));
    this.mediaUrls.clear();
    this.itemDrawerOpen.set(false);
    this.selectedItem.set(null);
  }

  // Attachment download (WAS-402)
  protected async downloadAttachment(attachmentId: string): Promise<void> {
    const dependentId = this.selectedDependentId();
    const item = this.selectedItem();
    if (!dependentId || !item || !attachmentId) return;

    this.downloadingAttachmentId.set(attachmentId);
    const request = this.itemRequest;
    try {
      const res = await firstValueFrom(
        this.api.dependentMedicalRecordAttachment(
          dependentId,
          item.resourceType,
          item.sourceId,
          attachmentId,
        ),
      );
      if (
        res.body &&
        request === this.itemRequest &&
        dependentId === this.selectedDependentId() &&
        !this.destroyed
      ) {
        const url = URL.createObjectURL(res.body);
        this.mediaUrls.add(url);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download =
          item.attachments.find((attachment) => attachment.attachmentId === attachmentId)
            ?.fileName ?? 'document';
        anchor.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          this.mediaUrls.delete(url);
        }, 1000);
        this.toast.success(this.uiLanguage.t('common.downloadSuccess'));
      }
    } catch {
      this.toast.error(this.uiLanguage.t('common.downloadFailed'));
    } finally {
      this.downloadingAttachmentId.set('');
    }
  }
}
