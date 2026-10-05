import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FollowUpBookingContext } from '../follow-ups';
import { AvailableDate, AvailableSlot, BookingOptions } from '../public-discovery';
import {
  BookablePatient,
  CancelReservationRequest,
  CreatePatientReservationRequest,
  CreateReservationRequest,
  normalizeReservation,
  ProviderRescheduleRequest,
  Reservation,
  ReservationFilterOptions,
  ReservationMetadata,
  ReservationPage,
  ReservationQuery,
  ReservationScope,
  RescheduleReservationRequest,
} from './reservation.models';

@Injectable({ providedIn: 'root' })
export class ReservationsApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;
  metadata(): Observable<ReservationMetadata> {
    return this.http.get<ReservationMetadata>(`${this.root}/reservations/metadata`);
  }
  bookablePatients(): Observable<BookablePatient[]> {
    return this.http.get<BookablePatient[]>(`${this.root}/reservations/bookable-patients`);
  }
  list(scope: ReservationScope, query: ReservationQuery): Observable<ReservationPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<ReservationPage>(this.scopeUrl(scope), { params }).pipe(
      map((page) => ({
        ...page,
        items: (page.items || []).map(normalizeReservation),
      })),
    );
  }
  details(scope: ReservationScope, id: string): Observable<Reservation> {
    return this.http.get<Reservation>(this.detailUrl(scope, id)).pipe(map(normalizeReservation));
  }
  filterOptions(scope: ReservationScope): Observable<ReservationFilterOptions> {
    if (scope.actor !== 'Doctor' && scope.actor !== 'Reception')
      throw new Error('Scoped operational filter options required');
    return this.http.get<ReservationFilterOptions>(`${this.scopeUrl(scope)}/filter-options`);
  }
  createPatient(body: CreatePatientReservationRequest, intentKey: string): Observable<Reservation> {
    return this.http
      .post<Reservation>(`${this.root}/reservations`, body, this.intentHeaders(intentKey))
      .pipe(map(normalizeReservation));
  }
  createReception(
    practiceId: string,
    body: CreateReservationRequest,
    intentKey: string,
  ): Observable<Reservation> {
    return this.http
      .post<Reservation>(
        this.scopeUrl({ actor: 'Reception', practiceId }),
        body,
        this.intentHeaders(intentKey),
      )
      .pipe(map(normalizeReservation));
  }
  receptionDates(practiceId: string, context: FollowUpBookingContext = {}): Observable<AvailableDate[]> {
    return this.http.get<AvailableDate[]>(
      `${this.receptionBookingUrl(practiceId)}/available-dates`,
      { params: { ...context } },
    );
  }
  receptionSlots(practiceId: string, date: string, context: FollowUpBookingContext = {}): Observable<AvailableSlot[]> {
    return this.http.get<AvailableSlot[]>(
      `${this.receptionBookingUrl(practiceId)}/available-slots`,
      { params: { date, ...context } },
    );
  }
  receptionOptions(practiceId: string, date: string, time: string, context: FollowUpBookingContext = {}): Observable<BookingOptions> {
    return this.http.get<BookingOptions>(`${this.receptionBookingUrl(practiceId)}/options`, {
      params: { date, time, ...context },
    });
  }
  cancel(
    scope: ReservationScope,
    id: string,
    body: CancelReservationRequest,
    intentKey: string,
  ): Observable<Reservation> {
    this.assertMutable(scope);
    return this.http
      .post<Reservation>(
        `${this.detailUrl(scope, id)}/cancel`,
        body,
        this.intentHeaders(intentKey),
      )
      .pipe(map(normalizeReservation));
  }
  rescheduleDates(scope: ReservationScope, id: string): Observable<AvailableDate[]> {
    this.assertMutable(scope);
    return this.http.get<AvailableDate[]>(
      `${this.detailUrl(scope, id)}/reschedule/available-dates`,
    );
  }
  rescheduleSlots(scope: ReservationScope, id: string, date: string): Observable<AvailableSlot[]> {
    this.assertMutable(scope);
    return this.http.get<AvailableSlot[]>(
      `${this.detailUrl(scope, id)}/reschedule/available-slots`,
      { params: { date } },
    );
  }
  reschedule(
    scope: ReservationScope,
    id: string,
    body: RescheduleReservationRequest | ProviderRescheduleRequest,
    intentKey: string,
  ): Observable<Reservation> {
    this.assertMutable(scope);
    if (
      scope.actor !== 'Patient' &&
      (!('patientConsentConfirmed' in body) || !body.patientConsentConfirmed || !body.reason.trim())
    )
      throw new Error('Provider consent and reason required');
    return this.http
      .post<Reservation>(
        `${this.detailUrl(scope, id)}/reschedule`,
        body,
        this.intentHeaders(intentKey),
      )
      .pipe(map(normalizeReservation));
  }
  restoreNoShow(
    practiceId: string,
    id: string,
    rowVersion: string,
    intentKey: string,
  ): Observable<Reservation> {
    return this.http
      .post<Reservation>(
        `${this.detailUrl({ actor: 'Reception', practiceId }, id)}/restore-no-show`,
        { rowVersion },
        this.intentHeaders(intentKey),
      )
      .pipe(map(normalizeReservation));
  }
  private receptionBookingUrl(id: string): string {
    if (!id) throw new Error('Practice required');
    return `${this.root}/reception/practices/${encodeURIComponent(id)}/booking`;
  }
  private scopeUrl(scope: ReservationScope): string {
    if (scope.actor === 'Patient') return `${this.root}/reservations/mine`;
    if (scope.actor === 'Admin') return `${this.root}/admin/reservations`;
    if (!scope.practiceId) throw new Error('Practice required');
    const prefix = scope.actor === 'Doctor' ? 'doctors/me' : 'reception';
    return `${this.root}/${prefix}/practices/${encodeURIComponent(scope.practiceId)}/reservations`;
  }
  private detailUrl(scope: ReservationScope, id: string): string {
    return `${this.scopeUrl(scope)}/${encodeURIComponent(id)}`;
  }
  private assertMutable(scope: ReservationScope): void {
    if (scope.actor === 'Admin') throw new Error('Administrative reservations are read-only');
  }
  private intentHeaders(key: string): { headers: { 'Idempotency-Key': string } } {
    if (!key.trim()) throw new Error('Idempotency key required');
    return { headers: { 'Idempotency-Key': key } };
  }
}
