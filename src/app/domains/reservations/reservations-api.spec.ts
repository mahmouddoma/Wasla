import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReservationsApi } from './reservations-api';
import { environment } from '../../../environments/environment';
import { ReservationScope } from './reservation.models';
describe('ReservationsApi', () => {
  let api: ReservationsApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ReservationsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  // Expected paths are taken from Jira ticket descriptions, independently of the URL builder.
  const date = '2026-09-20',
    time = '17:00';
  const query = { pageNumber: 1, pageSize: 20 };
  const create = {
    patientId: 'p1',
    businessDate: date,
    slotStartTime: time,
    segmentId: 's1',
    visitTypeId: 'v1',
    bookingNote: null,
  };
  const cancel = { reasonCode: 'Other', comment: 'Changed plans', rowVersion: 'v1' };
  const change = { businessDate: date, slotStartTime: time, rowVersion: 'v1' };
  const providerChange = {
    ...change,
    patientConsentConfirmed: true as const,
    reason: 'Patient requested change',
  };
  it.each([
    {
      key: 'WAS-135',
      method: 'GET',
      path: '/api/v1/reservations/metadata',
      call: () => api.metadata(),
    },
    {
      key: 'WAS-136',
      method: 'GET',
      path: '/api/v1/reservations/bookable-patients',
      call: () => api.bookablePatients(),
    },
    {
      key: 'WAS-137',
      method: 'POST',
      path: '/api/v1/reservations',
      call: () => api.createPatient({ ...create, doctorPracticeId: 'c1' }, 'intent'),
    },
    {
      key: 'WAS-138',
      method: 'GET',
      path: '/api/v1/reservations/mine',
      call: () => api.list({ actor: 'Patient' }, query),
    },
    {
      key: 'WAS-139',
      method: 'GET',
      path: '/api/v1/reservations/mine/r1',
      call: () => api.details({ actor: 'Patient' }, 'r1'),
    },
    {
      key: 'WAS-140',
      method: 'POST',
      path: '/api/v1/reservations/mine/r1/cancel',
      call: () => api.cancel({ actor: 'Patient' }, 'r1', cancel, 'intent'),
    },
    {
      key: 'WAS-141',
      method: 'GET',
      path: '/api/v1/reservations/mine/r1/reschedule/available-dates',
      call: () => api.rescheduleDates({ actor: 'Patient' }, 'r1'),
    },
    {
      key: 'WAS-142',
      method: 'GET',
      path: '/api/v1/reservations/mine/r1/reschedule/available-slots',
      call: () => api.rescheduleSlots({ actor: 'Patient' }, 'r1', date),
    },
    {
      key: 'WAS-143',
      method: 'POST',
      path: '/api/v1/reservations/mine/r1/reschedule',
      call: () => api.reschedule({ actor: 'Patient' }, 'r1', change, 'intent'),
    },
    {
      key: 'WAS-144',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/booking/available-dates',
      call: () => api.receptionDates('c1'),
    },
    {
      key: 'WAS-145',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/booking/available-slots',
      call: () => api.receptionSlots('c1', date),
    },
    {
      key: 'WAS-146',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/booking/options',
      call: () => api.receptionOptions('c1', date, time),
    },
    {
      key: 'WAS-147',
      method: 'POST',
      path: '/api/v1/reception/practices/c1/reservations',
      call: () => api.createReception('c1', create, 'intent'),
    },
    {
      key: 'WAS-148',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/reservations',
      call: () => api.list({ actor: 'Reception', practiceId: 'c1' }, query),
    },
    {
      key: 'WAS-149',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/reservations/filter-options',
      call: () => api.filterOptions({ actor: 'Reception', practiceId: 'c1' }),
    },
    {
      key: 'WAS-150',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/reservations/r1',
      call: () => api.details({ actor: 'Reception', practiceId: 'c1' }, 'r1'),
    },
    {
      key: 'WAS-151',
      method: 'POST',
      path: '/api/v1/reception/practices/c1/reservations/r1/cancel',
      call: () => api.cancel({ actor: 'Reception', practiceId: 'c1' }, 'r1', cancel, 'intent'),
    },
    {
      key: 'WAS-152',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/reservations/r1/reschedule/available-dates',
      call: () => api.rescheduleDates({ actor: 'Reception', practiceId: 'c1' }, 'r1'),
    },
    {
      key: 'WAS-153',
      method: 'GET',
      path: '/api/v1/reception/practices/c1/reservations/r1/reschedule/available-slots',
      call: () => api.rescheduleSlots({ actor: 'Reception', practiceId: 'c1' }, 'r1', date),
    },
    {
      key: 'WAS-154',
      method: 'POST',
      path: '/api/v1/reception/practices/c1/reservations/r1/reschedule',
      call: () =>
        api.reschedule({ actor: 'Reception', practiceId: 'c1' }, 'r1', providerChange, 'intent'),
    },
    {
      key: 'WAS-155',
      method: 'POST',
      path: '/api/v1/reception/practices/c1/reservations/r1/restore-no-show',
      call: () => api.restoreNoShow('c1', 'r1', 'v1', 'intent'),
    },
    {
      key: 'WAS-156',
      method: 'GET',
      path: '/api/v1/doctors/me/practices/c1/reservations',
      call: () => api.list({ actor: 'Doctor', practiceId: 'c1' }, query),
    },
    {
      key: 'WAS-157',
      method: 'GET',
      path: '/api/v1/doctors/me/practices/c1/reservations/filter-options',
      call: () => api.filterOptions({ actor: 'Doctor', practiceId: 'c1' }),
    },
    {
      key: 'WAS-158',
      method: 'GET',
      path: '/api/v1/doctors/me/practices/c1/reservations/r1',
      call: () => api.details({ actor: 'Doctor', practiceId: 'c1' }, 'r1'),
    },
    {
      key: 'WAS-159',
      method: 'POST',
      path: '/api/v1/doctors/me/practices/c1/reservations/r1/cancel',
      call: () => api.cancel({ actor: 'Doctor', practiceId: 'c1' }, 'r1', cancel, 'intent'),
    },
    {
      key: 'WAS-160',
      method: 'GET',
      path: '/api/v1/doctors/me/practices/c1/reservations/r1/reschedule/available-dates',
      call: () => api.rescheduleDates({ actor: 'Doctor', practiceId: 'c1' }, 'r1'),
    },
    {
      key: 'WAS-161',
      method: 'GET',
      path: '/api/v1/doctors/me/practices/c1/reservations/r1/reschedule/available-slots',
      call: () => api.rescheduleSlots({ actor: 'Doctor', practiceId: 'c1' }, 'r1', date),
    },
    {
      key: 'WAS-162',
      method: 'POST',
      path: '/api/v1/doctors/me/practices/c1/reservations/r1/reschedule',
      call: () =>
        api.reschedule({ actor: 'Doctor', practiceId: 'c1' }, 'r1', providerChange, 'intent'),
    },
    {
      key: 'WAS-163',
      method: 'GET',
      path: '/api/v1/admin/reservations',
      call: () => api.list({ actor: 'Admin' }, query),
    },
    {
      key: 'WAS-164',
      method: 'GET',
      path: '/api/v1/admin/reservations/r1',
      call: () => api.details({ actor: 'Admin' }, 'r1'),
    },
  ])('$key sends $method to its Jira endpoint', (test) => {
    const response: Observable<unknown> = test.call();
    response.subscribe();
    const request = http.expectOne((r) => r.url === environment.apiBaseUrl + test.path);
    expect(request.request.method).toBe(test.method);
    if (test.method === 'POST')
      expect(request.request.headers.get('Idempotency-Key')).toBe('intent');
    if (test.path.endsWith('/available-slots') || test.path.endsWith('/options'))
      expect(request.request.params.get('date')).toBe(date);
    if (test.path.endsWith('/options')) expect(request.request.params.get('time')).toBe(time);
    if (
      test.path.endsWith('/cancel') ||
      test.path.endsWith('/reschedule') ||
      test.path.endsWith('/restore-no-show')
    )
      expect(request.request.body.rowVersion).toBe('v1');
    request.flush({});
  });
  it.each([
    { actor: 'Patient', suffix: '/reservations/mine' },
    { actor: 'Reception', practiceId: 'c1', suffix: '/reception/practices/c1/reservations' },
    { actor: 'Doctor', practiceId: 'c1', suffix: '/doctors/me/practices/c1/reservations' },
    { actor: 'Admin', suffix: '/admin/reservations' },
  ] as const)('uses the correct scope for $actor', (scope) => {
    api
      .list(scope, { pageNumber: 2, pageSize: 20, status: 'Confirmed', isLate: false })
      .subscribe();
    const request = http.expectOne((r) => r.url.endsWith(scope.suffix));
    expect(request.request.params.get('isLate')).toBe('false');
    expect(request.request.params.get('pageNumber')).toBe('2');
    request.flush({ items: [], totalCount: 0, pageNumber: 2, pageSize: 20 });
  });
  it('sends rowVersion and an idempotency key on cancellation', () => {
    api
      .cancel(
        { actor: 'Patient' },
        'r1',
        { reasonCode: 'Other', comment: 'Plans changed', rowVersion: 'v2' },
        'intent-1',
      )
      .subscribe();
    const r = http.expectOne((r) => r.url.endsWith('/reservations/mine/r1/cancel'));
    expect(r.request.method).toBe('POST');
    expect(r.request.headers.get('Idempotency-Key')).toBe('intent-1');
    expect(r.request.body.rowVersion).toBe('v2');
    r.flush({});
  });
  it('does not accept administrative mutations or provider changes without consent', () => {
    expect(() =>
      api.cancel(
        { actor: 'Admin' },
        'r1',
        { reasonCode: 'Other', comment: null, rowVersion: 'v1' },
        'key',
      ),
    ).toThrow();
    expect(() =>
      api.reschedule(
        { actor: 'Doctor', practiceId: 'c1' },
        'r1',
        { businessDate: '2026-09-20', slotStartTime: '17:00', rowVersion: 'v1' },
        'key',
      ),
    ).toThrow();
    http.expectNone(() => true);
  });
  it('uses reservation-specific availability and never public discovery for rescheduling', () => {
    const scope: ReservationScope = { actor: 'Reception', practiceId: 'c1' };
    api.rescheduleSlots(scope, 'r1', '2026-09-20').subscribe();
    const r = http.expectOne((r) =>
      r.url.endsWith('/reception/practices/c1/reservations/r1/reschedule/available-slots'),
    );
    expect(r.request.params.get('date')).toBe('2026-09-20');
    r.flush([]);
  });
  it('creates internal reservations without client-owned price or doctor fields', () => {
    const body = {
      patientId: 'p1',
      businessDate: '2026-09-20',
      slotStartTime: '17:00',
      segmentId: 's1',
      visitTypeId: 'v1',
      bookingNote: null,
    };
    api.createReception('c1', body, 'key').subscribe();
    const r = http.expectOne((r) => r.url.endsWith('/reception/practices/c1/reservations'));
    expect(r.request.body).toEqual(body);
    expect(r.request.headers.get('Idempotency-Key')).toBe('key');
    r.flush({});
  });
});
