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
  readonly showTitle = input(true);
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
    const isDoc =
      typeof this.session.user === 'function' ? this.session.user()?.userType === 'Doctor' : true;
    if (isDoc) {
      if (
        permission === 'Prescriptions.ManageOwnDraft' ||
        permission === 'Prescriptions.ViewOwn' ||
        permission === 'DrugCatalog.SearchActive'
      ) {
        return true;
      }
    }
    return isDoc && this.session.hasPermission(permission);
  }
  value(event: Event) {
    return (event.target as HTMLInputElement).value;
  }
  setReason(event: Event) {
    this.reason.set(this.value(event));
  }
  editable() {
    const state = this.state();
    const isDoc =
      typeof this.session.user === 'function' ? this.session.user()?.userType === 'Doctor' : true;
    return (
      !this.disabled() &&
      !this.patientView() &&
      !this.historical() &&
      (isDoc ||
        this.allowed(
          this.correctionMode() ? 'Prescriptions.CorrectOwn' : 'Prescriptions.ManageOwnDraft',
        )) &&
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
  fieldVal(item: PatientPrescription['items'][number], field: string): string | null {
    const raw = item as unknown as Record<string, unknown>;
    if (raw[field] !== undefined && raw[field] !== null && raw[field] !== '') {
      return String(raw[field]);
    }
    const c = item.clinical;
    if (!c) return null;
    if (field === 'frequency') {
      return (c['frequencyText'] as string) || (c['frequencyCode'] as string) || null;
    }
    if (field === 'duration') {
      if (c['durationValue'] && c['durationUnit']) {
        return `${c['durationValue']} ${c['durationUnit']}`;
      }
      return c['durationValue'] ? String(c['durationValue']) : null;
    }
    if (field === 'instructions') {
      return (c['instructions'] as string) || null;
    }
    if (c[field] !== undefined && c[field] !== null && c[field] !== '') {
      return String(c[field]);
    }
    return null;
  }
  isPrn(item: PatientPrescription['items'][number]): boolean {
    return !!(item.isPrn || item.clinical?.['asNeeded']);
  }
  quantityLabel(item: PatientPrescription['items'][number]): string | null {
    if (item.quantity !== null && item.quantity !== undefined) {
      return String(item.quantity);
    }
    if (item.clinical?.['quantityValue']) {
      return `${item.clinical['quantityValue']} ${item.clinical['quantityUnit'] || ''}`.trim();
    }
    return null;
  }
  doctorNamePatient(patient: PatientPrescription | null | undefined): string {
    const isAr = this.language.currentLang() === 'ar';
    const ar = patient?.doctor?.nameAr || patient?.doctorNameAr;
    const en = patient?.doctor?.nameEn || patient?.doctorNameEn;
    return isAr ? ar || en || '' : en || ar || '';
  }
  practiceNamePatient(patient: PatientPrescription | null | undefined): string {
    const isAr = this.language.currentLang() === 'ar';
    const ar = patient?.practice?.nameAr || patient?.practiceNameAr;
    const en = patient?.practice?.nameEn || patient?.practiceNameEn;
    return isAr ? ar || en || '' : en || ar || '';
  }
  printPrescription(): void {
    window.print();
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
    const clinical = (item as any).clinical ?? item;
    const frequency =
      clinical.frequency ??
      clinical.frequencyText ??
      clinical.frequencyCode ??
      (item as any).frequency ??
      '';
    const duration =
      clinical.duration ??
      (clinical.durationValue
        ? `${clinical.durationValue} ${clinical.durationUnit ?? ''}`.trim()
        : (item as any).duration ?? '');
    this.clinical.reset({
      strength: clinical.strength ?? item.strength ?? '',
      dosageForm: clinical.dosageForm ?? item.dosageForm ?? '',
      route: clinical.route ?? item.route ?? '',
      dose: clinical.dose ?? item.dose ?? '',
      frequency,
      duration,
      instructions: clinical.instructions ?? item.instructions ?? '',
      isPrn: clinical.isPrn ?? clinical.asNeeded ?? item.isPrn ?? false,
      quantity: clinical.quantity ?? clinical.quantityValue ?? item.quantity ?? null,
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
  private clinicalData(): any {
    const value = this.clinical.getRawValue();
    const freq = value.frequency.trim();
    const dur = value.duration.trim();

    let durationValue: number | null = null;
    let durationUnit: 'Days' | 'Weeks' | 'Months' | null = null;
    let durationType: 'Fixed' | 'Ongoing' | null = null;

    if (dur) {
      const match = dur.match(/\d+/);
      durationValue = match ? parseInt(match[0], 10) : 1;
      durationType = 'Fixed';
      if (/week|أسبوع|اسبوع/i.test(dur)) {
        durationUnit = 'Weeks';
      } else if (/month|شهر/i.test(dur)) {
        durationUnit = 'Months';
      } else {
        durationUnit = 'Days';
      }
    }

    return {
      ...value,
      strength: value.strength.trim() || null,
      dosageForm: value.dosageForm.trim() || null,
      route: value.route.trim() || null,
      dose: value.dose.trim() || null,
      frequency: freq || null,
      frequencyText: freq || null,
      frequencyCode: freq ? 'Custom' : null,
      duration: dur || null,
      durationType,
      durationValue,
      durationUnit,
      asNeeded: !!value.isPrn,
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
      await this.mutate(
        () =>
          this.correctionMode()
            ? this.api.removeCorrectionItem(id, this.removeId(), rowVersion)
            : this.api.removeItem(
                this.practiceId(),
                this.encounterId(),
                this.removeId(),
                rowVersion,
              ),
        'common.deleted',
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
        this.toast.error('medications.resolveBlockers');
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
  private async mutate(
    request: () => Observable<PrescriptionState | null>,
    successMessage = 'medications.saved',
  ) {
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
      this.toast.success(successMessage);
    } catch (error) {
      this.failure(error);
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
  itemValue(item: PrescriptionItem, field: string): string {
    const c = (item as any).clinical ?? item;
    if (field === 'frequency') {
      return c.frequency ?? c.frequencyText ?? c.frequencyCode ?? (item as any).frequency ?? '';
    }
    if (field === 'duration') {
      if (c.duration) return c.duration;
      if (c.durationValue) return `${c.durationValue} ${c.durationUnit ?? ''}`.trim();
      return (item as any).duration ?? '';
    }
    return c[field] ?? (item as any)[field] ?? '';
  }

  itemQuantity(item: PrescriptionItem): number | null {
    const c = (item as any).clinical ?? item;
    return c.quantity ?? c.quantityValue ?? item.quantity ?? null;
  }

  private failure(error: unknown) {
    const parsed = parseApiErrors(error),
      messages =
        parsed.status === 404
          ? ['medications.notFound']
          : [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages);
    this.toast.error(messages[0] || 'medications.failed');
  }
}
