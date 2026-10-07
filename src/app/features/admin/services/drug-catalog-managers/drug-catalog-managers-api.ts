import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import {
  CreateManagerRequest,
  DrugCatalogManager,
  ManagerContact,
  ManagerPage,
} from './drug-catalog-managers.models';

export const CATALOG_MANAGER_KIND = new InjectionToken<'drug' | 'medical'>('catalog manager kind', {
  providedIn: 'root',
  factory: () => 'drug',
});

@Injectable({ providedIn: 'root' })
export class DrugCatalogManagersApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1/admin/${inject(CATALOG_MANAGER_KIND)}-catalog-managers`;
  list(search: string, pageNumber: number, pageSize = 20) {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<ManagerPage>(this.root, { params });
  }
  details(id: string) {
    return this.http.get<DrugCatalogManager>(this.url(id));
  }
  create(body: CreateManagerRequest) {
    return this.http.post<DrugCatalogManager>(this.root, body);
  }
  update(id: string, body: ManagerContact) {
    return this.http.put<DrugCatalogManager>(this.url(id), body);
  }
  activate(id: string) {
    return this.http.post<DrugCatalogManager>(`${this.url(id)}/activate`, null);
  }
  deactivate(id: string) {
    return this.http.post<DrugCatalogManager>(`${this.url(id)}/deactivate`, null);
  }
  private url(id: string) {
    return `${this.root}/${encodeURIComponent(id)}`;
  }
}
