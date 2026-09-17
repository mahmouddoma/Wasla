import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { DoctorDetails } from './doctor-details';
import { AdminDoctorsApi, AdminDoctorDetails } from '../services/admin-doctors';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('DoctorDetails', () => {
  let fixture: ComponentFixture<DoctorDetails>;
  let component: DoctorDetails;

  const validDoctorId = '11111111-1111-1111-1111-111111111111';

  const mockDoctorDetails: AdminDoctorDetails = {
    doctorId: validDoctorId,
    applicationUserId: 'user-doc-1',
    userName: 'dr_sameh',
    nameAr: 'سامح كمال',
    nameEn: 'Sameh Kamal',
    email: 'sameh@example.com',
    phone: '01012345678',
    dateOfBirth: '1980-05-15',
    age: 45,
    gender: 'Male',
    approvalStatus: 'Pending',
    hasProfileImage: false,
    hasPersonalIdFront: true,
    hasPersonalIdBack: true,
    hasSyndicateFront: true,
    hasSyndicateBack: true,
    nationalId: null,
    approvedByApplicationUserId: null,
    approvedOnUtc: null,
    rejectedByApplicationUserId: null,
    rejectedOnUtc: null,
    rejectionReason: null,
    suspendedByApplicationUserId: null,
    suspendedOnUtc: null,
    suspensionReason: null,
    reactivatedByApplicationUserId: null,
    reactivatedOnUtc: null,
    rowVersion: 'v1',
  };

  const mockApi = {
    details: vi.fn(() => of(mockDoctorDetails)),
    approve: vi.fn(() => of({ approvalStatus: 'Approved', rowVersion: 'v2' })),
    reject: vi.fn(() => of({ approvalStatus: 'Rejected', rowVersion: 'v2' })),
    suspensionImpact: vi.fn(() =>
      of({
        futureActiveReservationsCount: 3,
        practices: [
          {
            doctorPracticeId: 'clinic',
            nameAr: 'عيادة الاختبار',
            nameEn: 'Test clinic',
            futureActiveReservationsCount: 3,
          },
        ],
        earliestAppointmentUtc: null,
        latestAppointmentUtc: null,
      }),
    ),
    suspend: vi.fn(() => of({ approvalStatus: 'Suspended', rowVersion: 'v2' })),
    reactivate: vi.fn(() => of({ approvalStatus: 'Approved', rowVersion: 'v2' })),
    media: vi.fn(() => of({ body: new Blob(), headers: new Headers() })),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => {
      return (
        perm === PERMISSIONS.doctorsApprove ||
        perm === PERMISSIONS.doctorsReject ||
        perm === PERMISSIONS.doctorsSuspend ||
        perm === PERMISSIONS.doctorsReactivate
      );
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.details.mockReturnValue(of(mockDoctorDetails));

    await TestBed.configureTestingModule({
      imports: [DoctorDetails],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'doctorId' ? validDoctorId : null),
              },
            },
          },
        },
        { provide: AdminDoctorsApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads reservation impact before opening suspension confirmation', async () => {
    component['details'].set({ ...mockDoctorDetails, approvalStatus: 'Approved' });
    await component['openDecision']('suspend');
    expect(mockApi.suspensionImpact).toHaveBeenCalledWith(validDoctorId);
    expect(component['suspensionImpact']()?.futureActiveReservationsCount).toBe(3);
    expect(component['suspendDialogOpen']()).toBe(true);
    expect(mockApi.suspend).not.toHaveBeenCalled();
  });
  it('should create and load doctor details', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.details).toHaveBeenCalledWith(validDoctorId);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('سامح كمال');
  });
  it('uses the drawer doctor input while preserving the direct route behavior', async () => {
    const selectedId = '22222222-2222-2222-2222-222222222222';
    mockApi.details.mockReturnValue(of({ ...mockDoctorDetails, doctorId: selectedId }));
    fixture.componentRef.setInput('doctorIdInput', selectedId);
    fixture.componentRef.setInput('isDrawer', true);
    await fixture.whenStable();
    expect(mockApi.details).toHaveBeenLastCalledWith(selectedId);
    expect(component['details']()?.doctorId).toBe(selectedId);
    expect((fixture.nativeElement as HTMLElement).querySelector('.details-back')).toBeNull();
  });
  it('does not keep media received after the review component is destroyed', async () => {
    const media = new Subject<{ body: Blob; headers: Headers }>();
    mockApi.media.mockReturnValueOnce(media);
    const request = component['openMedia']({
      type: 'PersonalIdFront',
      label: 'ID',
      available: true,
    });
    fixture.destroy();
    media.next({ body: new Blob(['identity'], { type: 'image/png' }), headers: new Headers() });
    await request;
    expect(component['activeMedia']()).toBeNull();
  });

  it('should compute permissions correctly for Pending status', () => {
    const canApprove = (component as unknown as { canApprove: () => boolean }).canApprove();
    const canReject = (component as unknown as { canReject: () => boolean }).canReject();
    expect(canApprove).toBe(true);
    expect(canReject).toBe(true);
  });

  it('should compute doctor initials properly', () => {
    const initials = (component as unknown as { doctorInitials: () => string }).doctorInitials();
    expect(initials).toBe('سك');
  });

  it('should approve doctor with national id', async () => {
    mockApi.approve.mockReturnValue(of({ approvalStatus: 'Approved', rowVersion: 'v2' }));

    await (component as unknown as { approve: (id: string) => Promise<void> }).approve(
      '12345678901234',
    );
    fixture.detectChanges();

    expect(mockApi.approve).toHaveBeenCalledWith(validDoctorId, {
      nationalId: '12345678901234',
      rowVersion: 'v1',
    });
  });

  it('should handle API errors during load gracefully', async () => {
    mockApi.details.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Failed to fetch doctor' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
