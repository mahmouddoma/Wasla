import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorProfileApi } from './doctor-profile-api';

describe('DoctorProfileApi', () => {
  let api: DoctorProfileApi;
  let http: HttpTestingController;
  const doctorUrl = `${environment.apiBaseUrl}/api/v1/doctors/me`;
  const publicUrl = `${environment.apiBaseUrl}/api/v1/public`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DoctorProfileApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it.each([
    ['specializationOptions', `${doctorUrl}/specializations/options`],
    ['currentSpecializations', `${doctorUrl}/specializations`],
    ['openSpecializationRequest', `${doctorUrl}/specialization-request`],
    ['specializationHistory', `${doctorUrl}/specialization-request/history`],
    ['governorates', `${publicUrl}/governorates`],
    ['practiceLocation', `${doctorUrl}/practice-location`],
  ] as const)('loads %s from the exact endpoint', async (method, url) => {
    const result = firstValueFrom(api[method]() as Observable<unknown>);
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush(method === 'currentSpecializations' ? { items: [] } : []);
    await result;
  });

  it.each([
    ['cities', 1, `${publicUrl}/governorates/1/cities`],
    ['areas', 1001, `${publicUrl}/cities/1001/areas`],
  ] as const)('loads dependent %s without local location data', async (method, id, url) => {
    const result = firstValueFrom(api[method](id));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([]);
    await result;
  });

  it('submits the complete specialization selection', async () => {
    const body = { specializations: [{ medicalSpecializationId: 'id', isPrimary: true }] };
    const result = firstValueFrom(api.submitSpecializations(body));
    const request = http.expectOne(`${doctorUrl}/specialization-request`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ requestId: 'request' });
    await result;
  });

  it('resubmits with the latest rowVersion', async () => {
    const body = {
      specializations: [{ medicalSpecializationId: 'id', isPrimary: true }],
      rowVersion: 'AQID',
    };
    const result = firstValueFrom(api.resubmitSpecializations(body));
    const request = http.expectOne(`${doctorUrl}/specialization-request/resubmit`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ requestId: 'request' });
    await result;
  });

  it('upserts practice location without a doctor id', async () => {
    const body = {
      governorateId: 1,
      cityId: 1001,
      areaId: 10010001,
      detailedAddress: 'العنوان',
      latitude: 30,
      longitude: 31,
      rowVersion: null,
    };
    const result = firstValueFrom(api.upsertPracticeLocation(body));
    const request = http.expectOne(`${doctorUrl}/practice-location`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 'location' });
    await result;
  });
});
