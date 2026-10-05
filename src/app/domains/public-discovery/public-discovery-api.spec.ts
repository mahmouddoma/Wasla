import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicDiscoveryApi } from './public-discovery-api';

describe('PublicDiscoveryApi', () => {
  let api: PublicDiscoveryApi;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/v1/public`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PublicDiscoveryApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it.each(['id', 'practiceId', 'doctorPracticeId'])('normalizes %s for search and details booking', async (key) => {
    const practice = { [key]: 'clinic-1', nameAr: 'Clinic', isBookable: true };
    const doctor = { doctorId: 'doctor-1', practices: [practice] };
    const search = firstValueFrom(api.doctors({ pageNumber: 1, pageSize: 20 }));
    http.expectOne((request) => request.url === `${url}/doctors`).flush({
      items: [doctor], totalCount: 1, pageNumber: 1, pageSize: 20,
    });
    expect((await search).items[0].practices[0].id).toBe('clinic-1');
    const details = firstValueFrom(api.doctor('doctor-1'));
    http.expectOne(`${url}/doctors/doctor-1`).flush(doctor);
    const selected = (await details).practices[0];
    const dates = firstValueFrom(api.availableDates(selected.id));
    http.expectOne(`${url}/practices/clinic-1/available-dates`).flush([]);
    await dates;
  });

  it.each([undefined, null, '', 'undefined', 'null'])('blocks availability requests for invalid identifier %s', (id) => {
    expect(() => api.availableDates(id as unknown as string)).toThrow('discovery.invalidPractice');
    expect(() => api.availableSlots(id as unknown as string, '2026-10-04')).toThrow('discovery.invalidPractice');
    expect(() => api.bookingOptions(id as unknown as string, '2026-10-04', '10:00')).toThrow('discovery.invalidPractice');
    http.expectNone((request) => request.url.includes('/practices/'));
  });

  it('reports malformed doctor practice data instead of returning an undefined booking ID', async () => {
    const details = firstValueFrom(api.doctor('doctor-1'));
    const rejected = expect(details).rejects.toThrow('discovery.invalidPractice');
    http.expectOne(`${url}/doctors/doctor-1`).flush({ doctorId: 'doctor-1', practices: [{ nameAr: 'Clinic' }] });
    await rejected;
  });

  it('loads anonymous specialization/search/details contracts with server pagination', async () => {
    const specializations = firstValueFrom(api.specializations());
    http.expectOne(`${url}/specializations`).flush([]);
    await specializations;
    const search = firstValueFrom(
      api.doctors({
        searchText: 'احمد',
        specializationId: 's-1',
        governorateId: 1,
        pageNumber: 2,
        pageSize: 20,
      }),
    );
    const request = http.expectOne((item) => item.url === `${url}/doctors`);
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('specializationId')).toBe('s-1');
    request.flush({ items: [], totalCount: 0, pageNumber: 2, pageSize: 20 });
    await search;
    const details = firstValueFrom(api.doctor('doctor/1'));
    http.expectOne(`${url}/doctors/doctor%2F1`).flush({ doctorId: 'doctor-1', practices: [] });
    await details;
  });

  it('loads only backend-provided dates, slots and booking options', async () => {
    const dates = firstValueFrom(api.availableDates('practice-1'));
    http
      .expectOne(`${url}/practices/practice-1/available-dates`)
      .flush([{ date: '2026-09-15', isAvailable: true }]);
    await dates;
    const slots = firstValueFrom(api.availableSlots('practice-1', '2026-09-15'));
    const slotRequest = http.expectOne(
      `${url}/practices/practice-1/available-slots?date=2026-09-15`,
    );
    expect(slotRequest.request.params.get('date')).toBe('2026-09-15');
    slotRequest.flush([{ date: '2026-09-15', time: '18:20:00' }]);
    await slots;
    const options = firstValueFrom(api.bookingOptions('practice-1', '2026-09-15', '18:20:00'));
    const optionsRequest = http.expectOne(
      (item) => item.url === `${url}/practices/practice-1/booking-options`,
    );
    expect(optionsRequest.request.params.get('time')).toBe('18:20:00');
    optionsRequest.flush({
      practiceId: 'practice-1',
      date: '2026-09-15',
      time: '18:20:00',
      visitTypes: [],
    });
    await options;
  });
});
