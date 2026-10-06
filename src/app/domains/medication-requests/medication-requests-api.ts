import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MedicationSubmission } from '../prescriptions';
import {
  MedicationApproval,
  MedicationRequest,
  MedicationRequestPage,
  MedicationRequestQuery,
} from './medication-request.models';
@Injectable({ providedIn: 'root' })
export class MedicationRequestsApi {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl + '/api/v1';
  private doctor = this.root + '/doctors/me/drug-catalog-requests';
  private manager = this.root + '/admin/drug-catalog-requests';
  mine(query: MedicationRequestQuery) {
    return this.http.get<MedicationRequestPage>(this.doctor, { params: this.params(query, false) });
  }
  myDetails(requestId: string) {
    return this.http.get<MedicationRequest>(this.doctor + '/' + encodeURIComponent(requestId));
  }
  create(body: MedicationSubmission) {
    return this.http.post<MedicationRequest>(this.doctor, body);
  }
  update(requestId: string, data: MedicationSubmission, rowVersion: string) {
    return this.http.put<MedicationRequest>(this.doctor + '/' + encodeURIComponent(requestId), {
      data,
      rowVersion,
    });
  }
  list(query: MedicationRequestQuery) {
    return this.http.get<MedicationRequestPage>(this.manager, { params: this.params(query, true) });
  }
  details(requestId: string) {
    return this.http.get<MedicationRequest>(this.manager + '/' + encodeURIComponent(requestId));
  }
  requestMoreInfo(requestId: string, body: { rowVersion: string; reason: string }) {
    return this.http.post<MedicationRequest>(
      this.manager + '/' + encodeURIComponent(requestId) + '/request-more-info',
      body,
    );
  }
  approve(requestId: string, body: MedicationApproval, intentKey: string) {
    return this.http.post<MedicationRequest>(
      this.manager + '/' + encodeURIComponent(requestId) + '/approve',
      body,
      { headers: { 'Idempotency-Key': intentKey } },
    );
  }
  reject(
    requestId: string,
    body: { rowVersion: string; reason: string; duplicateOfDrugCatalogId?: string },
  ) {
    return this.http.post<MedicationRequest>(
      this.manager + '/' + encodeURIComponent(requestId) + '/reject',
      body,
    );
  }
  private params(query: MedicationRequestQuery, manager: boolean) {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.status) params = params.set('status', query.status);
    if (manager && query.doctorId) params = params.set('doctorId', query.doctorId);
    if (manager && query.search?.trim()) params = params.set('search', query.search.trim());
    return params;
  }
}
