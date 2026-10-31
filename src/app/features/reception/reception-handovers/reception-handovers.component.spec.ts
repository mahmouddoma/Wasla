import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { ReceptionHandoversComponent } from './reception-handovers.component';
import { Phase18Api, components } from '../../../domains/phase18';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';

type Handover = components['schemas']['HandoverResponse'];
describe('ReceptionHandoversComponent', () => {
  let fixture: ComponentFixture<ReceptionHandoversComponent>;
  const practiceId = signal('clinic-1');
  const deniedPermissions = signal<readonly string[]>([]);
  const handover: Handover = {
    id: 'h1',
    summary: 'Shift summary',
    status: 'Open',
    rowVersion: 'rv1',
    createdOnUtc: '2026-10-31T10:00:00Z',
    availableActions: [
      { code: 'Acknowledge', allowed: true },
      { code: 'Close', allowed: true },
    ],
  };
  const api = { call: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(async () => {
    practiceId.set('clinic-1');
    deniedPermissions.set([]);
    vi.clearAllMocks();
    api.call.mockImplementation((endpoint: string) =>
      of(endpoint === 'P18-096' ? { items: [handover], totalCount: 1 } : handover),
    );
    TestBed.configureTestingModule({
      imports: [ReceptionHandoversComponent],
      providers: [
        { provide: Phase18Api, useValue: api },
        { provide: ToastService, useValue: toast },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            currentPracticeId: practiceId,
            ensureLoaded: () => Promise.resolve(),
            allows: (code: string) => !deniedPermissions().includes(code),
          },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(ReceptionHandoversComponent);
    await fixture.whenStable();
  });

  it('renders real fields and opens a keyboard-accessible shared drawer', async () => {
    expect(fixture.nativeElement.textContent).toContain('Shift summary');
    fixture.nativeElement.querySelector('.btn-icon-subtle').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeTruthy();
    expect(fixture.componentInstance.selectedHandover()).toEqual(handover);
  });

  it('does not request or mutate handovers without delegated clinic view access', async () => {
    api.call.mockClear();
    deniedPermissions.set(['Handovers.ViewAssigned']);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    await component.loadHandovers();
    component.openCreateDrawer();
    component.newSummary = 'Synthetic summary';
    await component.submitNewHandover();
    await component.acknowledgeHandover(handover);
    expect(api.call).not.toHaveBeenCalled();
    expect(component.handovers()).toEqual([]);
    expect(component.drawerMode()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role=status]')?.textContent).toContain(
      TestBed.inject(LanguageService).t('reception.access.handovers'),
    );
  });

  it('requires separate delegated creation and action permissions', async () => {
    api.call.mockClear();
    deniedPermissions.set(['Handovers.CreateAssigned', 'Handovers.AcknowledgeAssigned']);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.openCreateDrawer();
    component.newSummary = 'Synthetic summary';
    await component.submitNewHandover();
    await component.acknowledgeHandover(handover);
    expect(
      api.call.mock.calls.some(([endpoint]) => endpoint === 'P18-097' || endpoint === 'P18-099'),
    ).toBe(false);
    expect(component.canAct(handover, 'Close')).toBe(true);
  });

  it('does not fabricate empty records or suppress read failures', async () => {
    api.call.mockReturnValueOnce(of({ items: [], totalCount: 0 }));
    await fixture.componentInstance.loadHandovers();
    await fixture.whenStable();
    expect(fixture.componentInstance.handovers()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.empty-state img')).toBeTruthy();
    api.call.mockReturnValueOnce(throwError(() => new Error('offline')));
    await fixture.componentInstance.loadHandovers();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role=alert] button')).toBeTruthy();
  });

  it('retains failed creation input, reports failure, and reuses its idempotency key', async () => {
    const component = fixture.componentInstance;
    component.openCreateDrawer();
    component.newSummary = '  New summary  ';
    api.call.mockReturnValueOnce(throwError(() => new Error('offline')));
    await component.submitNewHandover();
    const firstRequest = api.call.mock.calls.find(([endpoint]) => endpoint === 'P18-097')![1];
    expect(firstRequest.body).toEqual({ summary: 'New summary' });
    expect(firstRequest.idempotencyKey).toBeTruthy();
    expect(component.drawerMode()).toBe('create');
    expect(component.handovers()).toEqual([handover]);
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    await component.submitNewHandover();
    const requests = api.call.mock.calls.filter(([endpoint]) => endpoint === 'P18-097');
    expect(requests[1][1].idempotencyKey).toBe(firstRequest.idempotencyKey);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(component.drawerMode()).toBeNull();
  });

  it('blocks duplicate submissions and closing the drawer while saving', async () => {
    const pending = new Subject<Handover>();
    api.call.mockReturnValueOnce(pending);
    const component = fixture.componentInstance;
    component.openCreateDrawer();
    component.newSummary = 'Summary';
    const saving = component.submitNewHandover();
    await component.submitNewHandover();
    component.closeDrawer();
    expect(api.call.mock.calls.filter(([endpoint]) => endpoint === 'P18-097')).toHaveLength(1);
    expect(component.drawerMode()).toBe('create');
    pending.next(handover);
    pending.complete();
    await saving;
  });

  it('uses rowVersion and a key, updates the drawer from the server, and handles failure honestly', async () => {
    const component = fixture.componentInstance;
    component.openViewDrawer(handover);
    api.call.mockReturnValueOnce(of({ ...handover, status: 'Acknowledged', rowVersion: 'rv2' }));
    await component.acknowledgeHandover(handover);
    expect(api.call).toHaveBeenCalledWith(
      'P18-099',
      expect.objectContaining({
        body: { rowVersion: 'rv1' },
        idempotencyKey: expect.any(String),
      }),
    );
    expect(component.selectedHandover()?.rowVersion).toBe('rv2');
    api.call.mockReturnValueOnce(throwError(() => new Error('conflict')));
    toast.success.mockClear();
    await component.closeHandover(component.selectedHandover()!);
    expect(component.selectedHandover()?.status).toBe('Acknowledged');
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('requires allowed server actions and an actual clinic', async () => {
    expect(fixture.componentInstance.canAct({ ...handover, availableActions: [] }, 'Close')).toBe(
      false,
    );
    expect(fixture.componentInstance.canAct({ ...handover, rowVersion: null }, 'Close')).toBe(
      false,
    );
    api.call.mockClear();
    practiceId.set('');
    await fixture.whenStable();
    expect(api.call).not.toHaveBeenCalled();
    expect(fixture.componentInstance.handovers()).toEqual([]);
  });
});
