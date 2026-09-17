import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PatientPicker } from './patient-picker';
import { PatientsApi, PatientSearchItem, PagedResponse } from '../../../../domains/patients';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('PatientPicker', () => {
  let fixture: ComponentFixture<PatientPicker>;
  let component: PatientPicker;

  const mockPatient: PatientSearchItem = {
    patientId: 'p-1',
    nameAr: 'أحمد علي',
    nameEn: 'Ahmed Ali',
    phoneNumber: '01012345678',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    hasContactPhone: false,
  };

  const mockResponse: PagedResponse<PatientSearchItem> = {
    items: [mockPatient],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 20,
  };

  const mockPatientsApi = {
    search: vi.fn(() => of(mockResponse)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPatientsApi.search.mockReturnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [PatientPicker],
      providers: [
        { provide: PatientsApi, useValue: mockPatientsApi },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientPicker);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'البحث عن مريض');
    fixture.detectChanges();
  });

  it('should create and render label', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('البحث عن مريض');
  });

  it('should search patients and display results', async () => {
    const event = new Event('submit');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    await (component as unknown as { search: (e: Event) => Promise<void> }).search(event);
    fixture.detectChanges();

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockPatientsApi.search).toHaveBeenCalledWith(
      expect.objectContaining({ pageNumber: 1, pageSize: 20 }),
    );
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('أحمد علي');
  });

  it('should emit selected patient when choose is called', () => {
    let emittedPatient: PatientSearchItem | null = null;
    component.selected.subscribe((p) => (emittedPatient = p));

    (component as unknown as { choose: (p: PatientSearchItem) => void }).choose(mockPatient);

    expect(emittedPatient).toEqual(mockPatient);
  });

  it('should handle search error gracefully', async () => {
    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: { detail: 'Invalid search criteria' },
    });
    mockPatientsApi.search.mockReturnValue(throwError(() => errorResponse));

    const event = new Event('submit');
    await (component as unknown as { search: (e: Event) => Promise<void> }).search(event);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Invalid search criteria');
  });
});
