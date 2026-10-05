import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  CreateEncounterAmendmentRequest,
  DiagnosisDraft,
  EncounterAmendment,
  EncounterDetails,
  EncounterPage,
  EncounterQuery,
  PatientEncounterDetails,
} from './encounter.models';

@Injectable({ providedIn: 'root' })
export class EncountersApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;
  list(practiceId: string, query: EncounterQuery) {
    return this.http.get<EncounterPage>(this.practiceUrl(practiceId), {
      params: this.params(query),
    });
  }
  details(practiceId: string, encounterId: string) {
    return this.http.get<EncounterDetails>(this.url(practiceId, encounterId));
  }
  byTicket(practiceId: string, ticketId: string) {
    return this.http.get<EncounterDetails>(
      `${this.root}/doctors/me/practices/${this.id(practiceId)}/tickets/${this.id(ticketId)}/encounter`,
    );
  }
  updateNotes(practiceId: string, encounterId: string, clinicalNotes: string, rowVersion: string) {
    return this.http.patch<EncounterDetails>(
      `${this.url(practiceId, encounterId)}/clinical-notes`,
      { clinicalNotes, rowVersion },
    );
  }
  addDiagnosis(
    practiceId: string,
    encounterId: string,
    draft: DiagnosisDraft,
    encounterRowVersion: string,
  ) {
    return this.http.post<EncounterDetails>(`${this.url(practiceId, encounterId)}/diagnoses`, {
      ...draft,
      encounterRowVersion,
    });
  }
  updateDiagnosis(
    practiceId: string,
    encounterId: string,
    diagnosisId: string,
    draft: DiagnosisDraft,
    encounterRowVersion: string,
  ) {
    return this.http.put<EncounterDetails>(
      `${this.url(practiceId, encounterId)}/diagnoses/${this.id(diagnosisId)}`,
      { ...draft, encounterRowVersion },
    );
  }
  removeDiagnosis(
    practiceId: string,
    encounterId: string,
    diagnosisId: string,
    rowVersion: string,
  ) {
    return this.http.delete<EncounterDetails>(
      `${this.url(practiceId, encounterId)}/diagnoses/${this.id(diagnosisId)}`,
      { body: { rowVersion } },
    );
  }
  amendments(practiceId: string, encounterId: string) {
    return this.http.get<readonly EncounterAmendment[]>(
      `${this.url(practiceId, encounterId)}/amendments`,
    );
  }
  createAmendment(
    practiceId: string,
    encounterId: string,
    request: CreateEncounterAmendmentRequest,
  ) {
    return this.http.post<EncounterDetails>(
      `${this.url(practiceId, encounterId)}/amendments`,
      request,
    );
  }
  createFollowUp(practiceId: string, encounterId: string, validUntil: string) {
    return this.http.post<{
      readonly eligibilityId: string;
      readonly validUntil: string;
      readonly status: string;
    }>(`${this.url(practiceId, encounterId)}/follow-up-eligibility`, { validUntil });
  }
  mine(pageNumber: number, pageSize: number) {
    return this.http.get<EncounterPage>(`${this.root}/encounters/mine`, {
      params: { pageNumber, pageSize },
    });
  }
  myDetails(encounterId: string) {
    return this.http.get<PatientEncounterDetails>(
      `${this.root}/encounters/mine/${this.id(encounterId)}`,
    );
  }
  private practiceUrl(practiceId: string) {
    return `${this.root}/doctors/me/practices/${this.id(practiceId)}/encounters`;
  }
  private url(practiceId: string, encounterId: string) {
    return `${this.practiceUrl(practiceId)}/${this.id(encounterId)}`;
  }
  private id(value: string) {
    if (!value.trim()) throw new Error('Identifier required');
    return encodeURIComponent(value);
  }
  private params(query: EncounterQuery) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return params;
  }
}
