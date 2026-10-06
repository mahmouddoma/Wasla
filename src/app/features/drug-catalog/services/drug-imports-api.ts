import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  DrugImportBatch,
  ImportChangePage,
  ImportChangeType,
  ImportPage,
} from '../models/drug-import.models';
@Injectable({ providedIn: 'root' })
export class DrugImportsApi {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl + '/api/v1/admin/drug-catalog/imports';
  preview(file: File, sourceVersion: string, sourceCommitSha: string) {
    const body = new FormData();
    body.append('file', file);
    if (sourceVersion.trim()) body.append('sourceVersion', sourceVersion.trim());
    if (sourceCommitSha.trim()) body.append('sourceCommitSha', sourceCommitSha.trim());
    return this.http.post<DrugImportBatch>(this.root + '/preview', body);
  }
  changes(batchId: string, changeType: ImportChangeType | undefined, pageNumber: number) {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', 20);
    if (changeType) params = params.set('changeType', changeType);
    return this.http.get<ImportChangePage>(
      this.root + '/' + encodeURIComponent(batchId) + '/changes',
      { params },
    );
  }
  apply(batchId: string, intentKey: string) {
    return this.http.post<DrugImportBatch>(
      this.root + '/' + encodeURIComponent(batchId) + '/apply',
      null,
      { headers: { 'Idempotency-Key': intentKey } },
    );
  }
  list(pageNumber: number) {
    return this.http.get<ImportPage>(this.root, {
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', 20),
    });
  }
  details(batchId: string) {
    return this.http.get<DrugImportBatch>(this.root + '/' + encodeURIComponent(batchId));
  }
}
