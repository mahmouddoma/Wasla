import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DoctorPatientsApi } from './doctor-patients-api';

describe('DoctorPatientsApi contracts', () => {
  let api: DoctorPatientsApi;
  let http: HttpTestingController;
  const root = `${environment.apiBaseUrl}/api/v1/doctors/me`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DoctorPatientsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('MP-01 requests patients directory with search, filters and stable pagination anchor', () => {
    api
      .list({
        search: 'Ahmed',
        practiceId: 'prac-1',
        lastAttendanceFrom: '2026-10-01',
        lastAttendanceTo: '2026-10-28',
        minAttendanceCount: 2,
        hasUpcomingAppointment: true,
        practiceScope: 'active',
        pageNumber: 2,
        pageSize: 20,
        asOfUtc: '2026-10-28T08:00:00Z',
      })
      .subscribe();

    const req = http.expectOne((r) => r.url === `${root}/patients`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('search')).toBe('Ahmed');
    expect(req.request.params.get('practiceId')).toBe('prac-1');
    expect(req.request.params.get('lastAttendanceFrom')).toBe('2026-10-01');
    expect(req.request.params.get('lastAttendanceTo')).toBe('2026-10-28');
    expect(req.request.params.get('minAttendanceCount')).toBe('2');
    expect(req.request.params.get('hasUpcomingAppointment')).toBe('true');
    expect(req.request.params.get('practiceScope')).toBe('active');
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('20');
    expect(req.request.params.get('asOfUtc')).toBe('2026-10-28T08:00:00Z');
  });

  it('MP-02 requests patient overview by patientId', () => {
    api.overview('pat-1').subscribe();
    const req = http.expectOne(`${root}/patients/pat-1`);
    expect(req.request.method).toBe('GET');
  });

  it('MP-03 requests attendances for patient with filters', () => {
    api
      .attendances('pat-1', {
        practiceId: 'prac-1',
        status: 'Completed',
        pageNumber: 1,
        pageSize: 10,
      })
      .subscribe();

    const req = http.expectOne(
      (r) =>
        r.url === `${root}/patients/pat-1/attendances` &&
        r.params.get('practiceId') === 'prac-1' &&
        r.params.get('status') === 'Completed' &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '10',
    );
    expect(req.request.method).toBe('GET');
  });

  it('MP-04 requests diagnoses for patient', () => {
    api.diagnoses('pat-1', { pageNumber: 1, pageSize: 20 }).subscribe();
    const req = http.expectOne(
      (r) =>
        r.url === `${root}/patients/pat-1/diagnoses` &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '20',
    );
    expect(req.request.method).toBe('GET');
  });

  it('MP-05 requests prescriptions for patient', () => {
    api.prescriptions('pat-1', { pageNumber: 1, pageSize: 10 }).subscribe();
    const req = http.expectOne((r) => r.url === `${root}/patients/pat-1/prescriptions`);
    expect(req.request.method).toBe('GET');
  });

  it('MP-06 requests appointments for patient', () => {
    api.appointments('pat-1', { pageNumber: 1, pageSize: 10 }).subscribe();
    const req = http.expectOne((r) => r.url === `${root}/patients/pat-1/appointments`);
    expect(req.request.method).toBe('GET');
  });

  it('MP-07 requests follow-ups for patient', () => {
    api.followUps('pat-1', { pageNumber: 1, pageSize: 10 }).subscribe();
    const req = http.expectOne((r) => r.url === `${root}/patients/pat-1/follow-ups`);
    expect(req.request.method).toBe('GET');
  });

  it('MP-08 requests prescription PDF binary with disposition parameter', () => {
    api.prescriptionPdf('rx-1', 2, 'inline').subscribe();
    const req = http.expectOne(
      (r) =>
        r.url === `${root}/prescriptions/rx-1/versions/2/pdf` &&
        r.params.get('disposition') === 'inline',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
  });
});

