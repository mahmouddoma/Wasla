import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorOnboardingStatus } from './doctor.models';

@Injectable({ providedIn: 'root' })
export class DoctorApi {
  private readonly http = inject(HttpClient);
  private readonly doctorsUrl = `${environment.apiBaseUrl}/api/v1/doctors`;

  onboardingStatus(): Observable<DoctorOnboardingStatus> {
    return this.http.get<DoctorOnboardingStatus>(`${this.doctorsUrl}/me/onboarding`);
  }
}
