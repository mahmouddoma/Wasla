import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import * as C from './contracts';

export type DiagnosticKind = 'lab' | 'radiology';
export interface CatalogQuery {
  search?: string;
  status?: string;
  source?: string;
  hasArabic?: boolean;
  commonOnly?: boolean;
  pageNumber: number;
  pageSize: number;
}
@Injectable({ providedIn: 'root' })
export class MedicalCatalogApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;
  list(kind: DiagnosticKind, query: CatalogQuery, doctor = false) {
    return this.http.get<C.MedicalCatalogResponseClinicalPage>(this.catalog(kind, doctor), {
      params: this.params(query),
    });
  }
  details(kind: DiagnosticKind, id: string) {
    return this.http.get<C.MedicalCatalogResponse>(
      `${this.catalog(kind)}/${encodeURIComponent(id)}`,
    );
  }
  create(kind: DiagnosticKind, data: C.CatalogPresentation) {
    return this.http.post<C.MedicalCatalogResponse>(this.catalog(kind), data);
  }
  update(kind: DiagnosticKind, id: string, data: C.MedicalCatalogUpdateRequest) {
    return this.http.put<C.MedicalCatalogResponse>(
      `${this.catalog(kind)}/${encodeURIComponent(id)}`,
      data,
    );
  }
  action(
    kind: DiagnosticKind,
    id: string,
    action: 'activate' | 'deactivate' | 'merge',
    body: C.DiagnosticActionRequest,
    key?: string,
  ) {
    return this.http.post<C.MedicalCatalogResponse>(
      `${this.catalog(kind)}/${encodeURIComponent(id)}/${action}`,
      body,
      { headers: key ? { 'Idempotency-Key': key } : {} },
    );
  }
  preview(kind: DiagnosticKind, file: File, sourceVersion: string, key: string) {
    const body = new FormData();
    body.append('File', file);
    body.append('SourceVersion', sourceVersion);
    return this.http.post<C.DiagnosticImportBatchResponse>(
      `${this.catalog(kind)}/imports/preview`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
  }
  imports(kind: DiagnosticKind, pageNumber: number) {
    return this.http.get<C.DiagnosticImportBatchResponseClinicalPage>(
      `${this.catalog(kind)}/imports`,
      { params: { pageNumber, pageSize: 20 } },
    );
  }
  batch(kind: DiagnosticKind, id: string) {
    return this.http.get<C.DiagnosticImportBatchResponse>(
      `${this.catalog(kind)}/imports/${encodeURIComponent(id)}`,
    );
  }
  changes(kind: DiagnosticKind, id: string, pageNumber: number) {
    return this.http.get<C.DiagnosticImportRecordResponseClinicalPage>(
      `${this.catalog(kind)}/imports/${encodeURIComponent(id)}/changes`,
      { params: { pageNumber, pageSize: 20 } },
    );
  }
  apply(kind: DiagnosticKind, id: string, body: C.DiagnosticImportApplyRequest, key: string) {
    return this.http.post<C.DiagnosticImportBatchResponse>(
      `${this.catalog(kind)}/imports/${encodeURIComponent(id)}/apply`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
  }
  discard(kind: DiagnosticKind, id: string, body: C.DiagnosticActionRequest) {
    return this.http.post<C.DiagnosticImportBatchResponse>(
      `${this.catalog(kind)}/imports/${encodeURIComponent(id)}/discard`,
      body,
    );
  }
  requests(kind: DiagnosticKind, pageNumber: number, doctor: boolean, status?: string) {
    return this.http.get<C.MedicalCatalogRequestResponseClinicalPage>(
      this.requestsUrl(kind, doctor),
      { params: this.params({ pageNumber, pageSize: 20, status }) },
    );
  }
  request(kind: DiagnosticKind, id: string, doctor: boolean) {
    return this.http.get<C.MedicalCatalogRequestResponse>(
      `${this.requestsUrl(kind, doctor)}/${encodeURIComponent(id)}`,
    );
  }
  createRequest(
    kind: DiagnosticKind,
    body: C.LabMissingTestRequest | C.RadiologyMissingTestRequest,
    key: string,
  ) {
    return this.http.post<C.MedicalCatalogRequestResponse>(this.requestsUrl(kind, true), body, {
      headers: { 'Idempotency-Key': key },
    });
  }
  updateRequest(
    kind: DiagnosticKind,
    id: string,
    body: {
      data: C.LabMissingTestRequest | C.RadiologyMissingTestRequest;
      rowVersion: string | null;
    },
  ) {
    return this.http.put<C.MedicalCatalogRequestResponse>(
      `${this.requestsUrl(kind, true)}/${encodeURIComponent(id)}`,
      body,
    );
  }
  review(
    kind: DiagnosticKind,
    id: string,
    action: 'request-more-info' | 'approve' | 'reject',
    body: Omit<C.MedicalRequestReviewRequest, 'approvedData'> & {
      approvedData?: C.CatalogPresentation;
    },
    key?: string,
  ) {
    return this.http.post<C.MedicalCatalogRequestResponse>(
      `${this.requestsUrl(kind, false)}/${encodeURIComponent(id)}/${action}`,
      body,
      { headers: key ? { 'Idempotency-Key': key } : {} },
    );
  }
  private catalog(kind: DiagnosticKind, doctor = false) {
    return `${this.root}/${doctor ? 'doctors/me' : 'admin'}/${kind}-catalog`;
  }
  private requestsUrl(kind: DiagnosticKind, doctor: boolean) {
    return `${this.root}/${doctor ? 'doctors/me' : 'admin'}/${kind}-catalog-requests`;
  }
  private params(query: object) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return params;
  }
}
