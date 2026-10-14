import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoctorReportsComponent } from './doctor-reports.component';
import { Phase18Api } from '../../domains/phase18';
import { ToastService } from '../../core/notifications/toast.service';
import { of } from 'rxjs';

describe('DoctorReportsComponent', () => {
  let component: DoctorReportsComponent;
  let fixture: ComponentFixture<DoctorReportsComponent>;
  let apiMock: { call: ReturnType<typeof vi.fn> };
  let toastMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiMock = {
      call: vi.fn((endpoint: string) => {
        if (endpoint === 'P18-049') {
          return of({
            items: [
              {
                id: 'ins-test-1',
                metricName: 'No-Show Rate',
                practiceName: 'Main Clinic',
                status: 'New',
                explanation: 'Rate is high',
                suggestedAction: 'Send reminders',
                observedRate: '25%',
                baselineRate: '10%',
                rowVersion: 'v1',
              },
            ],
          });
        }
        if (endpoint === 'P18-076') {
          return of([
            {
              code: 'reservations',
              name: 'Reservations Report',
              category: 'Operations',
              description: 'Reservations statistics',
            },
          ]);
        }
        if (endpoint === 'P18-051' || endpoint === 'P18-054' || endpoint === 'P18-052') {
          return of({ success: true });
        }
        if (endpoint === 'P18-075') {
          return of(new Blob(['test'], { type: 'application/pdf' }));
        }
        return of({});
      }),
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DoctorReportsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Phase18Api, useValue: apiMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load insights and report catalog', () => {
    expect(component).toBeTruthy();
    expect(apiMock.call).toHaveBeenCalledWith('P18-047', expect.any(Object));
    expect(apiMock.call).toHaveBeenCalledWith('P18-076', expect.any(Object));
    expect(component.insights().length).toBeGreaterThan(0);
    expect(component.reports().length).toBeGreaterThan(0);
  });

  it('should switch tabs between insights and reports', () => {
    component.setTab('reports');
    expect(component.activeTab()).toBe('reports');
    component.setTab('insights');
    expect(component.activeTab()).toBe('insights');
  });

  it('should acknowledge an insight', () => {
    const insight = component.insights()[0];
    component.acknowledgeInsight(insight);
    expect(apiMock.call).toHaveBeenCalledWith('P18-049', {
      path: { insightId: insight.id },
      body: { rowVersion: insight.rowVersion },
    });
    expect(toastMock.success).toHaveBeenCalledWith('تم الاطلاع على الرؤية');
    expect(component.insights()[0].status).toBe('Acknowledged');
  });

  it('should resolve an insight', () => {
    const insight = component.insights()[0];
    component.resolveInsight(insight);
    expect(apiMock.call).toHaveBeenCalledWith('P18-052', {
      path: { insightId: insight.id },
      body: { rowVersion: insight.rowVersion },
    });
    expect(toastMock.success).toHaveBeenCalledWith('تمت معالجة التنبيه بنجاح');
    expect(component.insights()[0].status).toBe('Resolved');
  });

  it('should dismiss an insight with reason', () => {
    const insight = component.insights()[0];
    component.openDismissDrawer(insight);
    component.dismissReason = 'Not applicable to current season';
    component.submitDismiss();

    expect(apiMock.call).toHaveBeenCalledWith('P18-050', {
      path: { insightId: insight.id },
      body: { reason: 'Not applicable to current season', rowVersion: insight.rowVersion },
    });
    expect(toastMock.success).toHaveBeenCalledWith('تم تجاهل التنبيه');
    expect(component.selectedInsight()).toBeNull();
  });
});
