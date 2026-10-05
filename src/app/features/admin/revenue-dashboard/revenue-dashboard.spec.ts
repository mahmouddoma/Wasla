import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FinanceApi } from '../../../domains/finance';
import { RevenueDashboard } from './revenue-dashboard';

describe('RevenueDashboard', () => {
  it('renders aggregate values without patient drill-down', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: FinanceApi,
          useValue: {
            adminRevenue: () =>
              of({
                summary: {
                  grossRevenue: 100,
                  totalRefunds: 20,
                  netRevenue: 80,
                  paymentCount: 1,
                  refundCount: 1,
                  currencyCode: 'EGP',
                },
                byDoctorPractice: [],
              }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(RevenueDashboard);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('100');
    expect(fixture.nativeElement.textContent).not.toContain('patientId');
  });
});
