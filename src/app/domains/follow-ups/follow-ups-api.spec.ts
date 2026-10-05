import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FollowUpsApi } from './follow-ups-api';

describe('Phase 13 booking eligibility API', () => {
  let api: FollowUpsApi, http: HttpTestingController;
  const root = environment.apiBaseUrl + '/api/v1';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FollowUpsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('WAS-207 paginates and scopes dependent booking without requesting clinical records', () => {
    api.mine({ patientId: 'child', status: 'Available', pageNumber: 2, pageSize: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === root + '/follow-up-eligibilities/mine');
    expect(req.request.params.get('patientId')).toBe('child');
    expect(req.request.params.get('status')).toBe('Available');
    expect(req.request.params.get('pageNumber')).toBe('2');
    req.flush({});
  });
  it('WAS-208 reads latest eligibility and WAS-212 uses assigned practice patient path', () => {
    api.details('e').subscribe();
    http.expectOne(root + '/follow-up-eligibilities/mine/e').flush({});
    api.reception('p', 'u').subscribe();
    http.expectOne(root + '/reception/practices/p/patients/u/follow-up-eligibilities').flush([]);
  });
  it('WAS-209, WAS-210 and WAS-211 use eligibility-specific availability', () => {
    const url = root + '/reservations/follow-up-eligibilities/e';
    api.dates('e').subscribe();
    http.expectOne(url + '/available-dates').flush([]);
    api.slots('e', '2026-10-05').subscribe();
    const slots = http.expectOne((r) => r.url === url + '/available-slots');
    expect(slots.request.params.get('date')).toBe('2026-10-05');
    slots.flush([]);
    api.options('e', '2026-10-05', '18:00').subscribe();
    const options = http.expectOne((r) => r.url === url + '/booking-options');
    expect(options.request.params.get('time')).toBe('18:00');
    options.flush({});
  });
});
