import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Phase18Part2Api, PHASE18_PART2_OPERATIONS } from './phase18-part2-api';

describe('Phase18Part2Api', () => {
  let api: Phase18Part2Api;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Phase18Part2Api, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(Phase18Part2Api);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and define all 40 operations', () => {
    expect(api).toBeTruthy();
    expect(Object.keys(PHASE18_PART2_OPERATIONS).length).toBe(40);
  });

  it('should correctly call P18.2-01 (WAS-546 - GET /api/v1/practices/{practiceId}/tickets/{ticketId})', () => {
    api.call('P18.2-01' as any, {
      path: { practiceId: 'test-practiceId', ticketId: 'test-ticketId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/practices/test-practiceId/tickets/test-ticketId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-02 (WAS-547 - GET /api/v1/tickets/mine/{ticketId})', () => {
    api.call('P18.2-02' as any, {
      path: { ticketId: 'test-ticketId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/tickets/mine/test-ticketId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-03 (WAS-548 - GET /api/v1/reception/practices/{practiceId}/reservations/{reservationId})', () => {
    api.call('P18.2-03' as any, {
      path: { practiceId: 'test-practiceId', reservationId: 'test-reservationId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/reservations/test-reservationId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-04 (WAS-549 - GET /api/v1/doctors/me/practices/{practiceId}/reservations/{reservationId})', () => {
    api.call('P18.2-04' as any, {
      path: { practiceId: 'test-practiceId', reservationId: 'test-reservationId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/reservations/test-reservationId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-05 (WAS-550 - GET /api/v1/reservations/mine/{reservationId})', () => {
    api.call('P18.2-05' as any, {
      path: { reservationId: 'test-reservationId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reservations/mine/test-reservationId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-06 (WAS-551 - GET /api/v1/admin/reservations/{reservationId})', () => {
    api.call('P18.2-06' as any, {
      path: { reservationId: 'test-reservationId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reservations/test-reservationId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-07 (WAS-512 - GET /api/v1/doctors/me/practices/{practiceId}/archives/tickets)', () => {
    api.call('P18.2-07' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/archives/tickets' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-08 (WAS-513 - GET /api/v1/doctors/me/practices/{practiceId}/archives/reservations)', () => {
    api.call('P18.2-08' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/archives/reservations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-09 (WAS-514 - GET /api/v1/reception/practices/{practiceId}/archives/tickets)', () => {
    api.call('P18.2-09' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/archives/tickets' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-10 (WAS-515 - GET /api/v1/reception/practices/{practiceId}/archives/reservations)', () => {
    api.call('P18.2-10' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/archives/reservations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-11 (WAS-516 - GET /api/v1/tickets/mine/archived)', () => {
    api.call('P18.2-11' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/tickets/mine/archived' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-12 (WAS-517 - GET /api/v1/reservations/mine/archived)', () => {
    api.call('P18.2-12' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reservations/mine/archived' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-13 (WAS-518 - GET /api/v1/admin/archives/tickets)', () => {
    api.call('P18.2-13' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/tickets' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-14 (WAS-519 - GET /api/v1/admin/archives/reservations)', () => {
    api.call('P18.2-14' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/reservations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-15 (WAS-520 - GET /api/v1/admin/archives/tickets/{ticketId})', () => {
    api.call('P18.2-15' as any, {
      path: { ticketId: 'test-ticketId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/tickets/test-ticketId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-16 (WAS-521 - GET /api/v1/admin/archives/operations/health)', () => {
    api.call('P18.2-16' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/health' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-17 (WAS-522 - GET /api/v1/admin/archives/operations/runs)', () => {
    api.call('P18.2-17' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/runs' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-18 (WAS-523 - GET /api/v1/admin/archives/operations/runs/{runId})', () => {
    api.call('P18.2-18' as any, {
      path: { runId: 'test-runId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/runs/test-runId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-19 (WAS-524 - GET /api/v1/admin/archives/operations/exceptions)', () => {
    api.call('P18.2-19' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/exceptions' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-20 (WAS-525 - GET /api/v1/admin/archives/operations/exceptions/{exceptionId})', () => {
    api.call('P18.2-20' as any, {
      path: { exceptionId: 'test-exceptionId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/exceptions/test-exceptionId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-21 (WAS-526 - POST /api/v1/admin/archives/operations/pause)', () => {
    api.call('P18.2-21' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/pause' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18.2-22 (WAS-527 - POST /api/v1/admin/archives/operations/resume)', () => {
    api.call('P18.2-22' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/resume' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18.2-23 (WAS-528 - GET /api/v1/doctors/me/practices/{practiceId}/audit/events)', () => {
    api.call('P18.2-23' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/audit/events' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-24 (WAS-529 - GET /api/v1/doctors/me/practices/{practiceId}/audit/events/{eventKey})', () => {
    api.call('P18.2-24' as any, {
      path: { practiceId: 'test-practiceId', eventKey: 'test-eventKey' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/audit/events/test-eventKey' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-25 (WAS-530 - GET /api/v1/doctors/me/practices/{practiceId}/audit/sensitive-access)', () => {
    api.call('P18.2-25' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/audit/sensitive-access' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-26 (WAS-531 - GET /api/v1/reception/practices/{practiceId}/audit/my-activity)', () => {
    api.call('P18.2-26' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/audit/my-activity' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-27 (WAS-532 - GET /api/v1/reception/practices/{practiceId}/audit/my-activity/{eventKey})', () => {
    api.call('P18.2-27' as any, {
      path: { practiceId: 'test-practiceId', eventKey: 'test-eventKey' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/audit/my-activity/test-eventKey' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-28 (WAS-533 - GET /api/v1/admin/audit/events)', () => {
    api.call('P18.2-28' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/audit/events' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-29 (WAS-534 - GET /api/v1/admin/audit/events/{eventKey})', () => {
    api.call('P18.2-29' as any, {
      path: { eventKey: 'test-eventKey' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/audit/events/test-eventKey' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-30 (WAS-535 - POST /api/v1/admin/audit/sensitive-access/search)', () => {
    api.call('P18.2-30' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/audit/sensitive-access/search' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-31 (WAS-536 - GET /api/v1/admin/archives/reservations/{reservationId})', () => {
    api.call('P18.2-31' as any, {
      path: { reservationId: 'test-reservationId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/reservations/test-reservationId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-32 (WAS-537 - GET /api/v1/archives/metadata)', () => {
    api.call('P18.2-32' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/archives/metadata' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-33 (WAS-538 - GET /api/v1/doctors/me/archives/practices/options)', () => {
    api.call('P18.2-33' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/archives/practices/options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-34 (WAS-539 - GET /api/v1/admin/archives/practices/options)', () => {
    api.call('P18.2-34' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/practices/options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-35 (WAS-540 - GET /api/v1/admin/archives/operations/filter-options)', () => {
    api.call('P18.2-35' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/archives/operations/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-36 (WAS-541 - GET /api/v1/doctors/me/practices/{practiceId}/audit/filter-options)', () => {
    api.call('P18.2-36' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/audit/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-37 (WAS-542 - GET /api/v1/reception/practices/{practiceId}/audit/filter-options)', () => {
    api.call('P18.2-37' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/audit/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-38 (WAS-543 - GET /api/v1/admin/audit/filter-options)', () => {
    api.call('P18.2-38' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/audit/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-39 (WAS-544 - GET /api/v1/reservations/mine/archived/patients/options)', () => {
    api.call('P18.2-39' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reservations/mine/archived/patients/options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18.2-40 (WAS-545 - GET /api/v1/reception/archives/practices/options)', () => {
    api.call('P18.2-40' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/archives/practices/options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });
});
