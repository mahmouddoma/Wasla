import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
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
  it('renders server prices and addresses without invented ratings, review counts or waiting estimates', async () => {
    api.doctors.mockReturnValueOnce(of({ items: [mockDoctorDetails], totalCount: 1, pageNumber: 1, pageSize: 20 }));
    await fixture.componentInstance['search']();
    await fixture.whenStable();
    const language = TestBed.inject(LanguageService);
    for (const lang of ['en', 'ar'] as const) {
      language.setLanguage(lang);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.rating-stars')).toBeNull();
      expect(fixture.nativeElement.querySelector('.rating-count')).toBeNull();
      expect(fixture.nativeElement.querySelector('.wait-chip')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain(language.t('booking.standardNewConsultation'));
      expect(fixture.nativeElement.textContent).toContain(mockDoctorDetails.practices[0].detailedAddress);
    }
  });
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
    practiceLogoUrl: vi.fn((id: string) => '/api/v1/public/practices/' + id + '/logo'),
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
  it('launches the shared booking flow with the explicit selected appointment', async () => {
    const open = vi.spyOn(fixture.componentInstance['booking'], 'open').mockResolvedValue();
    await fixture.componentInstance['openDoctorDrawer'](mockDoctorDetails, 'practice-1', '2026-11-10', '15:30:00');
    expect(open).toHaveBeenCalledWith({ doctorId: 'doctor-1', doctorPracticeId: 'practice-1', businessDate: '2026-11-10', slotStartTime: '15:30:00' });
    expect(reservationsApi.createPatient).not.toHaveBeenCalled();
  });
});
