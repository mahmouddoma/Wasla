import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  PublicDoctorDetails,
  PublicDoctorSearchQuery,
  PublicDoctorSearchResponse,
  PublicSpecialization,
} from './public-discovery.models';

@Injectable({ providedIn: 'root' })
export class PublicDiscoveryApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/public`;
  specializations(): Observable<PublicSpecialization[]> {
    return this.http.get<PublicSpecialization[]>(`${this.url}/specializations`);
  }
  doctors(query: PublicDoctorSearchQuery): Observable<PublicDoctorSearchResponse> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && key !== 'pageNumber' && key !== 'pageSize')
        params = params.set(key, String(value));
    return this.http.get<PublicDoctorSearchResponse>(`${this.url}/doctors`, { params });
  }
  doctor(doctorId: string): Observable<PublicDoctorDetails> {
    return this.http.get<PublicDoctorDetails>(
      `${this.url}/doctors/${encodeURIComponent(doctorId)}`,
    );
  }
  availableDates(practiceId: string): Observable<AvailableDate[]> {
    return this.http.get<AvailableDate[]>(`${this.practiceUrl(practiceId)}/available-dates`);
  }
  availableSlots(practiceId: string, date: string): Observable<AvailableSlot[]> {
    return this.http.get<AvailableSlot[]>(`${this.practiceUrl(practiceId)}/available-slots`, {
      params: { date },
    });
  }
  bookingOptions(practiceId: string, date: string, time: string): Observable<BookingOptions> {
    return this.http.get<BookingOptions>(`${this.practiceUrl(practiceId)}/booking-options`, {
      params: { date, time },
    });
  }
  private practiceUrl(practiceId: string): string {
    return `${this.url}/practices/${encodeURIComponent(practiceId)}`;
  }
}
