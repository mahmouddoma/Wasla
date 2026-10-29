import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PrescriptionsApi } from '../prescriptions';
import { environment } from '../../../environments/environment';
import {
  ClinicalFilterQuery,
  ClinicalPage,
  DoctorMyPatientOverviewResponse,
  DoctorPatientAppointment,
  DoctorPatientAttendance,
  DoctorPatientDiagnosis,
  DoctorPatientFollowUp,
  DoctorPatientPrescription,
  DoctorPatientQuery,
  DoctorPatientsPageResponse,
} from './doctor-patient.models';

@Injectable({ providedIn: 'root' })
export class DoctorPatientsApi {
  private readonly prescriptionsApi = inject(PrescriptionsApi);
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1/doctors/me`;

  list(query: DoctorPatientQuery): Observable<DoctorPatientsPageResponse> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber.toString())
      .set('pageSize', query.pageSize.toString());

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.practiceId?.trim()) {
      params = params.set('practiceId', query.practiceId.trim());
    }
    if (query.lastAttendanceFrom?.trim()) {
      params = params.set('lastAttendanceFrom', query.lastAttendanceFrom.trim());
    }
    if (query.lastAttendanceTo?.trim()) {
      params = params.set('lastAttendanceTo', query.lastAttendanceTo.trim());
    }
    if (query.minAttendanceCount !== undefined && query.minAttendanceCount > 0) {
      params = params.set('minAttendanceCount', query.minAttendanceCount.toString());
    }
    if (query.hasUpcomingAppointment !== undefined) {
      params = params.set('hasUpcomingAppointment', query.hasUpcomingAppointment.toString());
    }
    if (query.practiceScope && query.practiceScope !== 'all') {
      params = params.set('practiceScope', query.practiceScope);
    }
    if (query.asOfUtc?.trim()) {
      params = params.set('asOfUtc', query.asOfUtc.trim());
    }

    return this.http.get<DoctorPatientsPageResponse>(`${this.root}/patients`, { params });
  }

  overview(patientId: string): Observable<DoctorMyPatientOverviewResponse> {
    return this.http.get<DoctorMyPatientOverviewResponse>(
      `${this.root}/patients/${this.id(patientId)}`,
    );
  }

  attendances(
    patientId: string,
    query?: Partial<ClinicalFilterQuery>,
  ): Observable<ClinicalPage<DoctorPatientAttendance>> {
    return this.http.get<ClinicalPage<DoctorPatientAttendance>>(
      `${this.root}/patients/${this.id(patientId)}/attendances`,
      { params: this.clinicalParams(query) },
    );
  }

  diagnoses(
    patientId: string,
    query?: Partial<ClinicalFilterQuery>,
  ): Observable<ClinicalPage<DoctorPatientDiagnosis>> {
    return this.http.get<ClinicalPage<DoctorPatientDiagnosis>>(
      `${this.root}/patients/${this.id(patientId)}/diagnoses`,
      { params: this.clinicalParams(query) },
    );
  }

  prescriptions(
    patientId: string,
    query?: Partial<ClinicalFilterQuery>,
  ): Observable<ClinicalPage<DoctorPatientPrescription>> {
    return this.http.get<ClinicalPage<DoctorPatientPrescription>>(
      `${this.root}/patients/${this.id(patientId)}/prescriptions`,
      { params: this.clinicalParams(query) },
    );
  }

  appointments(
    patientId: string,
    query?: Partial<ClinicalFilterQuery>,
  ): Observable<ClinicalPage<DoctorPatientAppointment>> {
    return this.http.get<ClinicalPage<DoctorPatientAppointment>>(
      `${this.root}/patients/${this.id(patientId)}/appointments`,
      { params: this.clinicalParams(query) },
    );
  }

  followUps(
    patientId: string,
    query?: Partial<ClinicalFilterQuery>,
  ): Observable<ClinicalPage<DoctorPatientFollowUp>> {
    return this.http.get<ClinicalPage<DoctorPatientFollowUp>>(
      `${this.root}/patients/${this.id(patientId)}/follow-ups`,
      { params: this.clinicalParams({ ...query, fromDate: undefined, toDate: undefined }) },
    );
  }

  prescriptionPdf(
    prescriptionId: string,
    versionNumber: number,
    disposition: 'inline' | 'attachment' = 'inline',
  ): Observable<Blob> {
    return this.prescriptionsApi.pdf(prescriptionId, versionNumber, disposition);
  }

  private clinicalParams(query?: Partial<ClinicalFilterQuery>): HttpParams {
    let params = new HttpParams();
    if (!query) return params;

    if (query.pageNumber) {
      params = params.set('pageNumber', query.pageNumber.toString());
    }
    if (query.pageSize) {
      params = params.set('pageSize', query.pageSize.toString());
    }
    if (query.practiceId?.trim()) {
      params = params.set('practiceId', query.practiceId.trim());
    }
    if (query.fromDate?.trim()) {
      params = params.set('fromDate', query.fromDate.trim());
    }
    if (query.toDate?.trim()) {
      params = params.set('toDate', query.toDate.trim());
    }
    if (query.status?.trim()) {
      params = params.set('status', query.status.trim());
    }
    return params;
  }

  private id(value: string): string {
    if (!value?.trim()) throw new Error('Identifier required');
    return encodeURIComponent(value.trim());
  }
}
