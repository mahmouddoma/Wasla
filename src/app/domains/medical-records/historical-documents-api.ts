import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PagedResponse } from '../patients';
import {
  HistoricalDocument,
  HistoricalReceipt,
  HistoricalSubject,
  HistoricalUpload,
  HistoricalVersion,
} from './historical-documents.models';

@Injectable({ providedIn: 'root' })
export class HistoricalDocumentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1`;
  list(subject: HistoricalSubject, pageNumber = 1, includeWithdrawn = false) {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', 20);
    if (subject.kind === 'own') params = params.set('includeWithdrawn', includeWithdrawn);
    return this.http.get<PagedResponse<HistoricalDocument>>(this.root(subject), { params });
  }
  details(subject: HistoricalSubject, id: string) {
    return this.http.get<HistoricalDocument>(`${this.root(subject)}/${this.id(id)}`);
  }
  versions(id: string, pageNumber = 1) {
    return this.http.get<HistoricalVersion[]>(
      `${this.root({ kind: 'own' })}/${this.id(id)}/versions`,
      { params: { pageNumber, pageSize: 20 } },
    );
  }
  upload(subject: HistoricalSubject, request: HistoricalUpload, key: string, documentId?: string) {
    const body = new FormData();
    const { files, ...fields } = request;
    for (const [name, value] of Object.entries(fields))
      if (value !== null && value !== undefined) body.append(name, String(value));
    files.forEach((file) => body.append('Files', file));
    const url = documentId
      ? `${this.root(subject)}/${this.id(documentId)}/versions`
      : this.root(subject);
    return this.http.post<HistoricalReceipt>(url, body, { headers: { 'Idempotency-Key': key } });
  }
  withdraw(
    subject: HistoricalSubject,
    id: string,
    rowVersion: string,
    reason: string,
    key: string,
  ) {
    return this.http.post<HistoricalReceipt>(
      `${this.root(subject)}/${this.id(id)}/withdraw`,
      { rowVersion, reason },
      { headers: { 'Idempotency-Key': key } },
    );
  }
  attachment(subject: HistoricalSubject, id: string, attachmentId: string) {
    return this.http.get(
      `${this.root(subject)}/${this.id(id)}/attachments/${this.id(attachmentId)}/content`,
      { responseType: 'blob', observe: 'response' },
    );
  }
  private root(subject: HistoricalSubject): string {
    return subject.kind === 'own'
      ? `${this.base}/patients/me/historical-documents`
      : `${this.base}/families/mine/dependents/${this.id(subject.patientId)}/historical-documents`;
  }
  private id(value: string): string {
    if (!value.trim()) throw new Error('Resource identifier required');
    return encodeURIComponent(value);
  }
}
