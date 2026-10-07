import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import {
  DiagnosticKind,
  MedicalCatalogApi,
  MedicalCatalogResponseClinicalPage,
} from '../../../../domains/medical-catalog';
import {
  DiagnosticRequestStateResponse,
  DiagnosticsApi,
  LabAddItemRequest,
  RadiologyAddItemRequest,
} from '../../../../domains/diagnostics';

@Component({
  selector: 'app-diagnostic-draft',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './diagnostic-draft.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './diagnostic-draft.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticDraftComponent {
  private readonly api = inject(DiagnosticsApi);
  private readonly catalog = inject(MedicalCatalogApi);
  private readonly auth = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  readonly kind = input.required<DiagnosticKind>();
  readonly practiceId = input.required<string>();
  readonly encounterId = input.required<string>();
  readonly title = computed(() =>
    this.kind() === 'lab' ? 'diagnostics.labRequests' : 'diagnostics.radiologyRequests',
  );
  readonly completed = input(false);
  readonly canPostVisit = input(false);
  readonly locked = input(false);
  readonly canManageEncounter = input(false);
  readonly changed = output<DiagnosticRequestStateResponse>();
  readonly busyChanged = output<boolean>();
  readonly state = signal<DiagnosticRequestStateResponse | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly search = signal('');
  readonly catalogId = signal('');
  readonly missing = signal(false);
  readonly name = signal('');
  readonly specimen = signal('');
  readonly note = signal('');
  readonly instructions = signal('');
  readonly patientInstructions = signal('');
  readonly postVisitReason = signal('');
  readonly editingId = signal('');
  readonly removingId = signal('');
  readonly editor = signal(false);
  readonly results = signal<MedicalCatalogResponseClinicalPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly messages = signal<readonly string[]>([]);
  readonly searchLoading = signal(false);
  private generation = 0;
  private searchSequence = 0;
  private intent: { signature: string; key: string } | null = null;
  constructor() {
    effect(() => {
      this.kind();
      this.practiceId();
      this.encounterId();
      this.completed();
      this.state.set(null);
      this.editor.set(false);
      void this.load();
    });
  }
  allowed(scope: string, action: string) {
    return (
      this.session.user()?.userType === 'Doctor' &&
      this.session.hasPermission(`${this.kind() === 'lab' ? 'Lab' : 'Radiology'}${scope}.${action}`)
    );
  }
  canManage() {
    return (
      !this.completed() &&
      this.canManageEncounter() &&
      this.allowed('Requests', 'ManageOwnDraft') &&
      (this.state()?.requestId ? !!this.state()?.capabilities?.canManageDraft : true)
    );
  }
  async load() {
    const generation = ++this.generation;
    if (this.completed() || !this.allowed('Requests', 'ViewOwn')) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.failed.set(false);
    try {
      const state = await firstValueFrom(
        this.api.draft(this.kind(), this.practiceId(), this.encounterId()),
      );
      if (generation === this.generation) this.state.set(state);
    } catch (error) {
      if (generation === this.generation) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  openEditor() {
    if (
      this.locked() ||
      this.busy() ||
      (!this.canManage() &&
        !(
          this.completed() &&
          this.canPostVisit() &&
          this.allowed('Requests', 'CreatePostVisitOwn')
        ))
    )
      return;
    this.editor.set(true);
    this.editingId.set('');
    this.catalogId.set('');
    this.instructions.set('');
    this.name.set('');
    this.specimen.set('');
    this.note.set('');
    this.missing.set(false);
    this.intent = null;
    void this.searchCatalog();
  }
  async searchCatalog(pageNumber = 1) {
    if (!this.allowed('Catalog', 'SearchActive')) return;
    const sequence = ++this.searchSequence;
    this.searchLoading.set(true);
    try {
      const results = await firstValueFrom(
        this.catalog.list(this.kind(), { search: this.search(), pageNumber, pageSize: 20 }, true),
      );
      if (sequence === this.searchSequence) this.results.set(results);
    } catch (error) {
      if (sequence === this.searchSequence) this.failure(error);
    } finally {
      if (sequence === this.searchSequence) this.searchLoading.set(false);
    }
  }
  select(id: string) {
    if (this.results().items?.some((i) => i.catalogId === id && i.status === 'Active')) {
      this.catalogId.set(id);
      this.missing.set(false);
    }
  }
  edit(id: string) {
    const item = this.state()?.items?.find((i) => i.itemId === id);
    if (!item?.capabilities?.canEdit || !this.canManage() || this.locked()) return;
    this.editingId.set(id);
    this.instructions.set(item.doctorInstructions ?? '');
    this.editor.set(true);
    this.intent = null;
  }
  async save() {
    if (this.busy() || this.locked()) return;
    const postVisit = this.completed();
    if (
      postVisit
        ? !this.canPostVisit() || !this.allowed('Requests', 'CreatePostVisitOwn')
        : !this.canManage()
    )
      return;
    const editing = this.editingId();
    if (
      !editing &&
      (this.missing()
        ? !this.name().trim() || !this.allowed('CatalogRequests', 'CreateOwn')
        : !this.catalogId())
    )
      return;
    if (postVisit && !this.postVisitReason().trim()) return;
    const missing = {
      specimen: this.specimen().trim() || null,
      catalogClarificationNote: this.note().trim() || null,
    };
    const token = this.state()?.rowVersion ?? null;
    const item =
      this.kind() === 'lab'
        ? {
            labTestCatalogId: this.missing() || editing ? null : this.catalogId(),
            newLabTest:
              this.missing() && !editing ? { ...missing, testName: this.name().trim() } : null,
            doctorInstructions: this.instructions().trim() || null,
            labRequestRowVersion: token,
            patientInstructions: this.patientInstructions().trim() || null,
          }
        : {
            radiologyProcedureCatalogId: this.missing() || editing ? null : this.catalogId(),
            newRadiologyProcedure:
              this.missing() && !editing ? { ...missing, procedureName: this.name().trim() } : null,
            doctorInstructions: this.instructions().trim() || null,
            radiologyRequestRowVersion: token,
            patientInstructions: this.patientInstructions().trim() || null,
          };
    const signature = JSON.stringify({ item, editing, postVisit, reason: this.postVisitReason() });
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    const key = this.intent.key;
    await this.mutate(() =>
      postVisit
        ? this.api.postVisit(
            this.kind(),
            this.practiceId(),
            this.encounterId(),
            {
              postVisitReason: this.postVisitReason().trim(),
              patientInstructions: this.patientInstructions().trim() || null,
              items: [item as never],
            },
            key,
          )
        : editing
          ? this.api.edit(
              this.kind(),
              this.practiceId(),
              this.encounterId(),
              editing,
              item as never,
            )
          : this.api.add(this.kind(), this.practiceId(), this.encounterId(), item as never, key),
    );
  }
  async remove() {
    const state = this.state(),
      id = this.removingId();
    if (
      this.busy() ||
      this.locked() ||
      !state?.rowVersion ||
      !this.canManage() ||
      !state.items?.find((i) => i.itemId === id)?.capabilities?.canRemove
    )
      return;
    await this.mutate(() =>
      this.api.remove(this.kind(), this.practiceId(), this.encounterId(), id, state.rowVersion!),
    );
  }
  private async mutate(request: () => Observable<DiagnosticRequestStateResponse>) {
    this.busy.set(true);
    this.busyChanged.emit(true);
    this.messages.set([]);
    try {
      const state = await firstValueFrom(request());
      this.state.set(state);
      this.changed.emit(state);
      this.editor.set(false);
      this.removingId.set('');
      this.intent = null;
      this.toast.success('diagnostics.saved');
    } catch (error) {
      this.failure(error, true);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.intent = null;
        this.editor.set(false);
        await this.load();
        if (this.state()) this.changed.emit(this.state()!);
      }
    } finally {
      this.busy.set(false);
      this.busyChanged.emit(false);
    }
  }
  private failure(error: unknown, mutation = false) {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['diagnostics.failed']);
    if (mutation) this.toast.error(this.messages()[0]);
    if (parsed.status === 403)
      void firstValueFrom(this.auth.currentUser())
        .then((u) => this.session.complete(u))
        .catch(() => {});
  }
}
