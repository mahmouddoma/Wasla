import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorPractice } from '../../../../domains/doctor-practices';
import { environment } from '../../../../../environments/environment';
import { PracticeOperations } from './practice-operations';

describe('PracticeOperations', () => {
  let fixture: ComponentFixture<PracticeOperations>;
  let component: PracticeOperations;
  let httpTesting: HttpTestingController;

  const samplePractice: DoctorPractice = {
    id: 'practice-op-1',
    nameAr: 'عيادة العمليات',
    nameEn: 'Operations Clinic',
    isActive: false,
    hasLogo: true,
    rowVersion: 'AQID',
    location: {
      governorate: { id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' },
      city: { id: 10, nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
      area: null,
      detailedAddress: 'شارع عباس العقاد',
      latitude: 30.05,
      longitude: 31.33,
    },
  };

  const sampleBranding = {
    practiceId: 'practice-op-1',
    hasLogo: true,
    logoStorageKey: 'logos/p1.png',
    primaryColor: '#008C8C',
    secondaryColor: '#0B2942',
    backgroundColor: '#FFFFFF',
    textColor: '#102A43',
    rowVersion: 'AQID',
  };

  const sampleConfig = {
    practiceId: 'practice-op-1',
    allowOnlineBooking: true,
    allowWalkIn: false,
    defaultSlotDurationMinutes: 20,
    checkInGracePeriodMinutes: 10,
    patientSelfCancellationCutoffMinutes: 60,
    maximumDailyPatients: 30,
    maximumTicketCallAttempts: 3,
      noShowAfterPassedPatientsCount: 3,
    timeZoneId: 'Africa/Cairo',
    rowVersion: 'AQID',
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PracticeOperations],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PracticeOperations);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('practice', samplePractice);
    fixture.componentRef.setInput('canActivate', true);
    fixture.componentRef.setInput('canViewConfiguration', true);
    fixture.componentRef.setInput('canManageConfiguration', true);
    fixture.componentRef.setInput('canViewBranding', true);
    fixture.componentRef.setInput('canManageBranding', true);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('creates component and loads configuration and branding in parallel', async () => {
    fixture.detectChanges();

    const configReq = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/practices/${samplePractice.id}/configuration`,
    );
    expect(configReq.request.method).toBe('GET');
    configReq.flush(sampleConfig);

    const brandingReq = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/practices/${samplePractice.id}/branding`,
    );
    expect(brandingReq.request.method).toBe('GET');
    brandingReq.flush(sampleBranding);

    await Promise.resolve();
    const logoReq = httpTesting.expectOne(
      `${environment.apiBaseUrl}/api/v1/doctors/me/practices/${samplePractice.id}/branding/logo`,
    );
    expect(logoReq.request.method).toBe('GET');
    logoReq.flush(new Blob(['fake-logo'], { type: 'image/png' }));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component['branding']()?.primaryColor).toBe('#008C8C');
    expect(component['configuration']()?.defaultSlotDurationMinutes).toBe(20);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('حالة التشغيل');
    expect(compiled.textContent).toContain('الهوية البصرية');
    expect(compiled.textContent).toContain('الإعدادات التشغيلية');
  });

  it('updates color picker value and branding model when onColorPicked is triggered', async () => {
    fixture.detectChanges();

    httpTesting
      .expectOne(
        `${environment.apiBaseUrl}/api/v1/doctors/me/practices/${samplePractice.id}/configuration`,
      )
      .flush(sampleConfig);
    httpTesting
      .expectOne(
        `${environment.apiBaseUrl}/api/v1/doctors/me/practices/${samplePractice.id}/branding`,
      )
      .flush(sampleBranding);

    await Promise.resolve();
    httpTesting
      .expectOne(
        `${environment.apiBaseUrl}/api/v1/doctors/me/practices/${samplePractice.id}/branding/logo`,
      )
      .flush(new Blob(['fake-logo'], { type: 'image/png' }));

    await fixture.whenStable();
    fixture.detectChanges();

    // Trigger color pick
    const mockInput = document.createElement('input');
    mockInput.value = '#099268';
    component['onColorPicked']('primaryColor', { target: mockInput } as unknown as Event);

    expect(component['brandingModel']().primaryColor).toBe('#099268');
    expect(component['getValidHex']('#099268', '#008C8C')).toBe('#099268');
    expect(component['getValidHex']('invalid', '#008C8C')).toBe('#008C8C');
  });
});
