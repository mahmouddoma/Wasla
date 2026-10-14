import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReceptionWorklistComponent } from './reception-worklist.component';
import { Phase18Api } from '../../../domains/phase18';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { ToastService } from '../../../core/notifications/toast.service';
import { of } from 'rxjs';

describe('ReceptionWorklistComponent', () => {
  let component: ReceptionWorklistComponent;
  let fixture: ComponentFixture<ReceptionWorklistComponent>;
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
        if (endpoint === 'P18-103') {
          return of({
            items: [
              {
                id: 'test-1',
                patientName: 'Test Patient',
                ticketNumber: '#T-1',
                visitType: 'Consultation',
                segment: 'Standard',
                status: 'Waiting',
                time: '09:00 AM',
                checkedIn: false,
              },
            ],
          });
        }
        if (endpoint === 'P18-093') {
          return of({ warnings: ['Attention item 1'] });
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
      imports: [ReceptionWorklistComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Phase18Api, useValue: apiMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: ReceptionPracticeContext,
          useValue: { currentPracticeId: () => 'practice-123' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionWorklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load worklist data', () => {
    expect(component).toBeTruthy();
    expect(apiMock.call).toHaveBeenCalledWith('P18-103', expect.any(Object));
    expect(component.worklistItems().length).toBeGreaterThan(0);
  });

  it('should filter items based on selectedFilter signal', () => {
    component.setFilter('waiting');
    expect(component.selectedFilter()).toBe('waiting');
    expect(component.filteredItems().every((x) => !x.checkedIn)).toBe(true);
  });

  it('should check in patient and show toast notification', () => {
    const item = component.worklistItems()[0];
    component.checkInPatient(item);
    expect(component.worklistItems()[0].checkedIn).toBe(true);
    expect(toastMock.success).toHaveBeenCalled();
  });
});
