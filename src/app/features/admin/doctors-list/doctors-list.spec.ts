import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { DoctorsList } from './doctors-list';
import { AdminDoctorsApi, AdminDoctorsPage, AdminDoctorListItem } from '../services/admin-doctors';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { PERMISSIONS } from '../../../core/auth/permissions';

describe('DoctorsList', () => {
  let fixture: ComponentFixture<DoctorsList>;
  let component: DoctorsList;

  const mockDoctor: AdminDoctorListItem = {
    doctorId: '11111111-1111-1111-1111-111111111111',
    nameAr: 'د. سامح كمال',
    nameEn: 'Dr. Sameh Kamal',
    email: 'sameh@example.com',
    phone: '01012345678',
    dateOfBirth: '1980-05-15',
    age: 45,
    gender: 'Male',
    approvalStatus: 'Approved',
    hasProfileImage: true,
    hasPersonalIdFront: true,
    hasPersonalIdBack: true,
    hasSyndicateFront: true,
    hasSyndicateBack: true,
    createdOnUtc: '2026-01-01T00:00:00Z',
  };

  const mockPage: AdminDoctorsPage = {
    items: [mockDoctor],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 10,
  };

  const mockApi = {
    list: vi.fn(() => of(mockPage)),
    details: vi.fn(() => throwError(() => ({ status: 503, error: { message: 'Details temporarily unavailable' } }))),
  };

  const mockSession = {
    hasPermission: vi.fn((perm: string) => perm === PERMISSIONS.doctorsViewDetails),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.list.mockReturnValue(of(mockPage));

    await TestBed.configureTestingModule({
      imports: [DoctorsList],
      providers: [
        provideRouter([]),
        { provide: AdminDoctorsApi, useValue: mockApi },
        { provide: AuthSession, useValue: mockSession },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load doctors list and metrics', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(mockApi.list).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('د. سامح كمال');
  });
  it('opens doctor review in a drawer and retains filters when it closes', async () => {
    component['filterModel'].set({ searchText: 'Sameh' });
    component['openDoctor'](mockDoctor);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('app-doctor-details')).not.toBeNull();
    expect(mockApi.details).toHaveBeenCalledWith(mockDoctor.doctorId);
    expect(component['selectedDoctor']()?.doctorId).toBe(mockDoctor.doctorId);
    component['closeDoctorDrawer']();
    await fixture.whenStable();
    expect(element.querySelector('app-doctor-details')).toBeNull();
    expect(component['filterModel']().searchText).toBe('Sameh');
  });
  it('does not close the review drawer during a doctor decision', async () => {
    component['openDoctor'](mockDoctor);
    await fixture.whenStable();
    const review = component['doctorReview']()!;
    review['isActionSubmitting'].set(true);
    component['closeDoctorDrawer']();
    expect(component['selectedDoctor']()).toBe(mockDoctor);
    review['isActionSubmitting'].set(false);
    component['closeDoctorDrawer']();
    expect(component['selectedDoctor']()).toBeNull();
  });

  it('should compute doctor initials and doctor code properly', () => {
    const initials = (component as unknown as { doctorInitials: (d: AdminDoctorListItem) => string }).doctorInitials(mockDoctor);
    expect(initials).toBe('د س');

    const code = (component as unknown as { doctorCode: (d: AdminDoctorListItem) => string }).doctorCode(mockDoctor);
    expect(code).toBe('#DR-1111');
  });

  it('should filter by approval status and reload data', () => {
    (component as unknown as { filterBy: (s: string) => void }).filterBy('Pending');
    expect((component as unknown as { selectedStatus: () => string }).selectedStatus()).toBe('Pending');
    expect(mockApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ approvalStatus: 'Pending', pageNumber: 1 }),
    );
  });

  it('should clear all filters', () => {
    (component as unknown as { filterBy: (s: string) => void }).filterBy('Pending');
    (component as unknown as { clearAllFilters: () => void }).clearAllFilters();

    expect((component as unknown as { selectedStatus: () => string }).selectedStatus()).toBe('');
    expect((component as unknown as { filterModel: () => { searchText: string } }).filterModel().searchText).toBe('');
  });

  it('should handle API errors gracefully', async () => {
    mockApi.list.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Database connection failed' } })),
    );

    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    const apiMessages = (component as unknown as { apiMessages: () => string[] }).apiMessages();
    expect(apiMessages.length).toBeGreaterThan(0);
  });
});
