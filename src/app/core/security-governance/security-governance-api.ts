import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReplaceRolePermissionsRequest,
  RolePermissionsResponse,
  SecurityPermission,
  SecurityRole,
} from './security-governance.models';

@Injectable({ providedIn: 'root' })
export class SecurityGovernanceApi {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = `${environment.apiBaseUrl}/api/v1/admin`;

  roles(): Observable<SecurityRole[]> {
    return this.http.get<SecurityRole[]>(`${this.adminUrl}/roles`);
  }

  roleDetails(roleId: string): Observable<SecurityRole> {
    return this.http.get<SecurityRole>(`${this.adminUrl}/roles/${roleId}`);
  }

  permissions(): Observable<SecurityPermission[]> {
    return this.http.get<SecurityPermission[]>(`${this.adminUrl}/permissions`);
  }

  rolePermissions(roleId: string): Observable<RolePermissionsResponse> {
    return this.http.get<RolePermissionsResponse>(`${this.adminUrl}/roles/${roleId}/permissions`);
  }

  replaceRolePermissions(
    roleId: string,
    request: ReplaceRolePermissionsRequest,
  ): Observable<RolePermissionsResponse> {
    return this.http.put<RolePermissionsResponse>(
      `${this.adminUrl}/roles/${roleId}/permissions`,
      request,
    );
  }
}
