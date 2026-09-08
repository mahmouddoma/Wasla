import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SuperAdminsApi } from './superadmins-api';

describe('SuperAdminsApi', () => {
  let api: SuperAdminsApi;
  let http: HttpTestingController;
  const superAdminId = '1bbac680-bda0-4cb0-b531-7cc1d61e22b6';
  const baseUrl = `${environment.apiBaseUrl}/api/v1/admin/superadmins`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SuperAdminsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends search, pagination and includeDeleted to the server', async () => {
    const result = firstValueFrom(
      api.list({ searchText: 'admin', pageNumber: 2, pageSize: 20, includeDeleted: true }),
    );
    const request = http.expectOne(
      `${baseUrl}?pageNumber=2&pageSize=20&includeDeleted=true&searchText=admin`,
    );

    expect(request.request.method).toBe('GET');
    request.flush({ items: [], totalCount: 0, pageNumber: 2, pageSize: 20 });
    await result;
  });

  it('loads a SuperAdmin by id', async () => {
    const result = firstValueFrom(api.details(superAdminId));
    const request = http.expectOne(`${baseUrl}/${superAdminId}`);
    expect(request.request.method).toBe('GET');
    request.flush({ superAdminId });
    await result;
  });

  it('creates a non-root SuperAdmin using the exact contract', async () => {
    const body = {
      userName: 'admin1',
      email: 'admin1@example.com',
      phoneNumber: '0101',
      nameAr: 'مشرف',
      nameEn: 'Admin',
      initialPassword: 'AdminPass123',
      confirmPassword: 'AdminPass123',
    };
    const result = firstValueFrom(api.create(body));
    const request = http.expectOne(baseUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ superAdminId, ...body });
    await result;
  });

  it('updates only mutable SuperAdmin fields', async () => {
    const body = {
      nameAr: 'مشرف محدث',
      nameEn: 'Updated Admin',
      email: 'updated@example.com',
      phoneNumber: '0101',
    };
    const result = firstValueFrom(api.update(superAdminId, body));
    const request = http.expectOne(`${baseUrl}/${superAdminId}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ superAdminId, userName: 'admin1', ...body });
    await result;
  });

  it.each(['activate', 'deactivate'] as const)('posts no request payload to %s', async (action) => {
    const result = firstValueFrom(api[action](superAdminId));
    const request = http.expectOne(`${baseUrl}/${superAdminId}/${action}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush(null);
    await result;
  });

  it('soft deletes a SuperAdmin without a request body', async () => {
    const result = firstValueFrom(api.delete(superAdminId));
    const request = http.expectOne(`${baseUrl}/${superAdminId}`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush(null);
    await result;
  });

  it('restores a SuperAdmin without a request payload', async () => {
    const result = firstValueFrom(api.restore(superAdminId));
    const request = http.expectOne(`${baseUrl}/${superAdminId}/restore`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush(null);
    await result;
  });
});
