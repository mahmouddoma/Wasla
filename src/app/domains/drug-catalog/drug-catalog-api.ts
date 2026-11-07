import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';
import {
  DrugCatalogResponse,
  DrugCatalogDetailsResponse,
  mapDrug,
  mapDrugDetails,
} from './drug-catalog-mappers';
import { DrugData, DrugMutation, DrugPage, DrugQuery } from './drug-catalog.models';

@Injectable({ providedIn: 'root' })
export class DrugCatalogApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;
  private readonly catalog = `${this.root}/admin/drug-catalog`;

  list(query: DrugQuery) {
    return this.http
      .get<Omit<DrugPage, 'items'> & { items: DrugCatalogResponse[] }>(this.catalog, {
        params: this.params(query),
      })
      .pipe(map((page) => ({ ...page, items: (page.items ?? []).map(mapDrug) })));
  }
  searchActive(query: Omit<DrugQuery, 'status'>) {
    return this.http
      .get<Omit<DrugPage, 'items'> & { items: DrugCatalogResponse[] }>(
        `${this.root}/doctors/me/drug-catalog`,
        {
          params: this.params(query),
        },
      )
      .pipe(map((page) => ({ ...page, items: (page.items ?? []).map(mapDrug) })));
  }
  details(drugId: string) {
    return this.http.get<DrugCatalogDetailsResponse>(this.url(drugId)).pipe(map(mapDrugDetails));
  }
  create(body: DrugData) {
    return this.http.post<DrugCatalogDetailsResponse>(this.catalog, body).pipe(map(mapDrugDetails));
  }
  update(drugId: string, data: DrugData, body: DrugMutation) {
    return this.http
      .put<DrugCatalogDetailsResponse>(this.url(drugId), { data, ...body })
      .pipe(map(mapDrugDetails));
  }
  activate(drugId: string, body: DrugMutation) {
    return this.http
      .post<DrugCatalogDetailsResponse>(`${this.url(drugId)}/activate`, body)
      .pipe(map(mapDrugDetails));
  }
  deactivate(drugId: string, body: DrugMutation) {
    return this.http
      .post<DrugCatalogDetailsResponse>(`${this.url(drugId)}/deactivate`, body)
      .pipe(map(mapDrugDetails));
  }
  merge(sourceDrugId: string, targetDrugCatalogId: string, body: DrugMutation, intentKey: string) {
    return this.http
      .post<DrugCatalogDetailsResponse>(
        `${this.url(sourceDrugId)}/merge`,
        { ...body, targetDrugCatalogId },
        { headers: { 'Idempotency-Key': intentKey } },
      )
      .pipe(map(mapDrugDetails));
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
