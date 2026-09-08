import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateSuperAdminRequest,
  SuperAdminRecord,
  SuperAdminsPage,
  SuperAdminsQuery,
  UpdateSuperAdminRequest,
} from './superadmins.models';

@Injectable({ providedIn: 'root' })
export class SuperAdminsApi {
  private readonly http = inject(HttpClient);
  private readonly superAdminsUrl = `${environment.apiBaseUrl}/api/v1/admin/superadmins`;

  list(query: SuperAdminsQuery): Observable<SuperAdminsPage> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize)
      .set('includeDeleted', query.includeDeleted);
    if (query.searchText) params = params.set('searchText', query.searchText);
    return this.http.get<SuperAdminsPage>(this.superAdminsUrl, { params });
  }

  details(superAdminId: string): Observable<SuperAdminRecord> {
    return this.http.get<SuperAdminRecord>(`${this.superAdminsUrl}/${superAdminId}`);
  }

  create(request: CreateSuperAdminRequest): Observable<SuperAdminRecord> {
    return this.http.post<SuperAdminRecord>(this.superAdminsUrl, request);
  }

  update(superAdminId: string, request: UpdateSuperAdminRequest): Observable<SuperAdminRecord> {
    return this.http.put<SuperAdminRecord>(`${this.superAdminsUrl}/${superAdminId}`, request);
  }

  activate(superAdminId: string): Observable<void> {
    return this.http.post<void>(`${this.superAdminsUrl}/${superAdminId}/activate`, null);
  }

  deactivate(superAdminId: string): Observable<void> {
    return this.http.post<void>(`${this.superAdminsUrl}/${superAdminId}/deactivate`, null);
  }

  delete(superAdminId: string): Observable<void> {
    return this.http.delete<void>(`${this.superAdminsUrl}/${superAdminId}`);
  }

  restore(superAdminId: string): Observable<void> {
    return this.http.post<void>(`${this.superAdminsUrl}/${superAdminId}/restore`, null);
  }
}
