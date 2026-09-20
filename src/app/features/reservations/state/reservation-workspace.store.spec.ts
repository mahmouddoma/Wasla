import { signal } from '@angular/core';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../core/auth/auth-session';
import { ReservationsApi } from '../../../domains/reservations';
import { TicketsApi } from '../../../domains/tickets';
import { ReservationWorkspaceStore, ReservationDraft } from './reservation-workspace.store';
import { reservationFixture, metadataFixture } from '../reservation-test-fixtures';
describe('ReservationWorkspaceStore', () => {
  const api = {
    cancel: vi.fn(),
    details: vi.fn(),
    list: vi.fn(),
    createPatient: vi.fn(),
    createReception: vi.fn(),
    receptionOptions: vi.fn(),
  };
  const ticketsApi = {
    checkIn: vi.fn(),
    forceCheckIn: vi.fn(),
  };
  const currentPracticeId = signal('clinic'),
    grants = signal<string[]>([]);
  const reception = {
    currentPracticeId,
    allows: (code: string) => grants().includes(code),
    practices: () => [{ id: 'clinic', nameAr: 'Test', nameEn: 'Test' }],
    select: (id: string) => currentPracticeId.set(id),
    refresh: vi.fn(async () => {
      grants.set([]);
    }),
  };
  let store: ReservationWorkspaceStore;
  const draft: ReservationDraft = {
    patientId: '',
    segmentId: '',
    visitTypeId: '',
    bookingNote: '',
    reasonCode: 'Other',
    comment: 'Changed plans',
    patientConsentConfirmed: false,
    reason: '',
  };
  beforeEach(() => {
    vi.clearAllMocks();
    currentPracticeId.set('clinic');
    grants.set([]);
    reception.refresh.mockImplementation(async () => {
      grants.set([]);
    });
    api.list.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        ReservationWorkspaceStore,
        { provide: ReservationsApi, useValue: api },
        { provide: TicketsApi, useValue: ticketsApi },
        { provide: ReceptionPracticeContext, useValue: reception },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: 'Patient' }), hasPermission: () => false },
        },
      ],
    });
    store = TestBed.inject(ReservationWorkspaceStore);
    store.actor.set('Patient');
    store.metadata.set(metadataFixture);
    store.detail.set(reservationFixture);
    store.editor.set('cancel');
  });
  it('retains the same intent key when retrying a failed request', async () => {
    api.cancel
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(of({ ...reservationFixture, status: 'Cancelled' }));
    await store.save(draft);
    await store.save(draft);
    expect(api.cancel).toHaveBeenCalledTimes(2);
    expect(api.cancel.mock.calls[0][3]).toBe(api.cancel.mock.calls[1][3]);
    expect(store.editor()).toBeNull();
  });
  it('refreshes rowVersion after a concurrent change and uses it on retry', async () => {
    api.cancel
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })))
      .mockReturnValueOnce(of({ ...reservationFixture, status: 'Cancelled' }));
    api.details.mockReturnValue(of({ ...reservationFixture, rowVersion: 'v2' }));
    await store.save(draft);
    expect(store.detail()?.rowVersion).toBe('v2');
    await store.save(draft);
    expect(api.cancel.mock.calls[1][2].rowVersion).toBe('v2');
    expect(api.cancel.mock.calls[1][3]).not.toBe(api.cancel.mock.calls[0][3]);
  });
  it('allows reception creation for a known patient ID without requiring search or view grants', async () => {
    store.actor.set('Reception');
    store.editor.set('create');
    store.practiceId.set('clinic');
    grants.set(['PracticeReservations.Create']);
    store.date.set('2026-09-20');
    store.time.set('17:00');
    store.options.set({
      practiceId: 'clinic',
      date: '2026-09-20',
      time: '17:00',
      visitTypes: [
        {
          visitTypeId: 'v1',
          type: 'NewConsultation',
          nameAr: 'Test',
          nameEn: 'Test',
          segments: [
            {
              segmentId: 's1',
              nameAr: 'Standard',
              nameEn: 'Standard',
              price: 300,
              isDefault: true,
            },
          ],
        },
      ],
    });
    api.createReception.mockReturnValue(of(reservationFixture));
    await store.save({ ...draft, patientId: 'known-patient', segmentId: 's1', visitTypeId: 'v1' });
    expect(api.createReception).toHaveBeenCalledWith(
      'clinic',
      expect.objectContaining({ patientId: 'known-patient', segmentId: 's1', visitTypeId: 'v1' }),
      expect.any(String),
    );
    expect(api.list).not.toHaveBeenCalled();
  });
  it('generates a valid retry key on HTTP origins without randomUUID', async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    });
    api.cancel.mockReturnValue(of({ ...reservationFixture, status: 'Cancelled' }));
    try {
      await store.save(draft);
      expect(api.cancel.mock.calls[0][3]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('offers only NewConsultation booking options for Phase 10', async () => {
    store.actor.set('Reception');
    store.editor.set('create');
    store.practiceId.set('clinic');
    store.date.set('2026-09-20');
    store.slots.set([{ date: '2026-09-20', time: '17:00' }]);
    api.receptionOptions.mockReturnValue(
      of({
        practiceId: 'clinic',
        date: '2026-09-20',
        time: '17:00',
        visitTypes: ['NewConsultation', 'FollowUp', 'Other'].map((type) => ({
          visitTypeId: type,
          type,
          nameAr: type,
          nameEn: type,
          segments: [],
        })),
      }),
    );
    await store.chooseTime('17:00');
    expect(api.receptionOptions).toHaveBeenCalledWith('clinic', '2026-09-20', '17:00');
    expect(store.options()?.visitTypes.map((v) => v.type)).toEqual(['NewConsultation']);
  });
  it('clears operational state and refreshes delegated grants after a fresh 403', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    store.practices.set(reception.practices());
    store.metadata.set({
      ...metadataFixture,
      providerCancellationReasons: metadataFixture.patientCancellationReasons,
    });
    grants.set(['PracticeReservations.Cancel']);
    api.cancel.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await store.save(draft);
    expect(api.cancel).toHaveBeenCalled();
    expect(reception.refresh).toHaveBeenCalled();
    expect(store.detail()).toBeNull();
    expect(store.editor()).toBeNull();
    expect(store.canCancel()).toBe(false);
  });
  it('ignores legacy grants and grants belonging to a different selected practice', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    grants.set(['PracticeReservations.Manage']);
    expect(store.canCancel()).toBe(false);
    grants.set(['PracticeReservations.Cancel']);
    currentPracticeId.set('other');
    await store.save(draft);
    expect(api.cancel).not.toHaveBeenCalled();
  });
  it('never attempts a mutation denied by server capabilities', async () => {
    store.detail.set({
      ...reservationFixture,
      capabilities: { ...reservationFixture.capabilities, canCancel: false },
    });
    await store.save(draft);
    expect(api.cancel).not.toHaveBeenCalled();
  });
  it('checks in an active reception reservation with payment and an idempotency key', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    store.detail.set({ ...reservationFixture, status: 'Active', price: 300 });
    grants.set(['PracticeTickets.CheckIn', 'PracticeTickets.RecordPayment']);
    ticketsApi.checkIn.mockReturnValue(of({ ticketId: 'ticket-1' }));

    await store.checkIn({ paidAmount: 300, force: false, reason: '' });

    expect(ticketsApi.checkIn).toHaveBeenCalledWith(
      'clinic',
      reservationFixture.reservationId,
      { paidAmount: 300 },
      expect.any(String),
    );
    expect(store.detail()).toBeNull();
    expect(store.checkedInTicket()?.ticketId).toBe('ticket-1');
  });
  it('requires the scoped force permission and sends the reason', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    store.detail.set({ ...reservationFixture, status: 'Active', price: 300 });
    grants.set(['PracticeTickets.RecordPayment', 'PracticeTickets.ForceCheckIn']);
    ticketsApi.forceCheckIn.mockReturnValue(of({ ticketId: 'ticket-1' }));

    await store.checkIn({ paidAmount: 300, force: true, reason: 'Patient arrived early' });

    expect(ticketsApi.forceCheckIn).toHaveBeenCalledWith(
      'clinic',
      reservationFixture.reservationId,
      { paidAmount: 300, reason: 'Patient arrived early' },
      expect.any(String),
    );
  });
  it('does not check in when payment differs from the locked price', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    store.detail.set({ ...reservationFixture, status: 'Active', price: 300 });
    grants.set(['PracticeTickets.CheckIn', 'PracticeTickets.RecordPayment']);

    await store.checkIn({ paidAmount: 299, force: false, reason: '' });

    expect(ticketsApi.checkIn).not.toHaveBeenCalled();
  });
});
