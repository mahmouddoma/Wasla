import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { DiagnosticsApi } from '../../../../domains/diagnostics';
import { PatientDiagnosticsTabComponent } from './patient-diagnostics-tab.component';
describe('Patient diagnostic history', () => {
  const api = { requests: vi.fn(), results: vi.fn(), inbox: vi.fn() };
  let grants: Set<string>;
  beforeEach(() => {
    vi.resetAllMocks();
    grants = new Set([
      'LabRequests.ViewOwn',
      'LabResults.ViewOwn',
      'LabResultSubmissions.ViewOwn',
      'RadiologyRequests.ViewOwn',
    ]);
    for (const method of Object.values(api))
      method.mockReturnValue(of({ items: [], totalCount: 0 }));
    TestBed.configureTestingModule({
      imports: [PatientDiagnosticsTabComponent],
      providers: [
        provideRouter([]),
        { provide: DiagnosticsApi, useValue: api },
        { provide: AuthSession, useValue: { hasPermission: (p: string) => grants.has(p) } },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(PatientDiagnosticsTabComponent);
    fixture.componentRef.setInput('patientId', 'patient');
    return fixture;
  }
  it('loads only the selected permitted source with patient scope', async () => {
    const fixture = create();
    await fixture.whenStable();
    expect(api.requests).toHaveBeenCalledWith('lab', 'Doctor', {
      PatientId: 'patient',
      PageNumber: 1,
      PageSize: 20,
    });
    expect(api.results).not.toHaveBeenCalled();
    expect(api.inbox).not.toHaveBeenCalled();
  });
  it('keeps Lab and Radiology permissions independent', async () => {
    grants = new Set(['RadiologyRequests.ViewOwn']);
    const fixture = create();
    await fixture.whenStable();
    expect(fixture.componentInstance.currentKind()).toBe('radiology');
    expect(api.requests).toHaveBeenCalledWith('radiology', 'Doctor', expect.anything());
    fixture.componentInstance.setKind('lab');
    expect(fixture.componentInstance.currentKind()).toBe('radiology');
  });
  it('opens source review with exact patient and submission identifiers', async () => {
    const fixture = create();
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.setTab('submissions');
    fixture.componentInstance.openSource('submission');
    expect(navigate).toHaveBeenCalledWith(['/diagnostics/doctor', 'lab'], {
      queryParams: { patientId: 'patient', view: 'submissions', submissionId: 'submission' },
    });
  });
  it('ignores an old scope response', async () => {
    const fixture = create();
    await fixture.whenStable();
    const old = new Subject<object>();
    api.requests.mockReturnValueOnce(old);
    const pending = fixture.componentInstance.loadData();
    fixture.componentInstance.setTab('results');
    old.next({ items: [{ requestId: 'old' }], totalCount: 1 });
    old.complete();
    await pending;
    expect(fixture.componentInstance.requests()).toEqual([]);
  });
  it('shows an error instead of a fake official result', async () => {
    const fixture = create();
    await fixture.whenStable();
    api.results.mockReturnValue(throwError(() => new Error('unavailable')));
    fixture.componentInstance.setTab('results');
    await Promise.resolve();
    expect(fixture.componentInstance.error()).toBe(true);
    expect(fixture.componentInstance.results()).toEqual([]);
  });
});
