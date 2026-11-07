import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import * as Wire from './contracts';
import {
  changeRequestToWire,
  mapCatalog,
  mapDetails,
  mapPage,
  mapSubscription,
} from './subscription-mappers';
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
  SubscriptionContract,
  TrialEligibility,
  PracticeAllocationDetails,
  RenewalPreview,
  RetainedAllocation,
} from './subscription.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1`;
  private readonly own = `${this.base}/doctors/me/subscription`;
  private readonly admin = `${this.base}/admin/subscriptions`;
  private readonly contractsUrl = `${this.base}/doctors/me/subscriptions`;

  contracts(contractId?: string): Observable<SubscriptionContract[]> {
    return this.http
      .get<(Omit<SubscriptionContract, 'periods'> & { periods: Wire.SubscriptionDetails[] })[]>(
        contractId ? `${this.contractsUrl}/${encodeURIComponent(contractId)}` : this.contractsUrl,
      )
      .pipe(
        map((items) => items.map((item) => ({ ...item, periods: item.periods.map(mapDetails) }))),
      );
  }
  trialEligibility(): Observable<TrialEligibility> {
    return this.http
      .get<Omit<TrialEligibility, 'trial'> & { trial: Wire.DoctorSubscription | null }>(
        `${this.contractsUrl}/trial/eligibility`,
      )
      .pipe(map((value) => ({ ...value, trial: mapSubscription(value.trial) })));
  }
  activateTrial(key: string): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(`${this.contractsUrl}/trial/activate`, {}, this.intent(key))
      .pipe(map(mapDetails));
  }
  selectContract(selection: SubscriptionSelection, key: string): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(`${this.contractsUrl}/selection`, selection, this.intent(key))
      .pipe(map(mapDetails));
  }
  changeContract(
    id: string,
    request: RequestSubscriptionChange,
    key: string,
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(
        `${this.contractsUrl}/${encodeURIComponent(id)}/change-requests`,
        { ...request, changeType: changeRequestToWire(request) },
        this.intent(key),
      )
      .pipe(map(mapDetails));
  }
  cancelContract(
    id: string,
    rowVersion: string,
    reason: string,
    key: string,
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(
        `${this.contractsUrl}/${encodeURIComponent(id)}/cancel-at-period-end`,
        { rowVersion, reason: reason.trim() || null },
        this.intent(key),
      )
      .pipe(map(mapDetails));
  }
  allocation(practiceId: string): Observable<PracticeAllocationDetails> {
    return this.http
      .get<
        Omit<PracticeAllocationDetails, 'effectivePeriod'> & {
          effectivePeriod: Wire.DoctorSubscription | null;
        }
      >(this.allocationUrl(practiceId))
      .pipe(
        map((value) => ({ ...value, effectivePeriod: mapSubscription(value.effectivePeriod) })),
      );
  }
  moveAllocation(
    practiceId: string,
    body: {
      targetSubscriptionContractId: string;
      continuedReceptionIds: string[];
      rowVersion: string;
    },
    key: string,
  ): Observable<PracticeAllocationDetails> {
    return this.http
      .post<
        Omit<PracticeAllocationDetails, 'effectivePeriod'> & {
          effectivePeriod: Wire.DoctorSubscription | null;
        }
      >(`${this.allocationUrl(practiceId)}/move`, body, this.intent(key))
      .pipe(
        map((value) => ({ ...value, effectivePeriod: mapSubscription(value.effectivePeriod) })),
      );
  }
  releaseAllocation(
    practiceId: string,
    body: { rowVersion: string; reason?: string },
    key: string,
  ): Observable<PracticeAllocationDetails> {
    return this.http
      .post<
        Omit<PracticeAllocationDetails, 'effectivePeriod'> & {
          effectivePeriod: Wire.DoctorSubscription | null;
        }
      >(`${this.allocationUrl(practiceId)}/release`, body, this.intent(key))
      .pipe(
        map((value) => ({ ...value, effectivePeriod: mapSubscription(value.effectivePeriod) })),
      );
  }
  renewalPreview(id: string, selection: SubscriptionSelection): Observable<RenewalPreview> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(selection))
      if (value != null) params = params.set(key, String(value));
    return this.http.get<RenewalPreview>(
      `${this.contractsUrl}/${encodeURIComponent(id)}/renewal-preview`,
      { params },
    );
  }
  saveRenewal(
    id: string,
    body: {
      rowVersion: string;
      targetPlanCode: string;
      targetBillingCycle: string;
      targetPracticeCount?: number | null;
      retainedAllocations: RetainedAllocation[];
    },
    key: string,
  ): Observable<SubscriptionDetails> {
    return this.http
      .post<Wire.SubscriptionDetails>(
        `${this.contractsUrl}/${encodeURIComponent(id)}/renewal-selection`,
        body,
        this.intent(key),
      )
      .pipe(map(mapDetails));
  }
  private allocationUrl(id: string): string {
    return `${this.base}/doctors/me/practices/${encodeURIComponent(id)}/subscription-allocation`;
  }
  /** Existing staff read supplies explicit keeper choices for allocation and renewal. */
  allocationReceptionOptions(): Observable<AllocationReceptionOption[]> {
    return this.http.get<AllocationReceptionOption[]>(`${this.base}/doctors/me/receptions`);
  }

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
export interface AllocationReceptionOption {
  id: string;
  nameAr: string;
  nameEn: string | null;
  isActive: boolean;
  assignments: { doctorPracticeId: string; isActive: boolean }[];
}
