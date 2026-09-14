import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST } from '../notifications/api-error-toast.interceptor';
import {
  DoctorPracticeLocation,
  DoctorSpecializationHistoryItem,
  DoctorSpecializationRequest,
  DoctorSpecializationsResponse,
  EgyptLocationOption,
  MedicalSpecializationOption,
  ResubmitDoctorSpecializationsRequest,
  SubmitDoctorSpecializationsRequest,
  UpsertDoctorPracticeLocationRequest,
} from './doctor-profile.models';

@Injectable({ providedIn: 'root' })
export class DoctorProfileApi {
  private readonly http = inject(HttpClient);
  private readonly doctorsUrl = `${environment.apiBaseUrl}/api/v1/doctors/me`;
  private readonly publicUrl = `${environment.apiBaseUrl}/api/v1/public`;

  specializationOptions(): Observable<MedicalSpecializationOption[]> {
    return this.http.get<MedicalSpecializationOption[]>(
      `${this.doctorsUrl}/specializations/options`,
    );
  }

  currentSpecializations(): Observable<DoctorSpecializationsResponse> {
    return this.http.get<DoctorSpecializationsResponse>(`${this.doctorsUrl}/specializations`, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  openSpecializationRequest(): Observable<DoctorSpecializationRequest> {
    return this.http.get<DoctorSpecializationRequest>(`${this.doctorsUrl}/specialization-request`, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  submitSpecializations(
    request: SubmitDoctorSpecializationsRequest,
  ): Observable<DoctorSpecializationRequest> {
    return this.http.post<DoctorSpecializationRequest>(
      `${this.doctorsUrl}/specialization-request`,
      request,
    );
  }

  resubmitSpecializations(
    request: ResubmitDoctorSpecializationsRequest,
  ): Observable<DoctorSpecializationRequest> {
    return this.http.post<DoctorSpecializationRequest>(
      `${this.doctorsUrl}/specialization-request/resubmit`,
      request,
    );
  }

  specializationHistory(): Observable<DoctorSpecializationHistoryItem[]> {
    return this.http.get<DoctorSpecializationHistoryItem[]>(
      `${this.doctorsUrl}/specialization-request/history`,
      {
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      },
    );
  }

  governorates(): Observable<EgyptLocationOption[]> {
    return this.http.get<EgyptLocationOption[]>(`${this.publicUrl}/governorates`);
  }

  cities(governorateId: number): Observable<EgyptLocationOption[]> {
    return this.http.get<EgyptLocationOption[]>(
      `${this.publicUrl}/governorates/${governorateId}/cities`,
    );
  }

  areas(cityId: number): Observable<EgyptLocationOption[]> {
    return this.http.get<EgyptLocationOption[]>(`${this.publicUrl}/cities/${cityId}/areas`);
  }

  practiceLocation(): Observable<DoctorPracticeLocation> {
    return this.http.get<DoctorPracticeLocation>(`${this.doctorsUrl}/practice-location`, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  upsertPracticeLocation(
    request: UpsertDoctorPracticeLocationRequest,
  ): Observable<DoctorPracticeLocation> {
    return this.http.put<DoctorPracticeLocation>(`${this.doctorsUrl}/practice-location`, request);
  }
}
