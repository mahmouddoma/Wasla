import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MedicalRecordsApi } from '../../../domains/medical-records';
import { AuthSession } from '../../../core/auth/auth-session';
import { PatientRecordComponent } from './patient-record.component';

describe('PatientRecordComponent', () => {
  const api = { patientOverview: vi.fn(), patientTimeline: vi.fn(), patientAccessLog: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    api.patientAccessLog.mockReturnValue(of({ items: [], hasMore: false }));
    api.patientOverview.mockReturnValue(
      of({
        patient: { nameAr: 'مريض' },
        summary: { officialLabResultCount: 0 },
        timeline: { items: [], nextCursor: null, hasMore: false },
        availableFilters: ['all', 'historical-documents'],
      }),
    );
    TestBed.configureTestingModule({
      imports: [PatientRecordComponent],
      providers: [
        provideRouter([]),
        { provide: MedicalRecordsApi, useValue: api },
        {
          provide: AuthSession,
          useValue: {
            hasPermission: (permission: string) => permission === 'MedicalRecords.ViewOwn',
          },
        },
      ],
    });
  });
  it('renders an illustrated empty medical record', async () => {
    const fixture = TestBed.createComponent(PatientRecordComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-state img')).not.toBeNull();
  });
  it('sends the exact historical-document filter with the returned opaque cursor', async () => {
    api.patientTimeline.mockReturnValue(of({ items: [], nextCursor: 'opaque', hasMore: true }));
    const component = TestBed.createComponent(PatientRecordComponent).componentInstance;
    await component.timeline('historical-documents');
    await component.timeline('historical-documents', true);
    expect(api.patientTimeline).toHaveBeenLastCalledWith(
      'historical-documents',
      undefined,
      undefined,
      'opaque',
    );
  });
  it('does not open a private document without its independent permission', () => {
    const component = TestBed.createComponent(PatientRecordComponent).componentInstance;
    component.openDocument('doc');
    expect(component.showDocuments()).toBe(false);
  });
  it('opens patient access history from the medical record navigation', async () => {
    const fixture = TestBed.createComponent(PatientRecordComponent);
    await fixture.whenStable();
    fixture.componentInstance.activeView.set('access');
    await fixture.whenStable();
    expect(api.patientAccessLog).toHaveBeenCalledWith(undefined);
    expect(fixture.nativeElement.querySelector('app-record-access-log')).toBeTruthy();
    expect(fixture.componentInstance.showDocuments()).toBe(false);
  });
});
