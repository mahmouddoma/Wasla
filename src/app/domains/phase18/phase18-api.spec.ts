import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Phase18Api, PHASE18_OPERATIONS } from './phase18-api';

describe('Phase18Api', () => {
  let api: Phase18Api;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Phase18Api, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(Phase18Api);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and define all 109 operations', () => {
    expect(api).toBeTruthy();
    expect(Object.keys(PHASE18_OPERATIONS).length).toBe(109);
  });

  it('should correctly call P18-001 (GET /api/v1/admin/attention)', () => {
    api.call('P18-001' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/attention' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-002 (GET /api/v1/admin/dashboard/filter-options)', () => {
    api.call('P18-002' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/dashboard/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-003 (GET /api/v1/admin/dashboard/overview)', () => {
    api.call('P18-003' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/dashboard/overview' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-004 (GET /api/v1/admin/data-quality/summary)', () => {
    api.call('P18-004' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/data-quality/summary' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-005 (GET /api/v1/admin/investigation-cases)', () => {
    api.call('P18-005' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-006 (POST /api/v1/admin/investigation-cases)', () => {
    api.call('P18-006' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-007 (GET /api/v1/admin/investigation-cases/{caseId})', () => {
    api.call('P18-007' as any, {
      path: { caseId: 'test-caseId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/test-caseId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-008 (POST /api/v1/admin/investigation-cases/{caseId}/assign)', () => {
    api.call('P18-008' as any, {
      path: { caseId: 'test-caseId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/test-caseId/assign' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-009 (POST /api/v1/admin/investigation-cases/{caseId}/close)', () => {
    api.call('P18-009' as any, {
      path: { caseId: 'test-caseId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/test-caseId/close' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-010 (GET /api/v1/admin/investigation-cases/{caseId}/history)', () => {
    api.call('P18-010' as any, {
      path: { caseId: 'test-caseId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/test-caseId/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-011 (POST /api/v1/admin/investigation-cases/{caseId}/reopen)', () => {
    api.call('P18-011' as any, {
      path: { caseId: 'test-caseId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/test-caseId/reopen' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-012 (POST /api/v1/admin/investigation-cases/{caseId}/resolve)', () => {
    api.call('P18-012' as any, {
      path: { caseId: 'test-caseId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/test-caseId/resolve' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-013 (POST /api/v1/admin/investigation-cases/{caseId}/start-review)', () => {
    api.call('P18-013' as any, {
      path: { caseId: 'test-caseId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/test-caseId/start-review' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-014 (GET /api/v1/admin/investigation-cases/filter-options)', () => {
    api.call('P18-014' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/investigation-cases/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-015 (GET /api/v1/admin/operations/exports/health)', () => {
    api.call('P18-015' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/operations/exports/health' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-016 (GET /api/v1/admin/operations/jobs/health)', () => {
    api.call('P18-016' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/operations/jobs/health' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-017 (GET /api/v1/admin/reports/{reportCode}/drilldown)', () => {
    api.call('P18-017' as any, {
      path: { reportCode: 'test-reportCode' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/test-reportCode/drilldown' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-018 (GET /api/v1/admin/reports/{reportCode}/export)', () => {
    api.call('P18-018' as any, {
      path: { reportCode: 'test-reportCode' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/test-reportCode/export' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush(new Blob(['test-data'], { type: 'application/pdf' }));
  });

  it('should correctly call P18-019 (GET /api/v1/admin/reports/adoption)', () => {
    api.call('P18-019' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/adoption' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-020 (GET /api/v1/admin/reports/catalog)', () => {
    api.call('P18-020' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/catalog' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-021 (GET /api/v1/admin/reports/doctor-lifecycle)', () => {
    api.call('P18-021' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/doctor-lifecycle' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-022 (GET /api/v1/admin/reports/geography)', () => {
    api.call('P18-022' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/geography' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-023 (GET /api/v1/admin/reports/operations)', () => {
    api.call('P18-023' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/operations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-024 (GET /api/v1/admin/reports/security-metadata)', () => {
    api.call('P18-024' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/admin/reports/security-metadata' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-025 (GET /api/v1/doctors/me/dashboard/filter-options)', () => {
    api.call('P18-025' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/dashboard/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-026 (GET /api/v1/doctors/me/dashboard/overview)', () => {
    api.call('P18-026' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/dashboard/overview' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-027 (GET /api/v1/doctors/me/expense-settlements/{id})', () => {
    api.call('P18-027' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expense-settlements/test-id' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-028 (GET /api/v1/doctors/me/expense-settlements/{id}/history)', () => {
    api.call('P18-028' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expense-settlements/test-id/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-029 (GET /api/v1/doctors/me/expense-settlements/{id}/receipt)', () => {
    api.call('P18-029' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expense-settlements/test-id/receipt' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-030 (POST /api/v1/doctors/me/expense-settlements/{id}/reverse)', () => {
    api.call('P18-030' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expense-settlements/test-id/reverse' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-031 (GET /api/v1/doctors/me/expenses)', () => {
    api.call('P18-031' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-032 (POST /api/v1/doctors/me/expenses)', () => {
    api.call('P18-032' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-033 (GET /api/v1/doctors/me/expenses/{id})', () => {
    api.call('P18-033' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/test-id' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-034 (GET /api/v1/doctors/me/expenses/{id}/history)', () => {
    api.call('P18-034' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/test-id/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-035 (GET /api/v1/doctors/me/expenses/categories)', () => {
    api.call('P18-035' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/categories' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-036 (GET /api/v1/doctors/me/expenses/dashboard)', () => {
    api.call('P18-036' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/dashboard' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-037 (GET /api/v1/doctors/me/expenses/obligations)', () => {
    api.call('P18-037' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/obligations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-038 (GET /api/v1/doctors/me/expenses/obligations/{id})', () => {
    api.call('P18-038' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/obligations/test-id' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-039 (PATCH /api/v1/doctors/me/expenses/obligations/{id})', () => {
    api.call('P18-039' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/obligations/test-id' && r.method === 'PATCH',
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-040 (POST /api/v1/doctors/me/expenses/obligations/{id}/cancel)', () => {
    api.call('P18-040' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/obligations/test-id/cancel' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-041 (POST /api/v1/doctors/me/expenses/obligations/{id}/confirm-actual)', () => {
    api.call('P18-041' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/obligations/test-id/confirm-actual' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-042 (GET /api/v1/doctors/me/expenses/obligations/{id}/history)', () => {
    api.call('P18-042' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/obligations/test-id/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-043 (POST /api/v1/doctors/me/expenses/obligations/{id}/settle)', () => {
    api.call('P18-043' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/obligations/test-id/settle' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-044 (GET /api/v1/doctors/me/expenses/transactions)', () => {
    api.call('P18-044' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/expenses/transactions' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-045 (GET /api/v1/doctors/me/finance/filter-options)', () => {
    api.call('P18-045' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/finance/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-046 (GET /api/v1/doctors/me/handovers)', () => {
    api.call('P18-046' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/handovers' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-047 (GET /api/v1/doctors/me/insights)', () => {
    api.call('P18-047' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/insights' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-048 (GET /api/v1/doctors/me/insights/{insightId})', () => {
    api.call('P18-048' as any, {
      path: { insightId: 'test-insightId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/insights/test-insightId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-049 (POST /api/v1/doctors/me/insights/{insightId}/acknowledge)', () => {
    api.call('P18-049' as any, {
      path: { insightId: 'test-insightId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/insights/test-insightId/acknowledge' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-050 (POST /api/v1/doctors/me/insights/{insightId}/dismiss)', () => {
    api.call('P18-050' as any, {
      path: { insightId: 'test-insightId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/insights/test-insightId/dismiss' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-051 (GET /api/v1/doctors/me/insights/{insightId}/history)', () => {
    api.call('P18-051' as any, {
      path: { insightId: 'test-insightId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/insights/test-insightId/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-052 (POST /api/v1/doctors/me/insights/{insightId}/resolve)', () => {
    api.call('P18-052' as any, {
      path: { insightId: 'test-insightId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/insights/test-insightId/resolve' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-053 (POST /api/v1/doctors/me/practices/{practiceId}/handovers)', () => {
    api.call('P18-053' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/handovers' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-054 (GET /api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId})', () => {
    api.call('P18-054' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/handovers/test-handoverId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-055 (POST /api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId}/acknowledge)', () => {
    api.call('P18-055' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/handovers/test-handoverId/acknowledge' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-056 (POST /api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId}/close)', () => {
    api.call('P18-056' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/handovers/test-handoverId/close' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-057 (GET /api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId}/history)', () => {
    api.call('P18-057' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/practices/test-practiceId/handovers/test-handoverId/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-058 (GET /api/v1/doctors/me/reception-salary-plans)', () => {
    api.call('P18-058' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reception-salary-plans' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-059 (POST /api/v1/doctors/me/reception-salary-plans)', () => {
    api.call('P18-059' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reception-salary-plans' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-060 (GET /api/v1/doctors/me/reception-salary-plans/{id})', () => {
    api.call('P18-060' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reception-salary-plans/test-id' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-061 (PUT /api/v1/doctors/me/reception-salary-plans/{id})', () => {
    api.call('P18-061' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reception-salary-plans/test-id' && r.method === 'PUT',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-062 (POST /api/v1/doctors/me/reception-salary-plans/{id}/end)', () => {
    api.call('P18-062' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reception-salary-plans/test-id/end' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-063 (GET /api/v1/doctors/me/reception-salary-plans/{id}/history)', () => {
    api.call('P18-063' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reception-salary-plans/test-id/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-064 (GET /api/v1/doctors/me/recurring-expense-plans)', () => {
    api.call('P18-064' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-065 (POST /api/v1/doctors/me/recurring-expense-plans)', () => {
    api.call('P18-065' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-066 (GET /api/v1/doctors/me/recurring-expense-plans/{id})', () => {
    api.call('P18-066' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans/test-id' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-067 (PUT /api/v1/doctors/me/recurring-expense-plans/{id})', () => {
    api.call('P18-067' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans/test-id' && r.method === 'PUT',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-068 (POST /api/v1/doctors/me/recurring-expense-plans/{id}/end)', () => {
    api.call('P18-068' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans/test-id/end' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-069 (GET /api/v1/doctors/me/recurring-expense-plans/{id}/history)', () => {
    api.call('P18-069' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans/test-id/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-070 (GET /api/v1/doctors/me/recurring-expense-plans/{id}/obligations)', () => {
    api.call('P18-070' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans/test-id/obligations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-071 (POST /api/v1/doctors/me/recurring-expense-plans/{id}/pause)', () => {
    api.call('P18-071' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans/test-id/pause' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-072 (POST /api/v1/doctors/me/recurring-expense-plans/{id}/resume)', () => {
    api.call('P18-072' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/recurring-expense-plans/test-id/resume' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-073 (GET /api/v1/doctors/me/reports/{reportCode})', () => {
    api.call('P18-073' as any, {
      path: { reportCode: 'test-reportCode' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/test-reportCode' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-074 (GET /api/v1/doctors/me/reports/{reportCode}/drilldown)', () => {
    api.call('P18-074' as any, {
      path: { reportCode: 'test-reportCode' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/test-reportCode/drilldown' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-075 (GET /api/v1/doctors/me/reports/{reportCode}/export)', () => {
    api.call('P18-075' as any, {
      path: { reportCode: 'test-reportCode' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/test-reportCode/export' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush(new Blob(['test-data'], { type: 'application/pdf' }));
  });

  it('should correctly call P18-076 (GET /api/v1/doctors/me/reports/catalog)', () => {
    api.call('P18-076' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/catalog' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-077 (GET /api/v1/doctors/me/reports/patients)', () => {
    api.call('P18-077' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/patients' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-078 (GET /api/v1/doctors/me/reports/practice-comparison)', () => {
    api.call('P18-078' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/practice-comparison' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-079 (GET /api/v1/doctors/me/reports/queue)', () => {
    api.call('P18-079' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/queue' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-080 (GET /api/v1/doctors/me/reports/reservations)', () => {
    api.call('P18-080' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/reports/reservations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-081 (GET /api/v1/doctors/me/salary-obligations)', () => {
    api.call('P18-081' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-obligations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-082 (GET /api/v1/doctors/me/salary-obligations/{id})', () => {
    api.call('P18-082' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-obligations/test-id' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-083 (PATCH /api/v1/doctors/me/salary-obligations/{id})', () => {
    api.call('P18-083' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-obligations/test-id' && r.method === 'PATCH',
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-084 (POST /api/v1/doctors/me/salary-obligations/{id}/cancel)', () => {
    api.call('P18-084' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-obligations/test-id/cancel' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-085 (GET /api/v1/doctors/me/salary-obligations/{id}/history)', () => {
    api.call('P18-085' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-obligations/test-id/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-086 (POST /api/v1/doctors/me/salary-obligations/{id}/settle)', () => {
    api.call('P18-086' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-obligations/test-id/settle' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-087 (GET /api/v1/doctors/me/salary-settlements/{id})', () => {
    api.call('P18-087' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-settlements/test-id' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-088 (GET /api/v1/doctors/me/salary-settlements/{id}/history)', () => {
    api.call('P18-088' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-settlements/test-id/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-089 (GET /api/v1/doctors/me/salary-settlements/{id}/receipt)', () => {
    api.call('P18-089' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-settlements/test-id/receipt' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-090 (POST /api/v1/doctors/me/salary-settlements/{id}/reverse)', () => {
    api.call('P18-090' as any, {
      path: { id: 'test-id' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/doctors/me/salary-settlements/test-id/reverse' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-091 (GET /api/v1/patients/me/dashboard/capabilities)', () => {
    api.call('P18-091' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/patients/me/dashboard/capabilities' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-092 (GET /api/v1/patients/me/dashboard/overview)', () => {
    api.call('P18-092' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/patients/me/dashboard/overview' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-093 (GET /api/v1/reception/attention)', () => {
    api.call('P18-093' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/attention' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-094 (GET /api/v1/reception/dashboard/filter-options)', () => {
    api.call('P18-094' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/dashboard/filter-options' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-095 (GET /api/v1/reception/dashboard/overview)', () => {
    api.call('P18-095' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/dashboard/overview' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-096 (GET /api/v1/reception/practices/{practiceId}/handovers)', () => {
    api.call('P18-096' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/handovers' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-097 (POST /api/v1/reception/practices/{practiceId}/handovers)', () => {
    api.call('P18-097' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/handovers' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-098 (GET /api/v1/reception/practices/{practiceId}/handovers/{handoverId})', () => {
    api.call('P18-098' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/handovers/test-handoverId' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-099 (POST /api/v1/reception/practices/{practiceId}/handovers/{handoverId}/acknowledge)', () => {
    api.call('P18-099' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/handovers/test-handoverId/acknowledge' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-100 (POST /api/v1/reception/practices/{practiceId}/handovers/{handoverId}/annotations)', () => {
    api.call('P18-100' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/handovers/test-handoverId/annotations' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-101 (POST /api/v1/reception/practices/{practiceId}/handovers/{handoverId}/close)', () => {
    api.call('P18-101' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: ({} as any),
      idempotencyKey: 'idem-key-123',
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/handovers/test-handoverId/close' && r.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('testQuery')).toBe('value');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');
    req.flush({ success: true });
  });

  it('should correctly call P18-102 (GET /api/v1/reception/practices/{practiceId}/handovers/{handoverId}/history)', () => {
    api.call('P18-102' as any, {
      path: { practiceId: 'test-practiceId', handoverId: 'test-handoverId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/handovers/test-handoverId/history' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-103 (GET /api/v1/reception/practices/{practiceId}/worklist)', () => {
    api.call('P18-103' as any, {
      path: { practiceId: 'test-practiceId' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/practices/test-practiceId/worklist' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-104 (GET /api/v1/reception/reports/{reportCode}/drilldown)', () => {
    api.call('P18-104' as any, {
      path: { reportCode: 'test-reportCode' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/reports/test-reportCode/drilldown' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-105 (GET /api/v1/reception/reports/{reportCode}/export)', () => {
    api.call('P18-105' as any, {
      path: { reportCode: 'test-reportCode' },
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/reports/test-reportCode/export' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush(new Blob(['test-data'], { type: 'application/pdf' }));
  });

  it('should correctly call P18-106 (GET /api/v1/reception/reports/activity)', () => {
    api.call('P18-106' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/reports/activity' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-107 (GET /api/v1/reception/reports/catalog)', () => {
    api.call('P18-107' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/reports/catalog' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-108 (GET /api/v1/reception/reports/queue)', () => {
    api.call('P18-108' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/reports/queue' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });

  it('should correctly call P18-109 (GET /api/v1/reception/reports/reservations)', () => {
    api.call('P18-109' as any, {
      path: undefined,
      query: { testQuery: 'value' },
      body: undefined,
      idempotencyKey: undefined,
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '/api/v1/reception/reports/reservations' && r.method === 'GET',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('testQuery')).toBe('value');
    
    req.flush({ success: true });
  });
});
