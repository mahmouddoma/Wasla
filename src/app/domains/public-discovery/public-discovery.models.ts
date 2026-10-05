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
export interface PublicDoctorSearchQuery {
  searchText?: string;
  specializationId?: string;
  governorateId?: number;
  cityId?: number;
  areaId?: number;
  pageNumber: number;
  pageSize: number;
}
