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

@Component({
  selector: 'app-encounter-workspace',
  imports: [TranslatePipe, PageHeader, FormField, SideDrawer],
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
    () =>
      !this.store.busy() &&
      !!this.amendmentReason().trim() &&
      this.stagedChanges().length > 0,
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
  label(item: { nameAr: string; nameEn?: string | null } | undefined) {
    return item
      ? this.language.currentLang() === 'en'
        ? item.nameEn || item.nameAr
        : item.nameAr
      : '';
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
  saveDiagnosis(event: Event) {
    event.preventDefault();
    const model = this.model();
    void this.store.saveDiagnosis(
      { type: model.type, displayText: model.displayText, notes: model.notes.trim() || null },
      model.diagnosisId,
    );
  }
  snapshot(value: unknown) {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
}
