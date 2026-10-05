import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AvailableDate, AvailableSlot, BookingOptions } from '../public-discovery';
import { FollowUpEligibility, FollowUpPage, FollowUpQuery } from './follow-up.models';

@Injectable({ providedIn: 'root' })
export class FollowUpsApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;
  mine(query: FollowUpQuery) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<FollowUpPage>(`${this.root}/follow-up-eligibilities/mine`, { params });
  }
  details(id: string) {
    return this.http.get<FollowUpEligibility>(
      `${this.root}/follow-up-eligibilities/mine/${this.id(id)}`,
    );
  }
  reception(practiceId: string, patientId: string) {
    return this.http.get<readonly FollowUpEligibility[]>(
      `${this.root}/reception/practices/${this.id(practiceId)}/patients/${this.id(patientId)}/follow-up-eligibilities`,
    );
  }
  dates(id: string) {
    return this.http.get<AvailableDate[]>(`${this.bookingUrl(id)}/available-dates`);
  }
  slots(id: string, date: string) {
    return this.http.get<AvailableSlot[]>(`${this.bookingUrl(id)}/available-slots`, {
      params: { date },
    });
  }
  options(id: string, date: string, time: string) {
    return this.http.get<BookingOptions>(`${this.bookingUrl(id)}/booking-options`, {
      params: { date, time },
    });
  }
  private bookingUrl(id: string) {
    return `${this.root}/reservations/follow-up-eligibilities/${this.id(id)}`;
  }
  private id(value: string) {
    if (!value.trim()) throw new Error('Identifier required');
    return encodeURIComponent(value);
  }
}
