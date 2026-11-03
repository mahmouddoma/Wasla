import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import * as Wire from './contracts';
import { changeRequestToWire, mapCatalog, mapDetails, mapPage } from './subscription-mappers';
import { environment } from '../../../environments/environment';
import {
  CommercialCatalog,
  LegacyTransitionBatch,
  RequestSubscriptionChange,
  RenewSubscriptionRequest,
  SubscriptionChangeDecision,
  SubscriptionDetails,
  SubscriptionListQuery,
  SubscriptionPage,
  SubscriptionPaymentRequest,
  SubscriptionSelection,
} from './subscription.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1`;
  private readonly own = `${this.base}/doctors/me/subscription`;
  private readonly admin = `${this.base}/admin/subscriptions`;

  catalog(): Observable<CommercialCatalog> {
    return this.http
      .get<Wire.CommercialCatalogResponse>(`${this.base}/public/commercial/catalog`)
      .pipe(map(mapCatalog));
  }
  mine(): Observable<SubscriptionDetails> {
    return this.http.get<Wire.SubscriptionDetails>(this.own).pipe(map(mapDetails));
  }
  select(selection: SubscriptionSelection): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(`${this.own}/selection`, selection)
      .pipe(map(mapDetails));
  }
  requestChange(request: RequestSubscriptionChange): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(`${this.own}/change-requests`, {
        ...request,
        changeType: changeRequestToWire(request),
      })
      .pipe(map(mapDetails));
  }
  cancelAtPeriodEnd(rowVersion: string): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(`${this.own}/cancel-at-period-end`, { rowVersion })
      .pipe(map(mapDetails));
  }
  list(query: SubscriptionListQuery): Observable<SubscriptionPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, value);
    }
    return this.http
      .get<Wire.DoctorSubscriptionPagedResponse>(this.admin, { params })
      .pipe(map(mapPage));
  }
  details(id: string): Observable<SubscriptionDetails> {
    return this.http.get<Wire.SubscriptionDetails>(this.detailUrl(id)).pipe(map(mapDetails));
  }
  activate(
    id: string,
    request: SubscriptionPaymentRequest,
    intentKey: string,
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(
        `${this.detailUrl(id)}/activate`,
        request,
        this.intent(intentKey),
      )
      .pipe(map(mapDetails));
  }
  extendTrial(
    id: string,
    request: { rowVersion: string; additionalDays: number; reason: string },
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(`${this.detailUrl(id)}/trial-extend`, request)
      .pipe(map(mapDetails));
  }
  approveChange(
    id: string,
    requestId: string,
    request: SubscriptionChangeDecision,
    intentKey: string,
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(
        `${this.changeUrl(id, requestId)}/approve`,
        request,
        this.intent(intentKey),
      )
      .pipe(map(mapDetails));
  }
  rejectChange(
    id: string,
    requestId: string,
    request: { rowVersion: string; changeRowVersion: string; reason: string },
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(`${this.changeUrl(id, requestId)}/reject`, request)
      .pipe(map(mapDetails));
  }
  renew(
    id: string,
    request: RenewSubscriptionRequest,
    intentKey: string,
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(
        `${this.detailUrl(id)}/renew`,
        request,
        this.intent(intentKey),
      )
      .pipe(map(mapDetails));
  }
  enrollLegacyTransition(): Observable<LegacyTransitionBatch> {
    return this.http
      .post<Wire.LegacyTransitionEnrollmentBatch>(`${this.admin}/legacy-transition/enroll`, null)
      .pipe(
        map((batch) => ({
          ...batch,
          status: batch.status ?? '',
          rowVersion: batch.rowVersion ?? '',
          completedOnUtc: batch.completedAtUtc,
        })),
      );
  }
  private detailUrl(id: string): string {
    return `${this.admin}/${encodeURIComponent(id)}`;
  }
  private changeUrl(id: string, requestId: string): string {
    return `${this.detailUrl(id)}/change-requests/${encodeURIComponent(requestId)}`;
  }
  private intent(key: string): { headers: { 'Idempotency-Key': string } } {
    if (!key.trim() || key.length > 150) throw new Error('Invalid subscription payment intent');
    return { headers: { 'Idempotency-Key': key } };
  }
}
