import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type {
  DiagnosticKind,
  DiagnosticActionRequest,
  DiagnosticHistoryResponse,
} from '../medical-catalog';
import * as C from './contracts';

export type DiagnosticActor = 'Doctor' | 'Patient';
export interface DiagnosticQuery {
  PracticeId?: string;
  PatientId?: string;
  EncounterId?: string;
  RequestId?: string;
  Origin?: C.DiagnosticOrigin;
  Status?: string;
  SubmissionStatus?: C.PatientSubmissionStatus;
  FromUtc?: string;
  ToUtc?: string;
  PageNumber: number;
  PageSize: number;
}
export interface DiagnosticUpload {
  readonly attachments: readonly File[];
  readonly attachmentKinds: readonly C.DiagnosticAttachmentKind[];
  readonly coveredItemIds: readonly string[];
  readonly providerName: string;
  readonly reportDate: string;
  readonly patientNote: string;
  readonly rowVersion: string | null;
  readonly reason: string;
}
@Injectable({ providedIn: 'root' })
export class DiagnosticsApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;
  draft(kind: DiagnosticKind, practiceId: string, encounterId: string) {
    return this.http.get<C.DiagnosticRequestStateResponse>(
      this.encounter(kind, practiceId, encounterId),
    );
  }
  add(
    kind: DiagnosticKind,
    practiceId: string,
    encounterId: string,
    body: C.LabAddItemRequest | C.RadiologyAddItemRequest,
    key: string,
  ) {
    return this.http.post<C.DiagnosticRequestStateResponse>(
      `${this.encounter(kind, practiceId, encounterId)}/items`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
  }
  edit(
    kind: DiagnosticKind,
    practiceId: string,
    encounterId: string,
    id: string,
    body: C.LabAddItemRequest | C.RadiologyAddItemRequest,
  ) {
    return this.http.put<C.DiagnosticRequestStateResponse>(
      `${this.encounter(kind, practiceId, encounterId)}/items/${encodeURIComponent(id)}`,
      body,
    );
  }
  remove(
    kind: DiagnosticKind,
    practiceId: string,
    encounterId: string,
    id: string,
    rowVersion: string,
  ) {
    return this.http.delete<C.DiagnosticRequestStateResponse>(
      `${this.encounter(kind, practiceId, encounterId)}/items/${encodeURIComponent(id)}`,
      { params: { rowVersion } },
    );
  }
  postVisit(
    kind: DiagnosticKind,
    practiceId: string,
    encounterId: string,
    body: {
      postVisitReason: string | null;
      patientInstructions: string | null;
      items: readonly (C.LabOrderItemRequest | C.RadiologyOrderItemRequest)[];
    },
    key: string,
  ) {
    return this.http.post<C.DiagnosticRequestStateResponse>(
      `${this.encounter(kind, practiceId, encounterId)}s/post-visit`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
  }
  requests(kind: DiagnosticKind, actor: DiagnosticActor, query: DiagnosticQuery) {
    return this.http.get<C.DiagnosticRequestSummaryClinicalPage>(
      this.collection(kind, 'requests', actor),
      { params: this.params(query) },
    );
  }
  request(kind: DiagnosticKind, actor: DiagnosticActor, id: string) {
    return this.http.get<C.DiagnosticRequestStateResponse>(
      `${this.collection(kind, 'requests', actor)}/${encodeURIComponent(id)}`,
    );
  }
  history(kind: DiagnosticKind, id: string) {
    return this.http.get<readonly DiagnosticHistoryResponse[]>(
      `${this.collection(kind, 'requests', 'Doctor')}/${encodeURIComponent(id)}/history`,
    );
  }
  cancel(
    kind: DiagnosticKind,
    requestId: string,
    itemId: string | null,
    body: DiagnosticActionRequest,
  ) {
    const action = itemId ? `items/${encodeURIComponent(itemId)}/cancel` : 'cancel-remaining';
    return this.http.post<C.DiagnosticRequestStateResponse>(
      `${this.collection(kind, 'requests', 'Doctor')}/${encodeURIComponent(requestId)}/${action}`,
      body,
    );
  }
  results(kind: DiagnosticKind, actor: DiagnosticActor, query: DiagnosticQuery) {
    return this.http.get<C.DiagnosticResultResponseClinicalPage>(
      this.collection(kind, 'results', actor),
      { params: this.params(query) },
    );
  }
  result(kind: DiagnosticKind, actor: DiagnosticActor, id: string) {
    return this.http.get<C.DiagnosticResultResponse>(
      `${this.collection(kind, 'results', actor)}/${encodeURIComponent(id)}`,
    );
  }
  versions(kind: DiagnosticKind, id: string) {
    return this.http.get<readonly C.DiagnosticVersionResponse[]>(
      `${this.collection(kind, 'results', 'Doctor')}/${encodeURIComponent(id)}/versions`,
    );
  }
  version(kind: DiagnosticKind, id: string, number: number) {
    return this.http.get<C.DiagnosticVersionResponse>(
      `${this.collection(kind, 'results', 'Doctor')}/${encodeURIComponent(id)}/versions/${number}`,
    );
  }
  inbox(kind: DiagnosticKind, query: DiagnosticQuery, status?: string) {
    return this.http.get<C.DiagnosticSubmissionSummaryClinicalPage>(
      this.collection(kind, 'result-submissions', 'Doctor'),
      { params: this.params({ ...query, status }) },
    );
  }
  submissions(kind: DiagnosticKind, requestId: string, pageNumber: number) {
    return this.http.get<C.DiagnosticSubmissionSummaryClinicalPage>(
      `${this.collection(kind, 'requests', 'Patient')}/${encodeURIComponent(requestId)}/submissions`,
      { params: { pageNumber, pageSize: 20 } },
    );
  }
  submission(kind: DiagnosticKind, actor: DiagnosticActor, id: string) {
    return this.http.get<C.DiagnosticSubmissionResponse>(
      `${this.collection(kind, 'result-submissions', actor)}/${encodeURIComponent(id)}`,
    );
  }
  accept(
    kind: DiagnosticKind,
    id: string,
    body: C.LabAcceptSubmissionRequest | C.RadiologyAcceptSubmissionRequest,
    key: string,
  ) {
    return this.http.post<C.DiagnosticResultMutationResponse>(
      `${this.collection(kind, 'result-submissions', 'Doctor')}/${encodeURIComponent(id)}/accept`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
  }
  reject(kind: DiagnosticKind, id: string, body: C.DiagnosticRejectSubmissionRequest) {
    return this.http.post<C.DiagnosticResultMutationResponse>(
      `${this.collection(kind, 'result-submissions', 'Doctor')}/${encodeURIComponent(id)}/reject`,
      body,
    );
  }
  withdraw(kind: DiagnosticKind, id: string, body: DiagnosticActionRequest) {
    return this.http.post<C.DiagnosticResultMutationResponse>(
      `${this.collection(kind, 'result-submissions', 'Patient')}/${encodeURIComponent(id)}/withdraw`,
      body,
    );
  }
  upload(
    kind: DiagnosticKind,
    actor: DiagnosticActor,
    id: string,
    upload: DiagnosticUpload,
    key: string,
    correction = false,
  ) {
    const base = this.collection(kind, correction ? 'results' : 'requests', actor);
    const action = correction ? 'corrections' : actor === 'Doctor' ? 'results' : 'submissions';
    return this.http.post<C.DiagnosticResultMutationResponse>(
      `${base}/${encodeURIComponent(id)}/${action}`,
      this.formData(kind, actor, upload),
      { headers: { 'Idempotency-Key': key } },
    );
  }
  voidResult(kind: DiagnosticKind, id: string, body: DiagnosticActionRequest, key: string) {
    return this.http.post<C.DiagnosticResultMutationResponse>(
      `${this.collection(kind, 'results', 'Doctor')}/${encodeURIComponent(id)}/void`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
  }
  download(
    kind: DiagnosticKind,
    actor: DiagnosticActor,
    type: 'results' | 'result-submissions',
    id: string,
    attachmentId: string,
    version?: number,
  ) {
    const prefix = type === 'results' && actor === 'Doctor' ? `/versions/${version}` : '';
    return this.http.get(
      `${this.collection(kind, type, actor)}/${encodeURIComponent(id)}${prefix}/attachments/${encodeURIComponent(attachmentId)}/content`,
      { responseType: 'blob', observe: 'response' },
    );
  }
  private formData(kind: DiagnosticKind, actor: DiagnosticActor, upload: DiagnosticUpload) {
    if (!upload.attachments.length || upload.attachments.length !== upload.attachmentKinds.length)
      throw Error('Attachment kinds must match files');
    const data = new FormData();
    upload.attachments.forEach((file) => data.append('Attachments', file));
    upload.attachmentKinds.forEach((value) => data.append('AttachmentKinds', value));
    if (actor === 'Doctor') {
      upload.coveredItemIds.forEach((id) =>
        data.append(
          kind === 'lab' ? 'CoveredLabRequestItemIds' : 'CoveredRadiologyRequestItemIds',
          id,
        ),
      );
      if (upload.rowVersion) data.append('RowVersion', upload.rowVersion);
      if (upload.reason) data.append('Reason', upload.reason);
    }
    data.append(
      kind === 'lab' ? 'ExternalLaboratoryName' : 'ExternalRadiologyCenterName',
      upload.providerName,
    );
    if (upload.reportDate) data.append('ExternalReportDate', upload.reportDate);
    if (upload.patientNote) data.append('PatientNote', upload.patientNote);
    return data;
  }
  private collection(kind: DiagnosticKind, collection: string, actor: DiagnosticActor) {
    return `${this.root}/${actor === 'Doctor' ? 'doctors/me/' : ''}${kind}-${collection}${actor === 'Patient' ? '/mine' : ''}`;
  }
  private encounter(kind: DiagnosticKind, practiceId: string, encounterId: string) {
    return `${this.root}/doctors/me/practices/${encodeURIComponent(practiceId)}/encounters/${encodeURIComponent(encounterId)}/${kind}-request`;
  }
  private params(query: object) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return params;
  }
}
