import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { MedicalRecordAccessLogPage, MedicalRecordsApi } from '../../../domains/medical-records';
import { RecordAccessLogComponent } from './record-access-log.component';

describe('RecordAccessLogComponent', () => {
  const entry = {
    entryId: 'entry1',
    actorCategory: 'Doctor',
    action: 'View',
    occurredAtUtc: '2026-11-09T10:00:00Z',
  };
  const api = {
    patientAccessLog: vi.fn<() => ReturnType<MedicalRecordsApi['patientAccessLog']>>(),
  };
  const session = { hasPermission: vi.fn(() => true) };

  beforeEach(() => {
    vi.resetAllMocks();
    session.hasPermission.mockReturnValue(true);
    api.patientAccessLog.mockReturnValue(of({ items: [entry], nextCursor: 'next', hasMore: true }));
    TestBed.configureTestingModule({
      imports: [RecordAccessLogComponent],
      providers: [
        { provide: MedicalRecordsApi, useValue: api },
        { provide: AuthSession, useValue: session },
      ],
    });
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('renders only safe server fields and changes labels with the active language', async () => {
    const fixture = TestBed.createComponent(RecordAccessLogComponent);
    await fixture.whenStable();
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('tbody');
    expect(table.textContent).toContain('Doctor');
    expect(table.textContent).toContain('View');
    expect(table.textContent).not.toContain('entry1');
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture.detectChanges();
    expect(table.textContent).toContain('طبيب');
    expect(table.textContent).toContain('اطلاع');
  });

  it('forwards opaque cursors and deduplicates overlapping server pages', async () => {
    const fixture = TestBed.createComponent(RecordAccessLogComponent);
    await fixture.whenStable();
    api.patientAccessLog.mockReturnValueOnce(
      of({ items: [entry, { ...entry, entryId: 'entry2' }], hasMore: false }),
    );
    await fixture.componentInstance.load(true);
    fixture.detectChanges();
    expect(api.patientAccessLog).toHaveBeenLastCalledWith('next');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('handles null lists with an illustrated empty state', async () => {
    api.patientAccessLog.mockReturnValueOnce(of({ items: null, hasMore: false }));
    const fixture = TestBed.createComponent(RecordAccessLogComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
  });

  it('makes no request without permission and clears sensitive metadata after a denial', async () => {
    session.hasPermission.mockReturnValueOnce(false);
    const denied = TestBed.createComponent(RecordAccessLogComponent);
    await denied.whenStable();
    expect(api.patientAccessLog).not.toHaveBeenCalled();
    const fixture = TestBed.createComponent(RecordAccessLogComponent);
    await fixture.whenStable();
    api.patientAccessLog.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    await fixture.componentInstance.load(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('retains existing rows on transient paging errors and discards late results after destruction', async () => {
    const fixture = TestBed.createComponent(RecordAccessLogComponent);
    await fixture.whenStable();
    api.patientAccessLog.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    await fixture.componentInstance.load(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    const pending = new Subject<MedicalRecordAccessLogPage>();
    api.patientAccessLog.mockReturnValueOnce(pending);
    const load = fixture.componentInstance.load(true);
    fixture.destroy();
    pending.next({ items: [], hasMore: false });
    pending.complete();
    await load;
  });
});
