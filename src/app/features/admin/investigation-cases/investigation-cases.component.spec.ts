import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InvestigationCasesComponent } from './investigation-cases.component';
import { Phase18Api } from '../../../domains/phase18';
import { ToastService } from '../../../core/notifications/toast.service';
import { of } from 'rxjs';

describe('InvestigationCasesComponent', () => {
  let component: InvestigationCasesComponent;
  let fixture: ComponentFixture<InvestigationCasesComponent>;
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
        if (endpoint === 'P18-005') {
          return of({
            items: [
              {
                id: 'inv-1',
                title: 'Test Investigation',
                issueType: 'Operational',
                priority: 'High',
                status: 'Open',
                assigneeName: 'Admin 1',
                createdAt: '2026-10-14',
                rowVersion: 'v1',
              },
            ],
          });
        }
        return of({ success: true });
      }),
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [InvestigationCasesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Phase18Api, useValue: apiMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigationCasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load investigation cases', () => {
    expect(component).toBeTruthy();
    expect(apiMock.call).toHaveBeenCalledWith('P18-005', expect.any(Object));
    expect(component.cases().length).toBeGreaterThan(0);
  });

  it('should toggle create and view drawer', () => {
    component.openCreateDrawer();
    expect(component.drawerMode()).toBe('create');

    const item = component.cases()[0];
    component.openViewDrawer(item);
    expect(component.drawerMode()).toBe('view');
    expect(component.selectedCase()).toEqual(item);

    component.closeDrawer();
    expect(component.drawerMode()).toBeNull();
  });

  it('should create new investigation case', () => {
    component.openCreateDrawer();
    component.newTitle = 'New Violation';
    component.newIssueType = 'Financial';
    component.createCase();

    expect(apiMock.call).toHaveBeenCalledWith('P18-006', expect.any(Object));
    expect(toastMock.success).toHaveBeenCalled();
  });
});
