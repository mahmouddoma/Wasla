import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { openPrivateMedia } from '../../../core/media/private-media';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  FamilyMedicalDependent,
  FamilyMedicalRecordEncounter,
  FamilyMedicalRecordItem,
  FamilyMedicalRecordOverview,
  MedicalRecordResourceType,
  MedicalRecordTimelineEntry,
} from '../../../domains/families';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';

@Component({
  selector: 'app-dependent-medical-record',
  imports: [PageHeader, SideDrawer, TranslatePipe],
  templateUrl: './dependent-medical-record.component.html',
  styleUrls: ['./dependent-medical-record.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependentMedicalRecordComponent {
  protected readonly uiLanguage = inject(LanguageService);
  private readonly api = inject(FamiliesApi);
  private readonly toast = inject(ToastService);

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
  protected readonly filterType = signal<MedicalRecordResourceType | ''>('');
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

  protected readonly selectedDependent = computed(() =>
    this.dependents().find((d) => d.patientId === this.selectedDependentId()) ?? null,
  );

  constructor() {
    void this.loadDependents();
  }

  protected async loadDependents(): Promise<void> {
    this.loadingDependents.set(true);
    this.messages.set([]);
    try {
      const res = await firstValueFrom(this.api.medicalRecordDependents());
      const items = res.items ?? [];
      this.dependents.set(items);
      if (items.length > 0) {
        this.selectDependent(items[0].patientId);
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
    void this.loadMedicalRecord(dependentId);
  }

  protected async loadMedicalRecord(dependentId: string): Promise<void> {
    if (!dependentId) return;
    this.loadingRecord.set(true);
    this.messages.set([]);
    try {
      const types = this.filterType() ? [this.filterType() as MedicalRecordResourceType] : undefined;
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

      this.overview.set(overviewData);
      this.timelineEntries.set(timelineData.items ?? []);
      this.nextCursor.set(timelineData.nextCursor ?? null);
      this.hasMore.set(timelineData.hasMore ?? false);
    } catch (error) {
      this.messages.set(parseApiErrors(error).messages);
      this.overview.set(null);
      this.timelineEntries.set([]);
    } finally {
      this.loadingRecord.set(false);
    }
  }

  protected async loadMoreTimeline(): Promise<void> {
    const dependentId = this.selectedDependentId();
    const cursor = this.nextCursor();
    if (!dependentId || !cursor || this.loadingMore()) return;

    this.loadingMore.set(true);
    try {
      const types = this.filterType() ? [this.filterType() as MedicalRecordResourceType] : undefined;
      const timelineData = await firstValueFrom(
        this.api.dependentMedicalRecordTimeline(dependentId, {
          types,
          fromDate: this.fromDate() || undefined,
          toDate: this.toDate() || undefined,
          cursor,
          pageSize: 20,
        }),
      );

      this.timelineEntries.update((prev) => [...prev, ...(timelineData.items ?? [])]);
      this.nextCursor.set(timelineData.nextCursor ?? null);
      this.hasMore.set(timelineData.hasMore ?? false);
    } catch {
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected onFilterChange(type: MedicalRecordResourceType | ''): void {
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

    try {
      const enc = await firstValueFrom(
        this.api.dependentMedicalRecordEncounter(dependentId, encounterId),
      );
      this.selectedEncounter.set(enc);
    } catch {
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
      this.encounterDrawerOpen.set(false);
    } finally {
      this.loadingEncounter.set(false);
    }
  }

  protected closeEncounterDrawer(): void {
    this.encounterDrawerOpen.set(false);
    this.selectedEncounter.set(null);
  }

  // Medical Item inspection drawer (WAS-401)
  protected async openItemDrawer(entry: MedicalRecordTimelineEntry): Promise<void> {
    const dependentId = this.selectedDependentId();
    if (!dependentId || !entry.resourceType || !entry.sourceId) return;

    this.loadingItem.set(true);
    this.selectedItem.set(null);
    this.itemDrawerOpen.set(true);

    try {
      const item = await firstValueFrom(
        this.api.dependentMedicalRecordItem(dependentId, entry.resourceType, entry.sourceId),
      );
      this.selectedItem.set(item);
    } catch {
      this.toast.error(this.uiLanguage.t('common.failedToLoad'));
      this.itemDrawerOpen.set(false);
    } finally {
      this.loadingItem.set(false);
    }
  }

  protected closeItemDrawer(): void {
    this.itemDrawerOpen.set(false);
    this.selectedItem.set(null);
  }

  // Attachment download (WAS-402)
  protected async downloadAttachment(attachmentId: string): Promise<void> {
    const dependentId = this.selectedDependentId();
    const item = this.selectedItem();
    if (!dependentId || !item || !attachmentId) return;

    this.downloadingAttachmentId.set(attachmentId);
    try {
      const res = await firstValueFrom(
        this.api.dependentMedicalRecordAttachment(
          dependentId,
          item.resourceType,
          item.sourceId,
          attachmentId,
        ),
      );
      if (res.body) {
        openPrivateMedia(res);
        this.toast.success(this.uiLanguage.t('common.downloadSuccess'));
      }
    } catch {
      this.toast.error(this.uiLanguage.t('common.downloadFailed'));
    } finally {
      this.downloadingAttachmentId.set('');
    }
  }
}
