import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, Observable, Subject, debounceTime, switchMap, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DrugCatalogApi, DrugCatalogItem, DrugPage } from '../../../../domains/drug-catalog';
import {
  AddPrescriptionItem,
  PatientPrescription,
  PrescriptionClinicalFields,
  PrescriptionItem,
  PrescriptionsApi,
  PrescriptionState,
  PrescriptionVersion,
} from '../../../../domains/prescriptions';

type Action = 'remove' | 'startCorrection' | 'finalize' | 'discard' | 'void';
@Component({
  selector: 'app-prescription-workspace',
  imports: [LocalizedDatePipe, ReactiveFormsModule, TranslatePipe],
  templateUrl: './prescription-workspace.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './prescription-workspace.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionWorkspaceComponent {
  private readonly api = inject(PrescriptionsApi);
  private readonly catalog = inject(DrugCatalogApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly language = inject(LanguageService);
  readonly initial = input<PrescriptionState | null>(null);
  readonly prescriptionId = input('');
  readonly practiceId = input('');
  readonly encounterId = input('');
  readonly canManage = input(false);
  readonly canRequest = input(false);
  readonly disabled = input(false);
  readonly patientView = input<PatientPrescription | null>(null);
  readonly changed = output<PrescriptionState | null>();
  readonly busyChanged = output<boolean>();
  private loadedContext: string | null = null;
  readonly state = signal<PrescriptionState | null>(null);
  readonly busy = signal(false);
  readonly messages = signal<string[]>([]);
  readonly versions = signal<readonly PrescriptionVersion[]>([]);
  readonly historical = signal<PrescriptionVersion | null>(null);
  readonly correctionMode = signal(false);
  readonly editingId = signal('');
  readonly editing = signal(false);
  readonly selectedDrug = signal<DrugCatalogItem | null>(null);
  readonly missing = signal(false);
  readonly drugs = signal<DrugPage | null>(null);
  readonly searchText = signal('');
  readonly searching = signal(false);
  readonly pending = signal<Action | null>(null);
  readonly removeId = signal('');
  readonly reason = signal('');
  readonly clinicalFields = [
    'strength',
    'dosageForm',
    'route',
    'dose',
    'frequency',
    'duration',
    'instructions',
  ] as const;
  readonly metadataFields = [
    'scientificName',
    'manufacturer',
    'strength',
    'dosageForm',
    'route',
    'drugClass',
    'doctorNote',
  ] as const;
  readonly clinical = this.fb.group({
    strength: [''],
    dosageForm: [''],
    route: [''],
    dose: [''],
    frequency: [''],
    duration: [''],
    instructions: [''],
    isPrn: [false],
    quantity: this.fb.control<number | null>(null, Validators.min(0)),
  });
  readonly medication = this.fb.group({
    medicationName: ['', Validators.required],
    scientificName: [''],
    manufacturer: [''],
    strength: [''],
    dosageForm: [''],
    route: [''],
    drugClass: [''],
    doctorNote: [''],
  });
  private readonly searches = new Subject<{
    search: string;
    pageNumber: number;
    sequence: number;
  }>();
  private searchSequence = 0;
  private generation = 0;
  private intent: { signature: string; key: string } | null = null;
  constructor() {
    effect(() => this.busyChanged.emit(this.busy()));
    effect(() => {
      const initial = this.initial(),
        id = this.prescriptionId(),
        encounterId = this.encounterId(),
        patient = this.patientView();
      const context = patient
        ? 'patient:' + patient.prescriptionId
        : 'doctor:' + id + ':' + encounterId;
      untracked(() => {
        if (this.loadedContext === context) {
          if (encounterId && this.state() !== initial) this.state.set(initial);
          return;
        }
        this.loadedContext = context;
        this.generation++;
        this.state.set(initial);
        this.editing.set(false);
        this.pending.set(null);
        this.historical.set(null);
        this.correctionMode.set(false);
        this.versions.set([]);
        this.intent = null;
        this.messages.set([]);
        this.searchSequence++;
        if (id && !encounterId && !patient) void this.load();
      });
    });
    this.searches
      .pipe(
        debounceTime(300),
        switchMap((query) => {
          if (
            !this.allowed('DrugCatalog.SearchActive') ||
            !this.editing() ||
            query.sequence !== this.searchSequence
          )
            return of(null);
          return this.catalog
            .searchActive({ search: query.search, pageNumber: query.pageNumber, pageSize: 20 })
            .pipe(
              switchMap((page) => of({ page, sequence: query.sequence })),
              catchError((error) => {
                if (query.sequence === this.searchSequence) this.failure(error);
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result?.sequence === this.searchSequence) {
          this.drugs.set(result.page);
          this.searching.set(false);
        } else if (!result) this.searching.set(false);
      });
  }
  allowed(permission: string) {
    return this.session.user()?.userType === 'Doctor' && this.session.hasPermission(permission);
  }
  value(event: Event) {
    return (event.target as HTMLInputElement).value;
  }
  setReason(event: Event) {
    this.reason.set(this.value(event));
  }
  editable() {
    const state = this.state();
    return (
      !this.disabled() &&
      !this.patientView() &&
      !this.historical() &&
      this.allowed(
        this.correctionMode() ? 'Prescriptions.CorrectOwn' : 'Prescriptions.ManageOwnDraft',
      ) &&
      (this.correctionMode()
        ? !!state?.draft && state.capabilities.canCorrect !== false
        : this.canManage() &&
          (!state || !!state.draft) &&
          state?.capabilities.canManageDraft !== false)
    );
  }
  itemName(item: {
    medicationName?: string;
    commercialNameEn?: string;
    commercialNameAr?: string | null;
  }) {
    return (
      (this.language.currentLang() === 'ar' ? item.commercialNameAr : null) ||
      item.medicationName ||
      item.commercialNameEn ||
      ''
    );
  }
  async load() {
    const id = this.prescriptionId() || this.state()?.prescriptionId;
    if (!id || !this.allowed('Prescriptions.ViewOwn')) return;
    const generation = this.generation;
    this.busy.set(true);
    try {
      const state = await firstValueFrom(this.api.details(id));
      if (generation === this.generation) this.state.set(state);
    } catch (error) {
      if (generation === this.generation) this.failure(error);
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  beginAdd() {
    if (!this.editable() || this.busy()) return;
    this.editingId.set('');
    this.clinical.reset();
    this.medication.reset();
    this.selectedDrug.set(null);
    this.missing.set(false);
    this.editing.set(true);
    this.search('');
    this.intent = null;
  }
  editItem(item: PrescriptionItem) {
    if (!this.editable() || this.busy()) return;
    this.editing.set(true);
    this.editingId.set(item.itemId);
    this.selectedDrug.set(null);
    this.missing.set(false);
    this.clinical.reset({
      strength: item.strength ?? '',
      dosageForm: item.dosageForm ?? '',
      route: item.route ?? '',
      dose: item.dose ?? '',
      frequency: item.frequency ?? '',
      duration: item.duration ?? '',
      instructions: item.instructions ?? '',
      isPrn: item.isPrn ?? false,
      quantity: item.quantity ?? null,
    });
  }
  search(search: string, pageNumber = 1) {
    if (!this.allowed('DrugCatalog.SearchActive')) return;
    this.searchText.set(search);
    this.searching.set(true);
    this.searches.next({ search, pageNumber, sequence: ++this.searchSequence });
  }
  choose(drug: DrugCatalogItem) {
    if (!this.editable() || this.busy() || this.disabled() || drug.status !== 'Active') return;
    this.selectedDrug.set(drug);
    this.missing.set(false);
    this.clinical.patchValue({
      strength: drug.strengthText ?? '',
      dosageForm: drug.dosageForm ?? '',
      route: drug.route ?? '',
    });
  }
  useMissing() {
    if (
      !this.editable() ||
      this.busy() ||
      !this.canRequest() ||
      !this.allowed('DrugCatalogRequests.CreateOwn')
    )
      return;
    this.selectedDrug.set(null);
    this.missing.set(true);
    this.medication.controls.medicationName.setValue(this.searchText());
  }
  private clinicalData(): PrescriptionClinicalFields {
    const value = this.clinical.getRawValue();
    return {
      ...value,
      strength: value.strength.trim() || null,
      dosageForm: value.dosageForm.trim() || null,
      route: value.route.trim() || null,
      dose: value.dose.trim() || null,
      frequency: value.frequency.trim() || null,
      duration: value.duration.trim() || null,
      instructions: value.instructions.trim() || null,
    };
  }
  async saveItem() {
    if (!this.editable() || this.busy() || this.disabled() || this.clinical.invalid) return;
    const state = this.state(),
      fields = this.clinicalData(),
      itemId = this.editingId();
    if (itemId && state) {
      const body = { ...fields, prescriptionRowVersion: state.rowVersion };
      await this.mutate(() =>
        this.correctionMode()
          ? this.api.updateCorrectionItem(state.prescriptionId, itemId, body)
          : this.api.updateItem(this.practiceId(), this.encounterId(), itemId, body),
      );
      return;
    }
    if (
      !this.selectedDrug() &&
      (!this.missing() ||
        this.medication.invalid ||
        !this.canRequest() ||
        !this.allowed('DrugCatalogRequests.CreateOwn'))
    ) {
      this.messages.set(['medications.invalidForm']);
      return;
    }
    const source = this.selectedDrug()
      ? { drugCatalogId: this.selectedDrug()!.drugCatalogId }
      : { newMedication: this.medication.getRawValue() };
    const body: AddPrescriptionItem = {
      ...fields,
      ...source,
      ...(state ? { prescriptionRowVersion: state.rowVersion } : {}),
    };
    const key = this.intentKey({
      action: 'add',
      context: this.encounterId() || state?.prescriptionId,
      body,
    });
    await this.mutate(() =>
      this.correctionMode() && state
        ? this.api.addCorrectionItem(state.prescriptionId, body, key)
        : this.api.addItem(this.practiceId(), this.encounterId(), body, key),
    );
  }
  ask(action: Action, itemId = '') {
    if (this.busy() || this.disabled() || this.patientView() || this.historical()) return;
    this.pending.set(action);
    this.removeId.set(itemId);
    this.reason.set('');
    this.intent = null;
  }
  async confirm() {
    const action = this.pending(),
      state = this.state();
    if (
      !action ||
      !state ||
      this.busy() ||
      this.disabled() ||
      this.patientView() ||
      this.historical()
    )
      return;
    const id = state.prescriptionId,
      rowVersion = state.rowVersion;
    if (
      action === 'remove' &&
      this.editable() &&
      state.draft?.items.some((i) => i.itemId === this.removeId())
    ) {
      await this.mutate(() =>
        this.correctionMode()
          ? this.api.removeCorrectionItem(id, this.removeId(), rowVersion)
          : this.api.removeItem(this.practiceId(), this.encounterId(), this.removeId(), rowVersion),
      );
      return;
    }
    if (
      action === 'startCorrection' &&
      state.current?.status === 'Finalized' &&
      state.capabilities.canCorrect &&
      this.allowed('Prescriptions.CorrectOwn') &&
      this.reason().trim()
    ) {
      const body = { rowVersion, reason: this.reason().trim() },
        key = this.intentKey({ action, id, body });
      await this.mutate(() => this.api.startCorrection(id, body, key));
      if (!this.messages().length) this.correctionMode.set(true);
      return;
    }
    if (
      action === 'finalize' &&
      this.correctionMode() &&
      state.capabilities.canFinalizeCorrection &&
      this.allowed('Prescriptions.CorrectOwn')
    ) {
      if (!state.draft?.items.length || state.completionBlockers.length) {
        this.messages.set(['medications.resolveBlockers']);
        return;
      }
      const key = this.intentKey({ action, id, rowVersion });
      await this.mutate(() => this.api.finalizeCorrection(id, rowVersion, key));
      if (!this.messages().length) this.correctionMode.set(false);
      return;
    }
    if (
      action === 'discard' &&
      this.correctionMode() &&
      state.capabilities.canDiscardCorrection &&
      this.allowed('Prescriptions.CorrectOwn')
    ) {
      await this.mutate(() => this.api.discardCorrection(id, rowVersion));
      if (!this.messages().length) this.correctionMode.set(false);
      return;
    }
    if (
      action === 'void' &&
      !state.draft &&
      state.current?.status === 'Finalized' &&
      state.capabilities.canVoid &&
      this.allowed('Prescriptions.VoidOwn') &&
      this.reason().trim()
    ) {
      const body = { rowVersion, reason: this.reason().trim() },
        key = this.intentKey({ action, id, body });
      await this.mutate(() => this.api.voidPrescription(id, body, key));
    }
  }
  async resumeCorrection() {
    const state = this.state();
    if (
      !state ||
      this.busy() ||
      this.disabled() ||
      !this.allowed('Prescriptions.CorrectOwn') ||
      !state.current ||
      !state.draft
    )
      return;
    this.busy.set(true);
    try {
      this.state.set(await firstValueFrom(this.api.correction(state.prescriptionId)));
      this.correctionMode.set(true);
      this.historical.set(null);
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  async loadVersions() {
    const state = this.state();
    if (!state || this.busy() || this.disabled() || !this.allowed('Prescriptions.ViewOwn')) return;
    this.busy.set(true);
    try {
      this.versions.set(await firstValueFrom(this.api.versions(state.prescriptionId)));
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  async inspectVersion(versionNumber: number) {
    const state = this.state();
    if (!state || this.busy() || this.disabled() || !this.allowed('Prescriptions.ViewOwn')) return;
    this.busy.set(true);
    try {
      this.historical.set(
        await firstValueFrom(this.api.versionDetails(state.prescriptionId, versionNumber)),
      );
      this.editing.set(false);
      this.pending.set(null);
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  private async mutate(request: () => Observable<PrescriptionState | null>) {
    if (this.disabled() || this.busy()) return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      const state = await firstValueFrom(request());
      this.state.set(state);
      this.changed.emit(state);
      this.editing.set(false);
      this.pending.set(null);
      this.intent = null;
      this.toast.success('medications.saved');
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        try {
          const id = this.state()?.prescriptionId;
          if (id) {
            const refreshed = await firstValueFrom(
              this.correctionMode() ? this.api.correction(id) : this.api.details(id),
            );
            this.state.set(refreshed);
            this.changed.emit(refreshed);
          }
          this.editing.set(false);
          this.pending.set(null);
          this.intent = null;
        } catch (refreshError) {
          this.failure(refreshError);
        }
      }
    } finally {
      this.busy.set(false);
    }
  }
  private intentKey(value: unknown) {
    const signature = JSON.stringify(value);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    return this.intent.key;
  }
  private failure(error: unknown, mutation = false) {
    const parsed = parseApiErrors(error),
      messages =
        parsed.status === 404
          ? ['medications.notFound']
          : [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages);
    if (mutation) this.toast.error(messages[0] || 'medications.failed');
  }
}
