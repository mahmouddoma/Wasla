import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { HistoricalDocumentsApi } from '../../../domains/medical-records/historical-documents-api';
import { HistoricalDocument } from '../../../domains/medical-records/historical-documents.models';
import { ToastService } from '../../../core/notifications/toast.service';
import { documentFixture } from '../../../../testing/family-workspace';
import { HistoricalDocumentsComponent } from './historical-documents.component';
import { LanguageService } from '../../../core/i18n/language.service';

describe('HistoricalDocumentsComponent', () => {
  const api = {
    list: vi.fn(),
    details: vi.fn(),
    upload: vi.fn(),
    withdraw: vi.fn(),
    attachment: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  afterEach(() => localStorage.removeItem('wasla_lang'));
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockReturnValue(of({ items: [], totalCount: 0 }));
    TestBed.configureTestingModule({
      imports: [HistoricalDocumentsComponent],
      providers: [
        { provide: HistoricalDocumentsApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(HistoricalDocumentsComponent);
    fixture.componentRef.setInput('subject', { kind: 'own' });
    fixture.componentRef.setInput('canCreate', true);
    fixture.detectChanges();
    return fixture;
  }
  it.each(['ar', 'en'] as const)('separates clinical document date from upload time in %s list and detail', async (lang) => {
    const document = documentFixture();
    document.currentVersion!.metadata.documentDate = '2020-01-01';
    document.currentVersion!.metadata.dateUnknown = false;
    api.list.mockReturnValueOnce(of({ items: [document], totalCount: 1 }));
    api.details.mockReturnValueOnce(of(document));
    const fixture = create();
    const language = TestBed.inject(LanguageService);
    language.setLanguage(lang);
    fixture.detectChanges();
    const dates = fixture.nativeElement.querySelectorAll('tbody time');
    expect(dates[0].getAttribute('datetime')).toBe('2020-01-01');
    expect(dates[1].getAttribute('datetime')).toBe(document.uploadedAtUtc);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(language.t('historical.uploadedAt'));
    fixture.componentInstance.inspect(document);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drawer-body time[datetime="2020-01-01"]')).toBeTruthy();
  });
  it('labels unknown document dates without substituting the upload date', () => {
    api.list.mockReturnValueOnce(of({ items: [documentFixture()], totalCount: 1 }));
    const fixture = create();
    const language = TestBed.inject(LanguageService);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(language.t('historical.documentDateUnknown'));
    expect(fixture.nativeElement.querySelectorAll('tbody time')).toHaveLength(1);
  });
  it('renders an illustrated empty state and an upload action', () => {
    const fixture = create();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-state img')).not.toBeNull();
    expect(api.list).toHaveBeenCalledWith({ kind: 'own' }, 1, false);
  });
  it('does not report quarantined upload receipts as saved', async () => {
    api.upload.mockReturnValue(
      of({
        documentId: 'doc',
        versionNumber: 0,
        validationState: 'Quarantined',
        failureCode: 'ScannerUnavailable',
      }),
    );
    const fixture = create(),
      component = fixture.componentInstance;
    component.startEdit();
    component.files = [new File(['pdf'], 'report.pdf', { type: 'application/pdf' })];
    await component.save();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(component.editing()).toBe(true);
  });
  it('does not download a withdrawn source', async () => {
    const component = create().componentInstance;
    component.selected.set(documentFixture({ state: 'Withdrawn' }));
    await component.download('file', 'report.pdf');
    expect(api.attachment).not.toHaveBeenCalled();
  });
  it('clears private details when the subject changes and ignores a stale response', () => {
    const detail = new Subject<HistoricalDocument>();
    api.details.mockReturnValue(detail);
    const fixture = create();
    fixture.componentInstance.inspect(documentFixture());
    fixture.componentRef.setInput('subject', { kind: 'dependent', patientId: 'second' });
    fixture.detectChanges();
    detail.next(documentFixture());
    expect(fixture.componentInstance.selected()).toBeNull();
  });
  it('purges details after authorization is revoked', () => {
    api.details.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const component = create().componentInstance;
    component.inspect(documentFixture());
    expect(component.selected()).toBeNull();
    expect(component.documents()).toEqual([]);
  });
  it('allows independently authorized upload without fetching the protected list', () => {
    const fixture = TestBed.createComponent(HistoricalDocumentsComponent);
    fixture.componentRef.setInput('canView', false);
    fixture.componentRef.setInput('canCreate', true);
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    expect(api.list).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editing()).toBe(true);
  });
});
