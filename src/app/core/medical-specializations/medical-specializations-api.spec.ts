import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalSpecializationsApi } from './medical-specializations-api';

describe('MedicalSpecializationsApi', () => {
  let api: MedicalSpecializationsApi;
  let http: HttpTestingController;
  const id = '1bbac680-bda0-4cb0-b531-7cc1d61e22b6';
  const url = `${environment.apiBaseUrl}/api/v1/admin/medical-specializations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MedicalSpecializationsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses server-side filters and pagination', async () => {
    const result = firstValueFrom(
      api.list({ search: 'قلب', isActive: true, isDeleted: false, pageNumber: 2, pageSize: 20 }),
    );
    const request = http.expectOne(
      `${url}?pageNumber=2&pageSize=20&search=%D9%82%D9%84%D8%A8&isActive=true&isDeleted=false`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], totalCount: 0, pageNumber: 2, pageSize: 20 });
    await result;
  });

  it('loads details by id', async () => {
    const result = firstValueFrom(api.details(id));
    const request = http.expectOne(`${url}/${id}`);
    expect(request.request.method).toBe('GET');
    request.flush({ id });
    await result;
  });

  it.each([
    ['create', 'POST'],
    ['update', 'PUT'],
  ] as const)('sends %s with the exact payload', async (action, method) => {
    const body = {
      nameAr: 'قلب',
      nameEn: null,
      descriptionAr: null,
      descriptionEn: null,
      sortOrder: 1,
    };
    const result = firstValueFrom(
      action === 'create' ? api.create(body) : api.update(id, { ...body, rowVersion: 'AQID' }),
    );
    const request = http.expectOne(action === 'create' ? url : `${url}/${id}`);
    expect(request.request.method).toBe(method);
    expect(request.request.body).toEqual(
      action === 'create' ? body : { ...body, rowVersion: 'AQID' },
    );
    request.flush({ id });
    await result;
  });

  it.each(['activate', 'deactivate', 'restore'] as const)(
    'posts rowVersion to %s',
    async (action) => {
      const body = { rowVersion: 'AQID' };
      const result = firstValueFrom(api[action](id, body));
      const request = http.expectOne(`${url}/${id}/${action}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(body);
      request.flush({ id });
      await result;
    },
  );

  it('soft deletes with rowVersion in the request body', async () => {
    const body = { rowVersion: 'AQID' };
    const result = firstValueFrom(api.delete(id, body));
    const request = http.expectOne(`${url}/${id}`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual(body);
    request.flush({ id });
    await result;
  });
});
