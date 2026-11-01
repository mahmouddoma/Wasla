import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoctorReportViewerComponent } from './doctor-report-viewer.component';
import { Phase18Api } from '../../../../domains/phase18';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ToastService } from '../../../../core/notifications/toast.service';

describe('DoctorReportViewerComponent', () => {
  let component: DoctorReportViewerComponent;
  let grants: Set<string>;
  const api = { call: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };

  const mockCatalog = [
    {
      reportCode: 'reservations',
      titleAr: 'تحليل الحجوزات',
      titleEn: 'Reservation Analytics',
      canPreview: true,
      canExportPdf: true,
      canExportExcel: true,
      allowedFilters: ['practiceId', 'fromDate', 'toDate'],
      availableGroupings: ['Day', 'Week', 'Month'],
      requiredPermissions: ['Reports.Doctor.ViewOwn'],
    },
    {
      reportCode: 'operating-finance',
      titleAr: 'التقرير المالي التشغيلي',
      titleEn: 'Operating Financial Statement',
      canPreview: true,
      canExportPdf: true,
      canExportExcel: true,
      allowedFilters: ['practiceId', 'fromDate', 'toDate'],
      requiredPermissions: ['FinancialStatements.Doctor.ViewOwn'],
    },
  ];

  const mockReservationsModel = {
    reportCode: 'reservations',
    metrics: [
      { metricCode: 'BookingsCreated', value: 144, unit: 'count' },
      {
        metricCode: 'AppointmentsScheduled',
        value: 155,
        unit: 'count',
        availableActions: [
          {
            code: 'Drilldown',
            allowed: true,
            route:
              '/api/v1/doctors/me/reports/reservations/drilldown?metricCode=AppointmentsScheduled&practiceId=p1',
          },
        ],
      },
      { metricCode: 'CancellationRateScheduledCohort', value: 14.19, unit: 'percentage' },
    ],
    series: [
      {
        key: '2026-10-01',
        metrics: [
          { metricCode: 'BookingsCreated', value: 10 },
          { metricCode: 'AppointmentsScheduled', value: 12 },
        ],
      },
    ],
    breakdowns: [
      {
        key: 'BookingCreationCohortFunnel',
        metrics: [
          { metricCode: 'BookingsCreated', value: 144 },
          { metricCode: 'CheckIns', value: 63 },
          { metricCode: 'TicketsCompleted', value: 63 },
        ],
      },
    ],
    window: {
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
      reportTimeZoneId: 'Africa/Cairo',
      asOfUtc: '2026-10-31T10:00:00Z',
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    grants = new Set(['Reports.Doctor.ViewOwn', 'FinancialStatements.Doctor.ViewOwn']);

    api.call.mockImplementation((code: string, req?: any) => {
      if (code === 'P18-076') return of(mockCatalog);
      if (code === 'P18-025') return of({ practices: [{ id: 'p1', nameAr: 'عيادة 1', nameEn: 'Clinic 1' }] });
      if (code === 'P18-073') return of(mockReservationsModel);
      if (code === 'P18-074') {
        return of({
          items: [{ reference: 'BK-101', metricValue: 1, businessDate: '2026-10-01' }],
          totalCount: 1,
          pageNumber: 1,
        });
      }
      if (code === 'P18-075') return of(new Blob(['fake-data'], { type: 'application/pdf' }));
      return of({});
    });

    TestBed.configureTestingModule({
      imports: [DoctorReportViewerComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['reportCode', 'reservations']])),
            snapshot: { queryParams: { practiceId: 'p1', fromDate: '2026-10-01', toDate: '2026-10-31' } },
          },
        },
        { provide: Phase18Api, useValue: api },
        { provide: AuthSession, useValue: { hasPermission: (p: string) => grants.has(p) } },
        { provide: ToastService, useValue: toast },
      ],
    });

    component = TestBed.createComponent(DoctorReportViewerComponent).componentInstance;
  });

  it('initializes report viewer and loads report preview from backend', async () => {
    const fixture = TestBed.createComponent(DoctorReportViewerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.call).toHaveBeenCalledWith('P18-076', {});
    expect(api.call).toHaveBeenCalledWith('P18-073', expect.objectContaining({
      path: { reportCode: 'reservations' },
    }));

    expect(fixture.componentInstance.model()?.reportCode).toBe('reservations');
    expect(fixture.componentInstance.kpis().length).toBeGreaterThan(0);
  });

  it('denies access if user lacks required permission for financial report', async () => {
    grants.delete('FinancialStatements.Doctor.ViewOwn');

    const fixture = TestBed.createComponent(DoctorReportViewerComponent);
    const inst = fixture.componentInstance;
    inst.reportCode.set('operating-finance');

    await inst.initReport('operating-finance');
    fixture.detectChanges();

    expect(inst.accessDenied()).toBe(true);
    expect(inst.model()).toBeNull();
  });

  it('opens drilldown drawer for authorized metrics and fetches source records', async () => {
    const fixture = TestBed.createComponent(DoctorReportViewerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const metric = mockReservationsModel.metrics[1]; // AppointmentsScheduled
    expect(fixture.componentInstance.canDrilldown(metric)).toBe(true);

    await fixture.componentInstance.openDrilldown(metric);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.call).toHaveBeenCalledWith('P18-074', expect.objectContaining({
      path: { reportCode: 'reservations' },
      query: expect.objectContaining({ metricCode: 'AppointmentsScheduled' }),
    }));
    expect(fixture.componentInstance.drillRows()?.items).toHaveLength(1);
  });

  it('exports report to PDF using P18-075 and triggers toast on success', async () => {
    const fixture = TestBed.createComponent(DoctorReportViewerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.exportReport('pdf');
    expect(api.call).toHaveBeenCalledWith('P18-075', expect.objectContaining({
      path: { reportCode: 'reservations' },
      query: expect.objectContaining({ format: 'pdf' }),
    }));
    expect(toast.success).toHaveBeenCalled();
  });
});
