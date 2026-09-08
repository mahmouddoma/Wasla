import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDoctorsApi } from './admin-doctors-api';

describe('AdminDoctorsApi', () => {
  let api: AdminDoctorsApi;
  let http: HttpTestingController;
  const doctorId = '1bbac680-bda0-4cb0-b531-7cc1d61e22b6';
  const baseUrl = `${environment.apiBaseUrl}/api/v1/admin/doctors`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminDoctorsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends list filters and server pagination as query parameters', async () => {
    const result = firstValueFrom(
      api.list({
        approvalStatus: 'Pending',
        searchText: 'ahmed',
        pageNumber: 2,
        pageSize: 20,
      }),
    );
    const request = http.expectOne(
      `${baseUrl}?pageNumber=2&pageSize=20&approvalStatus=Pending&searchText=ahmed`,
    );

    expect(request.request.method).toBe('GET');
    request.flush({ items: [], totalCount: 0, pageNumber: 2, pageSize: 20 });
    await result;
  });

  it('loads doctor details by doctorId', async () => {
    const result = firstValueFrom(api.details(doctorId));
    const request = http.expectOne(`${baseUrl}/${doctorId}`);

    expect(request.request.method).toBe('GET');
    request.flush({ doctorId });
    await result;
  });

  it('requests private media as a Blob from the media endpoint', async () => {
    const result = firstValueFrom(api.media(doctorId, 'PersonalIdFront'));
    const request = http.expectOne(`${baseUrl}/${doctorId}/media/PersonalIdFront`);

    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['image'], { type: 'image/png' }));
    await result;
  });

  it('sends the latest rowVersion when approving a doctor', async () => {
    const body = { nationalId: 'N-100', rowVersion: 'AQID' };
    const result = firstValueFrom(api.approve(doctorId, body));
    const request = http.expectOne(`${baseUrl}/${doctorId}/approve`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ doctorId, approvalStatus: 'Approved', rowVersion: 'BAUG' });
    await result;
  });

  it('sends the reason and latest rowVersion when rejecting a doctor', async () => {
    const body = { reason: 'verification mismatch', rowVersion: 'AQID' };
    const result = firstValueFrom(api.reject(doctorId, body));
    const request = http.expectOne(`${baseUrl}/${doctorId}/reject`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ doctorId, approvalStatus: 'Rejected', rowVersion: 'BAUG' });
    await result;
  });

  it('sends the reason and latest rowVersion when suspending a doctor', async () => {
    const body = { reason: 'governance review', rowVersion: 'AQID' };
    const result = firstValueFrom(api.suspend(doctorId, body));
    const request = http.expectOne(`${baseUrl}/${doctorId}/suspend`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ doctorId, approvalStatus: 'Suspended', rowVersion: 'BAUG' });
    await result;
  });

  it('sends only the latest rowVersion when reactivating a doctor', async () => {
    const body = { rowVersion: 'AQID' };
    const result = firstValueFrom(api.reactivate(doctorId, body));
    const request = http.expectOne(`${baseUrl}/${doctorId}/reactivate`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ doctorId, approvalStatus: 'Approved', rowVersion: 'BAUG' });
    await result;
  });
});
