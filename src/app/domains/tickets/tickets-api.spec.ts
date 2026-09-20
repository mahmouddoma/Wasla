import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TicketsApi } from './tickets-api';

describe('TicketsApi', () => {
  let api: TicketsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TicketsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each([
    [
      'WAS-166',
      'POST',
      '/api/v1/practices/p1/reservations/r1/check-in',
      () => api.checkIn('p1', 'r1', { paidAmount: 250 }, 'intent'),
    ],
    [
      'WAS-167',
      'POST',
      '/api/v1/practices/p1/reservations/r1/force-check-in',
      () => api.forceCheckIn('p1', 'r1', { paidAmount: 250, reason: 'Early arrival' }, 'intent'),
    ],
    [
      'WAS-168',
      'POST',
      '/api/v1/practices/p1/tickets/walk-in',
      () =>
        api.createWalkIn(
          'p1',
          { patientId: 'u1', segmentId: 's1', visitTypeId: 'v1', paidAmount: 250 },
          'intent',
        ),
    ],
    ['WAS-169', 'GET', '/api/v1/practices/p1/queue', () => api.queue('p1')],
    ['WAS-170', 'GET', '/api/v1/practices/p1/tickets/t1', () => api.details('p1', 't1')],
    ['WAS-171', 'POST', '/api/v1/practices/p1/queue/call-next', () => api.callNext('p1', 'intent')],
    [
      'WAS-172',
      'POST',
      '/api/v1/practices/p1/tickets/t1/manual-call',
      () => api.manualCall('p1', 't1', { reason: 'Emergency', rowVersion: 'rv' }, 'intent'),
    ],
    [
      'WAS-173',
      'POST',
      '/api/v1/practices/p1/tickets/t1/recall',
      () => api.recall('p1', 't1', { rowVersion: 'rv' }, 'intent'),
    ],
    [
      'WAS-174',
      'POST',
      '/api/v1/practices/p1/tickets/t1/confirm-no-response',
      () => api.confirmNoResponse('p1', 't1', { rowVersion: 'rv' }, 'intent'),
    ],
    [
      'WAS-175',
      'POST',
      '/api/v1/practices/p1/tickets/t1/restore-no-show',
      () => api.restoreNoShow('p1', 't1', { rowVersion: 'rv' }, 'intent'),
    ],
    [
      'WAS-176',
      'POST',
      '/api/v1/practices/p1/tickets/t1/start',
      () => api.start('p1', 't1', { rowVersion: 'rv' }, 'intent'),
    ],
    [
      'WAS-177',
      'POST',
      '/api/v1/practices/p1/tickets/t1/complete',
      () => api.complete('p1', 't1', { rowVersion: 'rv' }, 'intent'),
    ],
    [
      'WAS-178',
      'POST',
      '/api/v1/practices/p1/tickets/t1/cancel',
      () => api.cancel('p1', 't1', { reason: 'Patient left', rowVersion: 'rv' }, 'intent'),
    ],
    ['WAS-179', 'GET', '/api/v1/tickets/mine/active', () => api.myActive()],
    ['WAS-180', 'GET', '/api/v1/tickets/mine/t1', () => api.myDetails('t1')],
  ])('%s sends %s to the Jira endpoint', (_key, method, path, call) => {
    const response: Observable<unknown> = call();
    response.subscribe();
    const request = http.expectOne(environment.apiBaseUrl + path);
    expect(request.request.method).toBe(method);
    if (method === 'POST') expect(request.request.headers.get('Idempotency-Key')).toBe('intent');
    request.flush({});
  });

  it('sends the latest rowVersion and required reason for manual mutations', () => {
    api.cancel('p1', 't1', { reason: 'Patient left', rowVersion: 'rv-2' }, 'key').subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/tickets/t1/cancel'));
    expect(request.request.body).toEqual({ reason: 'Patient left', rowVersion: 'rv-2' });
    request.flush({});
  });
});
