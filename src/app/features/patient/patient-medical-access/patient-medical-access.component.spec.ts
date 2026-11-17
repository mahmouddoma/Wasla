import { HttpErrorResponse, HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  Family,
  FamilyMedicalAccessStatus,
  FamilyMedicalCase,
  FamilyMedicalHistoryItem,
  FamilyMedicalPage,
} from '../../../domains/families';
import { PatientMedicalAccessComponent } from './patient-medical-access.component';

const item: FamilyMedicalCase = {
  requestId: 'request-a',
  familyId: 'family',
  childPatientId: 'child',
  affectedAdultPatientId: 'adult',
  requestType: 'Restriction',
  status: 'Pending',
  revision: 1,
  reason: 'Synthetic reason',
  submittedAtUtc: '2026-11-17T10:00:00Z',
  rowVersion: 'version-a',
  reviewMessage: null,
  restrictionStatus: 'Allowed',
  capabilities: {
    canWithdraw: true,
    canResubmit: true,
    canApprove: false,
    canReject: false,
    canRequestModification: false,
  },
  documents: [
    {
      documentId: 'document',
      fileName: 'evidence.pdf',
      documentType: 'BirthCertificate',
      canDownload: true,
    },
  ],
};
const family: Family = {
  familyId: 'family',
  status: 'Active',
  members: [
    {
      patientId: 'child',
      nameAr: 'طفل تجريبي',
      nameEn: 'Test child',
      role: 'Child',
      gender: 'Male',
    },
    {
      patientId: 'adult',
      nameAr: 'أم تجريبية',
      nameEn: 'Test mother',
      role: 'Mother',
      gender: 'Female',
    },
  ],
};
const access: FamilyMedicalAccessStatus = {
  status: 'Allowed',
  canView: true,
  canRequestRestriction: true,
  canRequestRestoration: false,
};
const page: FamilyMedicalPage<FamilyMedicalCase> = {
  items: [item],
  pageNumber: 1,
  pageSize: 20,
  totalCount: 1,
};
const history: FamilyMedicalPage<FamilyMedicalHistoryItem> = {
  items: [],
  pageNumber: 1,
  pageSize: 20,
  totalCount: 0,
};

