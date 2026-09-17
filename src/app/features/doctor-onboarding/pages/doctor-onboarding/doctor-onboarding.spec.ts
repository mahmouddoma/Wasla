import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { DoctorOnboarding } from './doctor-onboarding';
import { DoctorApi, DoctorOnboardingStatus } from '../../../../domains/doctors';
import { AuthApi } from '../../../../core/auth/auth-api';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { CurrentUser } from '../../../../core/auth/auth.models';

describe('DoctorOnboarding', () => {
  let fixture: ComponentFixture<DoctorOnboarding>;
  let component: DoctorOnboarding;

  const pendingStatus: DoctorOnboardingStatus = {
    doctorId: 'doc-1',
    approvalStatus: 'Pending',
    approvedOnUtc: null,
    rejectionReason: null,
    suspensionReason: null,
    hasProfileImage: false,
    rowVersion: 'v1',
  };

  const approvedStatus: DoctorOnboardingStatus = {
    doctorId: 'doc-1',
    approvalStatus: 'Approved',
    approvedOnUtc: '2026-01-02T00:00:00Z',
    rejectionReason: null,
    suspensionReason: null,
    hasProfileImage: false,
    rowVersion: 'v2',
  };

  const mockUser: CurrentUser = {
    applicationUserId: 'doc-1',
    userName: 'dr_test',
    email: 'doctor@example.com',
    phoneNumber: '+201000000000',
    userType: 'Doctor',
    roles: ['Doctor'],
    permissions: [],
    isFirstLogin: false,
    doctorId: 'doc-1',
    patientId: null,
  };

  const mockDoctorApi = {
    onboardingStatus: vi.fn(() => of(pendingStatus)),
  };

  const mockAuthApi = {
    currentUser: vi.fn(() => of(mockUser)),
  };

  const mockAuthSession = {
    hasPermission: vi.fn(() => false),
    clear: vi.fn(),
    complete: vi.fn(),
    destinationFor: vi.fn(() => '/doctor/workspace'),
  };

  const mockRouter = {
    navigate: vi.fn(),
    navigateByUrl: vi.fn(),
  };

  let router: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDoctorApi.onboardingStatus.mockReturnValue(of(pendingStatus));
    mockAuthApi.currentUser.mockReturnValue(of(mockUser));
    mockAuthSession.destinationFor.mockReturnValue('/doctor/workspace');

    await TestBed.configureTestingModule({
      imports: [DoctorOnboarding],
      providers: [
        provideRouter([]),
        { provide: DoctorApi, useValue: mockDoctorApi },
        { provide: AuthApi, useValue: mockAuthApi },
        { provide: AuthSession, useValue: mockAuthSession },
        LanguageService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockReturnValue(Promise.resolve(true));
    vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(DoctorOnboarding);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load pending status', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockDoctorApi.onboardingStatus).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('قيد المراجعة والتدقيق');
  });

  it('should navigate away if status is approved', async () => {
    mockDoctorApi.onboardingStatus.mockReturnValue(of(approvedStatus));

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    expect(mockAuthApi.currentUser).toHaveBeenCalled();
    expect(mockAuthSession.complete).toHaveBeenCalledWith(mockUser);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/doctor/workspace', { replaceUrl: true });
  });

  it('should handle load error gracefully', async () => {
    mockDoctorApi.onboardingStatus.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Server error' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });

  it('should logout and redirect to login', () => {
    (component as unknown as { logout: () => void }).logout();
    expect(mockAuthSession.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
