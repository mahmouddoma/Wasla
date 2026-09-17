import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { DoctorPractice } from '../../../../domains/doctor-practices';
import { DoctorReception } from '../../services';
import { environment } from '../../../../../environments/environment';
import { DoctorReceptions } from './doctor-receptions';
import { ToastService } from '../../../../core/notifications/toast.service';

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

  const sampleAvailablePermissions = [
    { id: 'perm-1', code: 'DoctorReception.Queue.Call' },
    { id: 'perm-2', code: 'DoctorReception.Queue.CheckIn' },
    { id: 'perm-3', code: 'DoctorReception.Bookings.Manage' },
    { id: 'perm-4', code: 'DoctorReception.Patients.View' },
    { id: 'perm-5', code: 'DoctorReception.Queue.View' },
  ];

  async function createAndInitializeComponent(
    options: {
      receptions?: DoctorReception[];
      receptionId?: string;
      permissionsUnavailable?: boolean;
    } = {},
  ): Promise<void> {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DoctorReceptions],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(
                options.receptionId ? { receptionId: options.receptionId } : {},
              ),
              routeConfig: { path: options.receptionId ? ':receptionId' : '' },
            },
          },
        },
      ],
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

    const recReq = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/receptions${options.receptionId ? `/${options.receptionId}` : ''}`,
    );
    expect(recReq.request.method).toBe('GET');
    recReq.flush(
      options.receptionId ? sampleReceptions[1] : (options.receptions ?? sampleReceptions),
    );

    await Promise.resolve();
    await Promise.resolve();

    const practiceReq = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/practices`,
    );
    expect(practiceReq.request.method).toBe('GET');
    practiceReq.flush(samplePractices);

    const permissionsReq = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/receptions/assignable-permissions`,
    );
    expect(permissionsReq.request.method).toBe('GET');
    if (options.permissionsUnavailable) {
      permissionsReq.flush({}, { status: 404, statusText: 'Not Found' });
    } else {
      permissionsReq.flush(sampleAvailablePermissions);
    }

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
    expect(component['receptions']().length).toBe(2);
    expect(component['totalAssignmentsCount']()).toBe(1);
    expect(component['activeReceptionsCount']()).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('أحمد علي');
    expect(compiled.textContent).toContain('منى حسام');
    expect(compiled.textContent).toContain('فريق الاستقبال');
  });

  it('controls the side drawer for creating a new receptionist', async () => {
    await createAndInitializeComponent();

    expect(component['isCreateDrawerOpen']()).toBe(false);

    component['openCreateDrawer']();
    expect(component['isCreateDrawerOpen']()).toBe(true);

    component['closeCreateDrawer']();
    expect(component['isCreateDrawerOpen']()).toBe(false);
  });

  it('toggles permission selection correctly', async () => {
    await createAndInitializeComponent();

    expect(component['selectedPermissionIds']()).toEqual([]);

    component['togglePermission']('perm-1', true);
    expect(component['selectedPermissionIds']()).toEqual(['perm-1']);

    component['togglePermission']('perm-2', true);
    expect(component['selectedPermissionIds']()).toEqual(['perm-1', 'perm-2']);

    component['togglePermission']('perm-1', false);
    expect(component['selectedPermissionIds']()).toEqual(['perm-2']);
  });

  it('returns friendly permission labels for known permissions', async () => {
    await createAndInitializeComponent();

    expect(component['getPermissionLabel']('DoctorReception.Queue.Call')).toBe(
      'نداء التذاكر والمرضى',
    );
    expect(component['getPermissionLabel']('DoctorReception.Queue.CheckIn')).toBe(
      'تسجيل حضور المرضى',
    );
    expect(component['getPermissionLabel']('Patients.Register')).toBe('تسجيل المرضى الجدد');
    expect(component['getPermissionLabel']('PracticeQueue.Manage')).toBe(
      'إدارة طابور الانتظار والنداء',
    );
    expect(component['getPermissionLabel']('Unknown.Code')).toBe('Unknown.Code');
  });

  it('selects and deselects all available permissions', async () => {
    await createAndInitializeComponent();

    expect(component['isAllPermissionsSelected']()).toBe(false);

    component['selectAllPermissions']();
    expect(component['isAllPermissionsSelected']()).toBe(true);
    expect(component['selectedPermissionIds']().length).toBe(sampleAvailablePermissions.length);

    component['clearAllPermissions']();
    expect(component['isAllPermissionsSelected']()).toBe(false);
    expect(component['selectedPermissionIds']()).toEqual([]);
  });

  it('loads the catalog even when no receptionist has an assignment and enables the form', async () => {
    await createAndInitializeComponent({ receptions: [sampleReceptions[1]] });
    component['reception'].set(sampleReceptions[1]); // rec-2 has 0 assignments
    component['selectedPracticeId'].set('practice-1');
    fixture.detectChanges();

    expect(component['permissionOptions']().length).toBe(sampleAvailablePermissions.length);

    // Button is still disabled until at least one permission is selected
    const button = fixture.nativeElement.querySelector(
      '.assignment-form button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    // Select a permission → button must become enabled
    component['togglePermission']('perm-1', true);
    fixture.detectChanges();
    expect(component['hasSelectedPermissions']()).toBe(true);
    expect(button.disabled).toBe(false);
  });

  it('creates the first assignment from the detail page using catalog IDs without fetching other receptionists', async () => {
    await createAndInitializeComponent({ receptionId: 'rec-2' });
    httpTesting.expectNone(`${environment.apiBaseUrl}/api/v1/doctors/me/receptions`);
    component['selectedPracticeId'].set('practice-1');
    component['togglePermission']('perm-3', true);
    const saving = component['saveAssignment']();
    const request = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/receptions/rec-2/assignments`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      doctorPracticeId: 'practice-1',
      permissionIds: ['perm-3'],
    });
    const assignment = {
      ...sampleReceptions[0].assignments[0],
      permissions: [sampleAvailablePermissions[2]],
    };
    request.flush(assignment);
    await Promise.resolve();
    httpTesting
      .expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/receptions/rec-2`)
      .flush({ ...sampleReceptions[1], assignments: [assignment] });
    await saving;
    expect(component['reception']()?.assignments).toEqual([assignment]);
    expect(component['selectedPermissionIds']()).toEqual([]);
    expect(
      TestBed.inject(ToastService)
        .messages()
        .some((toast) => toast.kind === 'success'),
    ).toBe(true);
  });

  it('keeps reception details visible and blocks assignment if the catalog is unavailable', async () => {
    await createAndInitializeComponent({ receptionId: 'rec-2', permissionsUnavailable: true });
    expect(component['reception']()?.id).toBe('rec-2');
    expect(component['notFound']()).toBe(false);
    expect(component['forbidden']()).toBe(false);
    expect(component['practices']()).toEqual(samplePractices);
    expect(component['permissionOptions']()).toEqual([]);
    component['selectedPracticeId'].set('practice-1');
    component['selectedPermissionIds'].set(['perm-1']);
    await component['saveAssignment']();
    httpTesting.expectNone((request) => request.method === 'POST');
    expect(
      TestBed.inject(ToastService)
        .messages()
        .some((toast) => toast.kind === 'error'),
    ).toBe(true);
  });

  it('does not expand the catalog with historical assignment permissions', async () => {
    await createAndInitializeComponent();
    const assignment = {
      ...sampleReceptions[0].assignments[0],
      permissions: [
        ...sampleReceptions[0].assignments[0].permissions,
        { id: 'legacy', code: 'PracticeReservations.Manage' },
      ],
    };
    component['reception'].set({ ...sampleReceptions[0], assignments: [assignment] });
    component['editAssignment'](assignment);
    expect(component['selectedPermissionIds']()).toEqual(['perm-1', 'perm-2']);
    expect(component['permissionOptions']()).not.toContainEqual({
      id: 'legacy',
      code: 'PracticeReservations.Manage',
    });
  });

  it('requires selected IDs to exist in the displayed permission options', async () => {
    await createAndInitializeComponent();
    component['reception'].set(sampleReceptions[0]);
    component['editAssignment'](sampleReceptions[0].assignments[0]);
    expect(component['hasSelectedPermissions']()).toBe(true);
    component['selectedPermissionIds'].set(['unknown-permission']);
    expect(component['hasSelectedPermissions']()).toBe(false);
    await component['saveAssignment']();
    httpTesting.expectNone((request) => request.method === 'PUT');
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

  it('never creates a new assignment when an edited assignment has disappeared', async () => {
    await createAndInitializeComponent();
    component['reception'].set(sampleReceptions[1]);
    component['editingAssignmentId'].set('deleted');
    component['selectedPermissionIds'].set(['perm-1']);
    await component['saveAssignment']();
    httpTesting.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    expect(component['messages']()).toEqual(['receptions.assignmentStale']);
  });

  it('updates only the selected assignment with permission IDs and its row version', async () => {
    await createAndInitializeComponent();
    const current = {
      ...sampleReceptions[0],
      assignments: [
        sampleReceptions[0].assignments[0],
        {
          ...sampleReceptions[0].assignments[0],
          id: 'assign-2',
          doctorPracticeId: 'practice-2',
          rowVersion: 'ver-2',
        },
      ],
    };
    component['reception'].set(current);
    component['editAssignment'](current.assignments[0]);
    expect(component['selectedPermissionIds']()).toEqual(['perm-1', 'perm-2']);
    component['selectedPermissionIds'].set(['perm-2']);
    const saving = component['saveAssignment']();
    const request = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/receptions/rec-1/assignments/assign-1`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ permissionIds: ['perm-2'], rowVersion: 'ver-1' });
    request.flush({
      ...current.assignments[0],
      permissions: [current.assignments[0].permissions[1]],
      rowVersion: 'new',
    });
    await Promise.resolve();
    httpTesting
      .expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/receptions/rec-1`)
      .flush(current);
    await saving;
    expect(component['reception']()?.assignments[1]).toEqual(current.assignments[1]);
    expect(component['editingAssignmentId']()).toBeNull();
  });

  it('rejects an existing reception/practice pair and practices outside the own-doctor list', async () => {
    await createAndInitializeComponent();
    component['reception'].set(sampleReceptions[0]);
    component['selectedPracticeId'].set('practice-1');
    component['selectedPermissionIds'].set(['perm-1']);
    await component['saveAssignment']();
    expect(component['messages']()).toEqual(['receptions.assignmentDuplicate']);
    component['selectedPracticeId'].set('other-doctor-practice');
    await component['saveAssignment']();
    expect(component['messages']()).toEqual(['receptions.choosePractice']);
    httpTesting.expectNone((request) => request.method === 'POST');
  });

  it('reloads the edited assignment and its row version after a concurrency conflict', async () => {
    await createAndInitializeComponent();
    component['reception'].set(sampleReceptions[0]);
    component['editAssignment'](sampleReceptions[0].assignments[0]);
    const saving = component['saveAssignment']();
    httpTesting
      .expectOne(
        `${environment.apiBaseUrl}/api/v1/doctors/me/receptions/rec-1/assignments/assign-1`,
      )
      .flush({ detail: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    const updated = {
      ...sampleReceptions[0],
      assignments: [
        {
          ...sampleReceptions[0].assignments[0],
          rowVersion: 'new-version',
          permissions: [sampleReceptions[0].assignments[0].permissions[1]],
        },
      ],
    };
    httpTesting
      .expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/receptions/rec-1`)
      .flush(updated);
    await saving;
    expect(component['selectedPermissionIds']()).toEqual(['perm-2']);
    expect(component['reception']()?.assignments[0].rowVersion).toBe('new-version');
    expect(component['messages']()).toEqual(['Conflict']);
    expect(component['isSubmitting']()).toBe(false);
  });
});
