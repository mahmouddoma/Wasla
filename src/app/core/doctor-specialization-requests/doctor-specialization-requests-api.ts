import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DoctorSpecializationHistoryItem,
  DoctorSpecializationRequest,
} from '../doctor-profile/doctor-profile.models';
import {
  AdjustDoctorSpecializationsRequest,
  DoctorSpecializationRequestDetails,
  DoctorSpecializationRequestsPage,
  DoctorSpecializationRequestsQuery,
  RejectDoctorSpecializationRequest,
  RequestDoctorSpecializationModificationRequest,
  ReviewDoctorSpecializationRequest,
} from './doctor-specialization-requests.models';

@Injectable({ providedIn: 'root' })
export class DoctorSpecializationRequestsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/admin/doctor-specialization-requests`;

  list(query: DoctorSpecializationRequestsQuery): Observable<DoctorSpecializationRequestsPage> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.status) params = params.set('status', query.status);
    if (query.type) params = params.set('type', query.type);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<DoctorSpecializationRequestsPage>(this.url, { params });
  }

  details(requestId: string): Observable<DoctorSpecializationRequestDetails> {
    return this.http.get<DoctorSpecializationRequestDetails>(`${this.url}/${requestId}`);
  }

  history(requestId: string): Observable<DoctorSpecializationHistoryItem[]> {
    return this.http.get<DoctorSpecializationHistoryItem[]>(`${this.url}/${requestId}/history`);
  }

  adjust(
    requestId: string,
    request: AdjustDoctorSpecializationsRequest,
  ): Observable<DoctorSpecializationRequest> {
    return this.http.put<DoctorSpecializationRequest>(
      `${this.url}/${requestId}/specializations`,
      request,
    );
  }

  requestModification(
    requestId: string,
    request: RequestDoctorSpecializationModificationRequest,
  ): Observable<DoctorSpecializationRequest> {
    return this.http.post<DoctorSpecializationRequest>(
      `${this.url}/${requestId}/request-modification`,
      request,
    );
  }

  approve(
    requestId: string,
    request: ReviewDoctorSpecializationRequest,
  ): Observable<DoctorSpecializationRequest> {
    return this.http.post<DoctorSpecializationRequest>(`${this.url}/${requestId}/approve`, request);
  }

  reject(
    requestId: string,
    request: RejectDoctorSpecializationRequest,
  ): Observable<DoctorSpecializationRequest> {
    return this.http.post<DoctorSpecializationRequest>(`${this.url}/${requestId}/reject`, request);
  }
}
