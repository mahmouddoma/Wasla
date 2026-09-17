import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { SuperAdminCreate } from './superadmin-create';
import { SuperAdminsApi } from '../services/superadmins';
import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { SuperAdminFormSubmission } from '../superadmin-form/superadmin-form';

describe('SuperAdminCreate', () => {
  let fixture: ComponentFixture<SuperAdminCreate>;
  let component: SuperAdminCreate;
  let mockRouter: Router;

  const mockApi = {
    create: vi.fn(() => of({ superAdminId: 'sa-new-1' })),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const sampleSubmission: SuperAdminFormSubmission = {
    mode: 'create',
    request: {
      userName: 'newadmin',
      email: 'newadmin@example.com',
      phoneNumber: '01011112222',
      nameAr: 'مشرف جديد',
      nameEn: 'New Admin',
      initialPassword: 'Password123!',
      confirmPassword: 'Password123!',
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.create.mockReturnValue(of({ superAdminId: 'sa-new-1' }));

    await TestBed.configureTestingModule({
      imports: [SuperAdminCreate],
      providers: [
        provideRouter([]),
        { provide: SuperAdminsApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate');

    fixture = TestBed.createComponent(SuperAdminCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should create superadmin and navigate on success', async () => {
    await (component as unknown as { create: (s: SuperAdminFormSubmission) => Promise<void> }).create(sampleSubmission);

    expect(mockApi.create).toHaveBeenCalledWith(sampleSubmission.request);
    expect(mockToast.success).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/superadmins', 'sa-new-1'], {
      queryParams: { status: 'created' },
    });
  });

  it('should handle API errors during create gracefully', async () => {
    mockApi.create.mockReturnValue(
      throwError(() => ({ status: 400, error: { message: 'Username already exists' } })),
    );

    await (component as unknown as { create: (s: SuperAdminFormSubmission) => Promise<void> }).create(sampleSubmission);
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
