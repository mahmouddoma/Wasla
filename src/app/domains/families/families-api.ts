import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Family,
  FamilyMember,
  FamilyRequestDocument,
  FamilyRequestDetails,
  FamilyRequestHistoryItem,
  FamilyRequestPage,
  FamilyRequestQuery,
  FamilyRequestStatus,
  FamilyRequestType,
  FamilyRole,
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
    return this.detailsRequest(
      this.http.post<FamilyRequestDetailsResponse>(this.requestsUrl, requestBody(request)),
    );
  }

  requests(query: FamilyRequestQuery): Observable<FamilyRequestPage> {
    return this.http.get<FamilyRequestPage>(`${this.requestsUrl}/mine`, {
      params: queryParams(query),
    });
  }

  details(requestId: string): Observable<FamilyRequestDetails> {
    return this.detailsRequest(
      this.http.get<FamilyRequestDetailsResponse>(`${this.requestsUrl}/${requestId}`),
    );
  }

  document(requestId: string, documentId: string): Observable<HttpResponse<Blob>> {
    return this.privateDocument(`${this.requestsUrl}/${requestId}/documents/${documentId}`);
  }

  resubmit(requestId: string, request: ResubmitFamilyRequest): Observable<FamilyRequestDetails> {
    return this.detailsRequest(
      this.http.post<FamilyRequestDetailsResponse>(
        `${this.requestsUrl}/${requestId}/resubmit`,
        revisionBody(request),
      ),
    );
  }

  submitAssisted(request: SubmitAssistedFamilyRequest): Observable<FamilyRequestDetails> {
    const body = requestBody(request);
    body.append('RequesterPatientId', request.requesterPatientId.trim());
    return this.detailsRequest(
      this.http.post<FamilyRequestDetailsResponse>(this.assistedUrl, body),
    );
  }

  assistedRequests(query: FamilyRequestQuery): Observable<FamilyRequestPage> {
    return this.http.get<FamilyRequestPage>(this.assistedUrl, { params: queryParams(query) });
  }

  assistedDetails(requestId: string): Observable<FamilyRequestDetails> {
    return this.detailsRequest(
      this.http.get<FamilyRequestDetailsResponse>(`${this.assistedUrl}/${requestId}`),
    );
  }

  assistedDocument(requestId: string, documentId: string): Observable<HttpResponse<Blob>> {
    return this.privateDocument(`${this.assistedUrl}/${requestId}/documents/${documentId}`);
  }

  resubmitAssisted(
    requestId: string,
    request: ResubmitFamilyRequest,
  ): Observable<FamilyRequestDetails> {
    return this.detailsRequest(
      this.http.post<FamilyRequestDetailsResponse>(
        `${this.assistedUrl}/${requestId}/resubmit`,
        revisionBody(request),
      ),
    );
  }

  adminRequests(query: FamilyRequestQuery): Observable<FamilyRequestPage> {
    return this.http.get<FamilyRequestPage>(this.adminUrl, { params: queryParams(query) });
  }

  adminDetails(requestId: string): Observable<FamilyRequestDetails> {
    return this.detailsRequest(
      this.http.get<FamilyRequestDetailsResponse>(`${this.adminUrl}/${requestId}`),
    );
  }

  adminDocument(requestId: string, documentId: string): Observable<HttpResponse<Blob>> {
    return this.privateDocument(`${this.adminUrl}/${requestId}/documents/${documentId}`);
  }

  requestModification(
    requestId: string,
    request: FamilyReviewMessageRequest,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.adminUrl}/${requestId}/request-modification`,
      request,
    );
  }

  approve(
    requestId: string,
    request: FamilyReviewDecisionRequest,
  ): Observable<void> {
    return this.http.post<void>(`${this.adminUrl}/${requestId}/approve`, request);
  }

  reject(requestId: string, request: FamilyReviewReasonRequest): Observable<void> {
    return this.http.post<void>(`${this.adminUrl}/${requestId}/reject`, request);
  }

  private privateDocument(url: string): Observable<HttpResponse<Blob>> {
    return this.http.get(url, { observe: 'response', responseType: 'blob' });
  }

  private detailsRequest(
    request: Observable<FamilyRequestDetailsResponse>,
  ): Observable<FamilyRequestDetails> {
    return request.pipe(map(normalizeFamilyRequestDetails));
  }
}

interface FamilyRequestDetailsResponse {
  request: {
    requestId: string;
    requestType: FamilyRequestType;
    status: FamilyRequestStatus;
    familyId: string | null;
    currentRevisionNumber: number;
    rowVersion: string;
  };
  requester: FamilyRequestPartyResponse;
  target: FamilyRequestPartyResponse;
  requesterClaimedRole: Exclude<FamilyRole, 'Child'>;
  targetClaimedRole: FamilyRole;
  modificationMessage: string | null;
  rejectionReason: string | null;
  familyMembers: FamilyMember[];
  documents: FamilyRequestDocumentResponse[];
  history: FamilyRequestHistoryResponse[];
}

interface FamilyRequestPartyResponse {
  patientId: string;
  nameAr: string;
}

interface FamilyRequestDocumentResponse {
  documentId: string;
  documentType: string;
  originalFileName: string;
  revisionNumber: number;
  uploadedOnUtc: string;
}

interface FamilyRequestHistoryResponse {
  action: string;
  performedOnUtc: string;
  messageOrReason: string | null;
  revisionNumber: number;
}

function normalizeFamilyRequestDetails(
  response: FamilyRequestDetailsResponse,
): FamilyRequestDetails {
  const submittedOnUtc =
    response.history.find((item) => item.action === 'Submitted')?.performedOnUtc ??
    response.documents[0]?.uploadedOnUtc ??
    '';
  const documents: FamilyRequestDocument[] = response.documents.map((document) => ({
    documentId: document.documentId,
    documentType: document.documentType,
    fileName: document.originalFileName,
    revisionNumber: document.revisionNumber,
  }));
  const history: FamilyRequestHistoryItem[] = response.history.map((item) => ({
    action: item.action,
    occurredOnUtc: item.performedOnUtc,
    message: item.messageOrReason,
    revisionNumber: item.revisionNumber,
  }));

  return {
    requestId: response.request.requestId,
    requestType: response.request.requestType,
    status: response.request.status,
    requesterPatientId: response.requester.patientId,
    requesterNameAr: response.requester.nameAr,
    targetPatientId: response.target.patientId,
    targetNameAr: response.target.nameAr,
    requesterClaimedRole: response.requesterClaimedRole,
    targetClaimedRole: response.targetClaimedRole,
    currentRevisionNumber: response.request.currentRevisionNumber,
    submittedOnUtc,
    rowVersion: response.request.rowVersion,
    familyId: response.request.familyId,
    modificationMessage: response.modificationMessage,
    rejectionReason: response.rejectionReason,
    currentFamilyMembers: response.familyMembers,
    documents,
    history,
  };
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
