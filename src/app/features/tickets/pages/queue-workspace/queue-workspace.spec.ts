import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PracticeQueue, PracticeTicket } from '../../../../domains/tickets';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import {
  ReceptionPracticesApi,
  ReceptionPractice,
  ReceptionPracticeContext,
} from '../../../../domains/reception-practices';
import { TicketsApi } from '../../../../domains/tickets';
import { QueueWorkspace } from './queue-workspace';
import { AuthSession } from '../../../../core/auth/auth-session';
import { provideHttpClient } from '@angular/common/http';
import { PatientsApi, PatientSearchItem } from '../../../../domains/patients';
import { FollowUpsApi, FollowUpEligibility } from '../../../../domains/follow-ups';

describe('QueueWorkspace', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  let fixture: ComponentFixture<QueueWorkspace>;
  const queue = { inProgress: null, called: null, waiting: [], noShow: [] };
  const api = {
    queue: vi.fn(() => of(queue)),
    callNext: vi.fn(() => of({ ticketId: 't1' })),
    details: vi.fn(),
    createWalkIn: vi.fn(),
    start: vi.fn(),
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
        provideHttpClient(),
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

  it('shows a compact current state, waiting list and secondary no-show list', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('الآن');
    expect(text).toContain('الانتظار');
    expect(text).toContain('غير الحاضرين');
    expect(fixture.nativeElement.querySelector('#queue-practice-select')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.walk-in-trigger')).toBeNull();
  });
  const doctorTicket: PracticeTicket = {
    ticketId: 'doctor-ticket',
    ticketNumber: '7',
    status: 'Called',
    source: 'Reservation',
    practice: { id: 'p1', nameAr: 'عيادة', nameEn: 'Clinic' },
    doctor: { nameAr: 'طبيب', nameEn: 'Doctor' },
    patient: { nameAr: 'مريض', nameEn: 'Patient' },
    businessDate: '2026-10-07',
    lastUpdatedOnUtc: '2026-10-07T10:00:00Z',
    patientsAheadNow: 0,
    fastTrack: false,
    callAttempts: [],
    rowVersion: 'doctor-rv',
  };
  it('preserves Doctor Start with both required permissions and the ticket row version', async () => {
    api.start.mockReturnValue(of({ ...doctorTicket, status: 'InProgress' }));
    await fixture.componentInstance['act']('start', doctorTicket);
    expect(api.start).toHaveBeenCalledWith(
      'p1',
      'doctor-ticket',
      { rowVersion: 'doctor-rv' },
      expect.any(String),
    );
  });
  it('does not start when either existing clinical permission is absent', async () => {
    api.start.mockClear();
    vi.mocked(TestBed.inject(AuthSession).hasPermission).mockImplementation(
      (code) => code !== 'MedicalEncounters.StartOwn',
    );
    await fixture.componentInstance['act']('start', doctorTicket);
    expect(api.start).not.toHaveBeenCalled();
  });
  it('preserves the scoped Encounter destination for an in-progress patient', () => {
    fixture.componentInstance['queue'].set({
      ...queue,
      inProgress: { ...doctorTicket, status: 'InProgress' },
    });
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.current-patient a');
    expect(link.getAttribute('href')).toContain(
      '/doctor/encounters?practiceId=p1&ticketId=doctor-ticket',
    );
  });
  it('hides Encounter access without the existing diagnosis permission', () => {
    vi.mocked(TestBed.inject(AuthSession).hasPermission).mockImplementation(
      (code) => code !== 'Diagnoses.ViewOwn',
    );
    fixture.componentInstance['queue'].set({
      ...queue,
      inProgress: { ...doctorTicket, status: 'InProgress' },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.current-patient a')).toBeNull();
  });
});

describe('Reception queue authorization', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
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
        provideHttpClient(),
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
    expect(api.walkInOptions).toHaveBeenCalledWith('p1', {});
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
  it('uses a server visit/price combination and resets it when the patient changes', async () => {
    grants.push('PracticeTickets.CreateWalkIn', 'PracticeTickets.RecordPayment');
    const component = await start();
    await vi.waitFor(() => expect(component['segments']()).toHaveLength(2));
    const select = (value: string) => {
      const target = document.createElement('select');
      target.add(new Option(value, value));
      target.value = value;
      component['selectChoice']({ target } as unknown as Event);
    };
    select('s1:v1');
    expect(component['walkInModel']().paidAmount).toBe(500);
    component['changePatient']();
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

describe('P2 Queue request scope', () => {
  const patient: PatientSearchItem = {
    patientId: 'patient',
    nameAr: 'مريض اختبار',
    nameEn: 'Synthetic patient',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    phoneNumber: '01012345678',
    hasContactPhone: true,
  };
  const patientsApi = { search: vi.fn() };
  const followUps = { reception: vi.fn() };
  const ticket = (id = 't1'): PracticeTicket => ({
    ticketId: id,
    ticketNumber: '12',
    status: 'Waiting',
    source: 'WalkIn',
    practice: { id: 'a', nameAr: 'Clinic A', nameEn: 'Clinic A' },
    doctor: { nameAr: 'Doctor', nameEn: 'Doctor' },
    patient: { id: 'patient', nameAr: 'Synthetic patient', nameEn: 'Synthetic patient' },
    businessDate: '2026-10-07',
    lastUpdatedOnUtc: '2026-10-07T09:00:00Z',
    patientsAheadNow: 2,
    fastTrack: false,
    callAttempts: [],
    rowVersion: 'rv1',
  });
  const empty: PracticeQueue = { inProgress: null, called: null, waiting: [], noShow: [] };
  let fixture: ComponentFixture<QueueWorkspace>;
  let context: ReceptionPracticeContext;
  let grants: string[];
  const api = {
    queue: vi.fn(),
    details: vi.fn(),
    callNext: vi.fn(),
    walkInOptions: vi.fn(),
    createWalkIn: vi.fn(),
    manualCall: vi.fn(),
    cancel: vi.fn(),
    recall: vi.fn(),
    confirmNoResponse: vi.fn(),
    restoreNoShow: vi.fn(),
  };
  beforeEach(async () => {
    vi.resetAllMocks();
    grants = ['PracticeTickets.View', 'PracticeTickets.Call'];
    api.queue.mockReturnValue(of(empty));
    api.walkInOptions.mockReturnValue(of({ segments: [] }));
    patientsApi.search.mockReturnValue(of({ items: [patient], totalCount: 1 }));
    followUps.reception.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [QueueWorkspace],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: { get: () => null } },
          },
        },
        { provide: TicketsApi, useValue: api },
        {
          provide: AuthSession,
          useValue: { hasPermission: (code: string) => grants.includes(code) },
        },
        { provide: PatientsApi, useValue: patientsApi },
        { provide: FollowUpsApi, useValue: followUps },
        {
          provide: ReceptionPracticesApi,
          useValue: {
            list: () =>
              of(
                ['a', 'b'].map((id) => ({
                  id,
                  nameAr: id,
                  nameEn: id,
                  isActive: true,
                  doctorNameAr: null,
                  doctorNameEn: null,
                  permissionCodes: grants,
                })),
              ),
          },
        },
      ],
    });
    context = TestBed.inject(ReceptionPracticeContext);
    await context.ensureLoaded();
    context.select('a');
    fixture = TestBed.createComponent(QueueWorkspace);
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  async function switchTo(id: string) {
    context.select(id);
    await fixture.whenStable();
  }
  async function walkIn(price = 300) {
    grants.push(
      'PracticeTickets.CreateWalkIn',
      'PracticeTickets.RecordPayment',
      'Patients.SearchBasic',
    );
    api.walkInOptions.mockReturnValue(
      of({
        segments: [
          {
            segmentId: 'standard',
            nameAr: 'عادي',
            nameEn: 'Standard',
            priority: 1,
            visitTypes: [
              {
                visitTypeId: 'new',
                code: 'NewConsultation',
                nameAr: 'كشف',
                nameEn: 'Consultation',
                price,
              },
            ],
          },
        ],
      }),
    );
    await context.refresh();
    await fixture.whenStable();
    await fixture.componentInstance['openWalkIn']();
    await fixture.componentInstance['searchPatients']({ phoneNumber: patient.phoneNumber! });
    await fixture.componentInstance['choosePatient'](patient.patientId);
    choose('standard:new');
  }
  function choose(value: string) {
    const target = document.createElement('select');
    target.add(new Option(value, value));
    target.value = value;
    fixture.componentInstance['selectChoice']({ target } as unknown as Event);
  }
  it.each(['Cash', 'Card', 'Wallet'] as const)(
    'submits server price and %s, then shows scoped Done',
    async (method) => {
      await walkIn();
      api.createWalkIn.mockReturnValue(of(ticket()));
      fixture.componentInstance['choosePayment'](method);
      fixture.componentInstance['submitWalkIn']();
      await vi.waitFor(() =>
        expect(fixture.componentInstance['walkInDone']()?.ticketNumber).toBe('12'),
      );
      expect(api.createWalkIn).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({
          patientId: 'patient',
          segmentId: 'standard',
          visitTypeId: 'new',
          paidAmount: 300,
          paymentMethod: method,
        }),
        expect.any(String),
      );
      expect(fixture.componentInstance['acceptedWalkIn']()?.paymentMethod).toBe(method);
      expect(fixture.componentInstance['walkInModel']().patientId).toBe('');
      await switchTo('b');
      expect(fixture.componentInstance['walkInDone']()).toBeNull();
    },
  );
  it('supports free visits and preserves a failed draft and retry intent', async () => {
    await walkIn(0);
    const c = fixture.componentInstance;
    c['walkInModel'].update((value) => ({
      ...value,
      referenceNumber: 'POS',
      notes: 'Keep this note',
      paymentMethod: 'Wallet',
    }));
    api.createWalkIn
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of(ticket()));
    c['submitWalkIn']();
    await vi.waitFor(() => expect(api.createWalkIn).toHaveBeenCalledOnce());
    await fixture.whenStable();
    expect(c['walkInModel']()).toMatchObject({
      patientId: 'patient',
      visitTypeId: 'new',
      paidAmount: 0,
      referenceNumber: 'POS',
      notes: 'Keep this note',
      paymentMethod: 'Wallet',
    });
    expect(c['selectedPatient']()).toEqual(patient);
    c['submitWalkIn']();
    await vi.waitFor(() => expect(c['walkInDone']()).not.toBeNull());
    expect(api.createWalkIn.mock.calls[1][2]).toBe(api.createWalkIn.mock.calls[0][2]);
  });
  it('keeps structured search scoped and separates empty results from errors', async () => {
    await walkIn();
    const c = fixture.componentInstance;
    expect(patientsApi.search).toHaveBeenCalledWith({
      phoneNumber: patient.phoneNumber,
      doctorPracticeId: 'a',
      pageNumber: 1,
      pageSize: 20,
    });
    c['changePatient']();
    patientsApi.search.mockReturnValueOnce(of({ items: [], totalCount: 0 }));
    await c['searchPatients']({ name: 'Missing', dateOfBirth: '1990-01-01' });
    expect(c['patientSearched']()).toBe(true);
    expect(c['patientSearchFailed']()).toBe(false);
    patientsApi.search.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await c['searchPatients']({ name: 'Failure' });
    expect(c['patientSearchFailed']()).toBe(true);
    expect(c['patientSearched']()).toBe(false);
  });
  it('ignores old search and options responses after the drawer closes', async () => {
    await walkIn();
    const c = fixture.componentInstance;
    const search = new Subject<{ items: PatientSearchItem[] }>();
    patientsApi.search.mockReturnValueOnce(search);
    const pendingSearch = c['searchPatients']({ name: 'Old' });
    c['close']();
    search.next({ items: [patient] });
    search.complete();
    await pendingSearch;
    expect(c['patientSearched']()).toBe(false);
    const options = new Subject<{ segments: [] }>();
    api.walkInOptions.mockReturnValueOnce(options);
    const pendingOptions = c['openWalkIn']();
    c['close']();
    options.next({ segments: [] });
    options.complete();
    await pendingOptions;
    expect(c['walkInOpen']()).toBe(false);
    expect(c['optionsLoading']()).toBe(false);
  });
  it('revalidates eligibility and preserves its ID and row version', async () => {
    await walkIn();
    grants.push('FollowUpEligibility.ViewBookingEligibility');
    await context.refresh();
    await fixture.whenStable();
    const eligibility: FollowUpEligibility = {
      eligibilityId: 'eligible',
      patientId: 'patient',
      practiceId: 'a',
      doctorId: 'doctor',
      validUntil: '2026-10-10',
      status: 'Available',
      canBook: true,
      rowVersion: 'eligibility-v1',
    };
    fixture.componentInstance['eligibilities'].set([
      eligibility,
      { ...eligibility, eligibilityId: 'expired', canBook: false, status: 'Expired' },
    ]);
    fixture.componentInstance['walkInModel'].update((value) => ({
      ...value,
      patientId: 'patient',
    }));
    api.walkInOptions.mockReturnValue(
      of({
        segments: [
          {
            segmentId: 'standard',
            nameAr: 'عادي',
            nameEn: 'Standard',
            priority: 1,
            visitTypes: [
              {
                visitTypeId: 'follow',
                code: 'FollowUp',
                nameAr: 'متابعة',
                nameEn: 'Follow-up',
                price: 0,
              },
            ],
          },
        ],
      }),
    );
    const target = document.createElement('select');
    target.add(new Option('expired', 'expired'));
    target.add(new Option('eligible', 'eligible'));
    target.value = 'expired';
    await fixture.componentInstance['selectWalkInEligibility']({ target } as unknown as Event);
    expect(fixture.componentInstance['eligibility']()).toBeNull();
    target.value = 'eligible';
    await fixture.componentInstance['selectWalkInEligibility']({ target } as unknown as Event);
    choose('standard:follow');
    api.createWalkIn.mockReturnValue(of(ticket()));
    fixture.componentInstance['submitWalkIn']();
    await vi.waitFor(() => expect(api.createWalkIn).toHaveBeenCalledOnce());
    expect(api.createWalkIn.mock.calls[0][1]).toMatchObject({
      followUpEligibilityId: 'eligible',
      followUpEligibilityRowVersion: 'eligibility-v1',
      paidAmount: 0,
    });
  });
  it('requires RecordPayment and preserves the closed record-number fallback without SearchBasic', async () => {
    grants.push('PracticeTickets.CreateWalkIn');
    await context.refresh();
    await fixture.whenStable();
    expect(fixture.componentInstance['canWalkIn']()).toBe(false);
    grants.push('PracticeTickets.RecordPayment');
    await context.refresh();
    await fixture.whenStable();
    await fixture.componentInstance['openWalkIn']();
    fixture.detectChanges();
    const advanced: HTMLDetailsElement =
      fixture.nativeElement.querySelector('.walk-in-form details');
    expect(advanced.open).toBe(false);
    expect(fixture.nativeElement.querySelector('app-walk-in-patient-search')).toBeNull();
    expect(patientsApi.search).not.toHaveBeenCalled();
  });
  it('prevents duplicate creation and discards pending walk-in success after clinic switching', async () => {
    await walkIn();
    const pending = new Subject<PracticeTicket>();
    api.createWalkIn.mockReturnValue(pending);
    const c = fixture.componentInstance;
    c['submitWalkIn']();
    c['submitWalkIn']();
    await vi.waitFor(() => expect(api.createWalkIn).toHaveBeenCalledOnce());
    await switchTo('b');
    await switchTo('a');
    pending.next(ticket());
    pending.complete();
    await fixture.whenStable();
    expect(c['walkInDone']()).toBeNull();
    expect(c['walkInOpen']()).toBe(false);
  });
  it('requires a contextual reason and preserves rowVersion for manual call and cancellation', async () => {
    grants.push('PracticeTickets.ManualCall', 'PracticeTickets.Cancel');
    await context.refresh();
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c['selected'].set(ticket());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    await c['act']('manual-call');
    expect(api.manualCall).not.toHaveBeenCalled();
    c['chooseAction']('manual-call');
    c['reasonModel'].set({ reason: ' Priority reason ' });
    api.manualCall.mockReturnValue(of({ ...ticket(), status: 'Called' }));
    await c['act']('manual-call');
    expect(api.manualCall).toHaveBeenCalledWith(
      'a',
      't1',
      { reason: 'Priority reason', rowVersion: 'rv1' },
      expect.any(String),
    );
    c['chooseAction']('cancel');
    c['reasonModel'].set({ reason: ' Patient left ' });
    api.cancel.mockReturnValue(of({ ...ticket(), status: 'Cancelled', canRefund: true }));
    await c['act']('cancel');
    expect(api.cancel).toHaveBeenCalledWith(
      'a',
      't1',
      { reason: 'Patient left', rowVersion: 'rv1' },
      expect.any(String),
    );
    expect(c['pendingAction']()).toBeNull();
  });
  it('blocks Call Next while occupied and recall/restore for invalid outcomes', async () => {
    const c = fixture.componentInstance;
    c['queue'].set({ ...empty, called: { ...ticket(), status: 'Called' } });
    await c['callNext']();
    expect(api.callNext).not.toHaveBeenCalled();
    await c['act']('recall', {
      ...ticket(),
      status: 'Called',
      callAttempts: [{ attemptNumber: 1, calledOnUtc: '2026-10-07', outcome: 'NotResponded' }],
    });
    expect(api.recall).not.toHaveBeenCalled();
    grants.push('PracticeTickets.RestoreNoShow');
    await context.refresh();
    await fixture.whenStable();
    await c['act']('restore', { ...ticket(), status: 'NoShow', isRefunded: true });
    expect(api.restoreNoShow).not.toHaveBeenCalled();
  });
  it('clears unsafe drawer state after same-clinic permissions are removed', async () => {
    await walkIn();
    grants = ['PracticeTickets.View'];
    await context.refresh();
    await fixture.whenStable();
    expect(fixture.componentInstance['walkInOpen']()).toBe(false);
    expect(fixture.componentInstance['selectedPatient']()).toBeNull();
    expect(fixture.componentInstance['canWalkIn']()).toBe(false);
  });
  it('ignores older same-clinic Queue reads and detail results', async () => {
    const older = new Subject<PracticeQueue>();
    api.queue.mockReturnValueOnce(older);
    const first = fixture.componentInstance['loadQueue']();
    api.queue.mockReturnValueOnce(of({ ...empty, waiting: [ticket('new')] }));
    await fixture.componentInstance['loadQueue']();
    older.next({ ...empty, waiting: [ticket('old')] });
    older.complete();
    await first;
    expect(fixture.componentInstance['queue']().waiting[0].ticketId).toBe('new');
    const oldDetail = new Subject<PracticeTicket>();
    api.details.mockReturnValueOnce(oldDetail).mockReturnValueOnce(of(ticket('new')));
    const opening = fixture.componentInstance['inspect']('old');
    await fixture.componentInstance['inspect']('new');
    oldDetail.next(ticket('old'));
    oldDetail.complete();
    await opening;
    expect(fixture.componentInstance['selected']()?.ticketId).toBe('new');
  });
  it.each([200, 500, 403])(
    'ignores stale mutation %s and loads the latest clinic when it settles',
    async (status) => {
      const pending = new Subject<PracticeTicket>();
      api.callNext.mockReturnValue(pending);
      const operation = fixture.componentInstance['callNext']();
      const refresh = vi.spyOn(context, 'refresh');
      await switchTo('b');
      if (status === 200) {
        pending.next(ticket());
        pending.complete();
      } else pending.error(new HttpErrorResponse({ status }));
      await operation;
      await fixture.whenStable();
      expect(context.currentPracticeId()).toBe('b');
      expect(fixture.componentInstance['selected']()).toBeNull();
      expect(fixture.componentInstance['messages']()).toEqual([]);
      expect(refresh).not.toHaveBeenCalled();
      expect(api.queue).toHaveBeenLastCalledWith('b');
    },
  );
  it('does not restore an old ticket after A to B to A', async () => {
    const pending = new Subject<PracticeTicket>();
    api.details.mockReturnValue(pending);
    const opening = fixture.componentInstance['inspect']('old');
    await switchTo('b');
    await switchTo('a');
    pending.next(ticket('old'));
    pending.complete();
    await opening;
    expect(fixture.componentInstance['selected']()).toBeNull();
  });
  it('refreshes current-scope access on 403', async () => {
    const refresh = vi.spyOn(context, 'refresh');
    api.callNext.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await fixture.componentInstance['callNext']();
    expect(refresh).toHaveBeenCalledOnce();
    expect(fixture.componentInstance['selected']()).toBeNull();
    expect(fixture.componentInstance['loadFailed']()).toBe(true);
  });
  it('records a distinct Queue failure and supports retry', async () => {
    api.queue.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await fixture.componentInstance['loadQueue']();
    expect(fixture.componentInstance['loadFailed']()).toBe(true);
    await fixture.componentInstance['loadQueue']();
    expect(fixture.componentInstance['loadFailed']()).toBe(false);
  });
  it.each([403, 409, 500])(
    'ignores stale Queue read errors %s after A to B to A',
    async (status) => {
      const pending = new Subject<PracticeQueue>();
      api.queue.mockReturnValueOnce(pending);
      const load = fixture.componentInstance['loadQueue']();
      const refresh = vi.spyOn(context, 'refresh');
      await switchTo('b');
      await switchTo('a');
      pending.error(new HttpErrorResponse({ status }));
      await load;
      expect(fixture.componentInstance['loadFailed']()).toBe(false);
      expect(fixture.componentInstance['messages']()).toEqual([]);
      expect(refresh).not.toHaveBeenCalled();
    },
  );
  it('ignores an older same-clinic Queue error after a newer successful read', async () => {
    const pending = new Subject<PracticeQueue>();
    api.queue.mockReturnValueOnce(pending);
    const load = fixture.componentInstance['loadQueue']();
    await fixture.componentInstance['loadQueue']();
    pending.error(new HttpErrorResponse({ status: 403 }));
    await load;
    expect(fixture.componentInstance['loadFailed']()).toBe(false);
    expect(fixture.componentInstance['messages']()).toEqual([]);
  });
  it('distinguishes failed options from empty options and ignores old option errors', async () => {
    await walkIn();
    const c = fixture.componentInstance;
    api.walkInOptions.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await c['refreshChoices']();
    expect(c['optionsFailed']()).toBe(true);
    await c['refreshChoices']();
    expect(c['optionsFailed']()).toBe(false);
    const old = new Subject();
    api.walkInOptions.mockReturnValueOnce(old);
    const load = c['refreshChoices']();
    await c['refreshChoices']();
    old.error(new HttpErrorResponse({ status: 403 }));
    await load;
    expect(c['optionsFailed']()).toBe(false);
    expect(c['walkInChoices']()).toHaveLength(1);
  });
  it.each([403, 409, 500])(
    'ignores stale patient search error %s after clinic change',
    async (status) => {
      await walkIn();
      const pending = new Subject();
      patientsApi.search.mockReturnValueOnce(pending);
      const search = fixture.componentInstance['searchPatients']({ name: 'Old search' });
      const refresh = vi.spyOn(context, 'refresh');
      await switchTo('b');
      await switchTo('a');
      pending.error(new HttpErrorResponse({ status }));
      await search;
      expect(fixture.componentInstance['patientSearchFailed']()).toBe(false);
      expect(refresh).not.toHaveBeenCalled();
    },
  );
  it('uses known source/outcome labels and a safe fallback for unknown server values', () => {
    const c = fixture.componentInstance;
    expect(c['sourceLabel']('Reservation')).not.toBe('Reservation');
    expect(c['sourceLabel']('InternalUnknownCode')).not.toContain('InternalUnknownCode');
    expect(c['outcomeLabel']('NoResponse')).not.toBe('NoResponse');
    expect(c['outcomeLabel']('FutureOutcome')).not.toContain('FutureOutcome');
  });
  it('loads walk-in options without Queue View', async () => {
    grants = ['PracticeTickets.CreateWalkIn', 'PracticeTickets.RecordPayment'];
    await context.refresh();
    await fixture.componentInstance['selectPractice']('a');
    expect(api.walkInOptions).toHaveBeenCalledWith('a', {});
    expect(fixture.componentInstance['canWalkIn']()).toBe(true);
    expect(fixture.componentInstance['canViewQueue']()).toBe(false);
  });
});
