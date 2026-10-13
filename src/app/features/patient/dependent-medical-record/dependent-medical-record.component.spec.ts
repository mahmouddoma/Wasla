import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  FamilyMedicalDependent,
  FamilyMedicalRecordEncounter,
  FamilyMedicalRecordItem,
  FamilyMedicalRecordOverview,
  MedicalRecordTimelineEntry,
} from '../../../domains/families';
import { DependentMedicalRecordComponent } from './dependent-medical-record.component';

describe('DependentMedicalRecordComponent', () => {
  let component: DependentMedicalRecordComponent;
  let fixture: ComponentFixture<DependentMedicalRecordComponent>;

  const mockDependent: FamilyMedicalDependent = {
    patientId: 'child-1',
    nameAr: 'أحمد محمود',
    nameEn: 'Ahmed Mahmoud',
    medicalAccess: {
      status: 'Allowed',
      canView: true,
      canRequestRestriction: true,
      canRequestRestoration: false,
    },
  };

  const mockOverview: FamilyMedicalRecordOverview = {
    patient: {
      patientId: 'child-1',
      nameAr: 'أحمد محمود',
      nameEn: 'Ahmed Mahmoud',
      dateOfBirth: '2020-01-01',
      gender: 'Male',
    },
    context: {},
    summary: {
      completedVisitCount: 3,
      currentPrescriptionCount: 1,
      officialLabResultCount: 2,
      officialRadiologyResultCount: 0,
      hiddenEncounterCount: 0,
    },
    timeline: {
      items: [],
      nextCursor: null,
      hasMore: false,
    },
    capabilities: {
      canView: true,
      canViewAttachments: true,
      canRequestHiddenAccess: false,
    },
    availableFilters: ['prescription', 'lab-result'],
  };

  const mockTimelineEntry: MedicalRecordTimelineEntry = {
    type: 'Prescription',
    entryId: 'entry-1',
    occurredAtUtc: '2026-10-10T10:00:00Z',
    sourceId: 'rx-1',
    encounterId: 'enc-1',
    resourceType: 'prescription',
    status: 'Active',
    title: 'Amoxicillin 500mg',
    capabilities: {
      canViewDetails: true,
      canViewAttachments: true,
    },
  };

  const mockEncounter: FamilyMedicalRecordEncounter = {
    encounterId: 'enc-1',
    visitDate: '2026-10-10',
    doctor: { name: 'د. لؤي' },
    practice: { name: 'عيادة الأمل' },
    diagnoses: [
      { diagnosisId: 'diag-1', type: 'Primary', displayText: 'التهاب الحلق الحاد' },
    ],
    outputs: {
      items: [mockTimelineEntry],
      nextCursor: null,
      hasMore: false,
    },
    capabilities: {},
  };

  const mockItem: FamilyMedicalRecordItem = {
    resourceType: 'prescription',
    sourceId: 'rx-1',
    encounterId: 'enc-1',
    status: 'Active',
    currentVersion: 1,
    safeContent: { medication: 'Amoxicillin' },
    attachments: [
      {
        attachmentId: 'att-1',
        fileName: 'prescription.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
        canDownload: true,
      },
    ],
    capabilities: {},
  };

  const mockApi = {
    medicalRecordDependents: vi.fn(() =>
      of({ items: [mockDependent], nextCursor: null, hasMore: false }),
    ),
    dependentMedicalRecordOverview: vi.fn(() => of(mockOverview)),
    dependentMedicalRecordTimeline: vi.fn(() =>
      of({ items: [mockTimelineEntry], nextCursor: 'next-1', hasMore: true }),
    ),
    dependentMedicalRecordEncounter: vi.fn(() => of(mockEncounter)),
    dependentMedicalRecordItem: vi.fn(() => of(mockItem)),
    dependentMedicalRecordAttachment: vi.fn(() =>
      of(new HttpResponse({ body: new Blob(['file content']), status: 200 })),
    ),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi.medicalRecordDependents.mockReturnValue(
      of({ items: [mockDependent], nextCursor: null, hasMore: false }),
    );
    mockApi.dependentMedicalRecordOverview.mockReturnValue(of(mockOverview));
    mockApi.dependentMedicalRecordTimeline.mockReturnValue(
      of({ items: [mockTimelineEntry], nextCursor: 'next-1', hasMore: true }),
    );
    mockApi.dependentMedicalRecordEncounter.mockReturnValue(of(mockEncounter));
    mockApi.dependentMedicalRecordItem.mockReturnValue(of(mockItem));
    mockApi.dependentMedicalRecordAttachment.mockReturnValue(
      of(new HttpResponse({ body: new Blob(['file content']), status: 200 })),
    );

    await TestBed.configureTestingModule({
      imports: [DependentMedicalRecordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamiliesApi, useValue: mockApi },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DependentMedicalRecordComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load dependents and select the first one on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockApi.medicalRecordDependents).toHaveBeenCalled();
    expect(component['dependents']().length).toBe(1);
    expect(component['selectedDependentId']()).toBe('child-1');
    expect(mockApi.dependentMedicalRecordOverview).toHaveBeenCalledWith('child-1', expect.anything());
    expect(mockApi.dependentMedicalRecordTimeline).toHaveBeenCalledWith('child-1', expect.anything());
  });

  it('should filter timeline events by resource type', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['onFilterChange']('prescription');

    expect(component['filterType']()).toBe('prescription');
    expect(mockApi.dependentMedicalRecordTimeline).toHaveBeenCalledWith('child-1', {
      types: ['prescription'],
      fromDate: undefined,
      toDate: undefined,
      pageSize: 20,
    });
  });

  it('should filter timeline events by date range', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['onDateFilterChange']('2026-01-01', '2026-10-10');

    expect(component['fromDate']()).toBe('2026-01-01');
    expect(component['toDate']()).toBe('2026-10-10');
    expect(mockApi.dependentMedicalRecordTimeline).toHaveBeenCalledWith('child-1', {
      types: undefined,
      fromDate: '2026-01-01',
      toDate: '2026-10-10',
      pageSize: 20,
    });
  });

  it('should load more timeline events with cursor pagination', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['hasMore']()).toBe(true);
    expect(component['nextCursor']()).toBe('next-1');

    await component['loadMoreTimeline']();

    expect(mockApi.dependentMedicalRecordTimeline).toHaveBeenCalledWith('child-1', {
      types: undefined,
      fromDate: undefined,
      toDate: undefined,
      cursor: 'next-1',
      pageSize: 20,
    });
  });

  it('should open encounter drawer and fetch encounter details', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component['openEncounterDrawer']('enc-1');

    expect(component['encounterDrawerOpen']()).toBe(true);
    expect(mockApi.dependentMedicalRecordEncounter).toHaveBeenCalledWith('child-1', 'enc-1');
    expect(component['selectedEncounter']()?.encounterId).toBe('enc-1');
  });

  it('should open item drawer and fetch item details', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component['openItemDrawer'](mockTimelineEntry);

    expect(component['itemDrawerOpen']()).toBe(true);
    expect(mockApi.dependentMedicalRecordItem).toHaveBeenCalledWith('child-1', 'prescription', 'rx-1');
    expect(component['selectedItem']()?.sourceId).toBe('rx-1');
  });

  it('should download attachment and notify with toast', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['selectedItem'].set(mockItem);
    await component['downloadAttachment']('att-1');

    expect(mockApi.dependentMedicalRecordAttachment).toHaveBeenCalledWith(
      'child-1',
      'prescription',
      'rx-1',
      'att-1',
    );
    expect(mockToast.success).toHaveBeenCalled();
  });
});
