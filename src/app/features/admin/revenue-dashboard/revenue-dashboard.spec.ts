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

  it('updates dates and activePreset when a quick preset is clicked', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: FinanceApi,
          useValue: {
            adminRevenue: () =>
              of({
                summary: {
                  grossRevenue: 250,
                  totalRefunds: 0,
                  netRevenue: 250,
                  paymentCount: 2,
                  refundCount: 0,
                  currencyCode: 'EGP',
                },
                byDoctorPractice: [],
              }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(RevenueDashboard);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    (component as any).setPreset('thisYear');
    expect((component as any).activePreset()).toBe('thisYear');
    expect((component as any).model().fromDate.startsWith(new Date().getFullYear().toString())).toBe(true);

    (component as any).clearFilters();
    expect((component as any).activePreset()).toBe('thisMonth');
    expect((component as any).model().doctorId).toBe('');
    expect((component as any).model().practiceId).toBe('');
  });
});
