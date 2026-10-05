import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ReservationsApi } from '../../../domains/reservations';
import { PublicDiscoveryApi } from '../../../domains/public-discovery';
import { FollowUpEligibility, FollowUpsApi } from '../../../domains/follow-ups';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { ReservationDraft, ReservationWorkspaceStore } from './reservation-workspace.store';
import { reservationFixture } from '../reservation-test-fixtures';

describe('Follow-up reservation integration', () => {
  const eligibility: FollowUpEligibility = {
    eligibilityId: 'f1',
    patientId: 'p1',
    doctorId: 'd1',
    practiceId: 'clinic',
    status: 'Available',
    canBook: true,
    validUntil: '2026-10-30',
    rowVersion: 'fv1',
  };
  const options = {
    practiceId: 'clinic',
    date: '2026-10-05',
    time: '17:00',
    visitTypes: [
      {
        visitTypeId: 'follow-up',
        type: 'FollowUp',
        nameAr: 'متابعة',
        nameEn: 'Follow-up',
        segments: [{ segmentId: 's', nameAr: 'عادي', nameEn: 'Standard', price: 0 }],
      },
      { visitTypeId: 'new', type: 'NewConsultation', nameAr: 'كشف', nameEn: 'New', segments: [] },
    ],
  };
  const api = {
    receptionDates: vi.fn(),
    receptionSlots: vi.fn(),
    receptionOptions: vi.fn(),
    createPatient: vi.fn(),
    createReception: vi.fn(),
    list: vi.fn(),
  };
  const followUps = {
    mine: vi.fn(),
    reception: vi.fn(),
    details: vi.fn(),
    dates: vi.fn(),
    slots: vi.fn(),
    options: vi.fn(),
  };
  const publicApi = { availableDates: vi.fn(), availableSlots: vi.fn(), bookingOptions: vi.fn() };
  let store: ReservationWorkspaceStore;
  let followUpPermission: boolean;
  const draft: ReservationDraft = {
    patientId: 'p1',
    visitTypeId: 'follow-up',
    segmentId: 's',
    bookingNote: '',
    reasonCode: '',
    comment: '',
    reason: '',
    patientConsentConfirmed: false,
  };
  beforeEach(() => {
    vi.resetAllMocks();
    followUpPermission = true;
    const dates = [{ date: '2026-10-05', isAvailable: true }],
      slots = [{ date: '2026-10-05', time: '17:00' }];
    publicApi.availableDates.mockReturnValue(of(dates));
    api.receptionDates.mockReturnValue(of(dates));
    api.receptionSlots.mockReturnValue(of(slots));
    api.receptionOptions.mockReturnValue(of(options));
    api.list.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    api.createPatient.mockReturnValue(of(reservationFixture));
    api.createReception.mockReturnValue(of(reservationFixture));
    followUps.mine.mockReturnValue(of({ items: [eligibility], totalCount: 1 }));
    followUps.reception.mockReturnValue(of([eligibility]));
    followUps.details.mockReturnValue(of(eligibility));
    followUps.dates.mockReturnValue(of(dates));
    followUps.slots.mockReturnValue(of(slots));
    followUps.options.mockReturnValue(of(options));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        ReservationWorkspaceStore,
        { provide: ReservationsApi, useValue: api },
        { provide: FollowUpsApi, useValue: followUps },
        { provide: PublicDiscoveryApi, useValue: publicApi },
        {
          provide: AuthSession,
          useValue: {
            user: () => ({ userType: 'Patient' }),
            hasPermission: (p: string) =>
              p === 'FollowUpEligibility.ViewOwn' ? followUpPermission : true,
          },
        },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            currentPracticeId: signal('clinic'),
            allows: (p: string) =>
              p === 'FollowUpEligibility.ViewBookingEligibility' ? followUpPermission : true,
          },
        },
      ],
    });
    store = TestBed.inject(ReservationWorkspaceStore);
    store.practiceId.set('clinic');
    store.editor.set('create');
    store.patients.set([
      {
        patientId: 'p1',
        nameAr: 'مريض',
        nameEn: 'Patient',
        dateOfBirth: '',
        gender: '',
        isSelf: true,
        relationshipType: null,
      },
    ]);
  });
  async function selectFollowUp() {
    await store.choosePatient('p1');
    await store.chooseEligibility('f1');
    await store.chooseDate('2026-10-05');
    await store.chooseTime('17:00');
  }
  it('uses authenticated eligibility availability, only FollowUp options and latest eligibility version on create', async () => {
    await selectFollowUp();
    expect(followUps.dates).toHaveBeenCalledWith('f1');
    expect(followUps.slots).toHaveBeenCalledWith('f1', '2026-10-05');
    expect(store.options()?.visitTypes.map((v) => v.type)).toEqual(['FollowUp']);
    await store.save(draft);
    expect(api.createPatient).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'p1',
        followUpEligibilityId: 'f1',
        followUpEligibilityRowVersion: 'fv1',
      }),
      expect.any(String),
    );
    expect(api.createPatient.mock.calls[0][0]).not.toHaveProperty('price');
    expect(store.eligibility()).toBeNull();
  });
  it('passes assigned practice, patient and eligibility to reception availability', async () => {
    store.actor.set('Reception');
    await selectFollowUp();
    expect(api.receptionSlots).toHaveBeenCalledWith('clinic', '2026-10-05', {
      patientId: 'p1',
      followUpEligibilityId: 'f1',
    });
    expect(api.receptionOptions).toHaveBeenCalledWith('clinic', '2026-10-05', '17:00', {
      patientId: 'p1',
      followUpEligibilityId: 'f1',
    });
  });
  it('does not load eligibility without delegated permission', async () => {
    store.actor.set('Reception');
    followUpPermission = false;
    await store.choosePatient('p1');
    expect(followUps.reception).not.toHaveBeenCalled();
    expect(store.eligibilities()).toEqual([]);
  });
  it('expired claim conflicts discard availability instead of retrying a new consultation', async () => {
    await selectFollowUp();
    api.createPatient.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    followUps.details.mockReturnValue(
      of({ ...eligibility, canBook: false, status: 'Expired', rowVersion: 'fv2' }),
    );
    await store.save(draft);
    expect(store.options()).toBeNull();
    expect(store.slots()).toEqual([]);
    await store.save(draft);
    expect(api.createPatient).toHaveBeenCalledTimes(1);
  });
  it('changing booking patient clears the old claim and selection', async () => {
    await selectFollowUp();
    await store.choosePatient('other');
    expect(store.eligibility()).toBeNull();
    expect(store.options()).toBeNull();
  });
});
