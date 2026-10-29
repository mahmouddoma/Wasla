import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientPrescriptionsListComponent } from './patient-prescriptions-list.component';
import { DoctorPatientsApi } from '../../../../domains/doctor-patients';
import { PrescriptionsApi } from '../../../../domains/prescriptions';
import { ToastService } from '../../../../core/notifications/toast.service';
import { of, throwError } from 'rxjs';

describe('PatientPrescriptionsListComponent', () => {
  let component: PatientPrescriptionsListComponent;
  let fixture: ComponentFixture<PatientPrescriptionsListComponent>;
  let doctorPatientsApi: { prescriptions: ReturnType<typeof vi.fn>; prescriptionPdf: ReturnType<typeof vi.fn> };
  let prescriptionsApi: { versions: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  const mockPrescription = {
    prescriptionId: 'rx-1',
    encounterId: 'enc-1',
    practiceId: 'p-1',
    visitDateUtc: '2026-10-28T08:00:00Z',
    currentVersionNumber: 1,
    currentStatus: 'Finalized',
    medicationCount: 3,
    hasVersions: true,
    canView: true,
    canExport: true,
    isHistoricalPractice: false,
  };

  beforeEach(async () => {
    doctorPatientsApi = {
      prescriptions: vi.fn().mockReturnValue(of({ items: [mockPrescription], totalCount: 1, pageNumber: 1, pageSize: 10 })),
      prescriptionPdf: vi.fn().mockReturnValue(of(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))),
    };
    prescriptionsApi = {
      versions: vi.fn().mockReturnValue(of([
        { versionNumber: 1, status: 'Finalized', finalizedOnUtc: '2026-10-28T08:00:00Z', items: [] },
      ])),
    };
    toast = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PatientPrescriptionsListComponent],
      providers: [
        { provide: DoctorPatientsApi, useValue: doctorPatientsApi },
        { provide: PrescriptionsApi, useValue: prescriptionsApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientPrescriptionsListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'pat-1');
    fixture.detectChanges();
  });

  it('creates component and loads prescriptions', () => {
    expect(component).toBeTruthy();
    expect(doctorPatientsApi.prescriptions).toHaveBeenCalledWith('pat-1', { pageNumber: 1, pageSize: 10 });
    expect(component.prescriptions().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('views PDF inline when authorized', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

    component.viewPdf(mockPrescription);

    expect(doctorPatientsApi.prescriptionPdf).toHaveBeenCalledWith('rx-1', 1, 'inline');
    expect(createUrlSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('blob:test', '_blank');
  });

  it('loads version history', () => {
    component.viewVersions(mockPrescription);
    expect(prescriptionsApi.versions).toHaveBeenCalledWith('rx-1');
    expect(component.selectedVersions()?.length).toBe(1);

    component.closeVersionsModal();
    expect(component.selectedVersions()).toBeNull();
  });

  it('handles load error', () => {
    doctorPatientsApi.prescriptions.mockReturnValue(throwError(() => new Error('Error')));
    component.loadPrescriptions();
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});

