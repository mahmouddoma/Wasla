import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import {
  PublicDiscoveryApi,
  PublicDoctorSearchResponse,
} from '../../../../domains/public-discovery';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { ReservationsApi } from '../../../../domains/reservations/reservations-api';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PublicDoctors } from './public-doctors';

describe('PublicDoctors', () => {
  let fixture: ComponentFixture<PublicDoctors>;
  const empty: PublicDoctorSearchResponse = {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  };
  const mockDoctorDetails = {
    doctorId: 'doctor-1',
    nameAr: 'د. أحمد',
    nameEn: 'Dr. Ahmed',
    profileImageUrl: null,
    specializations: [],
    practices: [
      {
        id: 'practice-1',
        nameAr: 'عيادة الدقي',
        nameEn: 'Dokki Clinic',
        logoUrl: null,
        governorate: null,
        city: null,
        area: null,
        detailedAddress: 'شارع التحرير',
        latitude: null,
        longitude: null,
        publicSearchPrice: 300,
        nextAvailableSlotDate: null,
        nextAvailableSlotTime: null,
        isToday: false,
        isBookable: true,
        onlineBookingEnabled: true,
      },
    ],
    bio: 'استشاري جراحة',
    qualifications: [],
  };
  const api = {
    doctors: vi.fn(() => of(empty)),
    specializations: vi.fn(() => of([])),
    doctor: vi.fn(() => of(mockDoctorDetails)),
    availableDates: vi.fn(() => of([])),
    availableSlots: vi.fn(() => of([])),
    bookingOptions: vi.fn(() => of(null)),
  };
  const locations = {
    governorates: vi.fn(() => of([{ id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' }])),
    cities: vi.fn(() => of([])),
    areas: vi.fn(() => of([])),
  };
  const reservationsApi = {
    bookablePatients: vi.fn(() =>
      of([{ patientId: 'p-1', nameAr: 'أحمد', nameEn: 'Ahmed', isSelf: true }]),
    ),
    createPatient: vi.fn(() =>
      of({
        reservationId: 'res-1',
        reference: 'RES-84920',
        appointment: { businessDate: '2026-10-06', slotStartTime: '06:00:00' },
        doctor: { nameAr: 'د. أحمد', nameEn: 'Dr. Ahmed' },
        practice: { nameAr: 'عيادة الدقي', nameEn: 'Dokki Clinic' },
        patient: { nameAr: 'أحمد', nameEn: 'Ahmed' },
        price: 300,
      }),
    ),
  };
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    api.doctors.mockReturnValue(of(empty));
    api.doctor.mockReturnValue(of(mockDoctorDetails));
    api.availableDates.mockReturnValue(of([]));
    api.availableSlots.mockReturnValue(of([]));
    reservationsApi.bookablePatients.mockReturnValue(
      of([{ patientId: 'p-1', nameAr: 'أحمد', nameEn: 'Ahmed', isSelf: true }]),
    );
    TestBed.configureTestingModule({
      imports: [PublicDoctors],
      providers: [
        provideRouter([]),
        { provide: PublicDiscoveryApi, useValue: api },
        { provide: DoctorProfileApi, useValue: locations },
        { provide: ReservationsApi, useValue: reservationsApi },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PublicDoctors);
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('requests availability using the selected clinic ID', async () => {
    await fixture.componentInstance['openDoctorDrawer'](mockDoctorDetails, 'practice-1');
    expect(api.availableDates).toHaveBeenCalledWith('practice-1');
  });

  it('shows a loading error without claiming that the clinic has no booking days', async () => {
    api.availableDates.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await fixture.componentInstance['openDoctorDrawer'](mockDoctorDetails);
    await fixture.whenStable();
    expect(fixture.componentInstance['drawerMessages']()).toEqual(['discovery.resourceNotFound']);
    const text = (fixture.nativeElement as HTMLElement).textContent;
    const language = TestBed.inject(LanguageService);
    expect(text).toContain(language.t('discovery.resourceNotFound'));
    expect(text).not.toContain(language.t('booking.noDays'));
  });

  it('loads reference data and renders an empty search result', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(locations.governorates).toHaveBeenCalledOnce();
    expect(api.specializations).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('لا توجد نتائج مطابقة');
  });
  it('changes language, direction and reference names', async () => {
    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('main')?.dir).toBe('ltr');
    expect(element.querySelector('h1')?.textContent).toContain('Find your doctor');
    expect(element.textContent).toContain('Cairo');
  });
  it('submits trimmed filters with the existing pagination contract', async () => {
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = '  Ahmed  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(api.doctors).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchText: 'Ahmed', pageNumber: 1, pageSize: 20 }),
    );
  });
  it('clears dependent location filters when the governorate changes', async () => {
    fixture.componentInstance['filters'].update((value) => ({
      ...value,
      cityId: '1028',
      areaId: '10280003',
    }));
    const select = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLSelectElement>(
      'select',
    )[1];
    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(locations.cities).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance['filters']()).toMatchObject({
      governorateId: '1',
      cityId: '',
      areaId: '',
    });
  });
  it('renders search errors and retries through the visible action', async () => {
    api.doctors.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await fixture.componentInstance['search']();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
    api.doctors.mockReturnValue(of(empty));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.search-error button')!
      .click();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });
  it('renders returned doctors and replaces a broken photo with a fallback', async () => {
    api.doctors.mockReturnValue(
      of({
        ...empty,
        totalCount: 1,
        items: [
          {
            doctorId: 'doctor-1',
            nameAr: 'د. أحمد',
            nameEn: 'Dr. Ahmed',
            profileImageUrl: '/missing.png',
            specializations: [],
            practices: [],
          },
        ],
      }),
    );
    await fixture.componentInstance['search']();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.doctor-result h3')?.textContent).toContain('د. أحمد');
    expect(element.querySelector('.doctor-heading a')?.getAttribute('href')).toBe(
      '/doctors/doctor-1',
    );
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(element.querySelector('.image-placeholder')).not.toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.pagination button')?.disabled).toBe(true);
  });
  it('opens and closes the slide-over drawer for in-place booking', async () => {
    const doctorItem = {
      doctorId: 'doctor-1',
      nameAr: 'د. أحمد',
      nameEn: 'Dr. Ahmed',
      profileImageUrl: null,
      specializations: [],
      practices: [],
    };
    expect(fixture.componentInstance['drawerOpened']()).toBe(false);
    await fixture.componentInstance['openDoctorDrawer'](doctorItem);
    await fixture.whenStable();
    expect(fixture.componentInstance['drawerOpened']()).toBe(true);
    expect(api.doctor).toHaveBeenCalledWith('doctor-1');
    fixture.componentInstance['closeDrawer']();
    expect(fixture.componentInstance['drawerOpened']()).toBe(false);
  });

  it('selects and switches active practice for a doctor', () => {
    const doctor = {
      doctorId: 'doc-1',
      nameAr: 'د. علي',
      nameEn: 'Dr. Ali',
      profileImageUrl: null,
      specializations: [],
      practices: [
        { ...mockDoctorDetails.practices[0], id: 'practice-a', nameAr: 'فرع الدقي' },
        { ...mockDoctorDetails.practices[0], id: 'practice-b', nameAr: 'فرع المعادي' },
      ],
    };
    expect(fixture.componentInstance['getActivePractice'](doctor)?.id).toBe('practice-a');
    fixture.componentInstance['selectDoctorPractice']('doc-1', 'practice-b');
    expect(fixture.componentInstance['getActivePractice'](doctor)?.id).toBe('practice-b');
  });

  it('generates 3 preview schedule days with formatted slot times', () => {
    const practice = {
      ...mockDoctorDetails.practices[0],
      isToday: true,
      nextAvailableSlotDate: new Date().toISOString().slice(0, 10),
      nextAvailableSlotTime: '18:30:00',
    };
    const days = fixture.componentInstance['getScheduleDays'](practice);
    expect(days).toHaveLength(3);
    expect(days[0].label).toBe('اليوم');
    expect(days[0].isAvailable).toBe(true);
    expect(days[0].slotTime).toContain('06:30');
  });

  it('submits patient booking in-place and renders receipt on success', async () => {
    const component = fixture.componentInstance;
    const authSession = TestBed.inject(AuthSession);
    vi.spyOn(authSession, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authSession, 'user').mockReturnValue({
      applicationUserId: 'u-1',
      userName: 'patient.ahmed',
      email: 'p@wasla.local',
      phoneNumber: '01000000000',
      userType: 'Patient',
      roles: ['Patient'],
      permissions: [],
      isFirstLogin: false,
      doctorId: null,
      patientId: 'p-1',
    });

    component['drawerOpened'].set(true);
    component['drawerSelectedPractice'].set(mockDoctorDetails.practices[0]);
    component['drawerSelectedDate'].set('2026-10-06');
    component['drawerSelectedTime'].set('06:00:00');
    component['selectedPatientId'].set('p-1');

    const segment = { segmentId: 'seg-1', nameAr: 'كشف عادي', price: 300 };
    const visitType = { visitTypeId: 'vt-1', nameAr: 'كشف جديد' };

    await component['confirmBooking'](segment, visitType);
    await fixture.whenStable();

    expect(reservationsApi.createPatient).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('booking.successToast');
    expect(component['bookingConfirmedReservation']()).not.toBeNull();
    expect(component['bookingConfirmedReservation']()?.reference).toBe('RES-84920');

    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.booking-success-receipt')).not.toBeNull();
    expect(element.textContent).toContain('RES-84920');
  });
});
