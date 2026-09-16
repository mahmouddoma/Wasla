import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { CurrentUser } from '../../core/auth/auth.models';
import { PERMISSIONS } from '../../core/auth/permissions';
import { DoctorPracticeResponse } from '../../core/doctor-practices/doctor-practice.models';
import { DoctorPractices } from './doctor-practices';
import { environment } from '../../../environments/environment';

describe('DoctorPractices', () => {
  let fixture: ComponentFixture<DoctorPractices>;
  let component: DoctorPractices;
  let httpTesting: HttpTestingController;

  const doctorUser: CurrentUser = {
    applicationUserId: 'doc-1',
    userName: 'dr_samir',
    email: 'samir@example.com',
    phoneNumber: '+201000000000',
    userType: 'Doctor',
    roles: ['Doctor'],
    permissions: [
      PERMISSIONS.doctorPracticesManageOwn,
      PERMISSIONS.doctorPracticesActivateOwn,
      PERMISSIONS.doctorPracticeBrandingViewOwn,
      PERMISSIONS.doctorPracticeBrandingManageOwn,
    ],
    isFirstLogin: false,
    doctorId: 'doc-id-1',
    patientId: null,
  };

  const samplePractices: DoctorPracticeResponse[] = [
    {
      id: 'p-1',
      nameAr: 'العيادة الرئيسية',
      nameEn: 'Main Clinic',
      isActive: true,
      hasLogo: true,
      rowVersion: 'AQID',
      governorate: { id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' },
      city: { id: 10, nameAr: 'مصر الجديدة', nameEn: 'Heliopolis' },
      area: { id: 100, nameAr: 'الكوربة', nameEn: 'Korba' },
      detailedAddress: 'شارع بغداد',
      latitude: 30.08,
      longitude: 31.32,
    },
    {
      id: 'p-2',
      nameAr: 'فرع المعادي',
      nameEn: 'Maadi Branch',
      isActive: false,
      hasLogo: false,
      rowVersion: 'BAUG',
      governorate: { id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' },
      city: { id: 11, nameAr: 'المعادي', nameEn: 'Maadi' },
      area: null,
      detailedAddress: 'شارع 9',
      latitude: null,
      longitude: null,
    },
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DoctorPractices],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const session = TestBed.inject(AuthSession);
    session.begin({
      accessToken: 'test-token',
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      passwordChangeRequired: false,
    });
    session.complete(doctorUser);

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DoctorPractices);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('creates component and loads practice list with computed active counts', async () => {
    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/practices`);
    expect(req.request.method).toBe('GET');
    req.flush(samplePractices);
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component).toBeTruthy();
    expect((component as any).practices().length).toBe(2);
    expect((component as any).activeCount()).toBe(1);
    expect((component as any).inactiveCount()).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('العيادة الرئيسية');
    expect(compiled.textContent).toContain('فرع المعادي');
  });

  it('opens and closes the create practice side drawer without leaving the page', async () => {
    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/practices`);
    req.flush(samplePractices);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((component as any).isCreateDrawerOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('aside.side-drawer-panel')).toBeNull();

    const createBtn = fixture.nativeElement.querySelector(
      '.btn-create-practice',
    ) as HTMLButtonElement;
    expect(createBtn).toBeTruthy();
    createBtn.click();
    fixture.detectChanges();

    const govReq = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/public/governorates`);
    govReq.flush([{ id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' }]);
    fixture.detectChanges();

    expect((component as any).isCreateDrawerOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-side-drawer')).toBeTruthy();

    (component as any).closeCreateDrawer();
    fixture.detectChanges();
    expect((component as any).isCreateDrawerOpen()).toBe(false);
  });
});
