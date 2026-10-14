const fs = require('fs');

const manifest = require('C:/tmp/wasla-phase18-reference/docs/phase18/part1-endpoint-manifest.json');
const openApi = require('C:/tmp/wasla-phase18-reference/docs/phase18/part1-openapi.json');
const schemas = new Set(Object.keys(openApi.components.schemas));

const resolveResponseType = (endpoint) => {
  const op = openApi.paths[endpoint.route][endpoint.method.toLowerCase()];
  const res200 = op.responses['200'];
  const content = res200 ? res200.content : null;
  if (!content) return 'void';

  if (
    content['application/pdf'] ||
    content['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  ) {
    return 'Blob';
  }

  const schemaObj =
    content['application/json']?.schema ?? (content ? Object.values(content)[0]?.schema : null);
  if (!schemaObj) return 'unknown';

  if (schemaObj.type === 'array' && schemaObj.items && schemaObj.items['$ref']) {
    const itemRef = schemaObj.items['$ref'].split('/').pop();
    return `components['schemas']['${itemRef}'][]`;
  }

  if (schemaObj['$ref']) {
    const ref = schemaObj['$ref'].split('/').pop();
    if (schemas.has(ref)) {
      return `components['schemas']['${ref}']`;
    }
  }

  // Handle ReportPage`1[[...]]
  const rawType = endpoint.responses?.[0]?.type || '';
  if (rawType.includes('ReportPage`1[[')) {
    const inner = rawType.split('[[').pop().split(',')[0].split('.').pop();
    const candidate = `${inner}ReportPage`;
    if (schemas.has(candidate)) {
      return `components['schemas']['${candidate}']`;
    }
  }

  const simple = rawType.split('.').pop().replace(/`1.*/, '');
  if (schemas.has(simple)) {
    return `components['schemas']['${simple}']`;
  }

  return 'unknown';
};

const resolveBodyType = (endpoint) => {
  const op = openApi.paths[endpoint.route][endpoint.method.toLowerCase()];
  const bodyContent = op.requestBody?.content;
  if (!bodyContent) return 'never';

  const schemaObj =
    bodyContent['application/json']?.schema ?? Object.values(bodyContent)[0]?.schema;
  if (!schemaObj) return 'never';

  const ref = schemaObj['$ref']?.split('/').pop();
  if (ref && schemas.has(ref)) {
    return `components['schemas']['${ref}']`;
  }

  return 'unknown';
};

const pathParameters = (endpoint) =>
  endpoint.parameters.filter((parameter) => parameter.source === 'Path').map((p) => p.Name);

const operations = manifest
  .map(
    (endpoint) => `  '${endpoint.endpointId}': {
    method: '${endpoint.method}',
    route: '${endpoint.route}',
    pathParameters: [${pathParameters(endpoint).map((name) => `'${name}'`).join(', ')}] as const,
    requiresIdempotencyKey: ${endpoint.parameters.some((parameter) => parameter.Name === 'Idempotency-Key')},
  },`,
  )
  .join('\n');

const responseTypes = manifest
  .map((endpoint) => `  '${endpoint.endpointId}': ${resolveResponseType(endpoint)};`)
  .join('\n');

const bodyTypes = manifest
  .map((endpoint) => `  '${endpoint.endpointId}': ${resolveBodyType(endpoint)};`)
  .join('\n');

const output = `import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { components } from './phase18-openapi.types';

export type Phase18QueryValue = string | number | boolean | null | undefined;
export type Phase18Query = Readonly<Record<string, Phase18QueryValue>>;

export interface Phase18Call {
  readonly path?: Readonly<Record<string, string>>;
  readonly query?: Phase18Query;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}

export const PHASE18_OPERATIONS = {
${operations}
} as const;

export type Phase18Endpoint = keyof typeof PHASE18_OPERATIONS;

export type Phase18Responses = {
${responseTypes}
};

export type Phase18Bodies = {
${bodyTypes}
};

export type Phase18Request<T extends Phase18Endpoint> = Omit<Phase18Call, 'body'> &
  (Phase18Bodies[T] extends never ? { readonly body?: never } : { readonly body: Phase18Bodies[T] });

@Injectable({ providedIn: 'root' })
export class Phase18Api {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl;

  call<T extends Phase18Endpoint>(
    endpoint: T,
    request: Phase18Request<T>,
  ): Observable<Phase18Responses[T]> {
    const operation = PHASE18_OPERATIONS[endpoint];
    const url = this.url(operation.route, operation.pathParameters as readonly string[], request.path);
    const headers = operation.requiresIdempotencyKey
      ? this.idempotencyHeaders(request.idempotencyKey)
      : undefined;
    if (operation.route.endsWith('/export')) {
      return this.http.get(url, {
        params: this.params(request.query),
        headers,
        responseType: 'blob',
      }) as unknown as Observable<Phase18Responses[T]>;
    }

    const httpOptions = { params: this.params(request.query), headers };

    switch (operation.method) {
      case 'GET':
        return this.http.get<Phase18Responses[T]>(url, httpOptions);
      case 'POST':
        return this.http.post<Phase18Responses[T]>(url, (request as any).body, httpOptions);
      case 'PUT':
        return this.http.put<Phase18Responses[T]>(url, (request as any).body, httpOptions);
      case 'PATCH':
        return this.http.patch<Phase18Responses[T]>(url, (request as any).body, httpOptions);
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

  private params(query: Phase18Query | undefined): HttpParams {
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

fs.writeFileSync('src/app/domains/phase18/phase18-api.ts', output);
console.log('Successfully regenerated src/app/domains/phase18/phase18-api.ts');
