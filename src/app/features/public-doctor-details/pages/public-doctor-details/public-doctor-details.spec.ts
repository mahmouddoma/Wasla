import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AvailableDate, AvailableSlot, BookingOptions, PublicDiscoveryApi, PublicDoctorDetails, PublicPracticeSummary } from '../../../../domains/public-discovery';
import { PublicDoctorDetailsPage } from './public-doctor-details';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ReservationsApi } from '../../../../domains/reservations/reservations-api';
import { ToastService } from '../../../../core/notifications/toast.service';

describe('PublicDoctorDetailsPage', () => {
  it('displays the standard new-consultation baseline without unsupported ratings or reviews', async () => {
    const fixture = TestBed.createComponent(PublicDoctorDetailsPage);
    await fixture.whenStable();
    const language = TestBed.inject(LanguageService);
    for (const lang of ['ar', 'en'] as const) {
      language.setLanguage(lang);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.rating-stars')).toBeNull();
      expect(fixture.nativeElement.querySelector('.rating-count')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain(language.t('booking.standardNewConsultation'));
    }
  });
  const practice: PublicPracticeSummary = {
    id: 'branch-1', nameAr: 'العيادة', nameEn: 'Clinic', logoUrl: null,
    governorate: null, city: null, area: null, detailedAddress: null,
    latitude: null, longitude: null, publicSearchPrice: 300,
    nextAvailableSlotDate: null, nextAvailableSlotTime: null, isToday: false, isBookable: true,
  };
  const doctor: PublicDoctorDetails = { doctorId: 'doctor-1', nameAr: 'أحمد', nameEn: 'Ahmed',
    profileImageUrl: null, specializations: [], practices: [practice], bio: null, qualifications: [] };
  const api = {
    doctor: vi.fn<() => Observable<PublicDoctorDetails>>(),
    availableDates: vi.fn<() => Observable<AvailableDate[]>>(),
    availableSlots: vi.fn<() => Observable<AvailableSlot[]>>(),
    bookingOptions: vi.fn<() => Observable<BookingOptions>>(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.doctor.mockReturnValue(of(doctor));
    api.availableDates.mockReturnValue(of([]));
    api.availableSlots.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [PublicDoctorDetailsPage],
      providers: [
        provideRouter([]),
        { provide: PublicDiscoveryApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ doctorId: 'doctor-1' }), queryParamMap: convertToParamMap({}) } },
        },
        {
          provide: AuthSession,
          useValue: {
            token: () => null,
            isAuthenticated: () => false,
            hasRole: () => false,
            user: () => null,
            session: () => null,
            destinationFor: () => '/workspace',
          },
        },
        {
          provide: ReservationsApi,
          useValue: {
            bookablePatients: () => of([]),
            createPatient: () => of({}),
          },
        },
        {
          provide: ToastService,
          useValue: { success: vi.fn(), error: vi.fn() },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('opens the same booking flow from the selected profile practice without creating a reservation', async () => {
    const fixture = TestBed.createComponent(PublicDoctorDetailsPage);
    await fixture.whenStable();
    const open = vi.spyOn(fixture.componentInstance['booking'], 'open').mockResolvedValue();
    await fixture.componentInstance['choosePractice'](practice);
    expect(open).toHaveBeenCalledWith({ doctorId: 'doctor-1', doctorPracticeId: 'branch-1' });
    expect(api.availableSlots).not.toHaveBeenCalled();
  });
});
