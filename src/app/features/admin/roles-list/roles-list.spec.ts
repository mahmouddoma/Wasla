import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { RolesList } from './roles-list';
import { SecurityGovernanceApi } from '../services/security-governance/security-governance-api';
import { SecurityRole } from '../services/security-governance/security-governance.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthSession } from '../../../core/auth/auth-session';

describe('RolesList', () => {
  let fixture: ComponentFixture<RolesList>;
  let component: RolesList;

  const mockRole: SecurityRole = {
    id: 'role-1',
    name: 'SuperAdmin',
    isSystemRole: true,
  };

  const mockApi = {
    roles: vi.fn(() => of([mockRole])),
    permissions: vi.fn(() => of([])),
  };

  const mockSession = {
    hasPermission: vi.fn(() => true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.roles.mockReturnValue(of([mockRole]));

    await TestBed.configureTestingModule({
      imports: [RolesList],
      providers: [
        provideRouter([]),
        { provide: SecurityGovernanceApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load roles list', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.roles).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SuperAdmin');
  });

  it('should open role drawer when role is selected', () => {
    (component as unknown as { openRoleDrawer: (r: SecurityRole) => void }).openRoleDrawer(mockRole);
    fixture.detectChanges();

    expect((component as unknown as { selectedRole: () => SecurityRole | null }).selectedRole()).toEqual(mockRole);
  });

  it('should close role drawer on closeRoleDrawer', () => {
    (component as unknown as { openRoleDrawer: (r: SecurityRole) => void }).openRoleDrawer(mockRole);
    (component as unknown as { closeRoleDrawer: () => void }).closeRoleDrawer();
    fixture.detectChanges();

    expect((component as unknown as { selectedRole: () => SecurityRole | null }).selectedRole()).toBeNull();
  });

  it('should handle API errors during load gracefully', async () => {
    mockApi.roles.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Failed to load roles' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
