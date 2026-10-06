import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AddPrescriptionItem,
  PatientPrescription,
  PatientPrescriptionPage,
  PrescriptionClinicalFields,
  PrescriptionState,
  PrescriptionVersion,
} from './prescription.models';
@Injectable({ providedIn: 'root' })
export class PrescriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl + '/api/v1';
  private encounter(practiceId: string, encounterId: string) {
    return `${this.root}/doctors/me/practices/${encodeURIComponent(practiceId)}/encounters/${encodeURIComponent(encounterId)}/prescription/items`;
  }
  private prescription(prescriptionId: string) {
    return `${this.root}/doctors/me/prescriptions/${encodeURIComponent(prescriptionId)}`;
  }
  private intent(key: string) {
    return { headers: { 'Idempotency-Key': key } };
  }
  addItem(practiceId: string, encounterId: string, body: AddPrescriptionItem, intentKey: string) {
    return this.http.post<PrescriptionState>(
      this.encounter(practiceId, encounterId),
      body,
      this.intent(intentKey),
    );
  }
  updateItem(
    practiceId: string,
    encounterId: string,
    itemId: string,
    body: PrescriptionClinicalFields & { prescriptionRowVersion: string },
  ) {
    return this.http.put<PrescriptionState>(
      this.encounter(practiceId, encounterId) + '/' + encodeURIComponent(itemId),
      body,
    );
  }
  removeItem(practiceId: string, encounterId: string, itemId: string, rowVersion: string) {
    return this.http.delete<PrescriptionState | null>(
      this.encounter(practiceId, encounterId) + '/' + encodeURIComponent(itemId),
      { params: new HttpParams().set('rowVersion', rowVersion) },
    );
  }
  details(prescriptionId: string) {
    return this.http.get<PrescriptionState>(this.prescription(prescriptionId));
  }
  versions(prescriptionId: string) {
    return this.http.get<readonly PrescriptionVersion[]>(
      this.prescription(prescriptionId) + '/versions',
    );
  }
  versionDetails(prescriptionId: string, versionNumber: number) {
    return this.http.get<PrescriptionVersion>(
      this.prescription(prescriptionId) + '/versions/' + versionNumber,
    );
  }
  startCorrection(
    prescriptionId: string,
    body: { rowVersion: string; reason: string },
    intentKey: string,
  ) {
    return this.http.post<PrescriptionState>(
      this.prescription(prescriptionId) + '/correction-draft',
      body,
      this.intent(intentKey),
    );
  }
  correction(prescriptionId: string) {
    return this.http.get<PrescriptionState>(
      this.prescription(prescriptionId) + '/correction-draft',
    );
  }
  addCorrectionItem(prescriptionId: string, body: AddPrescriptionItem, intentKey: string) {
    return this.http.post<PrescriptionState>(
      this.prescription(prescriptionId) + '/correction-draft/items',
      body,
      this.intent(intentKey),
    );
  }
  updateCorrectionItem(
    prescriptionId: string,
    itemId: string,
    body: PrescriptionClinicalFields & { prescriptionRowVersion: string },
  ) {
    return this.http.put<PrescriptionState>(
      this.prescription(prescriptionId) + '/correction-draft/items/' + encodeURIComponent(itemId),
      body,
    );
  }
  removeCorrectionItem(prescriptionId: string, itemId: string, rowVersion: string) {
    return this.http.delete<PrescriptionState>(
      this.prescription(prescriptionId) + '/correction-draft/items/' + encodeURIComponent(itemId),
      { params: new HttpParams().set('rowVersion', rowVersion) },
    );
  }
  finalizeCorrection(prescriptionId: string, rowVersion: string, intentKey: string) {
    return this.http.post<PrescriptionState>(
      this.prescription(prescriptionId) + '/correction-draft/finalize',
      { rowVersion },
      this.intent(intentKey),
    );
  }
  discardCorrection(prescriptionId: string, rowVersion: string) {
    return this.http.post<PrescriptionState>(
      this.prescription(prescriptionId) + '/correction-draft/discard',
      { rowVersion },
    );
  }
  voidPrescription(
    prescriptionId: string,
    body: { rowVersion: string; reason: string },
    intentKey: string,
  ) {
    return this.http.post<PrescriptionState>(
      this.prescription(prescriptionId) + '/void',
      body,
      this.intent(intentKey),
    );
  }
  mine(pageNumber: number, pageSize = 20) {
    return this.http.get<PatientPrescriptionPage>(this.root + '/prescriptions/mine', {
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize),
    });
  }
  myDetails(prescriptionId: string) {
    return this.http.get<PatientPrescription>(
      this.root + '/prescriptions/mine/' + encodeURIComponent(prescriptionId),
    );
  }
}
