export interface PublicSpecialization {
  id: string;
  nameAr: string;
  nameEn: string | null;
}
export interface PublicLocation {
  id: number;
  nameAr: string;
  nameEn?: string | null;
}
export interface PublicPracticeSummary {
  id: string;
  nameAr: string;
  nameEn: string | null;
  logoUrl: string | null;
  governorate: PublicLocation | null;
  city: PublicLocation | null;
  area: PublicLocation | null;
  detailedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  publicSearchPrice: number | null;
  nextAvailableSlotDate: string | null;
  nextAvailableSlotTime: string | null;
  isToday: boolean;
  isBookable: boolean;
  onlineBookingEnabled?: boolean;
  bookingDisabledReason?: string | null;
}
export interface PublicDoctorSearchItem {
  doctorId: string;
  profileImageUrl: string | null;
  nameAr: string;
  nameEn: string | null;
  specializations: PublicSpecialization[];
  practices: PublicPracticeSummary[];
}
export interface PublicDoctorSearchResponse {
  items: PublicDoctorSearchItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
export interface PublicQualification {
  id: string;
  nameAr: string;
  nameEn: string | null;
  displayOrder: number;
}
export interface PublicDoctorDetails extends PublicDoctorSearchItem {
  bio: string | null;
  qualifications: PublicQualification[];
}
/** Transport identifiers are normalized once before reaching booking UI. */
export interface PublicPracticeResponse extends Omit<PublicPracticeSummary, 'id'> {
  id?: string | null;
  practiceId?: string | null;
  doctorPracticeId?: string | null;
}
export interface PublicDoctorSearchItemResponse extends Omit<PublicDoctorSearchItem, 'practices'> {
  practices: PublicPracticeResponse[];
}
export interface PublicDoctorSearchResponseDto extends Omit<PublicDoctorSearchResponse, 'items'> {
  items: PublicDoctorSearchItemResponse[];
}
export interface PublicDoctorDetailsResponse extends Omit<PublicDoctorDetails, 'practices'> {
  practices: PublicPracticeResponse[];
}
export interface AvailableDate {
  date: string;
  isAvailable: boolean;
}
export interface AvailableSlot {
  date: string;
  time: string;
  slotDurationMinutes?: number;
}
export interface BookingSegmentOption {
  segmentId: string;
  nameAr: string;
  nameEn: string | null;
  price: number;
  isDefault: boolean;
}
export interface BookingVisitTypeOption {
  visitTypeId: string;
  type?: 'NewConsultation' | 'FollowUp';
  nameAr: string;
  nameEn: string | null;
  segments: BookingSegmentOption[];
}
export interface BookingOptions {
  practiceId: string;
  date: string;
  time: string;
  visitTypes: BookingVisitTypeOption[];
}

/** Backend booking collections are nullable when no combination is currently bookable. */
export interface BookingOptionsResponse {
  practiceId: string;
  date: string;
  time: string;
  /** Legacy shape used by public and follow-up booking endpoints. */
  visitTypes?: Array<{
    visitTypeId: string;
    type?: 'NewConsultation' | 'FollowUp';
    nameAr: string | null;
    nameEn: string | null;
    segments: Array<{
      segmentId: string;
      nameAr: string | null;
      nameEn: string | null;
      price: number;
      isDefault: boolean;
    }> | null;
  }> | null;
  /** Reception booking shape: each segment owns its available visit types and price. */
  segments?: Array<{
    segmentId: string;
    nameAr: string | null;
    nameEn: string | null;
    priority?: number | null;
    visitTypes: Array<{
      visitTypeId: string;
      visitTypeCode?: 'NewConsultation' | 'FollowUp' | string | null;
      visitTypeNameAr: string | null;
      visitTypeNameEn: string | null;
      price: number;
    }> | null;
  }> | null;
}

export function normalizeBookingOptions(response: BookingOptionsResponse): BookingOptions {
  if (response.segments) return normalizeSegmentBookingOptions(response);

  return {
    practiceId: response.practiceId,
    date: response.date,
    time: response.time,
    visitTypes: (response.visitTypes ?? []).map((visitType) => ({
      visitTypeId: visitType.visitTypeId,
      ...(visitType.type ? { type: visitType.type } : {}),
      nameAr: visitType.nameAr ?? '',
      nameEn: visitType.nameEn,
      segments: (visitType.segments ?? []).map((segment) => ({
        segmentId: segment.segmentId,
        nameAr: segment.nameAr ?? '',
        nameEn: segment.nameEn,
        price: segment.price,
        isDefault: segment.isDefault,
      })),
    })),
  };
}

function normalizeSegmentBookingOptions(response: BookingOptionsResponse): BookingOptions {
  const visitTypes = new Map<string, BookingVisitTypeOption>();
  const orderedSegments = [...(response.segments ?? [])].sort(
    (left, right) =>
      (left.priority ?? Number.MAX_SAFE_INTEGER) - (right.priority ?? Number.MAX_SAFE_INTEGER),
  );

  for (const segment of orderedSegments) {
    for (const visitType of segment.visitTypes ?? []) {
      const existing = visitTypes.get(visitType.visitTypeId);
      const normalizedSegment: BookingSegmentOption = {
        segmentId: segment.segmentId,
        nameAr: segment.nameAr ?? '',
        nameEn: segment.nameEn,
        price: visitType.price,
        isDefault: segment.priority === 0,
      };

      if (existing) {
        existing.segments.push(normalizedSegment);
        continue;
      }

      visitTypes.set(visitType.visitTypeId, {
        visitTypeId: visitType.visitTypeId,
        ...(isBookingVisitType(visitType.visitTypeCode) ? { type: visitType.visitTypeCode } : {}),
        nameAr: visitType.visitTypeNameAr ?? '',
        nameEn: visitType.visitTypeNameEn,
        segments: [normalizedSegment],
      });
    }
  }

  return {
    practiceId: response.practiceId,
    date: response.date,
    time: response.time,
    visitTypes: [...visitTypes.values()],
  };
}

function isBookingVisitType(
  value: string | null | undefined,
): value is 'NewConsultation' | 'FollowUp' {
  return value === 'NewConsultation' || value === 'FollowUp';
}
export interface PublicDoctorSearchQuery {
  searchText?: string;
  specializationId?: string;
  governorateId?: number;
  cityId?: number;
  areaId?: number;
  pageNumber: number;
  pageSize: number;
}
