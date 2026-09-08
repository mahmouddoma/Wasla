import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorSpecializationRequestsApi } from './doctor-specialization-requests-api';

describe('DoctorSpecializationRequestsApi', () => {
  let api: DoctorSpecializationRequestsApi;
  let http: HttpTestingController;
  const requestId = '1bbac680-bda0-4cb0-b531-7cc1d61e22b6';
  const url = `${environment.apiBaseUrl}/api/v1/admin/doctor-specialization-requests`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DoctorSpecializationRequestsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses server-side queue filters and pagination', async () => {
    const result = firstValueFrom(
      api.list({
        status: 'PendingReview',
        type: 'Initial',
        search: 'ahmed',
        pageNumber: 2,
        pageSize: 20,
      }),
    );
    const request = http.expectOne(
      `${url}?pageNumber=2&pageSize=20&status=PendingReview&type=Initial&search=ahmed`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], totalCount: 0, pageNumber: 2, pageSize: 20 });
    await result;
  });

  it.each([
    ['details', `${url}/${requestId}`],
    ['history', `${url}/${requestId}/history`],
  ] as const)('loads request %s by requestId', async (method, endpoint) => {
    const result = firstValueFrom(api[method](requestId) as Observable<unknown>);
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('GET');
    request.flush(method === 'history' ? [] : { request: {} });
    await result;
  });

  it('adjusts only the proposed set and includes a reason', async () => {
    const body = {
      specializations: [{ medicalSpecializationId: 'id', isPrimary: true }],
      reason: 'reason',
      rowVersion: 'AQID',
    };
    const result = firstValueFrom(api.adjust(requestId, body));
    const request = http.expectOne(`${url}/${requestId}/specializations`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ requestId });
    await result;
  });

  it('requests modification with the latest rowVersion', async () => {
    const body = { message: 'message', rowVersion: 'AQID' };
    const result = firstValueFrom(api.requestModification(requestId, body));
    const request = http.expectOne(`${url}/${requestId}/request-modification`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ requestId });
    await result;
  });

  it.each(['approve', 'reject'] as const)('posts the exact %s review contract', async (action) => {
    const body =
      action === 'approve' ? { rowVersion: 'AQID' } : { reason: 'reason', rowVersion: 'AQID' };
    const result = firstValueFrom(
      action === 'approve'
        ? api.approve(requestId, { rowVersion: 'AQID' })
        : api.reject(requestId, { reason: 'reason', rowVersion: 'AQID' }),
    );
    const request = http.expectOne(`${url}/${requestId}/${action}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ requestId });
    await result;
  });
});
