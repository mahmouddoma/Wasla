import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RowVersionRequest } from '../doctor-practices/doctor-practice.models';
import {
  CreateDoctorReceptionRequest,
  CreateReceptionAssignmentRequest,
  DoctorReception,
  DoctorReceptionAssignment,
  UpdateReceptionAssignmentRequest,
} from './doctor-reception.models';

@Injectable({ providedIn: 'root' })
export class DoctorReceptionsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/doctors/me/receptions`;

  list(): Observable<DoctorReception[]> {
    return this.http.get<DoctorReception[]>(this.url);
  }
  details(receptionId: string): Observable<DoctorReception> {
    return this.http.get<DoctorReception>(this.receptionUrl(receptionId));
  }
  create(request: CreateDoctorReceptionRequest): Observable<DoctorReception> {
    return this.http.post<DoctorReception>(this.url, request);
  }
  assign(
    receptionId: string,
    request: CreateReceptionAssignmentRequest,
  ): Observable<DoctorReceptionAssignment> {
    return this.http.post<DoctorReceptionAssignment>(
      `${this.receptionUrl(receptionId)}/assignments`,
      request,
    );
  }
  updateAssignment(
    receptionId: string,
    assignmentId: string,
    request: UpdateReceptionAssignmentRequest,
  ): Observable<DoctorReceptionAssignment> {
    return this.http.put<DoctorReceptionAssignment>(
      `${this.assignmentUrl(receptionId, assignmentId)}`,
      request,
    );
  }
  activateAssignment(
    receptionId: string,
    assignmentId: string,
    request: RowVersionRequest,
  ): Observable<DoctorReceptionAssignment> {
    return this.http.post<DoctorReceptionAssignment>(
      `${this.assignmentUrl(receptionId, assignmentId)}/activate`,
      request,
    );
  }
  deactivateAssignment(
    receptionId: string,
    assignmentId: string,
    request: RowVersionRequest,
  ): Observable<DoctorReceptionAssignment> {
    return this.http.post<DoctorReceptionAssignment>(
      `${this.assignmentUrl(receptionId, assignmentId)}/deactivate`,
      request,
    );
  }
  private receptionUrl(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
  private assignmentUrl(receptionId: string, assignmentId: string): string {
    return `${this.receptionUrl(receptionId)}/assignments/${encodeURIComponent(assignmentId)}`;
  }
}
