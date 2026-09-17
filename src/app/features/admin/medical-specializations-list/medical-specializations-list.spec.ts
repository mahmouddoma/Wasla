import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MedicalSpecializationsList } from './medical-specializations-list';
import {
  MedicalSpecializationsApi,
  MedicalSpecialization,
  MedicalSpecializationsPage,
} from '../services/medical-specializations';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('MedicalSpecializationsList', () => {
  let fixture: ComponentFixture<MedicalSpecializationsList>;
  let component: MedicalSpecializationsList;

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

  const mockPage: MedicalSpecializationsPage = {
    items: [mockSpec],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 20,
  };

  const mockApi = {
    list: vi.fn(() => of(mockPage)),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => perm === PERMISSIONS.specializationsCreate),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.list.mockReturnValue(of(mockPage));

    await TestBed.configureTestingModule({
      imports: [MedicalSpecializationsList],
      providers: [
        provideRouter([]),
        { provide: MedicalSpecializationsApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalSpecializationsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load specializations list', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.list).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('طب الأطفال');
  });

  it('should open create drawer', () => {
    (component as unknown as { openCreateDrawer: () => void }).openCreateDrawer();
    fixture.detectChanges();

    expect((component as unknown as { isDrawerOpen: () => boolean }).isDrawerOpen()).toBe(true);
    expect((component as unknown as { selectedItem: () => { id: string | null } | null }).selectedItem()).toBeNull();
  });

  it('should open edit drawer with selected item', () => {
    (component as unknown as { openDrawer: (s: { id: string; nameAr: string }) => void }).openDrawer(mockSpec);
    fixture.detectChanges();

    expect((component as unknown as { isDrawerOpen: () => boolean }).isDrawerOpen()).toBe(true);
    expect((component as unknown as { selectedItem: () => { id: string | null } | null }).selectedItem()?.id).toBe('spec-1');
  });

  it('should close drawer on closeDrawer', () => {
    (component as unknown as { openCreateDrawer: () => void }).openCreateDrawer();
    (component as unknown as { closeDrawer: () => void }).closeDrawer();
    fixture.detectChanges();

    expect((component as unknown as { isDrawerOpen: () => boolean }).isDrawerOpen()).toBe(false);
    expect((component as unknown as { selectedItem: () => unknown }).selectedItem()).toBeNull();
  });

  it('should handle API errors gracefully during load', async () => {
    mockApi.list.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Server error' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
