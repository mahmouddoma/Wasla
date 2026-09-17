import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DoctorPracticeResponse,
  UpdateDoctorPracticeConfigurationRequest,
  UpdateDoctorPracticeRequest,
  UpdateScheduleExceptionRequest,
  UpdateSchedulePeriodRequest,
  WriteScheduleExceptionRequest,
  WriteSchedulePeriodRequest,
} from './doctor-practice.models';
import { DoctorPracticesApi } from './doctor-practices-api';

describe('DoctorPracticesApi', () => {
  let api: DoctorPracticesApi;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/v1/doctors/me/practices`;
  const practice = practiceResponse();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DoctorPracticesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps flat location identifiers and bilingual names from the details response', async () => {
    const result = firstValueFrom(api.details('practice-1'));
    http.expectOne(`${url}/practice-1`).flush({
      ...practice,
      location: {
        governorateId: 1,
        governorateNameAr: 'القاهرة',
        governorateNameEn: 'Cairo',
        cityId: 1028,
        cityNameAr: 'قسم مصرالجديدة',
        cityNameEn: 'Misr al-Gadida',
        areaId: 10280003,
        areaNameAr: 'المنتزة',
        areaNameEn: 'Al-Montazah',
        detailedAddress: '٢٤ شارع الخليفة المأمون',
        latitude: 30.0876,
        longitude: 31.309,
      },
    });

    expect((await result).location).toEqual({
      governorate: { id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' },
      city: { id: 1028, nameAr: 'قسم مصرالجديدة', nameEn: 'Misr al-Gadida' },
      area: { id: 10280003, nameAr: 'المنتزة', nameEn: 'Al-Montazah' },
      detailedAddress: '٢٤ شارع الخليفة المأمون',
      latitude: 30.0876,
      longitude: 31.309,
    });
  });

  it('loads the list and authoritative details endpoint', async () => {
    const listResult = firstValueFrom(api.list());
    http.expectOne(url).flush([practice, { ...practice, id: 'practice-2', rowVersion: 'BAUG' }]);
    expect((await listResult).map((item) => item.rowVersion)).toEqual(['AQID', 'BAUG']);

    const detailsResult = firstValueFrom(api.details('practice/1'));
    const details = http.expectOne(`${url}/practice%2F1`);
    expect(details.request.method).toBe('GET');
    details.flush(practice);
    expect((await detailsResult).location.detailedAddress).toBe('القاهرة');
  });

  it('creates and updates a practice with location and latest rowVersion', async () => {
    const writeRequest = {
      nameAr: 'عيادة القلب',
      nameEn: 'Cardiology',
      governorateId: 1,
      cityId: 1001,
      areaId: 10010001,
      detailedAddress: 'القاهرة',
      latitude: 30,
      longitude: 31,
    };
    const createResult = firstValueFrom(api.create(writeRequest));
    const create = http.expectOne(url);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(writeRequest);
    create.flush(practice, { status: 201, statusText: 'Created' });
    await createResult;

    const updateRequest: UpdateDoctorPracticeRequest = { ...writeRequest, rowVersion: 'AQID' };
    const updateResult = firstValueFrom(api.update('practice-1', updateRequest));
    const update = http.expectOne(`${url}/practice-1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.rowVersion).toBe('AQID');
    update.flush({ ...practice, rowVersion: 'BAUG' });
    await updateResult;
  });

  it('activates and deactivates with the current practice rowVersion', async () => {
    const activateResult = firstValueFrom(api.activate('practice-1', { rowVersion: 'AQID' }));
    const activate = http.expectOne(`${url}/practice-1/activate`);
    expect(activate.request.method).toBe('POST');
    expect(activate.request.body).toEqual({ rowVersion: 'AQID' });
    activate.flush({ ...practice, isActive: true, rowVersion: 'BAUG' });
    await activateResult;

    const deactivateResult = firstValueFrom(api.deactivate('practice-1', { rowVersion: 'BAUG' }));
    const deactivate = http.expectOne(`${url}/practice-1/deactivate`);
    expect(deactivate.request.method).toBe('POST');
    expect(deactivate.request.body).toEqual({ rowVersion: 'BAUG' });
    deactivate.flush({ ...practice, isActive: false, rowVersion: 'CAkK' });
    await deactivateResult;
  });

  it('loads and updates independent practice configuration', async () => {
    const configuration: UpdateDoctorPracticeConfigurationRequest = {
      allowOnlineBooking: true,
      allowWalkIn: false,
      defaultSlotDurationMinutes: 30,
      checkInGracePeriodMinutes: 10,
      patientSelfCancellationCutoffMinutes: 120,
      maximumDailyPatients: null,
      maximumTicketCallAttempts: 3,
      noShowAfterPassedPatientsCount: 3,
      timeZoneId: 'Africa/Cairo',
      rowVersion: 'AQID',
    };
    const loadResult = firstValueFrom(api.configuration('practice-1'));
    http.expectOne(`${url}/practice-1/configuration`).flush(configuration);
    expect((await loadResult).maximumDailyPatients).toBeNull();

    const updateResult = firstValueFrom(api.updateConfiguration('practice-1', configuration));
    const update = http.expectOne(`${url}/practice-1/configuration`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.rowVersion).toBe('AQID');
    update.flush({ ...configuration, rowVersion: 'BAUG' });
    await updateResult;
  });

  it('loads branding and removes the logo with a DELETE body', async () => {
    const branding = {
      id: 'branding-1',
      doctorPracticeId: 'practice-1',
      hasLogo: true,
      primaryColor: '#008b8b',
      secondaryColor: '#0b3558',
      backgroundColor: '#ffffff',
      textColor: '#102a43',
      rowVersion: 'AQID',
    };
    const loadResult = firstValueFrom(api.branding('practice-1'));
    http.expectOne(`${url}/practice-1/branding`).flush(branding);
    expect((await loadResult).hasLogo).toBe(true);

    const removeResult = firstValueFrom(api.removeLogo('practice-1', { rowVersion: 'AQID' }));
    const remove = http.expectOne(`${url}/practice-1/branding/logo`);
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.body).toEqual({ rowVersion: 'AQID' });
    remove.flush(null);
    await removeResult;
  });

  it('loads the authenticated logo and updates branding/logo with latest rowVersion', async () => {
    const logoResult = firstValueFrom(api.logo('practice-1'));
    const logo = http.expectOne(`${url}/practice-1/branding/logo`);
    expect(logo.request.responseType).toBe('blob');
    logo.flush(new Blob(['logo'], { type: 'image/png' }), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="logo.png"',
      },
    });
    expect((await logoResult).fileName).toBe('logo.png');

    const brandingBody = {
      primaryColor: '#008C8C',
      secondaryColor: null,
      backgroundColor: '#FFFFFF',
      textColor: '#102A43',
      rowVersion: 'AQID',
    };
    const updateResult = firstValueFrom(api.updateBranding('practice-1', brandingBody));
    const update = http.expectOne(`${url}/practice-1/branding`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual(brandingBody);
    update.flush({
      id: 'branding-1',
      doctorPracticeId: 'practice-1',
      hasLogo: false,
      ...brandingBody,
      rowVersion: 'BAUG',
    });
    await updateResult;

    const file = new File(['logo'], 'new-logo.png', { type: 'image/png' });
    const uploadResult = firstValueFrom(api.replaceLogo('practice-1', file, 'BAUG'));
    const upload = http.expectOne(`${url}/practice-1/branding/logo`);
    expect(upload.request.method).toBe('POST');
    const uploadedFile = upload.request.body.get('Logo') as File;
    expect(uploadedFile.name).toBe(file.name);
    expect(uploadedFile.type).toBe(file.type);
    expect(upload.request.body.get('RowVersion')).toBe('BAUG');
    upload.flush(null);
    await uploadResult;
  });

  it('loads raw and effective schedules', async () => {
    const loadResult = firstValueFrom(api.schedule('practice-1'));
    http.expectOne(`${url}/practice-1/schedule`).flush({ periods: [], exceptions: [] });
    await loadResult;

    const effectiveResult = firstValueFrom(api.effectiveSchedule('practice-1', '2026-09-15'));
    const effective = http.expectOne(
      (request) =>
        request.url === `${url}/practice-1/schedule/effective` &&
        request.params.get('date') === '2026-09-15',
    );
    expect(effective.request.method).toBe('GET');
    effective.flush([]);
    await effectiveResult;
  });

  it('creates, updates and deletes recurring schedule periods', async () => {
    const createRequest: WriteSchedulePeriodRequest = {
      dayOfWeek: 'Sunday',
      startTime: '09:00',
      endTime: '12:00',
      slotDurationMinutes: 30,
    };
    const createResult = firstValueFrom(api.addPeriod('practice-1', createRequest));
    const create = http.expectOne(`${url}/practice-1/schedule/periods`);
    expect(create.request.method).toBe('POST');
    create.flush({ id: 'period-1', ...createRequest, rowVersion: 'AQID' });
    await createResult;

    const updateRequest: UpdateSchedulePeriodRequest = { ...createRequest, rowVersion: 'AQID' };
    const updateResult = firstValueFrom(api.updatePeriod('practice-1', 'period-1', updateRequest));
    const update = http.expectOne(`${url}/practice-1/schedule/periods/period-1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.rowVersion).toBe('AQID');
    update.flush({ id: 'period-1', ...updateRequest, rowVersion: 'BAUG' });
    await updateResult;

    const deleteResult = firstValueFrom(
      api.deletePeriod('practice-1', 'period-1', { rowVersion: 'BAUG' }),
    );
    const remove = http.expectOne(`${url}/practice-1/schedule/periods/period-1`);
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.body).toEqual({ rowVersion: 'BAUG' });
    remove.flush(null);
    await deleteResult;
  });

  it('creates, updates and deletes date-specific schedule exceptions', async () => {
    const createRequest: WriteScheduleExceptionRequest = {
      date: '2026-09-20',
      type: 'DayOff',
      startTime: null,
      endTime: null,
      slotDurationMinutes: null,
    };
    const createResult = firstValueFrom(api.addException('practice-1', createRequest));
    const create = http.expectOne(`${url}/practice-1/schedule/exceptions`);
    expect(create.request.method).toBe('POST');
    create.flush({ id: 'exception-1', ...createRequest, rowVersion: 'AQID' });
    await createResult;

    const updateRequest: UpdateScheduleExceptionRequest = { ...createRequest, rowVersion: 'AQID' };
    const updateResult = firstValueFrom(
      api.updateException('practice-1', 'exception-1', updateRequest),
    );
    const update = http.expectOne(`${url}/practice-1/schedule/exceptions/exception-1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.rowVersion).toBe('AQID');
    update.flush({ id: 'exception-1', ...updateRequest, rowVersion: 'BAUG' });
    await updateResult;

    const deleteResult = firstValueFrom(
      api.deleteException('practice-1', 'exception-1', { rowVersion: 'BAUG' }),
    );
    const remove = http.expectOne(`${url}/practice-1/schedule/exceptions/exception-1`);
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.body).toEqual({ rowVersion: 'BAUG' });
    remove.flush(null);
    await deleteResult;
  });

  it('loads practice segments without transforming quotas or rowVersions', async () => {
    const result = firstValueFrom(api.segments('practice-1'));
    const request = http.expectOne(`${url}/practice-1/segments`);
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'segment-1',
        nameAr: 'عادي',
        nameEn: 'Normal',
        priority: 0,
        reservedDailyQuota: null,
        quotaReleaseBeforeMinutes: null,
        isDefault: true,
        isActive: true,
        rowVersion: 'AQID',
      },
    ]);
    expect((await result)[0].rowVersion).toBe('AQID');
  });

  it('creates and updates segments, visit types and prices without durationMinutes', async () => {
    const segmentBody = {
      nameAr: 'VIP',
      nameEn: 'VIP',
      priority: 2,
      reservedDailyQuota: 3,
      quotaReleaseBeforeMinutes: 60,
    };
    const addSegment = firstValueFrom(api.addSegment('practice-1', segmentBody));
    http.expectOne(`${url}/practice-1/segments`).flush({
      id: 'segment-2',
      ...segmentBody,
      isDefault: false,
      isActive: true,
      rowVersion: 'AQID',
    });
    await addSegment;
    const updateSegment = firstValueFrom(
      api.updateSegment('practice-1', 'segment-2', {
        ...segmentBody,
        isActive: false,
        rowVersion: 'AQID',
      }),
    );
    const segmentUpdateRequest = http.expectOne(`${url}/practice-1/segments/segment-2`);
    expect(segmentUpdateRequest.request.method).toBe('PUT');
    segmentUpdateRequest.flush({});
    await updateSegment;

    const visitTypes = firstValueFrom(api.visitTypes('practice-1'));
    http.expectOne(`${url}/practice-1/visit-types`).flush([]);
    await visitTypes;
    const visitBody = {
      nameAr: 'كشف جديد',
      nameEn: 'New consultation',
      isActive: true,
      rowVersion: 'AQID',
    };
    const updateVisit = firstValueFrom(api.updateVisitType('practice-1', 'visit-1', visitBody));
    const visitRequest = http.expectOne(`${url}/practice-1/visit-types/visit-1`);
    expect(visitRequest.request.body.durationMinutes).toBeUndefined();
    visitRequest.flush({ id: 'visit-1', type: 'NewConsultation', ...visitBody });
    await updateVisit;

    const prices = firstValueFrom(api.prices('practice-1'));
    http.expectOne(`${url}/practice-1/prices`).flush([]);
    await prices;
    const addPrice = firstValueFrom(
      api.addPrice('practice-1', { segmentId: 'segment-1', visitTypeId: 'visit-1', price: 300 }),
    );
    http.expectOne(`${url}/practice-1/prices`).flush({ id: 'price-1', rowVersion: 'AQID' });
    await addPrice;
    const updatePrice = firstValueFrom(
      api.updatePrice('practice-1', 'price-1', { price: 350, rowVersion: 'AQID' }),
    );
    http.expectOne(`${url}/practice-1/prices/price-1`).flush({});
    await updatePrice;
    const deletePrice = firstValueFrom(
      api.deletePrice('practice-1', 'price-1', { rowVersion: 'BAUG' }),
    );
    const deleteRequest = http.expectOne(`${url}/practice-1/prices/price-1`);
    expect(deleteRequest.request.body).toEqual({ rowVersion: 'BAUG' });
    deleteRequest.flush(null);
    await deletePrice;
  });
});

function practiceResponse(): DoctorPracticeResponse {
  return {
    id: 'practice-1',
    nameAr: 'عيادة القلب',
    nameEn: 'Cardiology',
    location: {
      governorate: { id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' },
      city: { id: 1001, nameAr: 'القاهرة', nameEn: 'Cairo' },
      area: { id: 10010001, nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
      detailedAddress: 'القاهرة',
      latitude: 30,
      longitude: 31,
    },
    isActive: false,
    hasLogo: true,
    rowVersion: 'AQID',
  };
}
