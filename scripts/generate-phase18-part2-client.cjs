const fs = require('fs');

const openApi = require('C:/tmp/wasla-phase18-reference/docs/phase18/part2-openapi.json');
const schemas = new Set(Object.keys(openApi.components.schemas));

const JIRA_MAP = {
  '/api/v1/practices/{practiceId}/tickets/{ticketId}': {
    key: 'WAS-546',
    endpointId: 'P18.2-01',
    summary: '[FE API 11.5.1] [MODIFIED — Phase 18 Part Two] Practice Ticket Details — Archive-Aware',
    controller: 'PracticeTickets',
    action: 'GetTicketDetails',
    roles: ['Doctor', 'Reception'],
  },
  '/api/v1/tickets/mine/{ticketId}': {
    key: 'WAS-547',
    endpointId: 'P18.2-02',
    summary: '[FE API 11.15.1] [MODIFIED — Phase 18 Part Two] My Ticket Details — Archive-Aware',
    controller: 'PatientTickets',
    action: 'GetMyTicketDetails',
    roles: ['Patient'],
  },
  '/api/v1/reception/practices/{practiceId}/reservations/{reservationId}': {
    key: 'WAS-548',
    endpointId: 'P18.2-03',
    summary: '[FE API 10.16.1] [MODIFIED — Phase 18 Part Two] Reception Reservation Details — Archive-Aware',
    controller: 'ReceptionReservations',
    action: 'GetReceptionReservationDetails',
    roles: ['Reception'],
  },
  '/api/v1/doctors/me/practices/{practiceId}/reservations/{reservationId}': {
    key: 'WAS-549',
    endpointId: 'P18.2-04',
    summary: '[FE API 10.24.1] [MODIFIED — Phase 18 Part Two] Doctor Reservation Details — Archive-Aware',
    controller: 'DoctorReservations',
    action: 'GetDoctorReservationDetails',
    roles: ['Doctor'],
  },
  '/api/v1/reservations/mine/{reservationId}': {
    key: 'WAS-550',
    endpointId: 'P18.2-05',
    summary: '[FE API 10.05.1] [MODIFIED — Phase 18 Part Two] My Reservation Details — Archive-Aware',
    controller: 'PatientReservations',
    action: 'GetMyReservationDetails',
    roles: ['Patient'],
  },
  '/api/v1/admin/reservations/{reservationId}': {
    key: 'WAS-551',
    endpointId: 'P18.2-06',
    summary: '[FE API 10.30.1] [MODIFIED — Phase 18 Part Two] Admin Reservation Details — Safe Archived Projection',
    controller: 'AdminReservations',
    action: 'GetAdminReservationDetails',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/doctors/me/practices/{practiceId}/archives/tickets': {
    key: 'WAS-512',
    endpointId: 'P18.2-07',
    summary: '[FE API 18.110] [ADDED] Doctor Archive Tickets',
    controller: 'Phase18PartTwo',
    action: 'GetDoctorArchivedTickets',
    roles: ['Doctor'],
  },
  '/api/v1/doctors/me/practices/{practiceId}/archives/reservations': {
    key: 'WAS-513',
    endpointId: 'P18.2-08',
    summary: '[FE API 18.111] [ADDED] Doctor Archived Reservations',
    controller: 'Phase18PartTwo',
    action: 'GetDoctorArchivedReservations',
    roles: ['Doctor'],
  },
  '/api/v1/reception/practices/{practiceId}/archives/tickets': {
    key: 'WAS-514',
    endpointId: 'P18.2-09',
    summary: '[FE API 18.112] [ADDED] Reception Archived Tickets',
    controller: 'Phase18PartTwo',
    action: 'GetReceptionArchivedTickets',
    roles: ['Reception'],
  },
  '/api/v1/reception/practices/{practiceId}/archives/reservations': {
    key: 'WAS-515',
    endpointId: 'P18.2-10',
    summary: '[FE API 18.113] [ADDED] Reception Archived Reservations',
    controller: 'Phase18PartTwo',
    action: 'GetReceptionArchivedReservations',
    roles: ['Reception'],
  },
  '/api/v1/tickets/mine/archived': {
    key: 'WAS-516',
    endpointId: 'P18.2-11',
    summary: '[FE API 18.114] [ADDED] Patient Archived Tickets',
    controller: 'Phase18PartTwo',
    action: 'GetPatientArchivedTickets',
    roles: ['Patient'],
  },
  '/api/v1/reservations/mine/archived': {
    key: 'WAS-517',
    endpointId: 'P18.2-12',
    summary: '[FE API 18.115] [ADDED] Patient Archived Reservations',
    controller: 'Phase18PartTwo',
    action: 'GetPatientArchivedReservations',
    roles: ['Patient'],
  },
  '/api/v1/admin/archives/tickets': {
    key: 'WAS-518',
    endpointId: 'P18.2-13',
    summary: '[FE API 18.116] [ADDED] Platform Archived Tickets',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformArchivedTickets',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/reservations': {
    key: 'WAS-519',
    endpointId: 'P18.2-14',
    summary: '[FE API 18.117] [ADDED] Platform Archived Reservations',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformArchivedReservations',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/tickets/{ticketId}': {
    key: 'WAS-520',
    endpointId: 'P18.2-15',
    summary: '[FE API 18.118] [ADDED] Platform Archived Ticket Details',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformArchivedTicketDetails',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/health': {
    key: 'WAS-521',
    endpointId: 'P18.2-16',
    summary: '[FE API 18.119] [ADDED] Archive Worker Health',
    controller: 'Phase18PartTwo',
    action: 'GetArchiveOperationsHealth',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/runs': {
    key: 'WAS-522',
    endpointId: 'P18.2-17',
    summary: '[FE API 18.120] [ADDED] Archive Runs List',
    controller: 'Phase18PartTwo',
    action: 'GetArchiveOperationsRuns',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/runs/{runId}': {
    key: 'WAS-523',
    endpointId: 'P18.2-18',
    summary: '[FE API 18.121] [ADDED] Archive Run Details',
    controller: 'Phase18PartTwo',
    action: 'GetArchiveOperationsRunDetails',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/exceptions': {
    key: 'WAS-524',
    endpointId: 'P18.2-19',
    summary: '[FE API 18.122] [ADDED] Archive Integrity Exceptions',
    controller: 'Phase18PartTwo',
    action: 'GetArchiveOperationsExceptions',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/exceptions/{exceptionId}': {
    key: 'WAS-525',
    endpointId: 'P18.2-20',
    summary: '[FE API 18.123] [ADDED] Archive Exception Details',
    controller: 'Phase18PartTwo',
    action: 'GetArchiveOperationsExceptionDetails',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/pause': {
    key: 'WAS-526',
    endpointId: 'P18.2-21',
    summary: '[FE API 18.124] [ADDED] Pause Archive Worker',
    controller: 'Phase18PartTwo',
    action: 'PauseArchiveWorker',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/resume': {
    key: 'WAS-527',
    endpointId: 'P18.2-22',
    summary: '[FE API 18.125] [ADDED] Resume Archive Worker',
    controller: 'Phase18PartTwo',
    action: 'ResumeArchiveWorker',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/doctors/me/practices/{practiceId}/audit/events': {
    key: 'WAS-528',
    endpointId: 'P18.2-23',
    summary: '[FE API 18.126] [ADDED] Doctor Audit Events',
    controller: 'Phase18PartTwo',
    action: 'GetDoctorAuditEvents',
    roles: ['Doctor'],
  },
  '/api/v1/doctors/me/practices/{practiceId}/audit/events/{eventKey}': {
    key: 'WAS-529',
    endpointId: 'P18.2-24',
    summary: '[FE API 18.127] [ADDED] Doctor Audit Event Detail',
    controller: 'Phase18PartTwo',
    action: 'GetDoctorAuditEventDetail',
    roles: ['Doctor'],
  },
  '/api/v1/doctors/me/practices/{practiceId}/audit/sensitive-access': {
    key: 'WAS-530',
    endpointId: 'P18.2-25',
    summary: '[FE API 18.128] [ADDED] Doctor Sensitive-Access Metadata',
    controller: 'Phase18PartTwo',
    action: 'GetDoctorSensitiveAccessEvents',
    roles: ['Doctor'],
  },
  '/api/v1/reception/practices/{practiceId}/audit/my-activity': {
    key: 'WAS-531',
    endpointId: 'P18.2-26',
    summary: '[FE API 18.129] [ADDED] Reception My Audit Activity',
    controller: 'Phase18PartTwo',
    action: 'GetReceptionMyAuditActivity',
    roles: ['Reception'],
  },
  '/api/v1/reception/practices/{practiceId}/audit/my-activity/{eventKey}': {
    key: 'WAS-532',
    endpointId: 'P18.2-27',
    summary: '[FE API 18.130] [ADDED] Reception My Audit Detail',
    controller: 'Phase18PartTwo',
    action: 'GetReceptionMyAuditEventDetail',
    roles: ['Reception'],
  },
  '/api/v1/admin/audit/events': {
    key: 'WAS-533',
    endpointId: 'P18.2-28',
    summary: '[FE API 18.131] [ADDED] Platform Audit Events',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformAuditEvents',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/audit/events/{eventKey}': {
    key: 'WAS-534',
    endpointId: 'P18.2-29',
    summary: '[FE API 18.132] [ADDED] Platform Audit Event Detail',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformAuditEventDetail',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/audit/sensitive-access/search': {
    key: 'WAS-535',
    endpointId: 'P18.2-30',
    summary: '[FE API 18.133] [ADDED] Restricted Audit Metadata Search',
    controller: 'Phase18PartTwo',
    action: 'SearchSensitiveAccessAuditEvents',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/reservations/{reservationId}': {
    key: 'WAS-536',
    endpointId: 'P18.2-31',
    summary: '[FE API 18.134] [ADDED] Platform Archived Reservation Detail',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformArchivedReservationDetails',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/archives/metadata': {
    key: 'WAS-537',
    endpointId: 'P18.2-32',
    summary: '[FE API 18.135] [ADDED] Archive Status & Filter Metadata',
    controller: 'Phase18PartTwo',
    action: 'GetArchiveMetadata',
    roles: ['Doctor', 'Reception', 'SuperAdmin', 'TenantAdmin', 'Patient'],
  },
  '/api/v1/doctors/me/archives/practices/options': {
    key: 'WAS-538',
    endpointId: 'P18.2-33',
    summary: '[FE API 18.136] [ADDED] Doctor Archive Practice Options',
    controller: 'Phase18PartTwo',
    action: 'GetDoctorArchivedPracticeOptions',
    roles: ['Doctor'],
  },
  '/api/v1/admin/archives/practices/options': {
    key: 'WAS-539',
    endpointId: 'P18.2-34',
    summary: '[FE API 18.137] [ADDED] Platform Archive Practice Options',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformArchivedPracticeOptions',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/admin/archives/operations/filter-options': {
    key: 'WAS-540',
    endpointId: 'P18.2-35',
    summary: '[FE API 18.138] [ADDED] Archive Operations Filter Options',
    controller: 'Phase18PartTwo',
    action: 'GetArchiveOperationsFilterOptions',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/doctors/me/practices/{practiceId}/audit/filter-options': {
    key: 'WAS-541',
    endpointId: 'P18.2-36',
    summary: '[FE API 18.139] [ADDED] Doctor Audit Filter Options',
    controller: 'Phase18PartTwo',
    action: 'GetDoctorAuditFilterOptions',
    roles: ['Doctor'],
  },
  '/api/v1/reception/practices/{practiceId}/audit/filter-options': {
    key: 'WAS-542',
    endpointId: 'P18.2-37',
    summary: '[FE API 18.140] [ADDED] Reception Audit Filter Options',
    controller: 'Phase18PartTwo',
    action: 'GetReceptionAuditFilterOptions',
    roles: ['Reception'],
  },
  '/api/v1/admin/audit/filter-options': {
    key: 'WAS-543',
    endpointId: 'P18.2-38',
    summary: '[FE API 18.141] [ADDED] Platform Audit Filter Options',
    controller: 'Phase18PartTwo',
    action: 'GetPlatformAuditFilterOptions',
    roles: ['SuperAdmin', 'TenantAdmin'],
  },
  '/api/v1/reservations/mine/archived/patients/options': {
    key: 'WAS-544',
    endpointId: 'P18.2-39',
    summary: '[FE API 18.142] [ADDED] Patient Archived Reservation Subject Options',
    controller: 'Phase18PartTwo',
    action: 'GetPatientArchivedReservationSubjectOptions',
    roles: ['Patient'],
  },
  '/api/v1/reception/archives/practices/options': {
    key: 'WAS-545',
    endpointId: 'P18.2-40',
    summary: '[FE API 18.143] [ADDED] Reception Archive Practice Options',
    controller: 'Phase18PartTwo',
    action: 'GetReceptionArchivedPracticeOptions',
    roles: ['Reception'],
  },
};

const entries = Object.entries(openApi.paths).map(([route, pathItem]) => {
  const method = Object.keys(pathItem)[0].toUpperCase();
  const op = pathItem[method.toLowerCase()];
  const jira = JIRA_MAP[route] || {
    key: 'UNKNOWN',
    endpointId: 'P18.2-XX',
    summary: op.summary || route,
    controller: op.tags?.[0] || 'Phase18PartTwo',
    action: 'Action',
    roles: [],
  };

  const parameters = op.parameters || [];
  const pathParams = parameters.filter((p) => p.in === 'path').map((p) => p.name);
  const queryParams = parameters.filter((p) => p.in === 'query').map((p) => p.name);
  const requiresIdemp = parameters.some((p) => p.name === 'Idempotency-Key');

  return {
    key: jira.key,
    endpointId: jira.endpointId,
    summary: jira.summary,
    route,
    method,
    controller: jira.controller,
    action: jira.action,
    roles: jira.roles,
    pathParams,
    queryParams,
    requiresIdemp,
    requestBody: op.requestBody ? true : false,
    op,
  };
});

// 1. Write docs/phase18-part2-jira-todo.json
fs.writeFileSync('docs/phase18-part2-jira-todo.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`Generated docs/phase18-part2-jira-todo.json with ${entries.length} items`);

// 2. Generate TypeScript API client
const resolveResponseType = (item) => {
  const res200 = item.op.responses?.['200'];
  const content = res200?.content;
  if (!content) return 'void';
  const schemaObj = content['application/json']?.schema ?? Object.values(content)[0]?.schema;
  if (!schemaObj) return 'unknown';

  if (schemaObj['$ref']) {
    const ref = schemaObj['$ref'].split('/').pop();
    if (schemas.has(ref)) return `components['schemas']['${ref}']`;
  }
  if (schemaObj.type === 'array' && schemaObj.items?.['$ref']) {
    const itemRef = schemaObj.items['$ref'].split('/').pop();
    return `components['schemas']['${itemRef}'][]`;
  }
  return 'unknown';
};

const resolveBodyType = (item) => {
  if (!item.requestBody) return 'never';
  const content = item.op.requestBody?.content;
  if (!content) return 'never';
  const schemaObj = content['application/json']?.schema ?? Object.values(content)[0]?.schema;
  if (!schemaObj) return 'never';
  const ref = schemaObj['$ref']?.split('/').pop();
  if (ref && schemas.has(ref)) return `components['schemas']['${ref}']`;
  return 'unknown';
};

const operations = entries
  .map(
    (item) => `  '${item.endpointId}': {
    method: '${item.method}',
    route: '${item.route}',
    pathParameters: [${item.pathParams.map((p) => `'${p}'`).join(', ')}] as const,
    requiresIdempotencyKey: ${item.requiresIdemp},
  },`,
  )
  .join('\n');

const responseTypes = entries
  .map((item) => `  '${item.endpointId}': ${resolveResponseType(item)};`)
  .join('\n');

const bodyTypes = entries
  .map((item) => `  '${item.endpointId}': ${resolveBodyType(item)};`)
  .join('\n');

const clientCode = `import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { components } from './phase18-part2-openapi.types';

export type Phase18Part2QueryValue = string | number | boolean | null | undefined;
export type Phase18Part2Query = Readonly<Record<string, Phase18Part2QueryValue>>;

export interface Phase18Part2Call {
  readonly path?: Readonly<Record<string, string>>;
  readonly query?: Phase18Part2Query;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}

export const PHASE18_PART2_OPERATIONS = {
${operations}
} as const;

export type Phase18Part2Endpoint = keyof typeof PHASE18_PART2_OPERATIONS;

export type Phase18Part2Responses = {
${responseTypes}
};

export type Phase18Part2Bodies = {
${bodyTypes}
};

export type Phase18Part2Request<T extends Phase18Part2Endpoint> = Omit<Phase18Part2Call, 'body'> &
  (Phase18Part2Bodies[T] extends never ? { readonly body?: never } : { readonly body: Phase18Part2Bodies[T] });

@Injectable({ providedIn: 'root' })
export class Phase18Part2Api {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl;

  call<T extends Phase18Part2Endpoint>(
    endpoint: T,
    request: Phase18Part2Request<T>,
  ): Observable<Phase18Part2Responses[T]> {
    const operation = PHASE18_PART2_OPERATIONS[endpoint];
    const url = this.url(operation.route, operation.pathParameters as readonly string[], request.path);
    const headers = operation.requiresIdempotencyKey
      ? this.idempotencyHeaders(request.idempotencyKey)
      : undefined;

    const httpOptions = { params: this.params(request.query), headers };

    switch (operation.method) {
      case 'GET':
        return this.http.get<Phase18Part2Responses[T]>(url, httpOptions);
      case 'POST':
        return this.http.post<Phase18Part2Responses[T]>(url, (request as any).body, httpOptions);
      case 'PUT':
        return this.http.put<Phase18Part2Responses[T]>(url, (request as any).body, httpOptions);
      case 'PATCH':
        return this.http.patch<Phase18Part2Responses[T]>(url, (request as any).body, httpOptions);
    }
  }

  private url(
    route: string,
    parameters: readonly string[],
    values: Readonly<Record<string, string>> | undefined,
  ): string {
    const resolved = parameters.reduce((value, parameter) => {
      const identifier = values?.[parameter];
      if (!identifier?.trim()) throw new Error('Missing path parameter: ' + parameter);
      return value.replace('{' + parameter + '}', encodeURIComponent(identifier));
    }, route);
    return this.root + resolved;
  }

  private params(query: Phase18Part2Query | undefined): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return params;
  }

  private idempotencyHeaders(key: string | undefined): HttpHeaders {
    if (!key?.trim()) throw new Error('Idempotency key required');
    return new HttpHeaders({ 'Idempotency-Key': key });
  }
}
`;

fs.writeFileSync('src/app/domains/phase18/phase18-part2-api.ts', clientCode);
console.log('Successfully generated src/app/domains/phase18/phase18-part2-api.ts');

// 3. Generate Unit Spec
const testCases = entries
  .map((item) => {
    const pathObj = item.pathParams.length
      ? '{ ' + item.pathParams.map((p) => `${p}: 'test-${p}'`).join(', ') + ' }'
      : 'undefined';
    const bodyVal = item.requestBody ? '({} as any)' : 'undefined';
    const idempVal = item.requiresIdemp ? "'idem-key-123'" : 'undefined';

    let expectedUrl = item.route;
    item.pathParams.forEach((p) => {
      expectedUrl = expectedUrl.replace('{' + p + '}', 'test-' + p);
    });

    const idempCheck = item.requiresIdemp
      ? `expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');`
      : '';

    return `  it('should correctly call ${item.endpointId} (${item.key} - ${item.method} ${item.route})', () => {
    api.call('${item.endpointId}' as any, {
      path: ${pathObj},
      query: { testQuery: 'value' },
      body: ${bodyVal},
      idempotencyKey: ${idempVal},
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '${expectedUrl}' && r.method === '${item.method}',
    );
    expect(req.request.method).toBe('${item.method}');
    expect(req.request.params.get('testQuery')).toBe('value');
    ${idempCheck}
    req.flush({ success: true });
  });`;
  })
  .join('\n\n');

const specCode = `import { provideHttpClient } from '@angular/common/http';
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

${testCases}
});
`;

fs.writeFileSync('src/app/domains/phase18/phase18-part2-api.spec.ts', specCode);
console.log('Successfully generated src/app/domains/phase18/phase18-part2-api.spec.ts with 40 test cases');
