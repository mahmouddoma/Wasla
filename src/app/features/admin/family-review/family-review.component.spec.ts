import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FamilyWorkspaceApi, ChildOnboardingReview } from '../../../domains/families';
import { AuthSession } from '../../../core/auth/auth-session';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamilyReviewComponent } from './family-review.component';

describe('FamilyReviewComponent', () => {
  const api = {
    adminOnboardingRequests: vi.fn(),
    adminOnboardingDetails: vi.fn(),
    decideOnboarding: vi.fn(),
    adminGovernanceCases: vi.fn(),
  };
  const permissions = new Set<string>();
  const review: ChildOnboardingReview = {
    request: {
      requestId: 'request',
      status: 'PendingReview',
      revision: 1,
      createdAtUtc: '',
      rowVersion: 'AAAA',
      reviewMessage: null,
      canResubmit: false,
      approvedPatientId: null,
      familyRelationshipRequestId: null,
      conflictCaseId: null,
      nextAction: null,
    },
    intake: {
      nameAr: 'طفل',
      nameEn: null,
      dateOfBirth: '2020-01-01',
      gender: 'Male',
      phoneNumber: null,
      primaryContactNameAr: 'أب',
      primaryContactPhone: '01012345678',
      relationToChild: 'Father',
    },
    evidence: [],
    possibleMatches: [],
    hasMorePossibleMatches: false,
    possibleMatchPageNumber: 1,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.clear();
    permissions.add('ChildOnboarding.ViewAll');
    api.adminOnboardingRequests.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [FamilyReviewComponent],
      providers: [
        provideRouter([]),
        { provide: FamilyWorkspaceApi, useValue: api },
        { provide: AuthSession, useValue: { hasPermission: (p: string) => permissions.has(p) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  });
  it('loads the permitted review queue and renders an empty state', async () => {
    const fixture = TestBed.createComponent(FamilyReviewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(api.adminOnboardingRequests).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.empty-state img')).not.toBeNull();
  });
  it('requires both onboarding and relationship approval grants', () => {
    const component = TestBed.createComponent(FamilyReviewComponent).componentInstance;
    component.childReview.set(review);
    permissions.add('ChildOnboarding.Decide');
    expect(component.canDecide('approve')).toBe(false);
    permissions.add('FamilyRelationshipRequests.Approve');
    expect(component.canDecide('approve')).toBe(true);
  });
  it('does not approve an ambiguous identity without explicit selection', async () => {
    permissions.add('ChildOnboarding.Decide');
    permissions.add('FamilyRelationshipRequests.Approve');
    const component = TestBed.createComponent(FamilyReviewComponent).componentInstance;
    component.childReview.set({
      ...review,
      possibleMatches: [
        {
          patientId: 'existing',
          nameAr: 'طفل',
          nameEn: null,
          dateOfBirth: '2020-01-01',
          gender: 'Male',
        },
      ],
    });
    component.ask('approve');
    await component.decide();
    expect(api.decideOnboarding).not.toHaveBeenCalled();
  });
  it('discards private details after a denied read', async () => {
    permissions.add('ChildOnboarding.ViewDetails');
    api.adminOnboardingDetails.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    const component = TestBed.createComponent(FamilyReviewComponent).componentInstance;
    await component.inspectChild('request');
    expect(component.childReview()).toBeNull();
    expect(component.onboarding()).toEqual([]);
  });
  it('narrows private identity revisions without rendering arbitrary JSON fields', () => {
    const component = TestBed.createComponent(FamilyReviewComponent).componentInstance;
    expect(
      component.identitySnapshot(
        '{"NameAr":"طفل","DateOfBirth":"2020-01-01","Gender":1,"PrivateNote":"hidden"}',
      ),
    ).toEqual({ nameAr: 'طفل', nameEn: null, dateOfBirth: '2020-01-01', gender: 'Male' });
    expect(component.identitySnapshot('not json')).toBeNull();
  });
  it('closes the loading drawer immediately without restoring an old review', () => {
    const component = TestBed.createComponent(FamilyReviewComponent).componentInstance;
    component.detailLoading.set(true);
    component.reason = 'private feedback';
    component.close();
    expect(component.detailLoading()).toBe(false);
    expect(component.reason).toBe('');
  });

  it('manages Master-Detail active state and filters queue by search query', () => {
    const component = TestBed.createComponent(FamilyReviewComponent).componentInstance;
    component.onboarding.set([
      review,
      {
        ...review,
        request: { ...review.request, requestId: 'req-2' },
        intake: { ...review.intake, nameAr: 'سارة', nameEn: 'Sara' },
      },
    ]);

    expect(component.hasActiveDetail()).toBe(false);
    component.childReview.set(review);
    expect(component.hasActiveDetail()).toBe(true);
    expect(component.detailTitle()).toBe('طفل');
    expect(component.selectedId()).toBe('request');

    component.searchQuery.set('سارة');
    expect(component.filteredOnboarding().length).toBe(1);
    expect(component.filteredOnboarding()[0].intake.nameAr).toBe('سارة');

    component.searchQuery.set('non-existent');
    expect(component.filteredOnboarding().length).toBe(0);
  });
});
