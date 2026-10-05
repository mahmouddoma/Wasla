import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  PublicDoctorDetails,
  PublicDoctorDetailsResponse,
  PublicDoctorSearchQuery,
  PublicDoctorSearchResponse,
  PublicDoctorSearchResponseDto,
  PublicPracticeResponse,
  PublicPracticeSummary,
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
    return this.http.get<PublicDoctorSearchResponseDto>(`${this.url}/doctors`, { params }).pipe(
      map((response) => ({
        ...response,
        items: response.items.map((doctor) => ({
          ...doctor,
          practices: doctor.practices.map((practice) => this.practice(practice)),
        })),
      })),
    );
  }
  doctor(doctorId: string): Observable<PublicDoctorDetails> {
    return this.http.get<PublicDoctorDetailsResponse>(
      `${this.url}/doctors/${encodeURIComponent(doctorId)}`,
    ).pipe(map((doctor) => ({
      ...doctor,
      practices: doctor.practices.map((practice) => this.practice(practice)),
    })));
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
    return `${this.url}/practices/${encodeURIComponent(this.practiceId(practiceId))}`;
  }
  private practice(response: PublicPracticeResponse): PublicPracticeSummary {
    const { id, practiceId, doctorPracticeId, ...practice } = response;
    const identifier = [id, practiceId, doctorPracticeId].find((value) =>
      typeof value === 'string' && value.trim() && !['undefined', 'null'].includes(value.trim()),
    );
    return { ...practice, id: this.practiceId(identifier) };
  }
  private practiceId(value: string | null | undefined): string {
    if (typeof value !== 'string' || !value.trim() || ['undefined', 'null'].includes(value.trim())) {
      throw new Error('discovery.invalidPractice');
    }
    return value.trim();
  }
}
