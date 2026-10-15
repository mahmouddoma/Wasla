import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { components } from './phase18-part2-openapi.types';

export type Phase18Part2QueryValue = string | number | boolean | null | undefined;
export type Phase18Part2Query = Readonly<Record<string, Phase18Part2QueryValue>>;

export interface Phase18Part2Call {
  readonly path?: Readonly<Record<string, string>>;
  readonly pathParams?: Readonly<Record<string, string>>;
  readonly query?: Phase18Part2Query;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}

export const PHASE18_PART2_OPERATIONS = {
  'P18.2-01': {
    method: 'GET',
    route: '/api/v1/practices/{practiceId}/tickets/{ticketId}',
    pathParameters: ['practiceId', 'ticketId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-02': {
    method: 'GET',
    route: '/api/v1/tickets/mine/{ticketId}',
    pathParameters: ['ticketId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-03': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/reservations/{reservationId}',
    pathParameters: ['practiceId', 'reservationId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-04': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/reservations/{reservationId}',
    pathParameters: ['practiceId', 'reservationId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-05': {
    method: 'GET',
    route: '/api/v1/reservations/mine/{reservationId}',
    pathParameters: ['reservationId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-06': {
    method: 'GET',
    route: '/api/v1/admin/reservations/{reservationId}',
    pathParameters: ['reservationId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-07': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/archives/tickets',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-08': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/archives/reservations',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-09': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/archives/tickets',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-10': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/archives/reservations',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-11': {
    method: 'GET',
    route: '/api/v1/tickets/mine/archived',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-12': {
    method: 'GET',
    route: '/api/v1/reservations/mine/archived',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-13': {
    method: 'GET',
    route: '/api/v1/admin/archives/tickets',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-14': {
    method: 'GET',
    route: '/api/v1/admin/archives/reservations',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-15': {
    method: 'GET',
    route: '/api/v1/admin/archives/tickets/{ticketId}',
    pathParameters: ['ticketId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-16': {
    method: 'GET',
    route: '/api/v1/admin/archives/operations/health',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-17': {
    method: 'GET',
    route: '/api/v1/admin/archives/operations/runs',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-18': {
    method: 'GET',
    route: '/api/v1/admin/archives/operations/runs/{runId}',
    pathParameters: ['runId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-19': {
    method: 'GET',
    route: '/api/v1/admin/archives/operations/exceptions',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-20': {
    method: 'GET',
    route: '/api/v1/admin/archives/operations/exceptions/{exceptionId}',
    pathParameters: ['exceptionId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-21': {
    method: 'POST',
    route: '/api/v1/admin/archives/operations/pause',
    pathParameters: [] as const,
    requiresIdempotencyKey: true,
  },
  'P18.2-22': {
    method: 'POST',
    route: '/api/v1/admin/archives/operations/resume',
    pathParameters: [] as const,
    requiresIdempotencyKey: true,
  },
  'P18.2-23': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/audit/events',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-24': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/audit/events/{eventKey}',
    pathParameters: ['practiceId', 'eventKey'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-25': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/audit/sensitive-access',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-26': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/audit/my-activity',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-27': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/audit/my-activity/{eventKey}',
    pathParameters: ['practiceId', 'eventKey'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-28': {
    method: 'GET',
    route: '/api/v1/admin/audit/events',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-29': {
    method: 'GET',
    route: '/api/v1/admin/audit/events/{eventKey}',
    pathParameters: ['eventKey'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-30': {
    method: 'POST',
    route: '/api/v1/admin/audit/sensitive-access/search',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-31': {
    method: 'GET',
    route: '/api/v1/admin/archives/reservations/{reservationId}',
    pathParameters: ['reservationId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-32': {
    method: 'GET',
    route: '/api/v1/archives/metadata',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-33': {
    method: 'GET',
    route: '/api/v1/doctors/me/archives/practices/options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-34': {
    method: 'GET',
    route: '/api/v1/admin/archives/practices/options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-35': {
    method: 'GET',
    route: '/api/v1/admin/archives/operations/filter-options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-36': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/audit/filter-options',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-37': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/audit/filter-options',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-38': {
    method: 'GET',
    route: '/api/v1/admin/audit/filter-options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-39': {
    method: 'GET',
    route: '/api/v1/reservations/mine/archived/patients/options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18.2-40': {
    method: 'GET',
    route: '/api/v1/reception/archives/practices/options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
} as const;

export type Phase18Part2Endpoint = keyof typeof PHASE18_PART2_OPERATIONS;

export type Phase18Part2Responses = {
  'P18.2-01': components['schemas']['TicketDetailsResponse'];
  'P18.2-02': components['schemas']['TicketDetailsResponse'];
  'P18.2-03': components['schemas']['ReservationDetailsResponse'];
  'P18.2-04': components['schemas']['ReservationDetailsResponse'];
  'P18.2-05': components['schemas']['ReservationDetailsResponse'];
  'P18.2-06': unknown;
  'P18.2-07': components['schemas']['ArchivedTicketItemArchivePage'];
  'P18.2-08': components['schemas']['ArchivedReservationItemArchivePage'];
  'P18.2-09': components['schemas']['ArchivedTicketItemArchivePage'];
  'P18.2-10': components['schemas']['ArchivedReservationItemArchivePage'];
  'P18.2-11': components['schemas']['ArchivedTicketItemArchivePage'];
  'P18.2-12': components['schemas']['ArchivedReservationItemArchivePage'];
  'P18.2-13': components['schemas']['PlatformTicketMetadataArchivePage'];
  'P18.2-14': components['schemas']['PlatformReservationMetadataArchivePage'];
  'P18.2-15': components['schemas']['PlatformTicketMetadata'];
  'P18.2-16': components['schemas']['ArchiveHealth'];
  'P18.2-17': components['schemas']['ArchiveRunItemArchivePage'];
  'P18.2-18': components['schemas']['ArchiveRunItem'];
  'P18.2-19': components['schemas']['ArchiveExceptionItemArchivePage'];
  'P18.2-20': components['schemas']['ArchiveExceptionItem'];
  'P18.2-21': components['schemas']['ArchiveControlResponse'];
  'P18.2-22': components['schemas']['ArchiveControlResponse'];
  'P18.2-23': components['schemas']['SafeAuditEventArchivePage'];
  'P18.2-24': components['schemas']['SafeAuditEvent'];
  'P18.2-25': components['schemas']['SafeAuditEventArchivePage'];
  'P18.2-26': components['schemas']['SafeAuditEventArchivePage'];
  'P18.2-27': components['schemas']['SafeAuditEvent'];
  'P18.2-28': components['schemas']['SafeAuditEventArchivePage'];
  'P18.2-29': components['schemas']['SafeAuditEvent'];
  'P18.2-30': components['schemas']['SafeAuditEventArchivePage'];
  'P18.2-31': components['schemas']['PlatformReservationMetadata'];
  'P18.2-32': components['schemas']['ArchiveMetadata'];
  'P18.2-33': components['schemas']['PracticeOptionOptionsPage'];
  'P18.2-34': components['schemas']['PracticeOptionOptionsPage'];
  'P18.2-35': components['schemas']['ArchiveOperationsOptions'];
  'P18.2-36': components['schemas']['AuditOptions'];
  'P18.2-37': components['schemas']['AuditOptions'];
  'P18.2-38': components['schemas']['AuditOptions'];
  'P18.2-39': components['schemas']['ArchivePatientOptionOptionsPage'];
  'P18.2-40': components['schemas']['PracticeOptionOptionsPage'];
};

export type Phase18Part2Bodies = {
  'P18.2-01': never;
  'P18.2-02': never;
  'P18.2-03': never;
  'P18.2-04': never;
  'P18.2-05': never;
  'P18.2-06': never;
  'P18.2-07': never;
  'P18.2-08': never;
  'P18.2-09': never;
  'P18.2-10': never;
  'P18.2-11': never;
  'P18.2-12': never;
  'P18.2-13': never;
  'P18.2-14': never;
  'P18.2-15': never;
  'P18.2-16': never;
  'P18.2-17': never;
  'P18.2-18': never;
  'P18.2-19': never;
  'P18.2-20': never;
  'P18.2-21': components['schemas']['ArchiveControlBody'];
  'P18.2-22': components['schemas']['ArchiveControlBody'];
  'P18.2-23': never;
  'P18.2-24': never;
  'P18.2-25': never;
  'P18.2-26': never;
  'P18.2-27': never;
  'P18.2-28': never;
  'P18.2-29': never;
  'P18.2-30': components['schemas']['RestrictedAuditSearch'];
  'P18.2-31': never;
  'P18.2-32': never;
  'P18.2-33': never;
  'P18.2-34': never;
  'P18.2-35': never;
  'P18.2-36': never;
  'P18.2-37': never;
  'P18.2-38': never;
  'P18.2-39': never;
  'P18.2-40': never;
};

export type Phase18Part2Request<T extends Phase18Part2Endpoint> = Omit<Phase18Part2Call, 'body'> &
  (Phase18Part2Bodies[T] extends never
    ? { readonly body?: never }
    : { readonly body: Phase18Part2Bodies[T] });

@Injectable({ providedIn: 'root' })
export class Phase18Part2Api {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl;

  call<T extends Phase18Part2Endpoint>(
    endpoint: T,
    request: Phase18Part2Request<T> = {} as Phase18Part2Request<T>,
  ): Observable<Phase18Part2Responses[T]> {
    const operation = PHASE18_PART2_OPERATIONS[endpoint];
    const pathValues = request.pathParams ?? request.path;
    const url = this.url(
      operation.route,
      operation.pathParameters as readonly string[],
      pathValues,
    );
    const headers = operation.requiresIdempotencyKey
      ? this.idempotencyHeaders(request.idempotencyKey)
      : undefined;

    const httpOptions = { params: this.params(request.query), headers };

    switch (operation.method as string) {
      case 'GET':
        return this.http.get<Phase18Part2Responses[T]>(url, httpOptions);
      case 'POST':
        return this.http.post<Phase18Part2Responses[T]>(url, (request as any).body, httpOptions);
      case 'PUT':
        return this.http.put<Phase18Part2Responses[T]>(url, (request as any).body, httpOptions);
      case 'PATCH':
        return this.http.patch<Phase18Part2Responses[T]>(url, (request as any).body, httpOptions);
      default:
        throw new Error('Unsupported HTTP method: ' + operation.method);
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
      if (value !== undefined && value !== null && value !== '')
        params = params.set(key, String(value));
    }
    return params;
  }

  private idempotencyHeaders(key: string | undefined): HttpHeaders {
    if (!key?.trim()) throw new Error('Idempotency key required');
    return new HttpHeaders({ 'Idempotency-Key': key });
  }
}
