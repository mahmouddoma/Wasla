import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccessInboxSummaryResponse,
  AccessRequestHistoryItem,
  ApproveHiddenAccessRequest,
  CreateHiddenAccessRequest,
  HiddenAccessRequestItem,
  HiddenAccessRequestSummaryPage,
  MedicalRecordAccessLogPage,
  MedicalRecordEncounterDetail,
  MedicalRecordItemDetail,
  MedicalRecordTimelinePage,
  OwnerAccessRequestItem,
  OwnerAccessRequestPage,
  PatientMedicalRecordOverview,
  RejectHiddenAccessRequest,
  RevokeHiddenAccessRequest,
  TreatingDoctorMedicalOverview,
  UpdateEncounterVisibilityRequest,
  UpdateEncounterVisibilityResponse,
  VisibilityHistoryItem,
} from './medical-records.models';

@Injectable({ providedIn: 'root' })
export class MedicalRecordsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly patientRecordUrl = `${this.baseUrl}/api/v1/patients/me/medical-record`;
  private readonly doctorsUrl = `${this.baseUrl}/api/v1/doctors/me`;

  // === Patient Self Endpoints (WAS-588 .. WAS-593) ===

  patientOverview(): Observable<PatientMedicalRecordOverview> {
    return this.http.get<PatientMedicalRecordOverview>(`${this.patientRecordUrl}/overview`);
  }

  patientTimeline(
    types?: string,
    fromDate?: string,
    toDate?: string,
    cursor?: string,
    pageSize = 20,
  ): Observable<MedicalRecordTimelinePage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (types) params = params.set('types', types);
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    if (cursor) params = params.set('cursor', cursor);

    return this.http.get<MedicalRecordTimelinePage>(`${this.patientRecordUrl}/timeline`, { params });
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
    fromDate?: string,
    toDate?: string,
    cursor?: string,
    pageSize = 20,
  ): Observable<MedicalRecordAccessLogPage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    if (cursor) params = params.set('cursor', cursor);

    return this.http.get<MedicalRecordAccessLogPage>(`${this.patientRecordUrl}/access-log`, { params });
  }

  // === Treating Doctor Endpoints (WAS-594 .. WAS-601) ===

  doctorTreatingOverview(
    practiceId: string,
    ticketId: string,
  ): Observable<TreatingDoctorMedicalOverview> {
    return this.http.get<TreatingDoctorMedicalOverview>(
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
  ): Observable<MedicalRecordTimelinePage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (types) params = params.set('types', types);
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    if (cursor) params = params.set('cursor', cursor);

    return this.http.get<MedicalRecordTimelinePage>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/timeline`,
      { params },
    );
  }

  doctorTreatingEncounter(
    practiceId: string,
    ticketId: string,
    encounterId: string,
  ): Observable<MedicalRecordEncounterDetail> {
    return this.http.get<MedicalRecordEncounterDetail>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/encounters/${encounterId}`,
    );
  }

  doctorTreatingItem(
    practiceId: string,
    ticketId: string,
    resourceType: string,
    sourceId: string,
  ): Observable<MedicalRecordItemDetail> {
    return this.http.get<MedicalRecordItemDetail>(
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
  ): Observable<HiddenAccessRequestSummaryPage> {
    return this.http.get<HiddenAccessRequestSummaryPage>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/access-requests`,
    );
  }

  doctorTreatingAccessRequestDetails(
    practiceId: string,
    ticketId: string,
    requestId: string,
  ): Observable<HiddenAccessRequestItem> {
    return this.http.get<HiddenAccessRequestItem>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/access-requests/${requestId}`,
    );
  }

  doctorCreateAccessRequest(
    practiceId: string,
    ticketId: string,
    body: CreateHiddenAccessRequest,
  ): Observable<HiddenAccessRequestItem> {
    return this.http.post<HiddenAccessRequestItem>(
      `${this.doctorsUrl}/practices/${practiceId}/tickets/${ticketId}/medical-record/access-requests`,
      body,
    );
  }

  // === Doctor Access Inbox & Reviews (WAS-602 .. WAS-608) ===

  doctorAccessInboxSummary(): Observable<AccessInboxSummaryResponse> {
    return this.http.get<AccessInboxSummaryResponse>(
      `${this.doctorsUrl}/medical-record-access-requests/inbox/summary`,
    );
  }

  doctorAccessInbox(
    status?: string,
    pageNumber = 1,
    pageSize = 20,
  ): Observable<OwnerAccessRequestPage> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    if (status) params = params.set('status', status);

    return this.http.get<OwnerAccessRequestPage>(
      `${this.doctorsUrl}/medical-record-access-requests/inbox`,
      { params },
    );
  }

  doctorAccessRequestDetails(requestId: string): Observable<OwnerAccessRequestItem> {
    return this.http.get<OwnerAccessRequestItem>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}`,
    );
  }

  doctorApproveAccessRequest(
    requestId: string,
    body: ApproveHiddenAccessRequest,
  ): Observable<OwnerAccessRequestItem> {
    return this.http.post<OwnerAccessRequestItem>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/approve`,
      body,
    );
  }

  doctorRejectAccessRequest(
    requestId: string,
    body: RejectHiddenAccessRequest,
  ): Observable<OwnerAccessRequestItem> {
    return this.http.post<OwnerAccessRequestItem>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/reject`,
      body,
    );
  }

  doctorRevokeAccessGrant(
    requestId: string,
    body: RevokeHiddenAccessRequest,
  ): Observable<OwnerAccessRequestItem> {
    return this.http.post<OwnerAccessRequestItem>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/revoke`,
      body,
    );
  }

  doctorAccessRequestHistory(requestId: string): Observable<readonly AccessRequestHistoryItem[]> {
    return this.http.get<readonly AccessRequestHistoryItem[]>(
      `${this.doctorsUrl}/medical-record-access-requests/${requestId}/history`,
    );
  }

  // === Encounter Visibility Controls (WAS-609 .. WAS-610) ===

  doctorUpdateEncounterVisibility(
    practiceId: string,
    encounterId: string,
    body: UpdateEncounterVisibilityRequest,
  ): Observable<UpdateEncounterVisibilityResponse> {
    return this.http.patch<UpdateEncounterVisibilityResponse>(
      `${this.doctorsUrl}/practices/${practiceId}/encounters/${encounterId}/visibility`,
      body,
    );
  }

  doctorEncounterVisibilityHistory(
    practiceId: string,
    encounterId: string,
  ): Observable<readonly VisibilityHistoryItem[]> {
    return this.http.get<readonly VisibilityHistoryItem[]>(
      `${this.doctorsUrl}/practices/${practiceId}/encounters/${encounterId}/visibility/history`,
    );
  }
}
