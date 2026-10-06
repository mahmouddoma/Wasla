import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  DrugCatalogDetails,
  DrugData,
  DrugMutation,
  DrugPage,
  DrugQuery,
} from './drug-catalog.models';

@Injectable({ providedIn: 'root' })
export class DrugCatalogApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;
  private readonly catalog = `${this.root}/admin/drug-catalog`;

  list(query: DrugQuery) {
    return this.http.get<DrugPage>(this.catalog, { params: this.params(query) });
  }
  searchActive(query: Omit<DrugQuery, 'status'>) {
    return this.http.get<DrugPage>(`${this.root}/doctors/me/drug-catalog`, {
      params: this.params(query),
    });
  }
  details(drugId: string) {
    return this.http.get<DrugCatalogDetails>(this.url(drugId));
  }
  create(body: DrugData) {
    return this.http.post<DrugCatalogDetails>(this.catalog, body);
  }
  update(drugId: string, data: DrugData, body: DrugMutation) {
    return this.http.put<DrugCatalogDetails>(this.url(drugId), { data, ...body });
  }
  activate(drugId: string, body: DrugMutation) {
    return this.http.post<DrugCatalogDetails>(`${this.url(drugId)}/activate`, body);
  }
  deactivate(drugId: string, body: DrugMutation) {
    return this.http.post<DrugCatalogDetails>(`${this.url(drugId)}/deactivate`, body);
  }
  merge(sourceDrugId: string, targetDrugCatalogId: string, body: DrugMutation, intentKey: string) {
    return this.http.post<DrugCatalogDetails>(
      `${this.url(sourceDrugId)}/merge`,
      { ...body, targetDrugCatalogId },
      { headers: { 'Idempotency-Key': intentKey } },
    );
  }
  private url(id: string) {
    return `${this.catalog}/${encodeURIComponent(id)}`;
  }
  private params(query: Omit<DrugQuery, 'status'> & { status?: string }) {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', query.status);
    return params;
  }
}
