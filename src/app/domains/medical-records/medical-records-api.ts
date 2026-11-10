import { SharedRecordSchemas } from './shared-record.models';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SafeRecordOverview, SafeRecordPage } from './patient-record.models';
import {
  MedicalRecordAccessLogPage,
  MedicalRecordEncounterDetail,
  MedicalRecordItemDetail,
  UpdateEncounterVisibilityRequest,
} from './medical-records.models';

@Injectable({ providedIn: 'root' })
export class MedicalRecordsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly patientRecordUrl = `${this.baseUrl}/api/v1/patients/me/medical-record`;
  private readonly doctorsUrl = `${this.baseUrl}/api/v1/doctors/me`;

  // === Patient Self Endpoints (WAS-588 .. WAS-593) ===

  patientOverview(): Observable<SafeRecordOverview> {
    return this.http.get<SafeRecordOverview>(`${this.patientRecordUrl}/overview`);
  }

  patientTimeline(
    types?: string,
    fromDate?: string,
    toDate?: string,
    cursor?: string,
    pageSize = 20,
  ): Observable<SafeRecordPage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (types) params = params.set('types', types);
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    if (cursor) params = params.set('cursor', cursor);

    return this.http.get<SafeRecordPage>(`${this.patientRecordUrl}/timeline`, { params });
  }

  patientEncounter(encounterId: string): Observable<MedicalRecordEncounterDetail> {
    return this.http.get<MedicalRecordEncounterDetail>(
      `${this.patientRecordUrl}/encounters/${encounterId}`,
    );
  }

  patientItem(resourceType: string, sourceId: string): Observable<MedicalRecordItemDetail> {
    return this.http.get<MedicalRecordItemDetail>(
      `${this.patientRecordUrl}/items/${resourceType}/${sourceId}`,
    );
  }

  patientAttachment(
    resourceType: string,
    sourceId: string,
    attachmentId: string,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.patientRecordUrl}/items/${resourceType}/${sourceId}/attachments/${attachmentId}/content`,
      { responseType: 'blob', observe: 'response' },
    );
  }

  patientAccessLog(
    cursor?: string,
    pageSize = 20,
  ): Observable<MedicalRecordAccessLogPage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (cursor) params = params.set('cursor', cursor);

    return this.http.get<MedicalRecordAccessLogPage>(`${this.patientRecordUrl}/access-log`, {
      params,
    });
  }

  // === Treating Doctor Endpoints (WAS-594 .. WAS-601) ===

  doctorTreatingOverview(
    practiceId: string,
    ticketId: string,
  ): Observable<SharedRecordSchemas['DoctorSharedMedicalRecordOverviewResponse']> {
    return this.http.get<SharedRecordSchemas['DoctorSharedMedicalRecordOverviewResponse']>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/overview`,
    );
  }

  doctorTreatingTimeline(
    practiceId: string,
    ticketId: string,
    types?: string,
    fromDate?: string,
    toDate?: string,
    cursor?: string,
    pageSize = 20,
  ): Observable<SharedRecordSchemas['TimelineEntryRecordPage']> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (types) params = params.set('types', types);
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    if (cursor) params = params.set('cursor', cursor);

    return this.http.get<SharedRecordSchemas['TimelineEntryRecordPage']>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/timeline`,
      { params },
    );
  }

  doctorTreatingEncounter(
    practiceId: string,
    ticketId: string,
    encounterId: string,
  ): Observable<SharedRecordSchemas['DoctorSharedMedicalRecordEncounterResponse']> {
    return this.http.get<SharedRecordSchemas['DoctorSharedMedicalRecordEncounterResponse']>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/encounters/${encounterId}`,
    );
  }

  doctorTreatingItem(
    practiceId: string,
    ticketId: string,
    resourceType: string,
    sourceId: string,
  ): Observable<SharedRecordSchemas['DoctorSharedMedicalRecordItemResponse']> {
    return this.http.get<SharedRecordSchemas['DoctorSharedMedicalRecordItemResponse']>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/items/${resourceType}/${sourceId}`,
    );
  }

  doctorTreatingAttachment(
    practiceId: string,
    ticketId: string,
    resourceType: string,
    sourceId: string,
    attachmentId: string,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/items/${resourceType}/${sourceId}/attachments/${attachmentId}/content`,
      { responseType: 'blob', observe: 'response' },
    );
  }

  doctorTreatingAccessRequests(
    practiceId: string,
    ticketId: string,
    cursor?: string,
  ): Observable<SharedRecordSchemas['HiddenAccessResponseRecordPage']> {
    return this.http.get<SharedRecordSchemas['HiddenAccessResponseRecordPage']>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/access-requests`,
      { params: cursor ? { cursor } : {} },
    );
  }

  doctorTreatingAccessRequestDetails(
    practiceId: string,
    ticketId: string,
    requestId: string,
  ): Observable<SharedRecordSchemas['HiddenAccessResponse']> {
    return this.http.get<SharedRecordSchemas['HiddenAccessResponse']>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/access-requests/${requestId}`,
    );
  }

  doctorCreateAccessRequest(
    practiceId: string,
    ticketId: string,
    body: SharedRecordSchemas['HiddenAccessCreateRequest'],
    idempotencyKey: string,
  ): Observable<SharedRecordSchemas['HiddenAccessResponse']> {
    return this.http.post<SharedRecordSchemas['HiddenAccessResponse']>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/access-requests`,
      body, { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  // === Doctor Access Inbox & Reviews (WAS-602 .. WAS-608) ===

  doctorAccessInboxSummary(): Observable<SharedRecordSchemas['AccessInboxSummary']> {
    return this.http.get<SharedRecordSchemas['AccessInboxSummary']>(
      `${this.doctorsUrl}/medical-record-access-requests/inbox/summary`,
    );
  }

  doctorAccessInbox(
    status?: string,
    cursor?: string,
    pageSize = 20,
  ): Observable<SharedRecordSchemas['HiddenAccessResponseRecordPage']> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (cursor) params = params.set('cursor', cursor);
    if (status) params = params.set('status', status);

    return this.http.get<SharedRecordSchemas['HiddenAccessResponseRecordPage']>(
      `${this.doctorsUrl}/medical-record-access-requests/inbox`,
      { params },
    );
  }

  doctorAccessRequestDetails(requestId: string): Observable<SharedRecordSchemas['HiddenAccessResponse']> {
    return this.http.get<SharedRecordSchemas['HiddenAccessResponse']>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}`,
    );
  }

  doctorApproveAccessRequest(
    requestId: string,
    body: SharedRecordSchemas['AccessDecisionRequest'],
    idempotencyKey: string,
  ): Observable<SharedRecordSchemas['HiddenAccessResponse']> {
    return this.http.post<SharedRecordSchemas['HiddenAccessResponse']>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/approve`,
      body, { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  doctorRejectAccessRequest(
    requestId: string,
    body: SharedRecordSchemas['AccessDecisionRequest'],
  ): Observable<SharedRecordSchemas['HiddenAccessResponse']> {
    return this.http.post<SharedRecordSchemas['HiddenAccessResponse']>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/reject`,
      body,
    );
  }

  doctorRevokeAccessGrant(
    requestId: string,
    body: SharedRecordSchemas['AccessDecisionRequest'],
  ): Observable<SharedRecordSchemas['HiddenAccessResponse']> {
    return this.http.post<SharedRecordSchemas['HiddenAccessResponse']>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/revoke`,
      body,
    );
  }

  doctorAccessRequestHistory(requestId: string): Observable<readonly SharedRecordSchemas['RequestHistoryResponse'][]> {
    return this.http.get<readonly SharedRecordSchemas['RequestHistoryResponse'][]>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/history`,
    );
  }

  // === Encounter Visibility Controls (WAS-609 .. WAS-610) ===

  doctorUpdateEncounterVisibility(
    practiceId: string,
    encounterId: string,
    body: Pick<UpdateEncounterVisibilityRequest, 'visibility' | 'rowVersion'>,
  ): Observable<SharedRecordSchemas['EncounterVisibilityResponse']> {
    return this.http.patch<SharedRecordSchemas['EncounterVisibilityResponse']>(
      `${this.doctorsUrl}/practices/${practiceId}/encounters/${encounterId}/visibility`,
      body,
    );
  }

  doctorEncounterVisibilityHistory(
    practiceId: string,
    encounterId: string,
    cursor?: string,
  ): Observable<SharedRecordSchemas['VisibilityHistoryResponseRecordPage']> {
    return this.http.get<SharedRecordSchemas['VisibilityHistoryResponseRecordPage']>(
      `${this.doctorsUrl}/practices/${practiceId}/encounters/${encounterId}/visibility/history`,
      { params: cursor ? { cursor } : {} },
    );
  }
}
