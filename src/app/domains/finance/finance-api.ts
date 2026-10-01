import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminRevenueAggregates,
  CorrectPaymentRequest,
  CorrectionResponse,
  CorrectRefundRequest,
  DoctorRevenueDashboard,
  FinancialTransactionItem,
  FinancialTransactionQuery,
  PageResult,
  PaymentDetail,
  PaymentReceipt,
  RefundPaymentRequest,
  RefundPaymentResponse,
  RefundReceipt,
} from './finance.models';

@Injectable({ providedIn: 'root' })
export class FinanceApi {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/v1`;

  practiceTransactions(practiceId: string, query: FinancialTransactionQuery) {
    return this.http.get<PageResult<FinancialTransactionItem>>(
      `${this.practice(practiceId)}/financial-transactions`,
      { params: this.params(query) },
    );
  }

  doctorTransactions(query: FinancialTransactionQuery) {
    return this.http.get<PageResult<FinancialTransactionItem>>(
      `${this.root}/doctors/me/financial-transactions`,
      { params: this.params(query) },
    );
  }

  myTransactions(query: FinancialTransactionQuery) {
    return this.http.get<PageResult<FinancialTransactionItem>>(
      `${this.root}/patients/me/financial-transactions`,
      { params: this.params(query) },
    );
  }

  paymentDetail(practiceId: string, paymentId: string): Observable<PaymentDetail> {
    return this.http.get<PaymentDetail>(`${this.practice(practiceId)}/payments/${this.id(paymentId)}`);
  }

  refundPayment(practiceId: string, paymentId: string, body: RefundPaymentRequest, intentKey: string) {
    return this.http.post<RefundPaymentResponse>(
      `${this.practice(practiceId)}/payments/${this.id(paymentId)}/refund`,
      body,
      this.intent(intentKey),
    );
  }

  correctPayment(practiceId: string, paymentId: string, body: CorrectPaymentRequest, intentKey: string) {
    return this.http.post<CorrectionResponse>(
      `${this.practice(practiceId)}/payments/${this.id(paymentId)}/correct`, body, this.intent(intentKey),
    );
  }

  correctRefund(practiceId: string, refundId: string, body: CorrectRefundRequest, intentKey: string) {
    return this.http.post<CorrectionResponse>(
      `${this.practice(practiceId)}/refunds/${this.id(refundId)}/correct`, body, this.intent(intentKey),
    );
  }

  practicePaymentReceipt(practiceId: string, paymentId: string) {
    return this.http.get<PaymentReceipt>(`${this.practice(practiceId)}/payments/${this.id(paymentId)}/receipt`);
  }

  practiceRefundReceipt(practiceId: string, refundId: string) {
    return this.http.get<RefundReceipt>(`${this.practice(practiceId)}/refunds/${this.id(refundId)}/receipt`);
  }

  myPaymentReceipt(paymentId: string) {
    return this.http.get<PaymentReceipt>(`${this.root}/patients/me/payments/${this.id(paymentId)}/receipt`);
  }

  myRefundReceipt(refundId: string) {
    return this.http.get<RefundReceipt>(`${this.root}/patients/me/refunds/${this.id(refundId)}/receipt`);
  }

  doctorRevenue(fromDate: string, toDate: string, practiceId = '') {
    return this.http.get<DoctorRevenueDashboard>(`${this.root}/doctors/me/revenue/dashboard`, {
      params: this.params({ fromDate, toDate, practiceId }),
    });
  }

  adminRevenue(fromDate: string, toDate: string, doctorId = '', practiceId = '') {
    return this.http.get<AdminRevenueAggregates>(`${this.root}/admin/revenue/aggregates`, {
      params: this.params({ fromDate, toDate, doctorId, practiceId }),
    });
  }

  private practice(practiceId: string): string {
    return `${this.root}/practices/${this.id(practiceId)}`;
  }

  private id(value: string): string {
    if (!value.trim()) throw new Error('Identifier required');
    return encodeURIComponent(value);
  }

  private intent(value: string): { headers: { 'Idempotency-Key': string } } {
    if (!value.trim()) throw new Error('Idempotency key required');
    return { headers: { 'Idempotency-Key': value } };
  }

  private params(source: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return params;
  }
}
