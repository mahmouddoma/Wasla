import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicationSubmission } from '../prescriptions';
import {
  MedicationApproval,
  MedicationRequest,
  MedicationRequestPage,
  MedicationRequestQuery,
} from './medication-request.models';

function normalizeHistoryEntry(entry: any) {
  if (!entry || typeof entry !== 'object') return entry;
  const date =
    entry.timestamp ??
    entry.createdOnUtc ??
    entry.createdAtUtc ??
    entry.occurredOnUtc ??
    entry.date ??
    '';
  return {
    action: entry.action ?? entry.status ?? '',
    reason: entry.reason ?? entry.note ?? null,
    createdOnUtc: date,
    createdAtUtc: date,
    timestamp: date,
  };
}

function normalizeMedicationRequest(dto: any): MedicationRequest {
  if (!dto || typeof dto !== 'object') return dto;
  const med = dto.medication && typeof dto.medication === 'object' ? dto.medication : {};
  return {
    ...dto,
    medicationName: dto.medicationName ?? med.medicationName ?? '',
    scientificName: dto.scientificName ?? med.scientificName ?? null,
    manufacturer: dto.manufacturer ?? med.manufacturer ?? null,
    strength: dto.strength ?? med.strength ?? null,
    dosageForm: dto.dosageForm ?? med.dosageForm ?? null,
    route: dto.route ?? med.route ?? null,
    drugClass: dto.drugClass ?? med.drugClass ?? null,
    doctorNote: dto.doctorNote ?? med.doctorNote ?? null,
    history: Array.isArray(dto.history) ? dto.history.map(normalizeHistoryEntry) : [],
  };
}

function normalizeMedicationRequestPage(page: any): MedicationRequestPage {
  if (!page || typeof page !== 'object') return page;
  return {
    ...page,
    items: Array.isArray(page.items)
      ? page.items.map(normalizeMedicationRequest)
      : (page.items ?? []),
  };
}

@Injectable({ providedIn: 'root' })
export class MedicationRequestsApi {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl + '/api/v1';
  private doctor = this.root + '/doctors/me/drug-catalog-requests';
  private manager = this.root + '/admin/drug-catalog-requests';
  mine(query: MedicationRequestQuery) {
    return this.http
      .get<MedicationRequestPage>(this.doctor, { params: this.params(query, false) })
      .pipe(map(normalizeMedicationRequestPage));
  }
  myDetails(requestId: string) {
    return this.http
      .get<MedicationRequest>(this.doctor + '/' + encodeURIComponent(requestId))
      .pipe(map(normalizeMedicationRequest));
  }
  create(body: MedicationSubmission) {
    return this.http
      .post<MedicationRequest>(this.doctor, body)
      .pipe(map(normalizeMedicationRequest));
  }
  update(requestId: string, data: MedicationSubmission, rowVersion: string) {
    return this.http
      .put<MedicationRequest>(this.doctor + '/' + encodeURIComponent(requestId), {
        data,
        rowVersion,
      })
      .pipe(map(normalizeMedicationRequest));
  }
  list(query: MedicationRequestQuery) {
    return this.http
      .get<MedicationRequestPage>(this.manager, { params: this.params(query, true) })
      .pipe(map(normalizeMedicationRequestPage));
  }
  details(requestId: string) {
    return this.http
      .get<MedicationRequest>(this.manager + '/' + encodeURIComponent(requestId))
      .pipe(map(normalizeMedicationRequest));
  }
  requestMoreInfo(requestId: string, body: { rowVersion: string; reason: string }) {
    return this.http.post<MedicationRequest>(
      this.manager + '/' + encodeURIComponent(requestId) + '/request-more-info',
      body,
    );
  }
  approve(requestId: string, body: MedicationApproval, intentKey: string) {
    return this.http.post<MedicationRequest>(
      this.manager + '/' + encodeURIComponent(requestId) + '/approve',
      body,
      { headers: { 'Idempotency-Key': intentKey } },
    );
  }
  reject(
    requestId: string,
    body: { rowVersion: string; reason: string; duplicateOfDrugCatalogId?: string },
  ) {
    return this.http.post<MedicationRequest>(
      this.manager + '/' + encodeURIComponent(requestId) + '/reject',
      body,
    );
  }
  private params(query: MedicationRequestQuery, manager: boolean) {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.status) params = params.set('status', query.status);
    if (manager && query.doctorId) params = params.set('doctorId', query.doctorId);
    if (manager && query.search?.trim()) params = params.set('search', query.search.trim());
    return params;
  }
}
