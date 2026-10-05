import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FollowUpEligibility, FollowUpsApi } from '../../../../domains/follow-ups';
import { ReservationsApi } from '../../../../domains/reservations';
import { FollowUpListComponent } from './follow-up-list.component';

describe('Follow-up booking UI', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  const eligibility: FollowUpEligibility = {
    eligibilityId: 'e',
    patientId: 'child',
    doctorId: 'd',
    practiceId: 'p',
    status: 'Available',
    validUntil: '2026-10-30',
    canBook: true,
    rowVersion: 'v1',
  };
  const api = { mine: vi.fn(), details: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.mine.mockReturnValue(
      of({ items: [eligibility], totalCount: 1, pageNumber: 1, pageSize: 20 }),
    );
    api.details.mockReturnValue(of(eligibility));
    TestBed.configureTestingModule({
      imports: [FollowUpListComponent],
      providers: [
        provideRouter([]),
        { provide: FollowUpsApi, useValue: api },
        { provide: ReservationsApi, useValue: { bookablePatients: () => of([]) } },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
  });
  it('creates and re-fetches eligibility before exposing its booking link', async () => {
    const fixture = TestBed.createComponent(FollowUpListComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    await fixture.componentInstance.inspect('e');
    fixture.detectChanges();
    expect(api.details).toHaveBeenCalledWith('e');
    const link = fixture.nativeElement.querySelector('a[href*="eligibilityId=e"]');
    expect(link).toBeTruthy();
    expect(link.href).toContain('patientId=child');
  });
  it('blocks booking when the server says unavailable and displays current status', async () => {
    api.details.mockReturnValue(of({ ...eligibility, canBook: false, status: 'Expired' }));
    const fixture = TestBed.createComponent(FollowUpListComponent);
    await fixture.whenStable();
    await fixture.componentInstance.inspect('e');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Expired');
    expect(fixture.nativeElement.querySelector('a[href*="eligibilityId"]')).toBeNull();
  });
  it('passes status filters to the API and shows a translated illustrated empty state', async () => {
    const fixture = TestBed.createComponent(FollowUpListComponent);
    await fixture.whenStable();
    api.mine.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const select = document.createElement('select');
    select.add(new Option('Expired', 'Expired'));
    select.value = 'Expired';
    fixture.componentInstance.filter('status', { target: select } as unknown as Event);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.mine).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'Expired', pageNumber: 1 }),
    );
    expect(fixture.nativeElement.querySelector('img.state-empty-illustration')).toBeTruthy();
  });
  it('discards detail responses after the drawer is closed', async () => {
    const pending = new Subject<FollowUpEligibility>();
    api.details.mockReturnValue(pending);
    const fixture = TestBed.createComponent(FollowUpListComponent);
    await fixture.whenStable();
    const task = fixture.componentInstance.inspect('e');
    fixture.componentInstance.close();
    pending.next(eligibility);
    pending.complete();
    await task;
    expect(fixture.componentInstance.selected()).toBeNull();
  });
});
