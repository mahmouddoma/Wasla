import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { components } from '../../../../domains/phase18/phase18-part2-openapi.types';
import { TicketsApi } from '../../../../domains/tickets';
import { Phase18Part2Api } from '../../../../domains/phase18';
import { PatientTickets } from './patient-tickets';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('PatientTickets', () => {
  let fixture: ComponentFixture<PatientTickets>;
  afterEach(() => localStorage.removeItem('wasla_lang'));
  const api = {
    myActive: vi.fn(() =>
      of([
        {
          ticketId: 't1',
          ticketNumber: 'A-12',
          status: 'Waiting',
          practice: { nameAr: 'عيادة', nameEn: 'Clinic' },
          doctor: { nameAr: 'طبيب', nameEn: 'Doctor' },
          patientsAheadNow: 3,
          lastUpdatedOnUtc: '2026-09-20T10:00:00Z',
        },
      ]),
    ),
    myDetails: vi.fn(),
  };

  const phase18Api = {
    call: vi.fn((): ReturnType<Phase18Part2Api['call']> =>
      of({
        items: [],
        nextCursor: null,
        pageSize: 50,
        asOfUtc: '2026-10-15T00:00:00Z',
        hasMore: false,
      }),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientTickets],
      providers: [
        provideRouter([]),
        { provide: TicketsApi, useValue: api },
        { provide: Phase18Part2Api, useValue: phase18Api },
      ],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PatientTickets);
    await fixture.whenStable();
  });

  it('creates and renders only the current patient active tickets', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(api.myActive).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('A-12');
    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('renders the privacy-safe dynamic queue notice', () => {
    expect(fixture.nativeElement.textContent).toContain('يتغير لحظيًا');
  });

  it('renders empty state when no active tickets exist', async () => {
    api.myActive.mockReturnValueOnce(of([]));
    const emptyFixture = TestBed.createComponent(PatientTickets);
    await emptyFixture.whenStable();
    emptyFixture.detectChanges();
    expect(emptyFixture.nativeElement.textContent).toContain('لا توجد تذاكر نشطة');
  });

  const archived = (ticketId: string): components['schemas']['ArchivedTicketItem'] => ({
    ticketId, ticketNumber: 19, doctorPracticeId: 'p1', businessDate: '2026-10-01',
    archivedAtUtc: '2026-10-02T10:00:00Z', status: 'Completed', detailsRoute: null, isArchived: true,
  });
  const page = (items: components['schemas']['ArchivedTicketItem'][], nextCursor: string | null = null) =>
    ({ items, nextCursor, hasMore: !!nextCursor, pageSize: 50, asOfUtc: '2026-11-09T00:00:00Z' });

  it('renders archive facts without fabricated names or live queue positions, and follows the cursor', async () => {
    phase18Api.call.mockReturnValueOnce(of(page([archived('old')], 'next')));
    await fixture.componentInstance['setViewMode']('archived');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.queue-notice-banner')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ahead-chip')).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('2026-10-01');
    expect(fixture.componentInstance['tickets']()).toEqual([]);
    phase18Api.call.mockReturnValueOnce(of(page([archived('old'), archived('older')])));
    await fixture.componentInstance['loadMore']();
    expect(phase18Api.call).toHaveBeenLastCalledWith('P18.2-11', { query: { pageSize: 50, cursor: 'next' } });
    expect(fixture.componentInstance['archivedTickets']().map(item => item.ticketId)).toEqual(['old', 'older']);
    expect(fixture.componentInstance['archiveHasMore']()).toBe(false);
  });

  it('discards a late archive response after switching back to current tickets', async () => {
    const pending = new Subject<components['schemas']['ArchivedTicketItemArchivePage']>();
    phase18Api.call.mockReturnValueOnce(pending);
    const loading = fixture.componentInstance['setViewMode']('archived');
    await fixture.componentInstance['setViewMode']('active');
    pending.next(page([archived('obsolete')]));
    pending.complete();
    await loading;
    expect(fixture.componentInstance['archivedTickets']()).toEqual([]);
    expect(fixture.componentInstance['tickets']().length).toBeGreaterThan(0);
  });

  it('keeps loaded archive rows when the next page fails and retries the same cursor', async () => {
    phase18Api.call.mockReturnValueOnce(of(page([archived('old')], 'next')));
    await fixture.componentInstance['setViewMode']('archived');
    phase18Api.call.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    await fixture.componentInstance['loadMore']();
    fixture.detectChanges();
    expect(fixture.componentInstance['archivedTickets']()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('app-archived-ticket-list [role="alert"]')).toBeTruthy();
    phase18Api.call.mockReturnValueOnce(of(page([archived('older')])));
    await fixture.componentInstance['retry']();
    expect(phase18Api.call).toHaveBeenLastCalledWith('P18.2-11', { query: { pageSize: 50, cursor: 'next' } });
    expect(fixture.componentInstance['archivedTickets']()).toHaveLength(2);
  });
});
