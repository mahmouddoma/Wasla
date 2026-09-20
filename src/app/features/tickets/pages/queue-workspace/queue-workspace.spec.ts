import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { ReceptionPracticeContext } from '../../../../domains/reception-practices';
import { TicketsApi } from '../../../../domains/tickets';
import { QueueWorkspace } from './queue-workspace';
import { AuthSession } from '../../../../core/auth/auth-session';

describe('QueueWorkspace', () => {
  let fixture: ComponentFixture<QueueWorkspace>;
  const queue = { inProgress: null, called: null, waiting: [], noShow: [] };
  const api = {
    queue: vi.fn(() => of(queue)),
    callNext: vi.fn(() => of({ ticketId: 't1' })),
    details: vi.fn(),
    createWalkIn: vi.fn(),
  };
  const practices = {
    list: vi.fn(() => of([{ id: 'p1', nameAr: 'عيادة', nameEn: 'Clinic', isActive: true }])),
  };
  const reception = {
    refresh: vi.fn(),
    practices: signal([]),
    currentPracticeId: signal(''),
    select: vi.fn(),
    allows: vi.fn(() => true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { actor: 'Doctor' }, queryParamMap: { get: () => null } } },
        },
        { provide: TicketsApi, useValue: api },
        { provide: DoctorPracticesApi, useValue: practices },
        { provide: ReceptionPracticeContext, useValue: reception },
        {
          provide: AuthSession,
          useValue: {
            hasPermission: vi.fn(() => true),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QueueWorkspace);
    await fixture.whenStable();
  });

  it('creates and loads the only active practice queue', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(api.queue).toHaveBeenCalledWith('p1');
  });

  it('renders all four authoritative queue sections', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('قيد الكشف');
    expect(text).toContain('تم النداء');
    expect(text).toContain('الانتظار');
    expect(text).toContain('لم يحضر');
  });
});
