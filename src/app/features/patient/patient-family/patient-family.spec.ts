import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamiliesApi, FamilyWorkspaceApi } from '../../../domains/families';
import { childFixture, workspaceFixture } from '../../../../testing/family-workspace';
import { PatientFamily } from './patient-family';

describe('PatientFamily workspace', () => {
  const api = {
    workspace: vi.fn(),
    onboardingRequests: vi.fn(),
    governanceCases: vi.fn(),
    onboardingDetails: vi.fn(),
  };
  const session = { hasPermission: vi.fn(() => false) };
  const relationships = { requests: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    api.workspace.mockReturnValue(of(workspaceFixture()));
    TestBed.configureTestingModule({
      imports: [PatientFamily],
      providers: [
        provideRouter([]),
        { provide: FamilyWorkspaceApi, useValue: api },
        { provide: FamiliesApi, useValue: relationships },
        { provide: AuthSession, useValue: session },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    });
  });
  it('renders the no-family workspace directly from a successful response', async () => {
    const fixture = TestBed.createComponent(PatientFamily);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(api.workspace).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.state img')).not.toBeNull();
  });
  it('gates medical and operational actions independently', async () => {
    api.workspace.mockReturnValue(
      of(workspaceFixture({ hasFamily: true, dependents: [childFixture({ canBook: true })] })),
    );
    const fixture = TestBed.createComponent(PatientFamily);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.dependent-row a')].map(
      (a: HTMLAnchorElement) => a.getAttribute('href'),
    );
    expect(links).toEqual(['/doctors?patientId=child']);
  });
  it('routes pending workflows by their returned reference', async () => {
    api.onboardingDetails.mockReturnValue(of([]));
    const component = TestBed.createComponent(PatientFamily).componentInstance;
    await component.openWorkflow({
      kind: 'ChildOnboarding',
      reference: 'opaque-request',
      status: 'PendingReview',
      nextAction: 'WaitForReview',
      createdAtUtc: '',
    });
    expect(api.onboardingDetails).toHaveBeenCalledWith('opaque-request');
  });
  it('clears a previously loaded workspace when access is revoked', async () => {
    const component = TestBed.createComponent(PatientFamily).componentInstance;
    await Promise.resolve();
    api.workspace.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await component.load();
    expect(component.workspace()).toBeNull();
    expect(component.failed()).toBe(true);
  });
  it('preserves the paginated relationship history and its server filters', async () => {
    session.hasPermission.mockReturnValue(true);
    relationships.requests.mockReturnValue(
      of({ items: [], pageNumber: 2, pageSize: 20, totalCount: 25 }),
    );
    const component = TestBed.createComponent(PatientFamily).componentInstance;
    component.requestType = 'VerifyOperationalParentChild';
    component.requestStatus = 'ModificationRequested';
    component.requestSearch = '  test  ';
    await component.loadRelationshipRequests(2);
    expect(relationships.requests).toHaveBeenCalledWith({
      pageNumber: 2,
      pageSize: 20,
      status: 'ModificationRequested',
      requestType: 'VerifyOperationalParentChild',
      search: 'test',
    });
    expect(component.relationshipHistory()?.totalCount).toBe(25);
  });
  it('releases the drawer busy state after a completed mutation refresh', () => {
    const component = TestBed.createComponent(PatientFamily).componentInstance;
    component.busy.set(true);
    component.close();
    expect(component.busy()).toBe(false);
  });
});
