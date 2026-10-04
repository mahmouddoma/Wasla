import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import {
  ReceptionPracticesApi,
  ReceptionPractice,
  ReceptionPracticeContext,
} from '../../../../domains/reception-practices';
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

describe('Reception queue authorization', () => {
  const emptyQueue = { inProgress: null, called: null, waiting: [], noShow: [] };
  const catalog = {
    practiceId: 'p1',
    currencyCode: 'EGP' as const,
    segments: [
      {
        segmentId: 's1',
        nameAr: 'Standard',
        nameEn: 'Standard',
        priority: 0,
        visitTypes: [
          {
            visitTypeId: 'v1',
            code: 'NewConsultation' as const,
            nameAr: 'New',
            nameEn: 'New',
            price: 500,
          },
        ],
      },
      { segmentId: 's2', nameAr: 'Other', nameEn: 'Other', priority: 1, visitTypes: [] },
    ],
  };
  let grants: string[];
  let fixture: ComponentFixture<QueueWorkspace>;
  const api = { queue: vi.fn(() => of(emptyQueue)), walkInOptions: vi.fn(() => of(catalog)) };
  const doctorApi = { list: vi.fn(), segments: vi.fn(), visitTypes: vi.fn(), prices: vi.fn() };
  const practice = (): ReceptionPractice => ({
    id: 'p1',
    nameAr: 'Clinic',
    nameEn: 'Clinic',
    doctorNameAr: null,
    doctorNameEn: null,
    isActive: true,
    permissionCodes: grants,
  });
  beforeEach(() => {
    vi.clearAllMocks();
    grants = ['PracticeTickets.View'];
    TestBed.configureTestingModule({
      imports: [QueueWorkspace],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: TicketsApi, useValue: api },
        { provide: DoctorPracticesApi, useValue: doctorApi },
        { provide: ReceptionPracticesApi, useValue: { list: () => of([practice()]) } },
        { provide: AuthSession, useValue: { hasPermission: () => false } },
      ],
    });
  });
  async function start() {
    fixture = TestBed.createComponent(QueueWorkspace);
    await fixture.whenStable();
    return fixture.componentInstance;
  }
  it('loads queue with View and never requests Doctor catalogs', async () => {
    grants.push('PracticeTickets.CreateWalkIn', 'PracticeTickets.RecordPayment');
    await start();
    expect(api.queue).toHaveBeenCalledWith('p1');
    expect(api.walkInOptions).toHaveBeenCalledWith('p1');
    for (const request of Object.values(doctorApi)) expect(request).not.toHaveBeenCalled();
  });
  it('does not request queue or catalog without View', async () => {
    grants = [];
    await start();
    expect(api.queue).not.toHaveBeenCalled();
    expect(api.walkInOptions).not.toHaveBeenCalled();
  });
  it.each([
    ['PracticeTickets.Call', 'canCallNext'],
    ['PracticeTickets.ManualCall', 'canManualCall'],
    ['PracticeTickets.RestoreNoShow', 'canRestore'],
    ['PracticeTickets.Cancel', 'canCancel'],
  ] as const)('uses only %s for %s', async (permission, capability) => {
    grants.push(permission);
    const component = await start();
    for (const key of ['canCallNext', 'canManualCall', 'canRestore', 'canCancel'] as const) {
      expect(component[key]()).toBe(key === capability);
    }
  });
  it('uses server prices and resets visit type and amount when segment changes', async () => {
    grants.push('PracticeTickets.CreateWalkIn', 'PracticeTickets.RecordPayment');
    const component = await start();
    await vi.waitFor(() => expect(component['segments']()).toHaveLength(2));
    const select = (field: 'segmentId' | 'visitTypeId', value: string) => {
      const target = document.createElement('select');
      target.add(new Option(value, value));
      target.value = value;
      component['selectWalkInOption'](field, { target } as unknown as Event);
    };
    select('segmentId', 's1');
    select('visitTypeId', 'v1');
    expect(component['walkInModel']().paidAmount).toBe(500);
    select('segmentId', 's2');
    expect(component['walkInModel']().visitTypeId).toBe('');
    expect(component['walkInModel']().paidAmount).toBe(0);
  });
  it('immediately removes Walk-In authority after the shared practice changes', async () => {
    grants.push('PracticeTickets.CreateWalkIn', 'PracticeTickets.RecordPayment');
    const component = await start();
    TestBed.inject(ReceptionPracticeContext).select('');
    expect(component['canWalkIn']()).toBe(false);
    await fixture.whenStable();
    expect(component['segments']()).toEqual([]);
  });
});
