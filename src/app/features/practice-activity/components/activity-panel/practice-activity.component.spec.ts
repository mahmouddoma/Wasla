import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Phase18Part2Api } from '../../../../domains/phase18';
import type { componentsPart2 as components } from '../../../../domains/phase18';
import { PracticeActivityComponent } from './practice-activity.component';

type Event = components['schemas']['SafeAuditEvent'];
type Page = components['schemas']['SafeAuditEventArchivePage'];
type Options = components['schemas']['AuditOptions'];

describe('PracticeActivityComponent', () => {
  const event: Event = {
    eventKey: 'safe-key',
    occurredAtUtc: '2026-11-09T10:00:00Z',
    action: 'Created',
    entityType: 'Ticket',
    actorType: 'Doctor',
    outcome: 'Succeeded',
  };
  const page = (items: Event[], nextCursor: string | null = null): Page => ({
    items,
    nextCursor,
    hasMore: !!nextCursor,
    pageSize: 20,
    asOfUtc: '2026-11-09T10:00:00Z',
  });
  const options = {
    actions: [{ code: 'Created', nameAr: 'إضافة', nameEn: 'Added' }],
    outcomes: [{ code: 'Succeeded', nameAr: 'تمت', nameEn: 'Succeeded' }],
    entityTypes: [{ code: 'Ticket', nameAr: 'تذكرة كشف', nameEn: 'Ticket' }],
    actors: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0 },
    practices: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0 },
  };
  const api = {
    call: vi.fn<(operation: string, call?: unknown) => Observable<Options | Page | Event>>(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.call.mockImplementation(
      (operation) =>
        of(
          operation === 'P18.2-36' || operation === 'P18.2-37'
            ? options
            : operation === 'P18.2-24' || operation === 'P18.2-27'
              ? event
              : page([event], 'next'),
        ) as unknown as Observable<Options | Page | Event>,
    );
    TestBed.configureTestingModule({
      imports: [PracticeActivityComponent],
      providers: [{ provide: Phase18Part2Api, useValue: api }],
    });
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  function create(actor: 'Doctor' | 'Reception' = 'Doctor') {
    const fixture = TestBed.createComponent(PracticeActivityComponent);
    fixture.componentRef.setInput('actor', actor);
    fixture.componentRef.setInput('practiceId', 'p1');
    fixture.detectChanges();
    return fixture;
  }
  it.each([
    ['Doctor', 'P18.2-36', 'P18.2-23', 'P18.2-24'],
    ['Reception', 'P18.2-37', 'P18.2-26', 'P18.2-27'],
  ] as const)(
    'loads %s scoped options, events and independently authorized details',
    async (actor, optionOp, listOp, detailOp) => {
      const fixture = create(actor);
      await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
      fixture.detectChanges();
      expect(api.call).toHaveBeenCalledWith(optionOp, { pathParams: { practiceId: 'p1' } });
      expect(api.call).toHaveBeenCalledWith(
        listOp,
        expect.objectContaining({ pathParams: { practiceId: 'p1' } }),
      );
      fixture.nativeElement.querySelector('tbody button').click();
      await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
      fixture.detectChanges();
      expect(api.call).toHaveBeenLastCalledWith(detailOp, {
        pathParams: { practiceId: 'p1', eventKey: 'safe-key' },
      });
      expect(fixture.nativeElement.querySelector('.activity-detail')).toBeTruthy();
      expect(fixture.nativeElement.textContent).not.toContain('safe-key');
      for (const lang of ['ar', 'en'] as const) {
        TestBed.inject(LanguageService).setLanguage(lang);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain(lang === 'ar' ? 'إضافة' : 'Added');
      }
    },
  );
  it('uses the server cursor and resets it when applying a published filter', async () => {
    const fixture = create();
    await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
    fixture.detectChanges();
    await fixture.componentInstance['load'](true);
    expect(api.call).toHaveBeenLastCalledWith(
      'P18.2-23',
      expect.objectContaining({ query: expect.objectContaining({ Cursor: 'next' }) }),
    );
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'Created';
    select.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
    fixture.detectChanges();
    expect(api.call).toHaveBeenLastCalledWith(
      'P18.2-23',
      expect.objectContaining({
        query: expect.objectContaining({ Cursor: null, Action: 'Created' }),
      }),
    );
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
  });
  it('clears the previous practice and ignores late details on a scope change', async () => {
    const fixture = create();
    await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
    fixture.detectChanges();
    const pending = new Subject<Event>();
    api.call.mockReturnValueOnce(pending);
    const detail = fixture.componentInstance['inspect'](event);
    fixture.componentRef.setInput('practiceId', 'p2');
    fixture.detectChanges();
    pending.next(event);
    pending.complete();
    await detail;
    await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
    fixture.detectChanges();
    expect(fixture.componentInstance['selected']()).toBeNull();
    expect(api.call).toHaveBeenCalledWith('P18.2-36', { pathParams: { practiceId: 'p2' } });
  });
  it('clears metadata after a denial and preserves loaded rows on transient paging failure', async () => {
    const fixture = create();
    await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
    fixture.detectChanges();
    api.call.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    await fixture.componentInstance['load'](true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    api.call.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    await fixture.componentInstance['load'](true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
  });
  it('shows an illustrated empty activity state', async () => {
    api.call.mockImplementation(
      (operation) =>
        of(operation === 'P18.2-36' ? options : page([])) as unknown as Observable<
          Options | Page | Event
        >,
    );
    const fixture = create();
    await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
  });
});
