import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { EncountersApi } from '../../../domains/encounters';
import { DoctorPracticesApi } from '../../../domains/doctor-practices';
import { TicketsApi } from '../../../domains/tickets';
import { EncounterWorkspaceStore } from './encounter-workspace.store';
import { encounterFixture } from '../encounter-test-fixtures';

describe('Encounter workspace workflow', () => {
  const api = {
    details: vi.fn(),
    list: vi.fn(),
    mine: vi.fn(),
    myDetails: vi.fn(),
    updateNotes: vi.fn(),
    addDiagnosis: vi.fn(),
    removeDiagnosis: vi.fn(),
    updateDiagnosis: vi.fn(),
    amendments: vi.fn(),
    createAmendment: vi.fn(),
    createFollowUp: vi.fn(),
    byTicket: vi.fn(),
  };
  const tickets = { details: vi.fn(), complete: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  const practiceApi = { list: vi.fn() };
  let store: EncounterWorkspaceStore;
  let permissions: boolean;
  beforeEach(() => {
    vi.resetAllMocks();
    permissions = true;
    api.list.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    api.details.mockReturnValue(of(encounterFixture));
    api.byTicket.mockReturnValue(of(encounterFixture));
    practiceApi.list.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        EncounterWorkspaceStore,
        { provide: EncountersApi, useValue: api },
        { provide: TicketsApi, useValue: tickets },
        { provide: ToastService, useValue: toast },
        { provide: DoctorPracticesApi, useValue: practiceApi },
        { provide: AuthSession, useValue: { hasPermission: () => permissions } },
      ],
    });
    store = TestBed.inject(EncounterWorkspaceStore);
    store.doctor.set(true);
    store.practiceId.set('p1');
    store.detail.set(encounterFixture);
  });
  it('uses updated encounter versions for consecutive notes and diagnosis mutations', async () => {
    api.updateNotes.mockReturnValue(of({ ...encounterFixture, rowVersion: 'ev2' }));
    api.addDiagnosis.mockReturnValue(of({ ...encounterFixture, rowVersion: 'ev3' }));
    await store.saveNotes('New findings');
    await store.saveDiagnosis({ type: 'Primary', displayText: 'Diagnosis', notes: null });
    expect(api.addDiagnosis).toHaveBeenCalledWith('p1', 'e1', expect.any(Object), 'ev2');
    expect(store.detail()?.rowVersion).toBe('ev3');
    expect(toast.success).toHaveBeenCalledTimes(2);
  });
  it('refreshes on a concurrency conflict and makes the error visible', async () => {
    api.removeDiagnosis.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.details.mockReturnValue(of({ ...encounterFixture, rowVersion: 'ev2' }));
    await store.removeDiagnosis('d1');
    expect(store.detail()?.rowVersion).toBe('ev2');
    expect(toast.error).toHaveBeenCalled();
  });
  it('blocks normal edits of a completed encounter even with permissive capabilities', async () => {
    store.detail.set({ ...encounterFixture, status: 'Completed' });
    await store.saveNotes('Overwrite');
    await store.removeDiagnosis('d1');
    expect(api.updateNotes).not.toHaveBeenCalled();
    expect(api.removeDiagnosis).not.toHaveBeenCalled();
  });
  it('completes using fresh ticket and latest encounter tokens, with one pending request', async () => {
    tickets.details.mockReturnValue(of({ rowVersion: 'tv2' }));
    const pending = new Subject<never>();
    tickets.complete.mockReturnValue(pending);
    const request = store.complete();
    await Promise.resolve();
    await store.complete();
    expect(tickets.complete).toHaveBeenCalledTimes(1);
    expect(tickets.complete).toHaveBeenCalledWith(
      'p1',
      't1',
      { ticketRowVersion: 'tv2', encounterRowVersion: 'ev1' },
      expect.any(String),
    );
    pending.error(new HttpErrorResponse({ status: 0 }));
    await request;
    expect(toast.error).toHaveBeenCalled();
  });
  it('does not complete with empty clinical notes or missing primary diagnosis', async () => {
    store.detail.set({ ...encounterFixture, clinicalNotes: '' });
    await store.complete();
    store.detail.set({
      ...encounterFixture,
      diagnoses: [{ diagnosisId: 'd', type: 'Secondary', displayText: 'Secondary', notes: null }],
    });
    await store.complete();
    expect(tickets.complete).not.toHaveBeenCalled();
  });

  it('refetches and sends prescription concurrency separately when a draft exists', async () => {
    tickets.details.mockReturnValue(of({ rowVersion: 'tv3' }));
    api.byTicket.mockReturnValue(of({ ...encounterFixture, rowVersion: 'ev7',
      prescription: { prescriptionId: 'rx1', practiceId: 'p1', medicalEncounterId: 'e1', current: null, draft: { versionNumber: 1, status: 'Draft', items: [] }, capabilities: {}, rowVersion: 'rx9', completionBlockers: [] } }));
    tickets.complete.mockReturnValue(of({ ticketId: 't1' }));
    await store.complete();
    expect(tickets.complete).toHaveBeenCalledWith('p1', 't1', {
      ticketRowVersion: 'tv3', encounterRowVersion: 'ev7', prescriptionRowVersion: 'rx9',
    }, expect.any(String));
  });
  it('displays all prescription blockers and never sends a completion request for invalid draft', async () => {
    tickets.details.mockReturnValue(of({ rowVersion: 'tv3' }));
    api.byTicket.mockReturnValue(of({ ...encounterFixture, prescription: {
      prescriptionId: 'rx1', practiceId: 'p1', medicalEncounterId: 'e1', current: null, draft: { versionNumber: 1, status: 'Draft', items: [] }, capabilities: {}, rowVersion: 'rx9', completionBlockers: [
        { code: 'DoseRequired', message: 'First item dose required', itemId: 'i1', field: 'dose' },
        { code: 'DoseRequired', message: 'Second item dose required', itemId: 'i2', field: 'dose' },
      ],
    } }));
    await store.complete();
    expect(tickets.complete).not.toHaveBeenCalled();
    expect(store.messages()).toEqual(['First item dose required', 'Second item dose required']);
    expect(toast.error).toHaveBeenCalledWith('medications.resolveBlockers');
  });
  it('refreshes independent prescription state after a completion conflict', async () => {
    tickets.details.mockReturnValue(of({ rowVersion: 'tv3' }));
    tickets.complete.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const refreshed = { ...encounterFixture, prescription: { prescriptionId: 'rx1', practiceId: 'p1', medicalEncounterId: 'e1', current: null, draft: { versionNumber: 1, status: 'Draft', items: [] }, capabilities: {}, rowVersion: 'rx10', completionBlockers: [] } };
    api.details.mockReturnValue(of(refreshed));
    await store.complete(); expect(store.detail()?.prescription?.rowVersion).toBe('rx10');
  });
  it('patient details use the self-only API and never fetch doctor history', async () => {
    store.doctor.set(false);
    api.myDetails.mockReturnValue(of({ encounterId: 'e1', diagnoses: [] }));
    await store.inspect('e1');
    await store.loadHistory();
    expect(api.myDetails).toHaveBeenCalledWith('e1');
    expect(api.details).not.toHaveBeenCalled();
    expect(api.amendments).not.toHaveBeenCalled();
  });
  it('drops an older detail response when another encounter is selected', async () => {
    const old = new Subject<typeof encounterFixture>();
    api.details
      .mockReturnValueOnce(old)
      .mockReturnValueOnce(of({ ...encounterFixture, encounterId: 'e2' }));
    const first = store.inspect('e1');
    await store.inspect('e2');
    old.next(encounterFixture);
    old.complete();
    await first;
    expect(store.detail()?.encounterId).toBe('e2');
  });
  it('recovers the encounter from ticket ID after a queue refresh', async () => {
    practiceApi.list.mockReturnValue(
      of([{ id: 'p1', nameAr: 'Clinic', nameEn: 'Clinic', isActive: true }]),
    );
    api.byTicket.mockReturnValue(of(encounterFixture));
    await store.initialize(true, 'p1', '', 't1');
    expect(api.byTicket).toHaveBeenCalledWith('p1', 't1');
  });
  it('WAS-202 creates an amendment on completed encounter, updating details and reloading history', async () => {
    store.detail.set({ ...encounterFixture, status: 'Completed', rowVersion: 'ev5', capabilities: { ...encounterFixture.capabilities, canAmend: true } });
    const updatedEncounter = {
      ...encounterFixture,
      status: 'Completed' as const,
      rowVersion: 'ev6',
    };
    api.createAmendment.mockReturnValue(of(updatedEncounter));
    api.amendments.mockReturnValue(of([]));
    const changes = [
      { type: 'ClinicalNotes' as const, clinicalNotes: 'Corrected findings' },
      { type: 'Diagnosis' as const, action: 'Remove' as const, diagnosisId: 'd1' },
    ];
    await store.createAmendment('Patient corrected symptom history', changes);
    expect(api.createAmendment).toHaveBeenCalledWith('p1', 'e1', {
      reason: 'Patient corrected symptom history',
      encounterRowVersion: 'ev5',
      changes,
    });
    expect(store.detail()?.rowVersion).toBe('ev6');
    expect(toast.success).toHaveBeenCalledWith('encounters.amendmentSaved');
    expect(api.amendments).toHaveBeenCalledWith('p1', 'e1');
  });
  it('WAS-202 rejects empty reason or missing changes when attempting amendment', async () => {
    store.detail.set({ ...encounterFixture, status: 'Completed', rowVersion: 'ev5' });
    await store.createAmendment('', [{ type: 'ClinicalNotes', clinicalNotes: 'x' }]);
    await store.createAmendment('Reason', []);
    expect(api.createAmendment).not.toHaveBeenCalled();
  });
});

