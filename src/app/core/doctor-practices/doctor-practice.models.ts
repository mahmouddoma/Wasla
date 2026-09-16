import { EgyptLocationOption } from '../doctor-profile/doctor-profile.models';

export interface DoctorPracticeLocationSummary {
  governorate: EgyptLocationOption | null;
  city: EgyptLocationOption | null;
  area: EgyptLocationOption | null;
  detailedAddress: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DoctorPractice {
  id: string;
  nameAr: string;
  nameEn: string | null;
  location: DoctorPracticeLocationSummary;
  isActive: boolean;
  hasLogo: boolean;
  rowVersion: string;
}

export interface DoctorPracticeLocationResponse extends Partial<DoctorPracticeLocationSummary> {
  governorateId?: number | null;
  governorateNameAr?: string | null;
  governorateNameEn?: string | null;
  cityId?: number | null;
  cityNameAr?: string | null;
  cityNameEn?: string | null;
  areaId?: number | null;
  areaNameAr?: string | null;
  areaNameEn?: string | null;
}

export interface DoctorPracticeResponse {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  location?: DoctorPracticeLocationResponse | null;
  governorate?: EgyptLocationOption | null;
  city?: EgyptLocationOption | null;
  area?: EgyptLocationOption | null;
  detailedAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  hasLogo: boolean;
  rowVersion: string;
}

export interface DoctorPracticeWriteRequest {
  nameAr: string;
  nameEn: string | null;
  governorateId: number;
  cityId: number;
  areaId: number;
  detailedAddress: string;
  latitude: number;
  longitude: number;
}

export interface UpdateDoctorPracticeRequest extends DoctorPracticeWriteRequest {
  rowVersion: string;
}

export interface RowVersionRequest {
  rowVersion: string;
}

export interface DoctorPracticeConfiguration {
  allowOnlineBooking: boolean;
  allowWalkIn: boolean;
  defaultSlotDurationMinutes: number;
  checkInGracePeriodMinutes: number;
  patientSelfCancellationCutoffMinutes: number;
  maximumDailyPatients: number | null;
  maximumTicketCallAttempts: number;
  timeZoneId: string;
  rowVersion: string;
}

export type UpdateDoctorPracticeConfigurationRequest = DoctorPracticeConfiguration;

export interface DoctorPracticeBranding {
  id: string;
  doctorPracticeId: string;
  hasLogo: boolean;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  rowVersion: string;
}

export interface DoctorPracticeLogo {
  blob: Blob;
  contentType: string;
  fileName: string | null;
}

export interface UpdateDoctorPracticeBrandingRequest {
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  rowVersion: string;
}

export type PracticeDayOfWeek =
  'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface DoctorPracticeSchedulePeriod {
  id: string;
  dayOfWeek: PracticeDayOfWeek;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  rowVersion: string;
}

export interface WriteSchedulePeriodRequest {
  dayOfWeek: PracticeDayOfWeek;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface UpdateSchedulePeriodRequest extends WriteSchedulePeriodRequest {
  rowVersion: string;
}

export type ScheduleExceptionType =
  'DayOff' | 'Vacation' | 'CustomWorkingHours' | 'BlockedTimeRange';

export interface DoctorPracticeScheduleException {
  id: string;
  date: string;
  type: ScheduleExceptionType;
  startTime: string | null;
  endTime: string | null;
  slotDurationMinutes: number | null;
  rowVersion: string;
}

export interface WriteScheduleExceptionRequest {
  date: string;
  type: ScheduleExceptionType;
  startTime: string | null;
  endTime: string | null;
  slotDurationMinutes: number | null;
}

export interface UpdateScheduleExceptionRequest extends WriteScheduleExceptionRequest {
  rowVersion: string;
}

export interface DoctorPracticeSchedule {
  periods: DoctorPracticeSchedulePeriod[];
  exceptions: DoctorPracticeScheduleException[];
}

export interface EffectiveSchedulePeriod {
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  slotStarts: string[];
}

export interface DoctorPracticeSegment {
  id: string;
  nameAr: string;
  nameEn: string | null;
  priority: number;
  reservedDailyQuota: number | null;
  quotaReleaseBeforeMinutes: number | null;
  isDefault: boolean;
  isActive: boolean;
  rowVersion: string;
}

export interface WriteDoctorPracticeSegmentRequest {
  nameAr: string;
  nameEn: string | null;
  priority: number;
  reservedDailyQuota: number | null;
  quotaReleaseBeforeMinutes: number | null;
}

export interface UpdateDoctorPracticeSegmentRequest extends WriteDoctorPracticeSegmentRequest {
  isActive: boolean;
  rowVersion: string;
}

export type DoctorPracticeVisitTypeCode = 'NewConsultation' | 'FollowUp';

export interface DoctorPracticeVisitType {
  id: string;
  type: DoctorPracticeVisitTypeCode;
  nameAr: string;
  nameEn: string | null;
  isActive: boolean;
  rowVersion: string;
}

export interface UpdateDoctorPracticeVisitTypeRequest {
  nameAr: string;
  nameEn: string | null;
  isActive: boolean;
  rowVersion: string;
}

export interface DoctorPracticePrice {
  id: string;
  segmentId: string;
  visitTypeId: string;
  price: number;
  rowVersion: string;
}

export interface CreateDoctorPracticePriceRequest {
  segmentId: string;
  visitTypeId: string;
  price: number;
}

export interface UpdateDoctorPracticePriceRequest {
  price: number;
  rowVersion: string;
}
