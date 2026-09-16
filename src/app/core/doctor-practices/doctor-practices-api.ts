import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateDoctorPracticePriceRequest,
  DoctorPractice,
  DoctorPracticeBranding,
  DoctorPracticeConfiguration,
  DoctorPracticeLogo,
  DoctorPracticePrice,
  DoctorPracticeResponse,
  DoctorPracticeSchedule,
  DoctorPracticeScheduleException,
  DoctorPracticeSchedulePeriod,
  DoctorPracticeSegment,
  DoctorPracticeVisitType,
  DoctorPracticeWriteRequest,
  EffectiveSchedulePeriod,
  RowVersionRequest,
  UpdateDoctorPracticeBrandingRequest,
  UpdateDoctorPracticeConfigurationRequest,
  UpdateDoctorPracticeRequest,
  UpdateDoctorPracticePriceRequest,
  UpdateDoctorPracticeSegmentRequest,
  UpdateDoctorPracticeVisitTypeRequest,
  UpdateScheduleExceptionRequest,
  UpdateSchedulePeriodRequest,
  WriteScheduleExceptionRequest,
  WriteSchedulePeriodRequest,
  WriteDoctorPracticeSegmentRequest,
} from './doctor-practice.models';
import { SKIP_ERROR_TOAST } from '../notifications/api-error-toast.interceptor';
import { EgyptLocationOption } from '../doctor-profile/doctor-profile.models';

@Injectable({ providedIn: 'root' })
export class DoctorPracticesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/doctors/me/practices`;

  list(): Observable<DoctorPractice[]> {
    return this.http
      .get<DoctorPracticeResponse[]>(this.url)
      .pipe(map((items) => items.map(normalizePractice)));
  }

  details(practiceId: string): Observable<DoctorPractice> {
    return this.http
      .get<DoctorPracticeResponse>(this.practiceUrl(practiceId))
      .pipe(map(normalizePractice));
  }

  create(request: DoctorPracticeWriteRequest): Observable<DoctorPractice> {
    return this.http.post<DoctorPracticeResponse>(this.url, request).pipe(map(normalizePractice));
  }

  update(practiceId: string, request: UpdateDoctorPracticeRequest): Observable<DoctorPractice> {
    return this.http
      .put<DoctorPracticeResponse>(this.practiceUrl(practiceId), request)
      .pipe(map(normalizePractice));
  }

  activate(practiceId: string, request: RowVersionRequest): Observable<DoctorPractice> {
    return this.http
      .post<DoctorPracticeResponse>(`${this.practiceUrl(practiceId)}/activate`, request)
      .pipe(map(normalizePractice));
  }

  deactivate(practiceId: string, request: RowVersionRequest): Observable<DoctorPractice> {
    return this.http
      .post<DoctorPracticeResponse>(`${this.practiceUrl(practiceId)}/deactivate`, request)
      .pipe(map(normalizePractice));
  }

  configuration(practiceId: string): Observable<DoctorPracticeConfiguration> {
    return this.http.get<DoctorPracticeConfiguration>(
      `${this.practiceUrl(practiceId)}/configuration`,
    );
  }

  updateConfiguration(
    practiceId: string,
    request: UpdateDoctorPracticeConfigurationRequest,
  ): Observable<DoctorPracticeConfiguration> {
    return this.http.put<DoctorPracticeConfiguration>(
      `${this.practiceUrl(practiceId)}/configuration`,
      request,
    );
  }

  branding(practiceId: string): Observable<DoctorPracticeBranding> {
    return this.http.get<DoctorPracticeBranding>(`${this.practiceUrl(practiceId)}/branding`);
  }

  logo(practiceId: string): Observable<DoctorPracticeLogo> {
    return this.http
      .get(`${this.practiceUrl(practiceId)}/branding/logo`, {
        observe: 'response',
        responseType: 'blob',
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .pipe(map(mapLogoResponse));
  }

  updateBranding(
    practiceId: string,
    request: UpdateDoctorPracticeBrandingRequest,
  ): Observable<DoctorPracticeBranding> {
    return this.http.put<DoctorPracticeBranding>(
      `${this.practiceUrl(practiceId)}/branding`,
      request,
    );
  }

  replaceLogo(practiceId: string, logo: File, rowVersion: string): Observable<void> {
    const body = new FormData();
    body.append('Logo', logo, logo.name);
    body.append('RowVersion', rowVersion);
    return this.http.post<void>(`${this.practiceUrl(practiceId)}/branding/logo`, body);
  }

  removeLogo(practiceId: string, request: RowVersionRequest): Observable<void> {
    return this.http.delete<void>(`${this.practiceUrl(practiceId)}/branding/logo`, {
      body: request,
    });
  }

  schedule(practiceId: string): Observable<DoctorPracticeSchedule> {
    return this.http.get<DoctorPracticeSchedule>(`${this.practiceUrl(practiceId)}/schedule`);
  }

  effectiveSchedule(practiceId: string, date: string): Observable<EffectiveSchedulePeriod[]> {
    return this.http.get<EffectiveSchedulePeriod[]>(
      `${this.practiceUrl(practiceId)}/schedule/effective`,
      { params: new HttpParams().set('date', date) },
    );
  }

  addPeriod(
    practiceId: string,
    request: WriteSchedulePeriodRequest,
  ): Observable<DoctorPracticeSchedulePeriod> {
    return this.http.post<DoctorPracticeSchedulePeriod>(
      `${this.practiceUrl(practiceId)}/schedule/periods`,
      request,
    );
  }

  updatePeriod(
    practiceId: string,
    periodId: string,
    request: UpdateSchedulePeriodRequest,
  ): Observable<DoctorPracticeSchedulePeriod> {
    return this.http.put<DoctorPracticeSchedulePeriod>(
      `${this.practiceUrl(practiceId)}/schedule/periods/${encodeURIComponent(periodId)}`,
      request,
    );
  }

  deletePeriod(practiceId: string, periodId: string, request: RowVersionRequest): Observable<void> {
    return this.http.delete<void>(
      `${this.practiceUrl(practiceId)}/schedule/periods/${encodeURIComponent(periodId)}`,
      { body: request },
    );
  }

  addException(
    practiceId: string,
    request: WriteScheduleExceptionRequest,
  ): Observable<DoctorPracticeScheduleException> {
    return this.http.post<DoctorPracticeScheduleException>(
      `${this.practiceUrl(practiceId)}/schedule/exceptions`,
      request,
    );
  }

  updateException(
    practiceId: string,
    exceptionId: string,
    request: UpdateScheduleExceptionRequest,
  ): Observable<DoctorPracticeScheduleException> {
    return this.http.put<DoctorPracticeScheduleException>(
      `${this.practiceUrl(practiceId)}/schedule/exceptions/${encodeURIComponent(exceptionId)}`,
      request,
    );
  }

  deleteException(
    practiceId: string,
    exceptionId: string,
    request: RowVersionRequest,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.practiceUrl(practiceId)}/schedule/exceptions/${encodeURIComponent(exceptionId)}`,
      { body: request },
    );
  }

  segments(practiceId: string): Observable<DoctorPracticeSegment[]> {
    return this.http.get<DoctorPracticeSegment[]>(`${this.practiceUrl(practiceId)}/segments`);
  }

  addSegment(
    practiceId: string,
    request: WriteDoctorPracticeSegmentRequest,
  ): Observable<DoctorPracticeSegment> {
    return this.http.post<DoctorPracticeSegment>(
      `${this.practiceUrl(practiceId)}/segments`,
      request,
    );
  }

  updateSegment(
    practiceId: string,
    segmentId: string,
    request: UpdateDoctorPracticeSegmentRequest,
  ): Observable<DoctorPracticeSegment> {
    return this.http.put<DoctorPracticeSegment>(
      `${this.practiceUrl(practiceId)}/segments/${encodeURIComponent(segmentId)}`,
      request,
    );
  }

  visitTypes(practiceId: string): Observable<DoctorPracticeVisitType[]> {
    return this.http.get<DoctorPracticeVisitType[]>(`${this.practiceUrl(practiceId)}/visit-types`);
  }

  updateVisitType(
    practiceId: string,
    visitTypeId: string,
    request: UpdateDoctorPracticeVisitTypeRequest,
  ): Observable<DoctorPracticeVisitType> {
    return this.http.put<DoctorPracticeVisitType>(
      `${this.practiceUrl(practiceId)}/visit-types/${encodeURIComponent(visitTypeId)}`,
      request,
    );
  }

  prices(practiceId: string): Observable<DoctorPracticePrice[]> {
    return this.http.get<DoctorPracticePrice[]>(`${this.practiceUrl(practiceId)}/prices`);
  }

  addPrice(
    practiceId: string,
    request: CreateDoctorPracticePriceRequest,
  ): Observable<DoctorPracticePrice> {
    return this.http.post<DoctorPracticePrice>(`${this.practiceUrl(practiceId)}/prices`, request);
  }

  updatePrice(
    practiceId: string,
    priceId: string,
    request: UpdateDoctorPracticePriceRequest,
  ): Observable<DoctorPracticePrice> {
    return this.http.put<DoctorPracticePrice>(
      `${this.practiceUrl(practiceId)}/prices/${encodeURIComponent(priceId)}`,
      request,
    );
  }

  deletePrice(practiceId: string, priceId: string, request: RowVersionRequest): Observable<void> {
    return this.http.delete<void>(
      `${this.practiceUrl(practiceId)}/prices/${encodeURIComponent(priceId)}`,
      { body: request },
    );
  }

  private practiceUrl(practiceId: string): string {
    return `${this.url}/${encodeURIComponent(practiceId)}`;
  }
}

