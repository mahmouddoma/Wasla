import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Family,
  FamilyRequestDetails,
  FamilyRequestPage,
  FamilyRequestQuery,
  FamilyReviewDecisionRequest,
  FamilyReviewMessageRequest,
  FamilyReviewReasonRequest,
  ResubmitFamilyRequest,
  SubmitAssistedFamilyRequest,
  SubmitFamilyRequest,
} from './family.models';

@Injectable({ providedIn: 'root' })
export class FamiliesApi {
  private readonly http = inject(HttpClient);
  private readonly familiesUrl = `${environment.apiBaseUrl}/api/v1/families`;
  private readonly requestsUrl = `${environment.apiBaseUrl}/api/v1/family-relationship-requests`;
  private readonly assistedUrl = `${this.requestsUrl}/assisted`;
  private readonly adminUrl = `${environment.apiBaseUrl}/api/v1/admin/family-relationship-requests`;

  mine(): Observable<Family> {
    return this.http.get<Family>(`${this.familiesUrl}/mine`);
  }

  submit(request: SubmitFamilyRequest): Observable<FamilyRequestDetails> {
    return this.http.post<FamilyRequestDetails>(this.requestsUrl, requestBody(request));
  }

  requests(query: FamilyRequestQuery): Observable<FamilyRequestPage> {
    return this.http.get<FamilyRequestPage>(`${this.requestsUrl}/mine`, {
      params: queryParams(query),
    });
  }

  details(requestId: string): Observable<FamilyRequestDetails> {
    return this.http.get<FamilyRequestDetails>(`${this.requestsUrl}/${requestId}`);
  }

  document(requestId: string, documentId: string): Observable<HttpResponse<Blob>> {
    return this.privateDocument(`${this.requestsUrl}/${requestId}/documents/${documentId}`);
  }

  resubmit(requestId: string, request: ResubmitFamilyRequest): Observable<FamilyRequestDetails> {
    return this.http.post<FamilyRequestDetails>(
      `${this.requestsUrl}/${requestId}/resubmit`,
      revisionBody(request),
    );
  }

  submitAssisted(request: SubmitAssistedFamilyRequest): Observable<FamilyRequestDetails> {
    const body = requestBody(request);
    body.append('RequesterPatientId', request.requesterPatientId.trim());
    return this.http.post<FamilyRequestDetails>(this.assistedUrl, body);
  }

  assistedRequests(query: FamilyRequestQuery): Observable<FamilyRequestPage> {
    return this.http.get<FamilyRequestPage>(this.assistedUrl, { params: queryParams(query) });
  }

  assistedDetails(requestId: string): Observable<FamilyRequestDetails> {
    return this.http.get<FamilyRequestDetails>(`${this.assistedUrl}/${requestId}`);
  }

  assistedDocument(requestId: string, documentId: string): Observable<HttpResponse<Blob>> {
    return this.privateDocument(`${this.assistedUrl}/${requestId}/documents/${documentId}`);
  }

  resubmitAssisted(
    requestId: string,
    request: ResubmitFamilyRequest,
  ): Observable<FamilyRequestDetails> {
    return this.http.post<FamilyRequestDetails>(
      `${this.assistedUrl}/${requestId}/resubmit`,
      revisionBody(request),
    );
  }

  adminRequests(query: FamilyRequestQuery): Observable<FamilyRequestPage> {
    return this.http.get<FamilyRequestPage>(this.adminUrl, { params: queryParams(query) });
  }

  adminDetails(requestId: string): Observable<FamilyRequestDetails> {
    return this.http.get<FamilyRequestDetails>(`${this.adminUrl}/${requestId}`);
  }

  adminDocument(requestId: string, documentId: string): Observable<HttpResponse<Blob>> {
    return this.privateDocument(`${this.adminUrl}/${requestId}/documents/${documentId}`);
  }

  requestModification(
    requestId: string,
    request: FamilyReviewMessageRequest,
  ): Observable<FamilyRequestDetails> {
    return this.http.post<FamilyRequestDetails>(
      `${this.adminUrl}/${requestId}/request-modification`,
      request,
    );
  }

  approve(
    requestId: string,
    request: FamilyReviewDecisionRequest,
  ): Observable<FamilyRequestDetails> {
    return this.http.post<FamilyRequestDetails>(`${this.adminUrl}/${requestId}/approve`, request);
  }

  reject(requestId: string, request: FamilyReviewReasonRequest): Observable<FamilyRequestDetails> {
    return this.http.post<FamilyRequestDetails>(`${this.adminUrl}/${requestId}/reject`, request);
  }

  private privateDocument(url: string): Observable<HttpResponse<Blob>> {
    return this.http.get(url, { observe: 'response', responseType: 'blob' });
  }
}

function queryParams(query: FamilyRequestQuery): HttpParams {
  let params = new HttpParams().set('pageNumber', query.pageNumber).set('pageSize', query.pageSize);
  if (query.status) params = params.set('status', query.status);
  if (query.requestType) params = params.set('requestType', query.requestType);
  if (query.search?.trim()) params = params.set('search', query.search.trim());
  return params;
}

function requestBody(request: SubmitFamilyRequest): FormData {
  const body = revisionBody(request);
  body.append('RequestType', request.requestType);
  if (request.familyId.trim()) body.append('FamilyId', request.familyId.trim());
  body.append('TargetPatientId', request.targetPatientId.trim());
  body.append('RequesterClaimedRole', request.requesterClaimedRole);
  body.append('TargetClaimedRole', request.targetClaimedRole);
  return body;
}

function revisionBody(
  request: Pick<SubmitFamilyRequest, 'evidenceFiles' | 'documentTypes'> & { rowVersion?: string },
): FormData {
  const body = new FormData();
  request.evidenceFiles.forEach((file) => body.append('EvidenceFiles', file));
  request.documentTypes.forEach((type) => body.append('DocumentTypes', type));
  if (request.rowVersion) body.append('RowVersion', request.rowVersion);
  return body;
}
