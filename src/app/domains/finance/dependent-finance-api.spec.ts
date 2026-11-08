import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { FinanceApi } from './finance-api';

describe('Dependent finance read-only boundaries', () => {
  let api: FinanceApi, http: HttpTestingController;
  const root = environment.apiBaseUrl + '/api/v1/families/mine/dependents/child';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FinanceApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('WAS-820 forces the subject into the path and carries server pagination', () => {
    api.dependentTransactions('child', { pageNumber: 2, pageSize: 20 }).subscribe();
    const request = http.expectOne((r) => r.url === root + '/financial-transactions');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.has('patientId')).toBe(false);
    request.flush({ items: [] });
  });
  it('WAS-821 reads the exact dependent payment receipt', () => {
    api.dependentPaymentReceipt('child', 'payment').subscribe();
    const request = http.expectOne(root + '/payments/payment/receipt');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
  it('WAS-822 reads the exact dependent refund receipt', () => {
    api.dependentRefundReceipt('child', 'refund').subscribe();
    const request = http.expectOne(root + '/refunds/refund/receipt');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
