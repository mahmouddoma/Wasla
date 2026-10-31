import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ReceptionWorklistComponent } from './reception-worklist.component';
import { Phase18Api, components } from '../../../domains/phase18';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { LanguageService } from '../../../core/i18n/language.service';

type Page = components['schemas']['WorklistItemReportPage'];

describe('ReceptionWorklistComponent', () => {
  let fixture: ComponentFixture<ReceptionWorklistComponent>;
  const practiceId = signal('');
  const allowed = signal(true);
  const page: Page = {
    items: [
      {
        id: 'r1',
        patientNameAr: 'أحمد',
        patientNameEn: 'Ahmed',
        reference: 'RES-1',
        category: 'AwaitingCheckIn',
        occurredAtUtc: '2026-10-31T10:00:00Z',
      },
    ],
    totalCount: 1,
  };
  const api = { call: vi.fn(() => of<Page>(page)) };

  beforeEach(async () => {
    practiceId.set('clinic-1');
    allowed.set(true);
    api.call.mockReset().mockReturnValue(of(page));
    TestBed.configureTestingModule({
      imports: [ReceptionWorklistComponent],
      providers: [
        provideRouter([]),
        { provide: Phase18Api, useValue: api },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            currentPracticeId: practiceId,
            ensureLoaded: () => Promise.resolve(),
            allows: () => allowed(),
          },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(ReceptionWorklistComponent);
    await fixture.whenStable();
  });

  it('maps the real API fields and hands off to the reservation workflow', async () => {
    expect(api.call).toHaveBeenCalledWith('P18-103', {
      path: { practiceId: 'clinic-1' },
      query: { pageNumber: 1, pageSize: 50 },
    });
    expect(fixture.nativeElement.textContent).toContain('أحمد');
    expect(fixture.nativeElement.textContent).toContain('RES-1');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toContain(
      '/reception/reservations',
    );
    expect(fixture.nativeElement.querySelector('.btn-action-primary button')).toBeNull();
    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Ahmed');
    expect(fixture.nativeElement.querySelector('main').dir).toBe('ltr');
  });

  it('filters categories without inventing check-in statuses or counts', async () => {
    fixture.componentInstance.setFilter('attention');
    await fixture.whenStable();
    expect(fixture.componentInstance.filteredItems()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.empty-state img')).toBeTruthy();
    fixture.componentInstance.setFilter('waiting');
    expect(fixture.componentInstance.filteredItems()).toHaveLength(1);
  });

  it('keeps empty responses empty and renders a real error with retry', async () => {
    api.call.mockReturnValueOnce(of({ items: [], totalCount: 0 }));
    await fixture.componentInstance.loadData();
    await fixture.whenStable();
    expect(fixture.componentInstance.worklistItems()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.empty-state img')).toBeTruthy();
    api.call.mockReturnValueOnce(throwError(() => new Error('unavailable')));
    await fixture.componentInstance.loadData();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role=alert] button')).toBeTruthy();
  });

  it('never requests a fabricated clinic and reloads on clinic changes', async () => {
    api.call.mockClear();
    practiceId.set('');
    await fixture.whenStable();
    expect(api.call).not.toHaveBeenCalled();
    expect(fixture.componentInstance.worklistItems()).toEqual([]);
    practiceId.set('clinic-2');
    await fixture.whenStable();
    expect(api.call).toHaveBeenCalledWith(
      'P18-103',
      expect.objectContaining({ path: { practiceId: 'clinic-2' } }),
    );
  });

  it('ignores stale responses after the clinic changes', async () => {
    const pending = new Subject<Page>();
    api.call.mockReturnValueOnce(pending);
    const request = fixture.componentInstance.loadData();
    practiceId.set('clinic-2');
    await fixture.whenStable();
    pending.next({ items: [{ id: 'old-clinic' }] });
    pending.complete();
    await request;
    expect(fixture.componentInstance.worklistItems()).toEqual(page.items);
  });

  it('requests subsequent pages and exposes the total', async () => {
    api.call.mockReturnValueOnce(of({ ...page, totalCount: 75 }));
    await fixture.componentInstance.loadData(2);
    expect(fixture.componentInstance.pageNumber()).toBe(2);
    expect(fixture.componentInstance.totalPages()).toBe(2);
    expect(api.call).toHaveBeenLastCalledWith(
      'P18-103',
      expect.objectContaining({ query: { pageNumber: 2, pageSize: 50 } }),
    );
  });

  it('stops requests and clears rows when clinic permission is revoked', async () => {
    api.call.mockClear();
    allowed.set(false);
    await fixture.whenStable();
    await fixture.componentInstance.loadData();
    expect(api.call).not.toHaveBeenCalled();
    expect(fixture.componentInstance.worklistItems()).toEqual([]);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role=status]')?.textContent).toContain(
      TestBed.inject(LanguageService).t('reception.access.worklist'),
    );
    allowed.set(true);
    await fixture.whenStable();
    expect(api.call).toHaveBeenCalledWith('P18-103', expect.any(Object));
  });
});