function mapLogoResponse(response: HttpResponse<Blob>): DoctorPracticeLogo {
  const disposition = response.headers.get('content-disposition') ?? '';
  const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plainName = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  return {
    blob: response.body ?? new Blob(),
    contentType:
      response.headers.get('content-type') ?? response.body?.type ?? 'application/octet-stream',
    fileName: encodedName ? decodeURIComponent(encodedName) : (plainName ?? null),
  };
}

function normalizePractice(item: DoctorPracticeResponse): DoctorPractice {
  const location = item.location ?? {};
  return {
    id: item.id,
    nameAr: item.nameAr,
    nameEn: item.nameEn ?? null,
    location: {
      governorate:
        locationOption(
          location.governorateId,
          location.governorateNameAr,
          location.governorateNameEn,
        ) ??
        location.governorate ??
        item.governorate ??
        null,
      city:
        locationOption(location.cityId, location.cityNameAr, location.cityNameEn) ??
        location.city ??
        item.city ??
        null,
      area:
        locationOption(location.areaId, location.areaNameAr, location.areaNameEn) ??
        location.area ??
        item.area ??
        null,
      detailedAddress: location.detailedAddress ?? item.detailedAddress ?? '',
      latitude: location.latitude ?? item.latitude ?? null,
      longitude: location.longitude ?? item.longitude ?? null,
    },
    isActive: item.isActive,
    hasLogo: item.hasLogo,
    rowVersion: item.rowVersion,
  };
}

function locationOption(
  id: number | null | undefined,
  nameAr: string | null | undefined,
  nameEn: string | null | undefined,
): EgyptLocationOption | null {
  return id == null ? null : { id, nameAr: nameAr ?? '', nameEn: nameEn ?? '' };
}
