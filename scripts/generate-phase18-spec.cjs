const fs = require('fs');
const manifest = require('C:/tmp/wasla-phase18-reference/docs/phase18/part1-endpoint-manifest.json');

const testCases = manifest
  .map((endpoint) => {
    const pathParams = endpoint.parameters.filter((p) => p.source === 'Path').map((p) => p.Name);
    const pathObj = pathParams.length
      ? '{ ' + pathParams.map((p) => `${p}: 'test-${p}'`).join(', ') + ' }'
      : 'undefined';
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
    const bodyVal = hasBody ? '({} as any)' : 'undefined';
    const requiresIdemp = endpoint.parameters.some((p) => p.Name === 'Idempotency-Key');
    const idempVal = requiresIdemp ? "'idem-key-123'" : 'undefined';

    let expectedUrl = endpoint.route;
    pathParams.forEach((p) => {
      expectedUrl = expectedUrl.replace('{' + p + '}', 'test-' + p);
    });

    const idempCheck = requiresIdemp
      ? `expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-123');`
      : '';

    const isExport = endpoint.route.endsWith('/export');
    const flushBody = isExport
      ? "new Blob(['test-data'], { type: 'application/pdf' })"
      : '{ success: true }';

    return `  it('should correctly call ${endpoint.endpointId} (${endpoint.method} ${endpoint.route})', () => {
    api.call('${endpoint.endpointId}' as any, {
      path: ${pathObj},
      query: { testQuery: 'value' },
      body: ${bodyVal},
      idempotencyKey: ${idempVal},
    }).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      (r) => r.url === environment.apiBaseUrl + '${expectedUrl}' && r.method === '${endpoint.method}',
    );
    expect(req.request.method).toBe('${endpoint.method}');
    expect(req.request.params.get('testQuery')).toBe('value');
    ${idempCheck}
    req.flush(${flushBody});
  });`;
  })
  .join('\n\n');

const content = `import { provideHttpClient } from '@angular/common/http';
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

${testCases}
});
`;

fs.writeFileSync('src/app/domains/phase18/phase18-api.spec.ts', content);
console.log('Successfully generated src/app/domains/phase18/phase18-api.spec.ts with 109 test cases');
