import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { CurrentUser } from '../../core/auth/auth.models';
import { PERMISSIONS } from '../../core/auth/permissions';
import { DoctorPractice } from '../../core/doctor-practices/doctor-practice.models';
import { DoctorReception } from '../../core/doctor-receptions/doctor-reception.models';
import { environment } from '../../../environments/environment';
import { DoctorReceptions } from './doctor-receptions';

describe('DoctorReceptions', () => {
  let fixture: ComponentFixture<DoctorReceptions>;
  let component: DoctorReceptions;
  let httpTesting: HttpTestingController;

  const doctorUser: CurrentUser = {
    applicationUserId: 'user-doc-1',
    userName: 'dr_sarah',
    email: 'sarah@wasla.local',
    phoneNumber: '01000000000',
    userType: 'Doctor',
    roles: ['Doctor'],
    permissions: [
      PERMISSIONS.receptionUsersManageOwn,
      PERMISSIONS.receptionAssignmentsManageOwn,
      PERMISSIONS.doctorPracticesManageOwn,
      PERMISSIONS.doctorPracticesViewOwn,
    ],
    isFirstLogin: false,
    doctorId: 'doc-1',
    patientId: null,
  };

  const sampleReceptions: DoctorReception[] = [
    {
      id: 'rec-1',
      applicationUserId: 'app-user-1',
      userName: 'ahmed_rec',
      email: 'ahmed@wasla.local',
      phoneNumber: '01000000001',
      nameAr: 'أحمد علي',
      nameEn: 'Ahmed Ali',
      rowVersion: 'ver-r1',
      assignments: [
        {
          id: 'assign-1',
          doctorPracticeId: 'practice-1',
          practiceNameAr: 'عيادة الدقي',
          practiceNameEn: 'Dokki Clinic',
          isActive: true,
          rowVersion: 'ver-1',
          permissions: [
            { id: 'perm-1', code: 'DoctorReception.Queue.Call' },
            { id: 'perm-2', code: 'DoctorReception.Queue.CheckIn' },
          ],
        },
      ],
    },
    {
      id: 'rec-2',
      applicationUserId: 'app-user-2',
      userName: 'mona_rec',
      email: 'mona@wasla.local',
      phoneNumber: null,
      nameAr: 'منى حسام',
      nameEn: 'Mona Hossam',
      rowVersion: 'ver-r2',
      assignments: [],
    },
  ];

  const samplePractices: DoctorPractice[] = [
    {
      id: 'practice-1',
      nameAr: 'عيادة الدقي',
      nameEn: 'Dokki Clinic',
      isActive: true,
      hasLogo: false,
      rowVersion: 'ver-p1',
      location: {
        governorate: null,
        city: null,
        area: null,
        detailedAddress: 'شارع التحرير، الدقي',
        latitude: null,
        longitude: null,
      },
    },
  ];

  async function createAndInitializeComponent(): Promise<void> {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DoctorReceptions],
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
    fixture = TestBed.createComponent(DoctorReceptions);
    component = fixture.componentInstance;

    const recReq = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/receptions`);
    expect(recReq.request.method).toBe('GET');
    recReq.flush(sampleReceptions);

    await Promise.resolve();

    const practiceReq = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/practices`,
    );
    expect(practiceReq.request.method).toBe('GET');
    practiceReq.flush(samplePractices);

    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    if (httpTesting) {
      httpTesting.verify();
    }
  });

  it('creates component and loads reception list and practice list', async () => {
    await createAndInitializeComponent();

    expect(component).toBeTruthy();
    expect((component as any).receptions().length).toBe(2);
    expect((component as any).totalAssignmentsCount()).toBe(1);
    expect((component as any).activeReceptionsCount()).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('أحمد علي');
    expect(compiled.textContent).toContain('منى حسام');
    expect(compiled.textContent).toContain('فريق الاستقبال');
  });

  it('controls the side drawer for creating a new receptionist', async () => {
    await createAndInitializeComponent();

    expect((component as any).isCreateDrawerOpen()).toBe(false);

    (component as any).openCreateDrawer();
    expect((component as any).isCreateDrawerOpen()).toBe(true);

    (component as any).closeCreateDrawer();
    expect((component as any).isCreateDrawerOpen()).toBe(false);
  });

  it('toggles permission selection correctly', async () => {
    await createAndInitializeComponent();

    expect((component as any).selectedPermissionIds()).toEqual([]);

    (component as any).togglePermission('perm-1', true);
    expect((component as any).selectedPermissionIds()).toEqual(['perm-1']);

    (component as any).togglePermission('perm-2', true);
    expect((component as any).selectedPermissionIds()).toEqual(['perm-1', 'perm-2']);

    (component as any).togglePermission('perm-1', false);
    expect((component as any).selectedPermissionIds()).toEqual(['perm-2']);
  });

  it('returns friendly permission labels for known permissions', async () => {
    await createAndInitializeComponent();

    expect((component as any).getPermissionLabel('DoctorReception.Queue.Call')).toBe(
      'نداء التذاكر والمرضى',
    );
    expect((component as any).getPermissionLabel('DoctorReception.Queue.CheckIn')).toBe(
      'تسجيل حضور المرضى',
    );
    expect((component as any).getPermissionLabel('Unknown.Code')).toBe('Unknown.Code');
  });

  it('sends the empty permission payload for inspection and displays server validation', async () => {
    await createAndInitializeComponent();
    component['reception'].set(sampleReceptions[1]);
    component['selectedPracticeId'].set('practice-1');
    const saving = component['saveAssignment']();
    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/receptions/rec-2/assignments`);
    expect(request.request.body).toEqual({ doctorPracticeId: 'practice-1', permissionIds: [] });
    request.flush({ errors: { PermissionIds: ['Select a permission.'] } }, { status: 400, statusText: 'Bad Request' });
    await saving;
    expect(component['messages']()).toEqual(['Select a permission.']);
    expect(component['selectedPracticeId']()).toBe('practice-1');
  });

  it('requires explicit permissions when updating an existing assignment', async () => {
    await createAndInitializeComponent();
    component['reception'].set(sampleReceptions[0]);
    component['editAssignment'](sampleReceptions[0].assignments[0]);
    component['selectedPermissionIds'].set([]);
    await component['saveAssignment']();
    httpTesting.expectNone((request) => request.method === 'PUT');
    expect(component['messages']().length).toBe(1);
  });
});
