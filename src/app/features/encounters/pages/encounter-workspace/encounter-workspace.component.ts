import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormField, form, maxLength, readonly as readonlyField } from '@angular/forms/signals';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import {
  Diagnosis,
  DiagnosisDraft,
  DiagnosisType,
  EncounterAmendmentChange,
  EncounterQuery,
} from '../../../../domains/encounters';
import { EncounterWorkspaceStore } from '../../state/encounter-workspace.store';
import { PrescriptionWorkspaceComponent } from '../../../prescriptions';
import { DiagnosticDraftComponent } from '../../../diagnostics';
import { RouterLink } from '@angular/router';

interface LocalizedNameEntity {
  nameAr?: string | null;
  nameEn?: string | null;
  practiceNameAr?: string | null;
  practiceNameEn?: string | null;
  doctorNameAr?: string | null;
  doctorNameEn?: string | null;
  patientNameAr?: string | null;
  patientNameEn?: string | null;
  patient?: { nameAr?: string | null; nameEn?: string | null } | null;
  doctor?: { nameAr?: string | null; nameEn?: string | null } | null;
  practice?: { nameAr?: string | null; nameEn?: string | null } | null;
}

@Component({
  selector: 'app-encounter-workspace',
  imports: [
    LocalizedDatePipe,
    TranslatePipe,
    PageHeader,
    FormField,
    SideDrawer,
    PrescriptionWorkspaceComponent,
    DiagnosticDraftComponent,
    RouterLink,
  ],
  providers: [EncounterWorkspaceStore],
  templateUrl: './encounter-workspace.component.html',
  styleUrl: './encounter-workspace.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterWorkspaceComponent implements OnInit {
  readonly store = inject(EncounterWorkspaceStore);
  readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  readonly model = signal({
    clinicalNotes: '',
    diagnosisId: '',
    type: 'Primary' as DiagnosisType,
    displayText: '',
    notes: '',
    validUntil: '',
  });
  readonly fields = form(this.model, (path) => {
    maxLength(path.clinicalNotes, 8000);
    maxLength(path.displayText, 500);
    maxLength(path.notes, 2000);
    readonlyField(path.clinicalNotes, () => !this.store.canEditNotes() || this.store.busy());
  });
  readonly removeId = signal('');
  readonly totalPages = computed(() => {
    const page = this.store.page();
    if (!page || !page.pageSize) return 1;
    return Math.max(1, Math.ceil(page.totalCount / page.pageSize));
  });

  // ── Drawer Navigation Tabs (Diagnoses, Prescription, Diagnostics, History) ──
  readonly activeTab = signal<'diagnoses' | 'prescription' | 'diagnostics' | 'history'>(
    'diagnoses',
  );

  // ── Amendment State (FE API 13.8) ─────────────────────────
  readonly showAmendmentForm = signal(false);
  readonly amendmentReason = signal('');
  readonly amendNotes = signal(false);
  readonly amendedNotes = signal('');
  readonly newDiagnosisType = signal<DiagnosisType>('Primary');
  readonly newDiagnosisText = signal('');
  readonly newDiagnosisNotes = signal('');
  readonly stagedDiagnosesToAdd = signal<DiagnosisDraft[]>([]);
  readonly stagedDiagnosisIdsToRemove = signal<string[]>([]);

  readonly stagedChanges = computed<EncounterAmendmentChange[]>(() => {
    const changes: EncounterAmendmentChange[] = [];
    if (this.amendNotes() && this.amendedNotes().trim()) {
      changes.push({
        type: 'ClinicalNotes',
        clinicalNotes: this.amendedNotes().trim(),
      });
    }
    for (const d of this.stagedDiagnosesToAdd()) {
      changes.push({
        type: 'Diagnosis',
        action: 'Add',
        diagnosisType: d.type,
        displayText: d.displayText,
        notes: d.notes,
        diagnosis: d,
      });
    }
    for (const id of this.stagedDiagnosisIdsToRemove()) {
      changes.push({
        type: 'Diagnosis',
        action: 'Remove',
        diagnosisId: id,
      });
    }
    return changes;
  });

  readonly canSubmitAmendment = computed(
    () => !this.store.busy() && !!this.amendmentReason().trim() && this.stagedChanges().length > 0,
  );

  startAmendment(): void {
    const detail = this.store.detail();
    this.amendmentReason.set('');
    this.amendNotes.set(false);
    this.amendedNotes.set(detail?.clinicalNotes ?? '');
    this.newDiagnosisType.set('Primary');
    this.newDiagnosisText.set('');
    this.newDiagnosisNotes.set('');
    this.stagedDiagnosesToAdd.set([]);
    this.stagedDiagnosisIdsToRemove.set([]);
    this.showAmendmentForm.set(true);
  }

  cancelAmendment(): void {
    this.showAmendmentForm.set(false);
    this.amendmentReason.set('');
    this.amendNotes.set(false);
    this.stagedDiagnosesToAdd.set([]);
    this.stagedDiagnosisIdsToRemove.set([]);
  }

  onNewDiagnosisTypeChange(event: Event): void {
    const val = this.value(event);
    if (val === 'Primary' || val === 'Secondary') {
      this.newDiagnosisType.set(val);
    }
  }

  stageAddDiagnosis(): void {
    const text = this.newDiagnosisText().trim();
    if (!text) return;
    this.stagedDiagnosesToAdd.update((list) => [
      ...list,
      {
        type: this.newDiagnosisType(),
        displayText: text,
        notes: this.newDiagnosisNotes().trim() || null,
      },
    ]);
    this.newDiagnosisText.set('');
    this.newDiagnosisNotes.set('');
  }

  removeStagedAddDiagnosis(index: number): void {
    this.stagedDiagnosesToAdd.update((list) => list.filter((_, i) => i !== index));
  }

  toggleVoidDiagnosis(diagnosisId: string): void {
    this.stagedDiagnosisIdsToRemove.update((ids) =>
      ids.includes(diagnosisId) ? ids.filter((id) => id !== diagnosisId) : [...ids, diagnosisId],
    );
  }

  async submitAmendment(): Promise<void> {
    const reason = this.amendmentReason().trim();
    const changes = this.stagedChanges();
    if (!reason || !changes.length || this.store.busy()) return;
    await this.store.createAmendment(reason, changes);
    this.cancelAmendment();
  }

  constructor() {
    effect(() => {
      const detail = this.store.detail();
      this.model.set({
        clinicalNotes: detail?.clinicalNotes ?? '',
        diagnosisId: '',
        type: 'Primary',
        displayText: '',
        notes: '',
        validUntil: '',
      });
      this.removeId.set('');
      this.cancelAmendment();
      this.activeTab.set('diagnoses');
    });
  }
  async ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    await this.store.initialize(
      this.route.snapshot.data['actor'] === 'Doctor',
      params.get('practiceId') || '',
      params.get('encounterId') || '',
      params.get('ticketId') || '',
    );
  }
  label(item: LocalizedNameEntity | null | undefined) {
    if (!item) return '';
    const nameAr = item.nameAr || item.practiceNameAr || item.doctorNameAr || item.patientNameAr;
    const nameEn = item.nameEn || item.practiceNameEn || item.doctorNameEn || item.patientNameEn;
    return this.language.currentLang() === 'en' ? nameEn || nameAr || '' : nameAr || nameEn || '';
  }
  doctorOrPatient(item: LocalizedNameEntity): string {
    if (this.store.doctor()) {
      const ar = item.patient?.nameAr || item.patientNameAr;
      const en = item.patient?.nameEn || item.patientNameEn;
      return this.language.currentLang() === 'en' ? en || ar || '' : ar || en || '';
    }
    const ar = item.doctor?.nameAr || item.doctorNameAr;
    const en = item.doctor?.nameEn || item.doctorNameEn;
    if (ar || en) {
      return this.language.currentLang() === 'en' ? en || ar || '' : ar || en || '';
    }
    if (item.practiceNameAr) {
      const match = item.practiceNameAr.match(/(د\.\s*[^ل]+)/);
      if (match) return match[1].trim();
      return item.practiceNameAr;
    }
    return '';
  }
  practiceLabel(item: LocalizedNameEntity): string {
    const ar = item.practice?.nameAr || item.practiceNameAr;
    const en = item.practice?.nameEn || item.practiceNameEn;
    return this.language.currentLang() === 'en' ? en || ar || '' : ar || en || '';
  }
  doctorNameDetail(detail: LocalizedNameEntity | null | undefined): string {
    const isAr = this.language.currentLang() === 'ar';
    const ar = detail?.doctor?.nameAr || detail?.doctorNameAr;
    const en = detail?.doctor?.nameEn || detail?.doctorNameEn;
    return isAr ? ar || en || '' : en || ar || '';
  }
  practiceNameDetail(detail: LocalizedNameEntity | null | undefined): string {
    const isAr = this.language.currentLang() === 'ar';
    const ar = detail?.practice?.nameAr || detail?.practiceNameAr;
    const en = detail?.practice?.nameEn || detail?.practiceNameEn;
    return isAr ? ar || en || '' : en || ar || '';
  }
  value(event: Event) {
    return (event.target as HTMLInputElement).value;
  }
  filter(key: keyof EncounterQuery, event: Event) {
    this.store.query.update((q) => ({
      ...q,
      [key]: this.value(event) || undefined,
      pageNumber: 1,
    }));
    void this.store.load();
  }
  page(delta: number) {
    this.store.query.update((q) => ({ ...q, pageNumber: q.pageNumber + delta }));
    void this.store.load();
  }
  editDiagnosis(diagnosis: Diagnosis) {
    this.model.update((m) => ({
      ...m,
      diagnosisId: diagnosis.diagnosisId,
      type: diagnosis.type,
      displayText: diagnosis.displayText,
      notes: diagnosis.notes || '',
    }));
  }
  cancelEditDiagnosis() {
    this.model.update((m) => ({
      ...m,
      diagnosisId: '',
      type: 'Primary',
      displayText: '',
      notes: '',
    }));
  }
  async saveDiagnosis(event: Event) {
    event.preventDefault();
    const model = this.model();
    await this.store.saveDiagnosis(
      { type: model.type, displayText: model.displayText, notes: model.notes.trim() || null },
      model.diagnosisId,
    );
    this.cancelEditDiagnosis();
  }
  async completeVisit() {
    const model = this.model();
    const draftDiagnosis = model.displayText.trim()
      ? {
          type: model.type,
          displayText: model.displayText.trim(),
          notes: model.notes.trim() || null,
        }
      : undefined;
    await this.store.complete(model.clinicalNotes, draftDiagnosis);
    if (draftDiagnosis) this.cancelEditDiagnosis();
  }
  snapshot(value: unknown) {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
  diagnoses(
    detail: { diagnoses?: readonly Diagnosis[] | null } | null | undefined,
  ): readonly Diagnosis[] {
    return detail?.diagnoses ?? [];
  }
}
