import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { ToastService } from '../../../core/notifications/toast.service';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';
import { DoctorPracticesApi } from '../../../domains/doctor-practices';
import {
  DiagnosisDraft,
  EncounterAmendment,
  EncounterAmendmentChange,
  EncounterDetails,
  EncounterPage,
  EncounterQuery,
  EncountersApi,
  PatientEncounterDetails,
} from '../../../domains/encounters';
import { TicketsApi } from '../../../domains/tickets';

@Injectable()
export class EncounterWorkspaceStore {
  private readonly api = inject(EncountersApi);
  private readonly tickets = inject(TicketsApi);
  private readonly practicesApi = inject(DoctorPracticesApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  readonly doctor = signal(false);
  readonly practices = signal<readonly { id: string; nameAr: string; nameEn: string | null }[]>([]);
  readonly practiceId = signal('');
  readonly query = signal<EncounterQuery>({ pageNumber: 1, pageSize: 20 });
  readonly page = signal<EncounterPage>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
  readonly detail = signal<EncounterDetails | null>(null);
  readonly patientDetail = signal<PatientEncounterDetails | null>(null);
  readonly history = signal<readonly EncounterAmendment[]>([]);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly messages = signal<readonly string[]>([]);
  private generation = 0;
  private listSequence = 0;
  private detailSequence = 0;
  private completionIntent: { signature: string; key: string } | null = null;
  readonly canReadDetails = computed(() =>
    this.doctor()
      ? this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwn) &&
        this.session.hasPermission(PERMISSIONS.diagnosesViewOwn)
      : this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwnCompleted),
  );
  readonly canEditNotes = computed(
    () =>
      this.detail()?.status === 'InProgress' &&
      !!this.detail()?.capabilities?.canEditClinicalNotes &&
      this.session.hasPermission(PERMISSIONS.medicalEncountersUpdateOwn),
  );
  readonly canManageDiagnoses = computed(
    () =>
      this.detail()?.status === 'InProgress' &&
      !!this.detail()?.capabilities?.canManageDiagnoses &&
      this.session.hasPermission(PERMISSIONS.diagnosesManageOwn),
  );
  readonly canComplete = computed(
    () =>
      this.detail()?.status === 'InProgress' &&
      !!this.detail()?.capabilities?.canComplete &&
      this.session.hasPermission(PERMISSIONS.doctorPracticeTicketsCompleteOwn),
  );
  readonly canCreateFollowUp = computed(
    () =>
      this.detail()?.status === 'Completed' &&
      !!this.detail()?.capabilities?.canCreateFollowUpEligibility &&
      this.session.hasPermission(PERMISSIONS.followUpEligibilityCreateOwn),
  );
  readonly canAmend = computed(
    () =>
      this.detail()?.status === 'Completed' &&
      (this.detail()?.capabilities?.canAmend ?? true) &&
      this.session.hasPermission(PERMISSIONS.medicalEncountersAmendOwn),
  );

  async initialize(doctor: boolean, practiceId = '', encounterId = '', ticketId = '') {
    this.doctor.set(doctor);
    try {
      if (doctor)
        this.practices.set(
          (await firstValueFrom(this.practicesApi.list())).filter((p) => p.isActive),
        );
      const id = this.practices().some((p) => p.id === practiceId)
        ? practiceId
        : this.practices().length === 1
          ? this.practices()[0].id
          : '';
      await this.selectPractice(id);
      if (encounterId) await this.inspect(encounterId);
      else if (doctor && ticketId && id && this.canReadDetails()) {
        const generation = this.generation,
          sequence = ++this.detailSequence;
        this.detailLoading.set(true);
        try {
          const detail = await firstValueFrom(this.api.byTicket(id, ticketId));
          if (generation === this.generation && sequence === this.detailSequence)
            this.detail.set(detail);
        } catch (error) {
          this.failure(error);
        } finally {
          if (generation === this.generation && sequence === this.detailSequence)
            this.detailLoading.set(false);
        }
      }
    } catch (error) {
      this.failure(error);
    }
  }
  async selectPractice(id: string) {
    if (this.busy() || (id && !this.practices().some((p) => p.id === id))) return;
    this.generation++;
    this.close();
    this.practiceId.set(id);
    this.query.set({ pageNumber: 1, pageSize: 20 });
    this.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    await this.load();
  }
  async load() {
    if (this.doctor() && !this.practiceId()) return;
    const sequence = ++this.listSequence,
      generation = this.generation;
    this.loading.set(true);
    this.failed.set(false);
    this.messages.set([]);
    try {
      const query = this.query();
      const page = await firstValueFrom(
        this.doctor()
          ? this.api.list(this.practiceId(), query)
          : this.api.mine(query.pageNumber, query.pageSize),
      );
      if (sequence === this.listSequence && generation === this.generation) this.page.set(page);
    } catch (error) {
      if (sequence === this.listSequence && generation === this.generation) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (sequence === this.listSequence && generation === this.generation) this.loading.set(false);
    }
  }
  async inspect(id: string) {
    if (!this.canReadDetails() || this.busy()) return;
    this.close();
    const sequence = ++this.detailSequence,
      generation = this.generation;
    this.detailLoading.set(true);
    this.messages.set([]);
    try {
      if (this.doctor()) {
        const detail = await firstValueFrom(this.api.details(this.practiceId(), id));
        if (sequence === this.detailSequence && generation === this.generation)
          this.detail.set(detail);
      } else {
        const detail = await firstValueFrom(this.api.myDetails(id));
        if (sequence === this.detailSequence && generation === this.generation)
          this.patientDetail.set(detail);
      }
    } catch (error) {
      if (sequence === this.detailSequence && generation === this.generation) this.failure(error);
    } finally {
      if (sequence === this.detailSequence && generation === this.generation)
        this.detailLoading.set(false);
    }
  }
  saveNotes(notes: string) {
    const detail = this.detail();
    if (!detail || !this.canEditNotes() || notes.length > 8000) return;
    return this.mutate(
      this.api.updateNotes(this.practiceId(), detail.encounterId, notes, detail.rowVersion),
    );
  }
  saveDiagnosis(draft: DiagnosisDraft, diagnosisId = '') {
    const detail = this.detail(),
      text = draft.displayText.trim();
    if (
      !detail ||
      !this.canManageDiagnoses() ||
      !text ||
      text.length > 500 ||
      (draft.notes?.length ?? 0) > 2000
    )
      return;
    const body = { ...draft, displayText: text };
    return this.mutate(
      diagnosisId
        ? this.api.updateDiagnosis(
            this.practiceId(),
            detail.encounterId,
            diagnosisId,
            body,
            detail.rowVersion,
          )
        : this.api.addDiagnosis(this.practiceId(), detail.encounterId, body, detail.rowVersion),
    );
  }
  removeDiagnosis(id: string) {
    const detail = this.detail();
    if (!detail || !this.canManageDiagnoses()) return;
    return this.mutate(
      this.api.removeDiagnosis(this.practiceId(), detail.encounterId, id, detail.rowVersion),
    );
  }
  async complete() {
    const detail = this.detail();
    if (!detail || !this.canComplete() || !detail.clinicalNotes.trim() || this.busy()) return;
    const active = detail.diagnoses.filter((d) => !d.isVoided);
    if (active.length && active.filter((d) => d.type === 'Primary').length !== 1) return;
    this.busy.set(true);
    try {
      const ticket = await firstValueFrom(this.tickets.details(this.practiceId(), detail.ticketId));
      const body = { ticketRowVersion: ticket.rowVersion, encounterRowVersion: detail.rowVersion };
      const signature = JSON.stringify({ ticketId: detail.ticketId, ...body });
      if (this.completionIntent?.signature !== signature)
        this.completionIntent = { signature, key: createIdempotencyKey() };
      await firstValueFrom(
        this.tickets.complete(this.practiceId(), detail.ticketId, body, this.completionIntent.key),
      );
      this.completionIntent = null;
      this.toast.success('encounters.saved');
      await this.reloadDetail();
      await this.load();
    } catch (error) {
      this.failure(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.reloadDetail();
    } finally {
      this.busy.set(false);
    }
  }
  async createFollowUp(validUntil: string) {
    const detail = this.detail();
    if (!detail || !this.canCreateFollowUp() || !validUntil || this.busy()) return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.createFollowUp(this.practiceId(), detail.encounterId, validUntil),
      );
      this.toast.success('encounters.saved');
      await this.reloadDetail();
      await this.load();
    } catch (error) {
      this.failure(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.reloadDetail();
    } finally {
      this.busy.set(false);
    }
  }
  async createAmendment(reason: string, changes: readonly EncounterAmendmentChange[]) {
    const detail = this.detail();
    if (!detail || !this.canAmend() || !reason.trim() || !changes.length || this.busy()) return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      const updated = await firstValueFrom(
        this.api.createAmendment(this.practiceId(), detail.encounterId, {
          reason: reason.trim(),
          encounterRowVersion: detail.rowVersion,
          changes,
        }),
      );
      if (updated && updated.encounterId) {
        this.detail.set(updated);
      } else {
        await this.reloadDetail();
      }
      this.toast.success('encounters.amendmentSaved');
      await this.loadHistory();
      await this.load();
    } catch (error) {
      this.failure(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.reloadDetail();
    } finally {
      this.busy.set(false);
    }
  }
  async loadHistory() {
    const detail = this.detail();
    if (!detail || !this.doctor() || detail.status !== 'Completed') return;
    const sequence = this.detailSequence;
    try {
      const history = await firstValueFrom(
        this.api.amendments(this.practiceId(), detail.encounterId),
      );
      if (sequence === this.detailSequence)
        this.history.set([...history].sort((a, b) => a.sequence - b.sequence));
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    }
  }
  close() {
    if (this.busy()) return;
    this.detailSequence++;
    this.detail.set(null);
    this.patientDetail.set(null);
    this.history.set([]);
    this.detailLoading.set(false);
    this.completionIntent = null;
  }
  private async mutate(request: Observable<EncounterDetails>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      this.detail.set(await firstValueFrom(request));
      this.toast.success('encounters.saved');
      await this.load();
    } catch (error) {
      this.failure(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.reloadDetail();
    } finally {
      this.busy.set(false);
    }
  }
  private async reloadDetail() {
    const detail = this.detail();
    if (!detail) return;
    try {
      this.detail.set(
        await firstValueFrom(this.api.details(this.practiceId(), detail.encounterId)),
      );
    } catch (error) {
      this.detail.set(null);
      this.failure(error);
    }
  }
  private failure(error: unknown) {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['encounters.failed']);
    this.toast.error(messages[0] || 'encounters.failed');
    if (error instanceof HttpErrorResponse && (error.status === 403 || error.status === 404)) {
      this.detailSequence++;
      this.detail.set(null);
      this.patientDetail.set(null);
      this.history.set([]);
    }
  }
}
