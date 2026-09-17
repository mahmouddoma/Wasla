import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PracticeSegments } from './practice-segments';
import {
  DoctorPracticeSegment,
  DoctorPracticeVisitType,
  DoctorPracticePrice,
} from '../../../../domains/doctor-practices';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { ToastService } from '../../../../core/notifications/toast.service';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('PracticeSegments', () => {
  let fixture: ComponentFixture<PracticeSegments>;
  let component: PracticeSegments;

  const mockSegments: DoctorPracticeSegment[] = [
    {
      id: 'seg-1',
      nameAr: 'شريحة عامة',
      nameEn: 'General Segment',
      priority: 1,
      reservedDailyQuota: 10,
      quotaReleaseBeforeMinutes: 60,
      isActive: true,
      isDefault: true,
      rowVersion: 'v1',
    },
  ];

  const mockVisitTypes: DoctorPracticeVisitType[] = [
    {
      id: 'vt-1',
      type: 'NewConsultation',
      nameAr: 'كشف عادي',
      nameEn: 'Regular Consultation',
      isActive: true,
      rowVersion: 'v1',
    },
  ];

  const mockPrices: DoctorPracticePrice[] = [
    {
      id: 'pr-1',
      segmentId: 'seg-1',
      visitTypeId: 'vt-1',
      price: 250,
      rowVersion: 'v1',
    },
  ];

  const mockApi = {
    segments: vi.fn(() => of(mockSegments)),
    visitTypes: vi.fn(() => of(mockVisitTypes)),
    prices: vi.fn(() => of(mockPrices)),
    addSegment: vi.fn(() => of(mockSegments[0])),
    updateSegment: vi.fn(() => of(mockSegments[0])),
    updateVisitType: vi.fn(() => of(mockVisitTypes[0])),
    addPrice: vi.fn(() => of(mockPrices[0])),
    updatePrice: vi.fn(() => of(mockPrices[0])),
    deletePrice: vi.fn(() => of(undefined)),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.segments.mockReturnValue(of(mockSegments));
    mockApi.visitTypes.mockReturnValue(of(mockVisitTypes));
    mockApi.prices.mockReturnValue(of(mockPrices));

    await TestBed.configureTestingModule({
      imports: [PracticeSegments],
      providers: [
        { provide: DoctorPracticesApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
        LanguageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PracticeSegments);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('practiceId', 'prac-1');
    fixture.componentRef.setInput('canViewSegments', true);
    fixture.componentRef.setInput('canManageSegments', true);
    fixture.componentRef.setInput('canViewPricing', true);
    fixture.componentRef.setInput('canManagePricing', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load segments, visit types and prices', async () => {
    expect(component).toBeTruthy();
    await (component as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();

    expect(mockApi.segments).toHaveBeenCalledWith('prac-1');
    expect(mockApi.visitTypes).toHaveBeenCalledWith('prac-1');
    expect(mockApi.prices).toHaveBeenCalledWith('prac-1');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('شريحة عامة');
  });

  it('should toggle adding segment state', () => {
    (component as unknown as { openAddSegment: () => void }).openAddSegment();
    expect((component as unknown as { isAddingSegment: () => boolean }).isAddingSegment()).toBe(true);

    (component as unknown as { cancelSegmentEdit: () => void }).cancelSegmentEdit();
    expect((component as unknown as { isAddingSegment: () => boolean }).isAddingSegment()).toBe(false);
  });

  it('should populate edit segment form', () => {
    (component as unknown as { editSegment: (s: DoctorPracticeSegment) => void }).editSegment(mockSegments[0]);
    expect((component as unknown as { editingSegmentId: () => string | null }).editingSegmentId()).toBe('seg-1');
    const model = (component as unknown as { segmentModel: () => { nameAr: string } }).segmentModel();
    expect(model.nameAr).toBe('شريحة عامة');
  });

  it('should delete a price when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockApi.deletePrice.mockReturnValue(of(undefined));

    await (component as unknown as { deletePrice: (p: DoctorPracticePrice) => Promise<void> }).deletePrice(mockPrices[0]);

    expect(mockApi.deletePrice).toHaveBeenCalledWith('prac-1', 'pr-1', { rowVersion: 'v1' });
    expect(mockToast.success).toHaveBeenCalledWith('تم حذف السعر.');
  });

  it('should handle API errors during segment load gracefully', async () => {
    mockApi.segments.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Failed to load' } })),
    );

    await component.ngOnInit();
    fixture.detectChanges();

    const messages = (component as unknown as { messages: () => string[] }).messages();
    expect(messages.length).toBeGreaterThan(0);
  });
});
