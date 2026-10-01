import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FinanceApi } from './finance-api';

describe('FinanceApi', () => {
  let api: FinanceApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(FinanceApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each([
    ['WAS-184', 'GET', '/api/v1/practices/p1/financial-transactions', () => api.practiceTransactions('p1', {})],
    ['WAS-185', 'GET', '/api/v1/practices/p1/payments/pay1', () => api.paymentDetail('p1', 'pay1')],
    ['WAS-186', 'GET', '/api/v1/practices/p1/payments/pay1/receipt', () => api.practicePaymentReceipt('p1', 'pay1')],
    ['WAS-187', 'GET', '/api/v1/practices/p1/refunds/ref1/receipt', () => api.practiceRefundReceipt('p1', 'ref1')],
    ['WAS-188', 'GET', '/api/v1/doctors/me/financial-transactions', () => api.doctorTransactions({})],
    ['WAS-189', 'GET', '/api/v1/doctors/me/revenue/dashboard', () => api.doctorRevenue('2026-09-01', '2026-09-30')],
    ['WAS-190', 'GET', '/api/v1/patients/me/financial-transactions', () => api.myTransactions({})],
    ['WAS-191', 'GET', '/api/v1/patients/me/payments/pay1/receipt', () => api.myPaymentReceipt('pay1')],
    ['WAS-192', 'GET', '/api/v1/patients/me/refunds/ref1/receipt', () => api.myRefundReceipt('ref1')],
    ['WAS-193', 'GET', '/api/v1/admin/revenue/aggregates', () => api.adminRevenue('2026-09-01', '2026-09-30')],
  ])('%s calls its endpoint', (_key, method, path, call) => {
    (call() as Observable<unknown>).subscribe();
    const request = http.expectOne((item) => item.url === environment.apiBaseUrl + path);
    expect(request.request.method).toBe(method);
    request.flush({});
  });

  it.each([
    ['WAS-181', '/payments/pay1/refund', () => api.refundPayment('p1', 'pay1', { refundMethod: 'Cash', refundReasonCode: 'DoctorUnavailable', reason: null, referenceNumber: null, notes: null }, 'key')],
    ['WAS-182', '/payments/pay1/correct', () => api.correctPayment('p1', 'pay1', { paymentMethod: 'Card', referenceNumber: 'POS', notes: null, correctionReason: 'Wrong method', rowVersion: 'rv' }, 'key')],
    ['WAS-183', '/refunds/ref1/correct', () => api.correctRefund('p1', 'ref1', { refundMethod: 'Wallet', refundReasonCode: 'Other', reason: 'Reason', referenceNumber: null, notes: null, correctionReason: 'Wrong method', rowVersion: 'rv' }, 'key')],
  ])('%s sends mutation idempotency', (_key, suffix, call) => {
    (call() as Observable<unknown>).subscribe();
    const request = http.expectOne((item) => item.url.endsWith(suffix));
    expect(request.request.headers.get('Idempotency-Key')).toBe('key');
    request.flush({});
  });
});
