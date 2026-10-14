import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReceptionHandoversComponent } from './reception-handovers.component';
import { Phase18Api } from '../../../domains/phase18';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { ToastService } from '../../../core/notifications/toast.service';
import { of } from 'rxjs';

describe('ReceptionHandoversComponent', () => {
  let component: ReceptionHandoversComponent;
  let fixture: ComponentFixture<ReceptionHandoversComponent>;
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
        if (endpoint === 'P18-096') {
          return of({
            items: [
              {
                id: 'hand-1',
                summary: 'Morning shift handed over to evening shift cleanly',
                status: 'Open',
                createdByName: 'Sara Ahmed',
                createdAt: '2026-10-14 14:00',
                annotationsCount: 0,
                rowVersion: 'v1',
              },
            ],
          });
        }
        if (
          endpoint === 'P18-097' ||
          endpoint === 'P18-099' ||
          endpoint === 'P18-100' ||
          endpoint === 'P18-101'
        ) {
          return of({ success: true, id: 'hand-1' });
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
      imports: [ReceptionHandoversComponent],
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

    fixture = TestBed.createComponent(ReceptionHandoversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load handovers list', () => {
    expect(component).toBeTruthy();
    expect(apiMock.call).toHaveBeenCalledWith('P18-096', expect.any(Object));
    expect(component.handovers().length).toBeGreaterThan(0);
  });

  it('should open create drawer', () => {
    component.openCreateDrawer();
    expect(component.drawerMode()).toBe('create');
  });

  it('should submit new handover', () => {
    component.openCreateDrawer();
    component.newSummary = 'Shift completed successfully without issues.';
    component.submitNewHandover();

    expect(apiMock.call).toHaveBeenCalledWith('P18-097', expect.any(Object));
    expect(toastMock.success).toHaveBeenCalled();
    expect(component.drawerMode()).toBeNull();
  });

  it('should acknowledge an open handover', () => {
    const item = component.handovers()[0];
    component.openViewDrawer(item);
    component.acknowledgeHandover(item);

    expect(apiMock.call).toHaveBeenCalledWith('P18-099', expect.any(Object));
    expect(toastMock.success).toHaveBeenCalled();
  });
});
