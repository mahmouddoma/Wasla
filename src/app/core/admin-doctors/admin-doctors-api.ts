import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminDoctorDetails,
  AdminDoctorsPage,
  AdminDoctorsQuery,
  ApproveDoctorRequest,
  DoctorLifecycleResponse,
  DoctorMediaType,
  ReactivateDoctorRequest,
  RejectDoctorRequest,
  SuspendDoctorRequest,
} from './admin-doctors.models';

@Injectable({ providedIn: 'root' })
export class AdminDoctorsApi {
  private readonly http = inject(HttpClient);
  private readonly doctorsUrl = `${environment.apiBaseUrl}/api/v1/admin/doctors`;

  list(query: AdminDoctorsQuery): Observable<AdminDoctorsPage> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.approvalStatus) params = params.set('approvalStatus', query.approvalStatus);
    if (query.searchText) params = params.set('searchText', query.searchText);
    return this.http.get<AdminDoctorsPage>(this.doctorsUrl, { params });
  }

  details(doctorId: string): Observable<AdminDoctorDetails> {
    return this.http.get<AdminDoctorDetails>(`${this.doctorsUrl}/${doctorId}`);
  }

  media(doctorId: string, mediaType: DoctorMediaType): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.doctorsUrl}/${doctorId}/media/${mediaType}`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  approve(doctorId: string, request: ApproveDoctorRequest): Observable<DoctorLifecycleResponse> {
    return this.http.post<DoctorLifecycleResponse>(
      `${this.doctorsUrl}/${doctorId}/approve`,
      request,
    );
  }

  reject(doctorId: string, request: RejectDoctorRequest): Observable<DoctorLifecycleResponse> {
    return this.http.post<DoctorLifecycleResponse>(
      `${this.doctorsUrl}/${doctorId}/reject`,
      request,
    );
  }

  suspend(doctorId: string, request: SuspendDoctorRequest): Observable<DoctorLifecycleResponse> {
    return this.http.post<DoctorLifecycleResponse>(
      `${this.doctorsUrl}/${doctorId}/suspend`,
      request,
    );
  }

  reactivate(
    doctorId: string,
    request: ReactivateDoctorRequest,
  ): Observable<DoctorLifecycleResponse> {
    return this.http.post<DoctorLifecycleResponse>(
      `${this.doctorsUrl}/${doctorId}/reactivate`,
      request,
    );
  }
}