describe('Patient medical access: policy gates and server state', () => {
  let fixture: ComponentFixture<PatientMedicalAccessComponent>;
  let component: PatientMedicalAccessComponent;
  let api: {
    mine: ReturnType<typeof vi.fn<() => Observable<Family>>>;
    myMedicalAccessRequests: ReturnType<
      typeof vi.fn<() => Observable<FamilyMedicalPage<FamilyMedicalCase>>>
    >;
    myMedicalAccessRequest: ReturnType<typeof vi.fn<(id: string) => Observable<FamilyMedicalCase>>>;
    myMedicalAccessHistory: ReturnType<
      typeof vi.fn<(id: string) => Observable<FamilyMedicalPage<FamilyMedicalHistoryItem>>>
    >;
    childMedicalAccess: ReturnType<
      typeof vi.fn<(id: string) => Observable<FamilyMedicalAccessStatus>>
    >;
    withdrawMedicalAccessRequest: ReturnType<
      typeof vi.fn<(...args: unknown[]) => Observable<FamilyMedicalCase>>
    >;
    myMedicalAccessDocument: ReturnType<
      typeof vi.fn<(...args: unknown[]) => Observable<HttpResponse<Blob>>>
    >;
    createMedicalAccessRequest: ReturnType<typeof vi.fn>;
    resubmitMedicalAccessRequest: ReturnType<typeof vi.fn>;
  };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = {
      mine: vi.fn(() => of(family)),
      myMedicalAccessRequests: vi.fn(() => of(page)),
      myMedicalAccessRequest: vi.fn(() => of(item)),
      myMedicalAccessHistory: vi.fn(() => of(history)),
      childMedicalAccess: vi.fn(() => of(access)),
      withdrawMedicalAccessRequest: vi.fn(() => of(item)),
      myMedicalAccessDocument: vi.fn(() => of(new HttpResponse<Blob>({ body: null }))),
      createMedicalAccessRequest: vi.fn(),
      resubmitMedicalAccessRequest: vi.fn(),
    };
    toast = { success: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PatientMedicalAccessComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamiliesApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PatientMedicalAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(['ar', 'en'] as const)(
    'explains unavailable evidence in %s without collecting files or allowing a mutation',
    async (language) => {
      TestBed.inject(LanguageService).setLanguage(language);
      await component['checkDependentAccess']('child');
      component['showEvidenceUnavailable']();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-side-drawer [role="dialog"]')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain(
        TestBed.inject(LanguageService).t('familyPolicy.evidenceUnavailable'),
      );
      expect(
        fixture.nativeElement.querySelector(
          'input[type="file"], textarea, #detail-doc-types, #detail-resubmit-types',
        ),
      ).toBeNull();
      expect(api.createMedicalAccessRequest).not.toHaveBeenCalled();
      expect(api.resubmitMedicalAccessRequest).not.toHaveBeenCalled();
    },
  );

  it('shows family names rather than identifiers', () => {
    expect(component['memberName']('child')).toBe(
      TestBed.inject(LanguageService).isRtl() ? 'طفل تجريبي' : 'Test child',
    );
    expect(fixture.nativeElement.textContent).not.toContain('request-a');
    expect(fixture.nativeElement.textContent).not.toContain('version-a');
  });

  it('never queries an unrelated child', async () => {
    await component['checkDependentAccess']('unrelated');
    expect(api.childMedicalAccess).not.toHaveBeenCalled();
    expect(component['childStatus']()).toBeNull();
  });

  it('ignores a previous child response after the selection is cleared', async () => {
    const pending = new Subject<FamilyMedicalAccessStatus>();
    api.childMedicalAccess.mockReturnValue(pending);
    const work = component['checkDependentAccess']('child');
    await component['checkDependentAccess']('');
    pending.next(access);
    pending.complete();
    await work;
    expect(component['childStatus']()).toBeNull();
    expect(component['checkingChild']()).toBe(false);
  });

  it('does not display an old case when a later selection resolves first', async () => {
    const previous = new Subject<FamilyMedicalCase>();
    api.myMedicalAccessRequest.mockReturnValueOnce(previous);
    const work = component['openDetailsDrawer'](item);
    const next = { ...item, requestId: 'request-b' };
    api.myMedicalAccessRequest.mockReturnValueOnce(of(next));
    await component['openDetailsDrawer'](next);
    previous.next(item);
    previous.complete();
    await work;
    expect(component['selectedCase']()?.requestId).toBe('request-b');
  });

  it('does not reopen details after closing while loading', async () => {
    const pending = new Subject<FamilyMedicalCase>();
    api.myMedicalAccessRequest.mockReturnValue(pending);
    const work = component['openDetailsDrawer'](item);
    component['closeDetail']();
    pending.next(item);
    pending.complete();
    await work;
    expect(component['selectedCase']()).toBeNull();
    expect(component['drawerOpen']()).toBe(false);
  });

  it('does not expose summary fallback actions after a details failure', async () => {
    api.myMedicalAccessRequest.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    await component['openDetailsDrawer'](item);
    expect(component['selectedCase']()).toBeNull();
    expect(component['detailMessages']().length).toBeGreaterThan(0);
    await component['withdrawRequest'](item);
    expect(api.withdrawMedicalAccessRequest).not.toHaveBeenCalled();
  });

  it('distinguishes history failure from empty history while retaining the case', async () => {
    api.myMedicalAccessHistory.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    await component['openDetailsDrawer'](item);
    expect(component['selectedCase']()).toEqual(item);
    expect(component['historyFailed']()).toBe(true);
  });

  it('ignores stale list errors after a successful refresh', async () => {
    const previous = new Subject<FamilyMedicalPage<FamilyMedicalCase>>();
    api.myMedicalAccessRequests.mockReturnValueOnce(previous);
    const work = component['load']();
    await component['load']();
    previous.error(new HttpErrorResponse({ status: 503 }));
    await work;
    expect(component['listResult']()).toEqual(page);
    expect(component['messages']()).toEqual([]);
  });

  it('distinguishes list errors from empty results', async () => {
    api.myMedicalAccessRequests.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    await component['load']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-requests-state')).toBeNull();
  });

  it('blocks withdrawal without capability and duplicate submissions', async () => {
    await component['openDetailsDrawer'](item);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await component['withdrawRequest']({
      ...item,
      capabilities: { ...item.capabilities, canWithdraw: false },
    });
    expect(api.withdrawMedicalAccessRequest).not.toHaveBeenCalled();
    const pending = new Subject<FamilyMedicalCase>();
    api.withdrawMedicalAccessRequest.mockReturnValue(pending);
    const work = component['withdrawRequest'](item);
    await component['withdrawRequest'](item);
    expect(api.withdrawMedicalAccessRequest).toHaveBeenCalledTimes(1);
    expect(api.withdrawMedicalAccessRequest).toHaveBeenCalledWith(
      'request-a',
      'version-a',
      expect.any(String),
    );
    pending.next(item);
    pending.complete();
    await work;
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(component['drawerOpen']()).toBe(false);
  });

  it('refreshes on withdrawal 409 without retrying the mutation', async () => {
    await component['openDetailsDrawer'](item);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.withdrawMedicalAccessRequest.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    await component['withdrawRequest'](item);
    expect(api.withdrawMedicalAccessRequest).toHaveBeenCalledTimes(1);
    expect(api.myMedicalAccessRequest).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledWith(
      TestBed.inject(LanguageService).t('common.conflictState'),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not download an unrelated or non-downloadable document', async () => {
    await component['openDetailsDrawer'](item);
    await component['downloadDoc']({ ...item.documents[0], documentId: 'unrelated' });
    await component['downloadDoc']({ ...item.documents[0], canDownload: false });
    expect(api.myMedicalAccessDocument).not.toHaveBeenCalled();
    await component['downloadDoc'](item.documents[0]);
    expect(api.myMedicalAccessDocument).toHaveBeenCalledWith('request-a', 'document');
  });

  it('shows a recoverable family load error', async () => {
    api.mine.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component['loadMembers']();
    fixture.detectChanges();
    expect(component['membersFailed']()).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#check-child-input')
        ?.disabled,
    ).toBe(true);
    await component['loadMembers']();
    expect(component['membersFailed']()).toBe(false);
    expect(component['children']()).toHaveLength(1);
  });
});
