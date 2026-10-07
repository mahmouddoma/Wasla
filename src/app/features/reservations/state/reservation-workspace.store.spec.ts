import { ToastService } from '../../../core/notifications/toast.service';
import { signal } from '@angular/core';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../core/auth/auth-session';
import { PatientsApi, PatientSearchItem, PagedResponse } from '../../../domains/patients';
import { Reservation, ReservationsApi } from '../../../domains/reservations';
import { TicketsApi } from '../../../domains/tickets';
import { ReservationWorkspaceStore, ReservationDraft } from './reservation-workspace.store';
import { reservationFixture, metadataFixture } from '../reservation-test-fixtures';
describe('ReservationWorkspaceStore', () => {
  it('retains focused arrival and submitted context after a conflict while refreshing details', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    const active = { ...reservationFixture, status: 'Active', price: 250 };
    store.detail.set(active);
    store.arrival.set(true);
    grants.set([
      'PracticeReservations.View',
      'PracticeTickets.CheckIn',
      'PracticeTickets.RecordPayment',
    ]);
    TestBed.tick();
    ticketsApi.checkIn.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.details.mockReturnValue(of({ ...active, rowVersion: 'fresh' }));
    await store.checkIn({
      paidAmount: 250,
      paymentMethod: 'Wallet',
      referenceNumber: 'POS',
      notes: 'Keep',
      force: false,
      reason: '',
    });
    expect(store.arrival()).toBe(true);
    expect(store.detail()?.rowVersion).toBe('fresh');
    expect(store.checkedInTicket()).toBeNull();
  });
  it('stores accepted payment method and patient name without requiring Queue View', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    store.detail.set({ ...reservationFixture, status: 'Active', price: 0 });
    grants.set(['PracticeTickets.CheckIn', 'PracticeTickets.RecordPayment']);
    TestBed.tick();
    ticketsApi.checkIn.mockReturnValue(
      of({ ticketId: 'ticket', ticketNumber: '12', patientsAheadNow: 2 }),
    );
    await store.checkIn({
      paidAmount: 0,
      paymentMethod: 'Card',
      referenceNumber: null,
      notes: null,
      force: false,
      reason: '',
    });
    expect(store.acceptedArrival()?.paymentMethod).toBe('Card');
    expect(store.arrivalPatient()).toEqual(reservationFixture.patient);
    expect(store.canOpenQueue()).toBe(false);
    store.close();
    expect(store.checkedInTicket()).toBeNull();
  });
  it('invalidates an arrival draft when same-clinic payment permission is removed', () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    grants.set(['PracticeTickets.CheckIn', 'PracticeTickets.RecordPayment']);
    TestBed.tick();
    store.arrival.set(true);
    store.detail.set({ ...reservationFixture, status: 'Active', price: 250 });
    TestBed.tick();
    grants.set(['PracticeTickets.CheckIn']);
    TestBed.tick();
    expect(store.arrival()).toBe(false);
    expect(store.detail()).toBeNull();
  });
  it.each([200, 403, 409])(
    'ignores late check-in outcome %s after switching clinics and returning',
    async (status) => {
      store.actor.set('Reception');
      store.practiceId.set('clinic');
      store.detail.set({ ...reservationFixture, status: 'Active', price: 250 });
      grants.set(['PracticeTickets.CheckIn', 'PracticeTickets.RecordPayment']);
      const pending = new Subject();
      ticketsApi.checkIn.mockReturnValue(pending);
      const operation = store.checkIn({
        paidAmount: 250,
        paymentMethod: 'Card',
        referenceNumber: 'POS',
        notes: null,
        force: false,
        reason: '',
      });
      currentPracticeId.set('other');
      TestBed.tick();
      currentPracticeId.set('clinic');
      TestBed.tick();
      if (status === 200) {
        pending.next({ ticketId: 'old-ticket' });
        pending.complete();
      } else pending.error(new HttpErrorResponse({ status }));
      await operation;
      expect(store.checkedInTicket()).toBeNull();
      expect(store.acceptedArrival()).toBeNull();
      expect(reception.refresh).not.toHaveBeenCalled();
      expect(api.details).not.toHaveBeenCalled();
    },
  );
  afterEach(() => localStorage.removeItem('wasla_lang'));
  const api = {
    filterOptions: vi.fn(() => of({ segments: [] })),
    cancel: vi.fn(),
    reschedule: vi.fn(),
    restoreNoShow: vi.fn(),
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
    ensureLoaded: vi.fn(async () => undefined),
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
          useValue: {
            user: () => ({ userType: 'Patient' }),
            hasPermission: vi.fn(
              (code: string) => code.startsWith('PracticeReservations.') && grants().includes(code),
            ),
          },
        },
      ],
    });
    store = TestBed.inject(ReservationWorkspaceStore);
    store.actor.set('Patient');
    store.metadata.set(metadataFixture);
    store.detail.set(reservationFixture);
    store.editor.set('cancel');
  });
  it('coalesces concurrent practice selections and preserves deliberate refresh', async () => {
    store.actor.set('Reception');
    grants.set(['PracticeReservations.View']);
    store.practices.set([{ id: 'clinic', nameAr: 'Clinic', nameEn: 'Clinic' }]);
    await Promise.all([store.selectPractice('clinic'), store.selectPractice('clinic')]);
    expect(api.filterOptions).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledTimes(1);
    await store.loadList();
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it('does not load reservation filters without delegated View', async () => {
    store.actor.set('Reception');
    store.practices.set([{ id: 'clinic', nameAr: 'Clinic', nameEn: 'Clinic' }]);
    await store.selectPractice('clinic');
    expect(api.filterOptions).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();
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
    expect(api.receptionOptions).toHaveBeenCalledWith('clinic', '2026-09-20', '17:00', {});
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

    await store.checkIn({
      paidAmount: 300,
      paymentMethod: 'Cash',
      referenceNumber: null,
      notes: null,
      force: false,
      reason: '',
    });

    expect(ticketsApi.checkIn).toHaveBeenCalledWith(
      'clinic',
      reservationFixture.reservationId,
      { paidAmount: 300, paymentMethod: 'Cash', referenceNumber: null, notes: null },
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

    await store.checkIn({
      paidAmount: 300,
      paymentMethod: 'Card',
      referenceNumber: 'POS',
      notes: null,
      force: true,
      reason: 'Patient arrived early',
    });

    expect(ticketsApi.forceCheckIn).toHaveBeenCalledWith(
      'clinic',
      reservationFixture.reservationId,
      {
        paidAmount: 300,
        reason: 'Patient arrived early',
        paymentMethod: 'Card',
        referenceNumber: 'POS',
        notes: null,
      },
      expect.any(String),
    );
  });
  it('does not check in when payment differs from the locked price', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    store.detail.set({ ...reservationFixture, status: 'Active', price: 300 });
    grants.set(['PracticeTickets.CheckIn', 'PracticeTickets.RecordPayment']);

    await store.checkIn({
      paidAmount: 299,
      paymentMethod: 'Cash',
      referenceNumber: null,
      notes: null,
      force: false,
      reason: '',
    });

    expect(ticketsApi.checkIn).not.toHaveBeenCalled();
  });

  it('prevents duplicate cancellations and confirms completion with a toast', async () => {
    const response = new Subject<typeof reservationFixture>();
    api.cancel.mockReturnValue(response);
    const toast = vi.spyOn(TestBed.inject(ToastService), 'success');
    const saving = store.save(draft);
    expect(store.busy()).toBe(true);
    await store.save(draft);
    expect(api.cancel).toHaveBeenCalledTimes(1);
    response.next({ ...reservationFixture, status: 'Cancelled' });
    await saving;
    expect(store.busy()).toBe(false);
    expect(store.editor()).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
  });
  it('keeps the cancellation editor and draft context after a failed mutation', async () => {
    api.cancel.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    await store.save(draft);
    expect(store.editor()).toBe('cancel');
    expect(store.detail()?.reservationId).toBe(reservationFixture.reservationId);
    expect(store.busy()).toBe(false);
    expect(toast).toHaveBeenCalled();
  });
  it('uses server dates for Today, Upcoming and All without changing other actors', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    grants.set(['PracticeReservations.View']);
    store.setReceptionView('Today');
    await Promise.resolve();
    expect(api.list.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({ fromDate: expect.any(String), toDate: expect.any(String) }),
    );
    store.setReceptionView('Upcoming');
    await Promise.resolve();
    expect(store.query().toDate).toBeUndefined();
    expect(store.query().fromDate).toBeTruthy();
    store.setReceptionView('All');
    await Promise.resolve();
    expect(store.query().fromDate).toBeUndefined();
    store.actor.set('Doctor');
    const before = store.query();
    store.setReceptionView('Today');
    expect(store.query()).toEqual(before);
  });
  it('requires both account and selected clinic permissions for structured patient search', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    grants.set(['Patients.SearchBasic']);
    const search = vi.spyOn(TestBed.inject(PatientsApi), 'search');
    await store.searchPatients({ phoneNumber: '01011122233' });
    expect(search).not.toHaveBeenCalled();
  });
  it('clears completed patient search state on practice switch', async () => {
    vi.spyOn(TestBed.inject(AuthSession), 'hasPermission').mockReturnValue(true);
    store.actor.set('Reception');
    store.practices.set([
      { id: 'clinic-a', nameAr: 'Clinic A', nameEn: 'Clinic A' },
      { id: 'clinic-b', nameAr: 'Clinic B', nameEn: 'Clinic B' },
    ]);
    currentPracticeId.set('clinic-a');
    store.practiceId.set('clinic-a');
    grants.set(['Patients.SearchBasic']);

    const patient: PatientSearchItem = {
      patientId: 'p-a',
      nameAr: 'Synthetic',
      nameEn: 'Synthetic',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phoneNumber: '01011122233',
      hasContactPhone: false,
    };
    const search = vi
      .spyOn(TestBed.inject(PatientsApi), 'search')
      .mockReturnValue(of({ items: [patient], totalCount: 1, pageNumber: 1, pageSize: 20 }));

    await store.searchPatients({
      phoneNumber: patient.phoneNumber!,
      dateOfBirth: patient.dateOfBirth,
    });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorPracticeId: 'clinic-a',
        phoneNumber: patient.phoneNumber,
        dateOfBirth: patient.dateOfBirth,
      }),
    );
    expect(store.patientResults()[0].phoneNumber).toBe(patient.phoneNumber);
    expect(store.patientSearched()).toBe(true);
    expect(store.patientSearchLoading()).toBe(false);
    expect(store.patientSearchFailed()).toBe(false);

    // Switch to Clinic B
    await store.selectPractice('clinic-b');

    // Assert after switch
    expect(store.patientResults()).toEqual([]);
    expect(store.patientSearched()).toBe(false);
    expect(store.patientSearchFailed()).toBe(false);
    expect(store.patientSearchLoading()).toBe(false);
    expect(store.bookingPatient()).toBeNull();
    expect(store.bookingPatientId()).toBe('');
  });

  it('clears selected booking patient, eligibilities, and availability on practice switch', async () => {
    vi.spyOn(TestBed.inject(AuthSession), 'hasPermission').mockReturnValue(true);
    store.actor.set('Reception');
    store.practices.set([
      { id: 'clinic-a', nameAr: 'Clinic A', nameEn: 'Clinic A' },
      { id: 'clinic-b', nameAr: 'Clinic B', nameEn: 'Clinic B' },
    ]);
    currentPracticeId.set('clinic-a');
    store.practiceId.set('clinic-a');
    grants.set([
      'Patients.SearchBasic',
      'PracticeReservations.View',
      'PracticeReservations.Create',
      'FollowUpEligibility.ViewBookingEligibility',
    ]);

    const patient: PatientSearchItem = {
      patientId: 'p-a',
      nameAr: 'Synthetic',
      nameEn: 'Synthetic',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phoneNumber: '01011122233',
      hasContactPhone: false,
    };
    vi.spyOn(TestBed.inject(PatientsApi), 'search').mockReturnValue(
      of({ items: [patient], totalCount: 1, pageNumber: 1, pageSize: 20 }),
    );

    await store.searchPatients({ name: 'Synthetic' });
    store.editor.set('create');
    await store.choosePatient('p-a');

    expect(store.bookingPatientId()).toBe('p-a');
    expect(store.bookingPatient()?.patientId).toBe('p-a');

    store.dates.set([{ date: '2026-10-07', isAvailable: true }]);
    store.slots.set([{ date: '2026-10-07', time: '10:00' }]);
    store.date.set('2026-10-07');
    store.time.set('10:00');

    // Switch to Clinic B
    await store.selectPractice('clinic-b');

    expect(store.bookingPatient()).toBeNull();
    expect(store.bookingPatientId()).toBe('');
    expect(store.eligibilities()).toEqual([]);
    expect(store.eligibility()).toBeNull();
    expect(store.dates()).toEqual([]);
    expect(store.slots()).toEqual([]);
    expect(store.options()).toBeNull();
    expect(store.date()).toBe('');
    expect(store.time()).toBe('');
  });

  it('does not restore old patient results when switching A -> B -> A', async () => {
    vi.spyOn(TestBed.inject(AuthSession), 'hasPermission').mockReturnValue(true);
    store.actor.set('Reception');
    store.practices.set([
      { id: 'clinic-a', nameAr: 'Clinic A', nameEn: 'Clinic A' },
      { id: 'clinic-b', nameAr: 'Clinic B', nameEn: 'Clinic B' },
    ]);
    currentPracticeId.set('clinic-a');
    store.practiceId.set('clinic-a');
    grants.set(['Patients.SearchBasic']);

    const patient: PatientSearchItem = {
      patientId: 'p-a',
      nameAr: 'Synthetic',
      nameEn: 'Synthetic',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phoneNumber: '01011122233',
      hasContactPhone: false,
    };
    vi.spyOn(TestBed.inject(PatientsApi), 'search').mockReturnValue(
      of({ items: [patient], totalCount: 1, pageNumber: 1, pageSize: 20 }),
    );

    await store.searchPatients({ name: 'Synthetic' });
    expect(store.patientResults().length).toBe(1);

    // Switch to Clinic B
    await store.selectPractice('clinic-b');
    expect(store.patientResults()).toEqual([]);

    // Switch back to Clinic A
    await store.selectPractice('clinic-a');
    expect(store.patientResults()).toEqual([]);
    expect(store.bookingPatient()).toBeNull();
    expect(store.bookingPatientId()).toBe('');
    expect(store.patientSearched()).toBe(false);
    expect(store.patientSearchLoading()).toBe(false);
    expect(store.patientSearchFailed()).toBe(false);
  });

  it('ignores late responses (both success and failure) from Clinic A after switching to Clinic B', async () => {
    vi.spyOn(TestBed.inject(AuthSession), 'hasPermission').mockReturnValue(true);
    store.actor.set('Reception');
    store.practices.set([
      { id: 'clinic-a', nameAr: 'Clinic A', nameEn: 'Clinic A' },
      { id: 'clinic-b', nameAr: 'Clinic B', nameEn: 'Clinic B' },
    ]);
    currentPracticeId.set('clinic-a');
    store.practiceId.set('clinic-a');
    grants.set(['Patients.SearchBasic']);

    const patient: PatientSearchItem = {
      patientId: 'p-a',
      nameAr: 'Synthetic',
      nameEn: 'Synthetic',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phoneNumber: '01011122233',
      hasContactPhone: false,
    };

    // Case 4a: Late success ignored
    const pendingSuccess = new Subject<PagedResponse<PatientSearchItem>>();
    const searchSpy = vi
      .spyOn(TestBed.inject(PatientsApi), 'search')
      .mockReturnValue(pendingSuccess);

    const requestA = store.searchPatients({ name: 'Synthetic' });
    expect(store.patientSearchLoading()).toBe(true);

    await store.selectPractice('clinic-b');
    expect(store.patientSearchLoading()).toBe(false);

    pendingSuccess.next({ items: [patient], totalCount: 1, pageNumber: 1, pageSize: 20 });
    pendingSuccess.complete();
    await requestA;

    expect(store.patientResults()).toEqual([]);
    expect(store.patientSearched()).toBe(false);
    expect(store.patientSearchLoading()).toBe(false);
    expect(store.patientSearchFailed()).toBe(false);

    // Case 4b: Late failure ignored
    currentPracticeId.set('clinic-a');
    store.practiceId.set('clinic-a');
    const pendingFailure = new Subject<PagedResponse<PatientSearchItem>>();
    searchSpy.mockReturnValue(pendingFailure);

    const requestB = store.searchPatients({ name: 'Synthetic' });
    expect(store.patientSearchLoading()).toBe(true);

    await store.selectPractice('clinic-b');
    expect(store.patientSearchLoading()).toBe(false);

    pendingFailure.error(new HttpErrorResponse({ status: 403 }));
    await requestB;

    expect(store.patientResults()).toEqual([]);
    expect(store.patientSearchFailed()).toBe(false);
    expect(store.patientSearchLoading()).toBe(false);
    expect(reception.refresh).not.toHaveBeenCalled();
  });

  it('correctly derives Reception Today empty state and filtered states', () => {
    store.actor.set('Reception');
    currentPracticeId.set('clinic-a');
    store.practiceId.set('clinic-a');
    grants.set(['PracticeReservations.View', 'PracticeReservations.Create']);
    store.setReceptionView('Today');
    store.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    store.loading.set(false);
    store.listFailed.set(false);

    // Default Today with no filters
    expect(store.isReceptionFiltered()).toBe(false);
    expect(store.isReceptionTodayEmpty()).toBe(true);

    // Search filter active
    store.query.update((q) => ({ ...q, search: 'Ahmed' }));
    expect(store.isReceptionFiltered()).toBe(true);
    expect(store.isReceptionTodayEmpty()).toBe(false);

    // Clear search, add status filter
    store.query.update((q) => ({ ...q, search: undefined, status: 'Active' }));
    expect(store.isReceptionFiltered()).toBe(true);
    expect(store.isReceptionTodayEmpty()).toBe(false);

    // Switch to Upcoming view
    store.query.update((q) => ({ ...q, status: undefined }));
    store.setReceptionView('Upcoming');
    expect(store.isReceptionTodayEmpty()).toBe(false);
  });
  it('clears a pending drawer on clinic switch without attaching its result to the new clinic', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    grants.set(['PracticeReservations.Cancel']);
    store.metadata.set({
      ...metadataFixture,
      providerCancellationReasons: metadataFixture.patientCancellationReasons,
    });
    const pending = new Subject<Reservation>();
    api.cancel.mockReturnValue(pending);
    const save = store.save(draft);
    expect(store.busy()).toBe(true);
    currentPracticeId.set('');
    TestBed.tick();
    expect(store.editor()).toBeNull();
    expect(store.detail()).toBeNull();
    pending.next(reservationFixture);
    pending.complete();
    await save;
    TestBed.tick();
    expect(store.detail()).toBeNull();
    expect(store.busy()).toBe(false);
    expect(store.practiceId()).toBe('');
  });
  it('reschedules Reception appointments only with consent and reason and preserves the row version', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    grants.set(['PracticeReservations.Reschedule']);
    store.editor.set('reschedule');
    store.date.set('2026-10-07');
    store.time.set('17:30');
    store.slots.set([{ date: '2026-10-07', time: '17:30' }]);
    api.reschedule.mockReturnValue(of(reservationFixture));
    await store.save(draft);
    expect(api.reschedule).not.toHaveBeenCalled();
    await store.save({
      ...draft,
      patientConsentConfirmed: true,
      reason: 'Patient requested change',
    });
    expect(api.reschedule).toHaveBeenCalledWith(
      { actor: 'Reception', practiceId: 'clinic' },
      reservationFixture.reservationId,
      {
        businessDate: '2026-10-07',
        slotStartTime: '17:30',
        rowVersion: reservationFixture.rowVersion,
        patientConsentConfirmed: true,
        reason: 'Patient requested change',
      },
      expect.any(String),
    );
  });
  it('restores no-show only with delegated permission and the server capability', async () => {
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    grants.set(['PracticeReservations.RestoreNoShow']);
    store.editor.set('restore');
    store.detail.set({
      ...reservationFixture,
      status: 'NoShow',
      capabilities: { ...reservationFixture.capabilities, canRestoreFromNoShow: false },
    });
    await store.save(draft);
    expect(api.restoreNoShow).not.toHaveBeenCalled();
    store.detail.update((detail) => ({
      ...detail!,
      capabilities: { ...detail!.capabilities, canRestoreFromNoShow: true },
    }));
    api.restoreNoShow.mockReturnValue(of(reservationFixture));
    await store.save(draft);
    expect(api.restoreNoShow).toHaveBeenCalledWith(
      'clinic',
      reservationFixture.reservationId,
      reservationFixture.rowVersion,
      expect.any(String),
    );
  });
});
