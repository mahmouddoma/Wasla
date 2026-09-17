import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AvailableDate, AvailableSlot, BookingOptions, PublicDiscoveryApi, PublicDoctorDetails, PublicPracticeSummary } from '../../../../domains/public-discovery';
import { PublicDoctorDetailsPage } from './public-doctor-details';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('PublicDoctorDetailsPage', () => {
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
    TestBed.configureTestingModule({ imports: [PublicDoctorDetailsPage], providers: [provideRouter([]),
      { provide: PublicDiscoveryApi, useValue: api },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ doctorId: 'doctor-1' }) } } },
    ] });
    TestBed.inject(LanguageService).setLanguage('ar');
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('updates translated controls, clinic names and direction when language changes', async () => {
    const fixture = TestBed.createComponent(PublicDoctorDetailsPage);
    await fixture.whenStable();
    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('main')?.dir).toBe('ltr');
    expect(element.textContent).toContain('Back to search');
    expect(element.textContent).toContain('Choose clinic');
    expect(element.querySelector('.practice-list h3')?.textContent).toContain('Clinic');
  });
  it('does not announce empty availability while the clinic dates are loading', async () => {
    const fixture = TestBed.createComponent(PublicDoctorDetailsPage);
    await fixture.whenStable();
    const dates = new Subject<AvailableDate[]>();
    api.availableDates.mockReturnValue(dates);
    const pending = fixture.componentInstance['choosePractice'](practice);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).not.toContain(TestBed.inject(LanguageService).t('booking.noDays'));
    dates.next([]);
    await pending;
    await fixture.whenStable();
    expect(element.textContent).toContain(TestBed.inject(LanguageService).t('booking.noDays'));
  });
  it('prevents choosing dates marked unavailable by the server', async () => {
    const fixture = TestBed.createComponent(PublicDoctorDetailsPage);
    await fixture.whenStable();
    api.availableDates.mockReturnValue(of([{ date: '2026-09-20', isAvailable: false }]));
    await fixture.componentInstance['choosePractice'](practice);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.choice-grid button')!;
    expect(button.disabled).toBe(true);
    button.click();
    expect(api.availableSlots).not.toHaveBeenCalled();
  });
  it('renders the doctor and refuses booking for unavailable branches', async () => {
    const fixture = TestBed.createComponent(PublicDoctorDetailsPage);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('أحمد');
    await fixture.componentInstance['choosePractice']({ ...practice, isBookable: false });
    expect(api.availableDates).not.toHaveBeenCalled();
  });
  it('keeps the latest branch dates when responses arrive out of order', async () => {
    const page = TestBed.createComponent(PublicDoctorDetailsPage).componentInstance;
    const first = new Subject<AvailableDate[]>();
    const second = new Subject<AvailableDate[]>();
    api.availableDates.mockReturnValueOnce(first).mockReturnValueOnce(second);
    page['selectedTime'].set('17:00');
    const pendingFirst = page['choosePractice'](practice);
    const pendingSecond = page['choosePractice']({ ...practice, id: 'branch-2' });
    expect(page['selectedTime']()).toBe('');
    second.next([{ date: '2026-09-20', isAvailable: true }]);
    await pendingSecond;
    first.next([{ date: '2026-09-19', isAvailable: true }]);
    await pendingFirst;
    expect(page['dates']()).toEqual([{ date: '2026-09-20', isAvailable: true }]);
    expect(page['selectedPractice']()?.id).toBe('branch-2');
  });
  it('clears old slots and ignores failures belonging to an earlier date', async () => {
    const page = TestBed.createComponent(PublicDoctorDetailsPage).componentInstance;
    await page['choosePractice'](practice);
    const first = new Subject<AvailableSlot[]>();
    const second = new Subject<AvailableSlot[]>();
    api.availableSlots.mockReturnValueOnce(first).mockReturnValueOnce(second);
    page['slots'].set([{ date: '2026-09-18', time: '17:00' }]);
    const pendingFirst = page['chooseDate']('2026-09-19');
    expect(page['slots']()).toEqual([]);
    const pendingSecond = page['chooseDate']('2026-09-20');
    first.error(new HttpErrorResponse({ status: 500 }));
    await pendingFirst;
    expect(page['bookingLoading']()).toBe(true);
    expect(page['messages']()).toEqual([]);
    second.next([{ date: '2026-09-20', time: '18:00' }]);
    await pendingSecond;
    expect(page['slots']()[0].time).toBe('18:00');
  });
  it('refreshes slots when the current slot conflicts', async () => {
    const page = TestBed.createComponent(PublicDoctorDetailsPage).componentInstance;
    await page['choosePractice'](practice);
    await page['chooseDate']('2026-09-20');
    api.bookingOptions.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await page['chooseSlot']('18:00');
    expect(api.availableSlots).toHaveBeenCalledTimes(2);
    expect(page['selectedTime']()).toBe('');
    expect(page['bookingLoading']()).toBe(false);
  });
  it('shows the not-found state for an unknown doctor', async () => {
    api.doctor.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(PublicDoctorDetailsPage);
    await fixture.whenStable();
    expect(fixture.componentInstance['notFound']()).toBe(true);
    expect(fixture.componentInstance['isLoading']()).toBe(false);
  });
});
