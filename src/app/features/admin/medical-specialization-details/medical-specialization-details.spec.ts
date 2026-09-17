import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MedicalSpecializationDetails } from './medical-specialization-details';
import {
  MedicalSpecializationsApi,
  MedicalSpecialization,
} from '../services/medical-specializations';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('MedicalSpecializationDetails', () => {
  let fixture: ComponentFixture<MedicalSpecializationDetails>;
  let component: MedicalSpecializationDetails;

  const mockSpec: MedicalSpecialization = {
    id: 'spec-1',
    nameAr: 'طب الأطفال',
    nameEn: 'Pediatrics',
    descriptionAr: 'علاج الأطفال',
    descriptionEn: 'Children medicine',
    isActive: true,
    isDeleted: false,
    sortOrder: 1,
    rowVersion: 'v1',
  };

  const mockApi = {
    details: vi.fn(() => of(mockSpec)),
    create: vi.fn(() => of(mockSpec)),
    update: vi.fn(() => of(mockSpec)),
    activate: vi.fn(() => of(mockSpec)),
    deactivate: vi.fn(() => of(mockSpec)),
    delete: vi.fn(() => of(undefined)),
    restore: vi.fn(() => of(mockSpec)),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => {
      return (
        perm === PERMISSIONS.specializationsCreate ||
        perm === PERMISSIONS.specializationsUpdate ||
        perm === PERMISSIONS.specializationsActivate ||
        perm === PERMISSIONS.specializationsDeactivate ||
        perm === PERMISSIONS.specializationsDelete
      );
    }),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.details.mockReturnValue(of(mockSpec));

    await TestBed.configureTestingModule({
      imports: [MedicalSpecializationDetails],
      providers: [
        provideRouter([]),
        { provide: MedicalSpecializationsApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalSpecializationDetails);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('specIdInput', 'spec-1');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load specialization details when specIdInput is provided', () => {
    expect(component).toBeTruthy();
    expect(mockApi.details).toHaveBeenCalledWith('spec-1');
    const details = (component as unknown as { details: () => MedicalSpecialization | null }).details();
    expect(details?.nameAr).toBe('طب الأطفال');
  });

  it('should emit closed output', () => {
    let closedCalled = false;
    component.closed.subscribe(() => (closedCalled = true));

    component.closed.emit();

    expect(closedCalled).toBe(true);
  });

  it('should save specialization and emit saved event', async () => {
    let emittedSaved: MedicalSpecialization | null = null;
    component.saved.subscribe((s) => (emittedSaved = s));

    mockApi.update.mockReturnValue(of(mockSpec));

    const event = new Event('submit', { cancelable: true });
    await (component as unknown as { save: (e: Event) => Promise<void> }).save(event);

    expect(mockApi.update).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
    expect(emittedSaved).toEqual(mockSpec);
  });

  it('should handle API errors during load gracefully', async () => {
    mockApi.details.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Failed to fetch' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
