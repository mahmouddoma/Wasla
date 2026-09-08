import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SecurityGovernanceApi } from './security-governance-api';

describe('SecurityGovernanceApi', () => {
  let api: SecurityGovernanceApi;
  let http: HttpTestingController;
  const roleId = '10000000-0000-0000-0000-000000000002';
  const adminUrl = `${environment.apiBaseUrl}/api/v1/admin`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SecurityGovernanceApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the roles catalog without query parameters', async () => {
    const result = firstValueFrom(api.roles());
    const request = http.expectOne(`${adminUrl}/roles`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
    await result;
  });

  it('loads role metadata by roleId', async () => {
    const result = firstValueFrom(api.roleDetails(roleId));
    const request = http.expectOne(`${adminUrl}/roles/${roleId}`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: roleId, name: 'Doctor', isSystemRole: true });
    await result;
  });

  it('loads the permissions catalog without query parameters', async () => {
    const result = firstValueFrom(api.permissions());
    const request = http.expectOne(`${adminUrl}/permissions`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
    await result;
  });

  it('loads persisted permissions for a role', async () => {
    const result = firstValueFrom(api.rolePermissions(roleId));
    const request = http.expectOne(`${adminUrl}/roles/${roleId}/permissions`);
    expect(request.request.method).toBe('GET');
    request.flush({ roleId, permissions: [] });
    await result;
  });

  it('replaces role permissions with the complete selected id collection', async () => {
    const body = { permissionIds: ['1bbac680-bda0-4cb0-b531-7cc1d61e22b6'] };
    const result = firstValueFrom(api.replaceRolePermissions(roleId, body));
    const request = http.expectOne(`${adminUrl}/roles/${roleId}/permissions`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ roleId, permissions: [] });
    await result;
  });
});
