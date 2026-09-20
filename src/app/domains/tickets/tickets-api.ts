import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CheckInTicketRequest,
  CreateWalkInTicketRequest,
  ForceCheckInTicketRequest,
  PracticeQueue,
  PracticeTicket,
  TicketReasonRequest,
  TicketVersionRequest,
} from './ticket.models';

@Injectable({ providedIn: 'root' })
export class TicketsApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;

  checkIn(
    practiceId: string,
    reservationId: string,
    body: CheckInTicketRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.http.post<PracticeTicket>(
      `${this.practiceUrl(practiceId)}/reservations/${this.id(reservationId)}/check-in`,
      body,
      this.intentHeaders(intentKey),
    );
  }

  forceCheckIn(
    practiceId: string,
    reservationId: string,
    body: ForceCheckInTicketRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.http.post<PracticeTicket>(
      `${this.practiceUrl(practiceId)}/reservations/${this.id(reservationId)}/force-check-in`,
      body,
      this.intentHeaders(intentKey),
    );
  }

  createWalkIn(
    practiceId: string,
    body: CreateWalkInTicketRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.http.post<PracticeTicket>(
      `${this.practiceUrl(practiceId)}/tickets/walk-in`,
      body,
      this.intentHeaders(intentKey),
    );
  }

  queue(practiceId: string): Observable<PracticeQueue> {
    return this.http.get<PracticeQueue>(`${this.practiceUrl(practiceId)}/queue`);
  }

  details(practiceId: string, ticketId: string): Observable<PracticeTicket> {
    return this.http.get<PracticeTicket>(`${this.ticketUrl(practiceId, ticketId)}`);
  }

  callNext(practiceId: string, intentKey: string): Observable<PracticeTicket> {
    return this.http.post<PracticeTicket>(
      `${this.practiceUrl(practiceId)}/queue/call-next`,
      {},
      this.intentHeaders(intentKey),
    );
  }

  manualCall(
    practiceId: string,
    ticketId: string,
    body: TicketReasonRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.mutate(practiceId, ticketId, 'manual-call', body, intentKey);
  }

  recall(
    practiceId: string,
    ticketId: string,
    body: TicketVersionRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.mutate(practiceId, ticketId, 'recall', body, intentKey);
  }

  confirmNoResponse(
    practiceId: string,
    ticketId: string,
    body: TicketVersionRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.mutate(practiceId, ticketId, 'confirm-no-response', body, intentKey);
  }

  restoreNoShow(
    practiceId: string,
    ticketId: string,
    body: TicketVersionRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.mutate(practiceId, ticketId, 'restore-no-show', body, intentKey);
  }

  start(
    practiceId: string,
    ticketId: string,
    body: TicketVersionRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.mutate(practiceId, ticketId, 'start', body, intentKey);
  }

  complete(
    practiceId: string,
    ticketId: string,
    body: TicketVersionRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.mutate(practiceId, ticketId, 'complete', body, intentKey);
  }

  cancel(
    practiceId: string,
    ticketId: string,
    body: TicketReasonRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.mutate(practiceId, ticketId, 'cancel', body, intentKey);
  }

  myActive(): Observable<readonly PracticeTicket[]> {
    return this.http
      .get<readonly PracticeTicket[] | { readonly items: readonly PracticeTicket[] }>(
        `${this.root}/tickets/mine/active`,
      )
      .pipe(map((response) => ('items' in response ? response.items : response)));
  }

  myDetails(ticketId: string): Observable<PracticeTicket> {
    return this.http.get<PracticeTicket>(`${this.root}/tickets/mine/${this.id(ticketId)}`);
  }

  private mutate(
    practiceId: string,
    ticketId: string,
    action: string,
    body: TicketVersionRequest | TicketReasonRequest,
    intentKey: string,
  ): Observable<PracticeTicket> {
    return this.http.post<PracticeTicket>(
      `${this.ticketUrl(practiceId, ticketId)}/${action}`,
      body,
      this.intentHeaders(intentKey),
    );
  }

  private practiceUrl(practiceId: string): string {
    return `${this.root}/practices/${this.id(practiceId)}`;
  }

  private ticketUrl(practiceId: string, ticketId: string): string {
    return `${this.practiceUrl(practiceId)}/tickets/${this.id(ticketId)}`;
  }

  private id(value: string): string {
    if (!value.trim()) throw new Error('Identifier required');
    return encodeURIComponent(value);
  }

  private intentHeaders(key: string): { headers: { 'Idempotency-Key': string } } {
    if (!key.trim()) throw new Error('Idempotency key required');
    return { headers: { 'Idempotency-Key': key } };
  }
}
