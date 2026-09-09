import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePatientRequest,
  CreatePatientResponse,
  PagedResponse,
  PatientContact,
  PatientProfile,
  PatientSearchItem,
  PatientSearchQuery,
  UpdatePatientProfileRequest,
  UpsertPatientContactRequest,
} from './patient.models';

@Injectable({ providedIn: 'root' })
export class PatientsApi {
  private readonly http = inject(HttpClient);
  private readonly patientsUrl = `${environment.apiBaseUrl}/api/v1/patients`;
  private readonly meUrl = `${this.patientsUrl}/me`;

  create(request: CreatePatientRequest): Observable<CreatePatientResponse> {
    const body = new FormData();
    appendText(body, 'NameAr', request.nameAr);
    appendText(body, 'NameEn', request.nameEn);
    appendText(body, 'DateOfBirth', request.dateOfBirth);
    appendText(body, 'Gender', request.gender);
    appendText(body, 'PhoneNumber', request.phoneNumber);
    appendText(body, 'Email', request.email);
    if (request.profileImage) body.append('ProfileImage', request.profileImage);
    if (
      !request.phoneNumber.trim() ||
      request.primaryContactNameAr.trim() ||
      request.primaryContactPhoneNumber.trim() ||
      request.primaryContactLinkedPatientId.trim()
    ) {
      appendText(body, 'PrimaryContactNameAr', request.primaryContactNameAr);
      appendText(body, 'PrimaryContactPhoneNumber', request.primaryContactPhoneNumber);
      appendText(body, 'PrimaryContactRelationshipType', request.primaryContactRelationshipType);
      body.append('PrimaryContactIsPrimary', String(request.primaryContactIsPrimary));
      appendText(body, 'PrimaryContactLinkedPatientId', request.primaryContactLinkedPatientId);
    }
    return this.http.post<CreatePatientResponse>(this.patientsUrl, body);
  }

  search(query: PatientSearchQuery): Observable<PagedResponse<PatientSearchItem>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.phoneNumber?.trim()) params = params.set('phoneNumber', query.phoneNumber.trim());
    if (query.name?.trim()) params = params.set('name', query.name.trim());
    if (query.dateOfBirth) params = params.set('dateOfBirth', query.dateOfBirth);
    return this.http.get<PagedResponse<PatientSearchItem>>(`${this.patientsUrl}/search`, {
      params,
    });
  }

  profile(): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(this.meUrl);
  }

  profileImage(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.meUrl}/profile-image`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  updateProfile(request: UpdatePatientProfileRequest): Observable<PatientProfile> {
    const body = new FormData();
    appendText(body, 'NameAr', request.nameAr);
    appendText(body, 'NameEn', request.nameEn);
    appendText(body, 'PhoneNumber', request.phoneNumber);
    appendText(body, 'Email', request.email);
    body.append('RowVersion', request.rowVersion);
    if (request.profileImage) body.append('ProfileImage', request.profileImage);
    return this.http.put<PatientProfile>(this.meUrl, body);
  }

  contacts(): Observable<PatientContact[]> {
    return this.http.get<PatientContact[]>(`${this.meUrl}/contacts`);
  }

  addContact(request: UpsertPatientContactRequest): Observable<PatientContact> {
    return this.http.post<PatientContact>(`${this.meUrl}/contacts`, request);
  }

  updateContact(
    contactId: string,
    request: UpsertPatientContactRequest,
  ): Observable<PatientContact> {
    return this.http.put<PatientContact>(`${this.meUrl}/contacts/${contactId}`, request);
  }

  deactivateContact(contactId: string): Observable<void> {
    return this.http.delete<void>(`${this.meUrl}/contacts/${contactId}`);
  }
}

function appendText(body: FormData, key: string, value: string): void {
  const normalized = value.trim();
  if (normalized) body.append(key, normalized);
}
