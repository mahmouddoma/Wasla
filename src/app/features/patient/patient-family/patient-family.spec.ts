import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  Family,
  FamilyRequestDetails,
  FamilyRequestPage,
} from '../../../domains/families';
import { FamiliesApi } from '../../../domains/families';
import { PatientFamily } from './patient-family';

describe('PatientFamily', () => {
  let fixture: ComponentFixture<PatientFamily>;
  let component: PatientFamily;

  const sampleFamily: Family = {
    familyId: 'fam-1',
    status: 'Active',
    members: [
      {
        patientId: 'pat-1',
        nameAr: 'أحمد محمود',
        nameEn: 'Ahmed Mahmoud',
        role: 'Father',
        gender: 'Male',
      },
    ],
  };

  const samplePage: FamilyRequestPage = {
    items: [],
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  };

  const sampleDetails: FamilyRequestDetails = {
    requestId: 'req-1',
    familyId: 'fam-1',
    requesterPatientId: 'pat-1',
    requesterNameAr: 'أحمد محمود',
    targetPatientId: 'pat-2',
    targetNameAr: 'علي أحمد',
    requestType: 'CreateFamily',
    status: 'Pending',
    requesterClaimedRole: 'Father',
    targetClaimedRole: 'Child',
    currentRevisionNumber: 1,
    submittedOnUtc: '2026-01-01T00:00:00Z',
    modificationMessage: null,
    rejectionReason: null,
    currentFamilyMembers: [],
    documents: [],
    history: [],
    rowVersion: 'ver-1',
  };

  const api = {
    mine: vi.fn(() => of(sampleFamily)),
    requests: vi.fn(() => of(samplePage)),
    details: vi.fn(() => of(sampleDetails)),
    submit: vi.fn(() => of(sampleDetails)),
    resubmit: vi.fn(() => of(sampleDetails)),
  };

  const session = {
    hasPermission: vi.fn(() => true),
  };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    api.mine.mockReturnValue(of(sampleFamily));
    api.requests.mockReturnValue(of(samplePage));
    api.details.mockReturnValue(of(sampleDetails));
    api.submit.mockReturnValue(of(sampleDetails));
    session.hasPermission.mockReturnValue(true);

    TestBed.configureTestingModule({
      imports: [PatientFamily],
      providers: [
        provideRouter([]),
        { provide: FamiliesApi, useValue: api },
        { provide: AuthSession, useValue: session },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PatientFamily);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('loads family data and relationship requests on creation', async () => {
    expect(component).toBeTruthy();
    expect(api.mine).toHaveBeenCalled();
    expect(api.requests).toHaveBeenCalled();
    expect(component['family']()).toEqual(sampleFamily);
    expect(component['loading']()).toBe(false);
  });

  it('selects request and loads full request details', async () => {
    await component['openRequest']('req-1');
    expect(api.details).toHaveBeenCalledWith('req-1');
    expect(component['selectedRequest']()).toEqual(sampleDetails);
  });

  it('submits relationship request with valid files and displays feedback', async () => {
    const dummyFile = new File(['proof'], 'birth_cert.pdf', { type: 'application/pdf' });
    component['requestModel'].set({
      requestType: 'CreateFamily',
      familyId: '',
      targetPatientId: '00000000-0000-0000-0000-000000000002',
      requesterClaimedRole: 'Father',
      targetClaimedRole: 'Child',
      documentTypes: 'BirthCertificate',
    });
    component['evidenceFiles'].set([dummyFile]);
    fixture.detectChanges();

    await component['submitRequest'](new Event('submit', { cancelable: true }));

    expect(api.submit).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });
});
