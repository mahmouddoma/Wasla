import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMedicalSpecializationRequest,
  MedicalSpecialization,
  MedicalSpecializationLifecycleRequest,
  MedicalSpecializationsPage,
  MedicalSpecializationsQuery,
  UpdateMedicalSpecializationRequest,
} from './medical-specializations.models';

@Injectable({ providedIn: 'root' })
export class MedicalSpecializationsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/admin/medical-specializations`;

  list(query: MedicalSpecializationsQuery): Observable<MedicalSpecializationsPage> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    if (query.isActive !== undefined) params = params.set('isActive', query.isActive);
    if (query.isDeleted !== undefined) params = params.set('isDeleted', query.isDeleted);
    return this.http.get<MedicalSpecializationsPage>(this.url, { params });
  }

  details(id: string): Observable<MedicalSpecialization> {
    return this.http.get<MedicalSpecialization>(`${this.url}/${id}`);
  }

  create(request: CreateMedicalSpecializationRequest): Observable<MedicalSpecialization> {
    return this.http.post<MedicalSpecialization>(this.url, request);
  }

  update(
    id: string,
    request: UpdateMedicalSpecializationRequest,
  ): Observable<MedicalSpecialization> {
    return this.http.put<MedicalSpecialization>(`${this.url}/${id}`, request);
  }

  activate(
    id: string,
    request: MedicalSpecializationLifecycleRequest,
  ): Observable<MedicalSpecialization> {
    return this.http.post<MedicalSpecialization>(`${this.url}/${id}/activate`, request);
  }

  deactivate(
    id: string,
    request: MedicalSpecializationLifecycleRequest,
  ): Observable<MedicalSpecialization> {
    return this.http.post<MedicalSpecialization>(`${this.url}/${id}/deactivate`, request);
  }

  delete(
    id: string,
    request: MedicalSpecializationLifecycleRequest,
  ): Observable<MedicalSpecialization> {
    return this.http.delete<MedicalSpecialization>(`${this.url}/${id}`, { body: request });
  }

  restore(
    id: string,
    request: MedicalSpecializationLifecycleRequest,
  ): Observable<MedicalSpecialization> {
    return this.http.post<MedicalSpecialization>(`${this.url}/${id}/restore`, request);
  }
}
