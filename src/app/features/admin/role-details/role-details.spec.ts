import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { RoleDetails } from './role-details';
import { SecurityGovernanceApi } from '../services/security-governance/security-governance-api';
import {
  SecurityRole,
  RolePermissionsResponse,
} from '../services/security-governance/security-governance.models';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('RoleDetails', () => {
  let fixture: ComponentFixture<RoleDetails>;
  let component: RoleDetails;

  const validRoleId = '11111111-1111-1111-1111-111111111111';

  const mockRole: SecurityRole = {
    id: validRoleId,
    name: 'CustomManager',
    isSystemRole: false,
  };

  const mockPermissionsResponse: RolePermissionsResponse = {
    roleId: validRoleId,
    permissions: [
      {
        id: 'perm-1',
        name: 'Doctors.ViewAll',
        isSystemPermission: false,
      },
    ],
  };

  const mockApi = {
    roleDetails: vi.fn(() => of(mockRole)),
    rolePermissions: vi.fn(() => of(mockPermissionsResponse)),
    permissions: vi.fn(() => of(mockPermissionsResponse.permissions)),
    updateRolePermissions: vi.fn(() => of(mockPermissionsResponse)),
    roles: vi.fn(() => of([mockRole])),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => {
      return perm === PERMISSIONS.rolePermissionsManage || perm === PERMISSIONS.permissionsView;
    }),
    user: vi.fn(() => null),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.roleDetails.mockReturnValue(of(mockRole));
    mockApi.rolePermissions.mockReturnValue(of(mockPermissionsResponse));
    mockApi.permissions.mockReturnValue(of(mockPermissionsResponse.permissions));

    await TestBed.configureTestingModule({
      imports: [RoleDetails],
      providers: [
        provideRouter([]),
        { provide: SecurityGovernanceApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleDetails);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('roleIdInput', validRoleId);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load permissions for role', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.rolePermissions).toHaveBeenCalledWith(validRoleId);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('CustomManager');
  });

  it('should emit closed event', () => {
    let closedCalled = false;
    component.closed.subscribe(() => (closedCalled = true));

    component.closed.emit();

    expect(closedCalled).toBe(true);
  });

  it('updates permission module and action labels without reloading the catalog', async () => {
    const language = TestBed.inject(LanguageService);
    language.setLanguage('ar');
    expect(component['getGroupLabel']('Doctors')).toBe('حسابات الأطباء');
    expect(component['getPermissionLabel']('Doctors.ViewAll')).toBe('عرض جميع حسابات الأطباء');
    language.setLanguage('en');
    await fixture.whenStable();
    expect(component['getGroupLabel']('Doctors')).toBe('Doctor accounts');
    expect(component['getPermissionLabel']('Doctors.ViewAll')).toBe('View all doctor accounts');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'View all doctor accounts',
    );
  });

  it('finds permissions by the translated action in either language', () => {
    component['permissionSearch'].set('عرض جميع');
    expect(component['filteredPermissionGroups']()[0].permissions[0].name).toBe('Doctors.ViewAll');
    component['permissionSearch'].set('View all doctor');
    expect(component['filteredPermissionGroups']()[0].permissions[0].name).toBe('Doctors.ViewAll');
  });

  it('should handle error during permissions loading gracefully', async () => {
    mockApi.rolePermissions.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Permissions failed to load' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
