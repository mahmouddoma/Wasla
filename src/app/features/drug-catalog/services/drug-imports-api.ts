import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs';
import {
  DrugImportBatchResponse,
  DrugImportChangeResponse,
  mapDrugImport,
  mapDrugImportChange,
} from '../models/drug-import-mappers';
import {
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
    return this.http
      .post<DrugImportBatchResponse>(this.root + '/preview', body)
      .pipe(map(mapDrugImport));
  }
  changes(batchId: string, changeType: ImportChangeType | undefined, pageNumber: number) {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', 20);
    if (changeType) params = params.set('changeType', changeType);
    return this.http
      .get<Omit<ImportChangePage, 'items'> & { items: DrugImportChangeResponse[] }>(
        this.root + '/' + encodeURIComponent(batchId) + '/changes',
        { params },
      )
      .pipe(map((page) => ({ ...page, items: (page.items ?? []).map(mapDrugImportChange) })));
  }
  apply(batchId: string, intentKey: string) {
    return this.http
      .post<DrugImportBatchResponse>(
        this.root + '/' + encodeURIComponent(batchId) + '/apply',
        null,
        { headers: { 'Idempotency-Key': intentKey } },
      )
      .pipe(map(mapDrugImport));
  }
  list(pageNumber: number) {
    return this.http
      .get<Omit<ImportPage, 'items'> & { items: DrugImportBatchResponse[] }>(this.root, {
        params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', 20),
      })
      .pipe(map((page) => ({ ...page, items: (page.items ?? []).map(mapDrugImport) })));
  }
  details(batchId: string) {
    return this.http
      .get<DrugImportBatchResponse>(this.root + '/' + encodeURIComponent(batchId))
      .pipe(map(mapDrugImport));
  }
}
