export type ReservationActor = 'Patient' | 'Reception' | 'Doctor' | 'Admin';
export interface ReservationScope {
  actor: ReservationActor;
  practiceId?: string;
}
export interface ReservationLabel {
  code: string;
  nameAr: string;
  nameEn: string | null;
  requiresComment?: boolean;
}
export interface ReservationMetadata {
  statuses: ReservationLabel[];
  bookingSources: ReservationLabel[];
  patientCancellationReasons: ReservationLabel[];
  providerCancellationReasons: ReservationLabel[];
  maximumAdvanceBookingDays: number;
  maxPatientReschedulesPerReservation: number;
}
export interface ReservationFilterOptions {
  statuses: ReservationLabel[];
  bookingSources: ReservationLabel[];
  segments: { id: string; nameAr: string; nameEn: string | null; isActive?: boolean }[];
}
export interface BookablePatient {
  patientId: string;
  nameAr: string;
  nameEn: string | null;
  dateOfBirth: string;
  gender: string;
  isSelf: boolean;
  relationshipType: string | null;
}
export interface ReservationIdentity {
  id?: string;
  nameAr: string;
  nameEn: string | null;
  phoneNumber?: string | null;
}
export interface ReservationAppointment {
  businessDate: string;
  slotStartTime: string;
  scheduledTime?: string;
  appointmentStartUtc?: string;
  appointmentEndUtc?: string;
  durationMinutes?: number;
  timeZoneId?: string;
}
export interface ReservationCapabilities {
  canCancel: boolean;
  canReschedule: boolean;
  canRestoreFromNoShow: boolean;
  cancelBlockedReason?: string | null;
  rescheduleBlockedReason?: string | null;
  restoreBlockedReason?: string | null;
  patientCancellationCutoffUtc?: string | null;
  remainingPatientReschedules?: number;
}
export interface ReservationTimelineEvent {
  id?: string;
  occurredOnUtc: string;
  nameAr?: string;
  nameEn?: string | null;
  eventType?: string;
  description?: string | null;
  reason?: string | null;
}
/** Operational projection only; this model deliberately has no clinical record fields. */
export interface Reservation {
  reservationId: string;
  reference: string;
  status: string;
  isLate: boolean;
  patient: ReservationIdentity;
  doctor: ReservationIdentity;
  practice: ReservationIdentity;
  doctorPracticeId: string;
  appointment: ReservationAppointment;
  segment?: ReservationIdentity;
  visitType?: ReservationIdentity;
  price?: number;
  currency?: string;
  bookingSource?: string;
  bookingNote?: string | null;
  createdOnUtc?: string;
  cancelledOnUtc?: string | null;
  cancellationReason?: string | null;
  capabilities: ReservationCapabilities;
  timeline: ReservationTimelineEvent[];
  rowVersion: string;
}
export interface ReservationPage {
  items: Reservation[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  summary?: Readonly<Record<string, number>>;
}
export interface ReservationQuery {
  patientId?: string;
  view?: 'Upcoming' | 'History' | 'All';
  fromDate?: string;
  toDate?: string;
  status?: string;
  segmentId?: string;
  bookingSource?: string;
  isLate?: boolean;
  search?: string;
  doctorId?: string;
  practiceId?: string;
  pageNumber: number;
  pageSize: number;
}
export interface CreateReservationRequest {
  patientId: string;
  businessDate: string;
  slotStartTime: string;
  segmentId: string;
  visitTypeId: string;
  bookingNote: string | null;
}
export interface CreatePatientReservationRequest extends CreateReservationRequest {
  doctorPracticeId: string;
}
export interface CancelReservationRequest {
  reasonCode: string;
  comment: string | null;
  rowVersion: string;
}
export interface RescheduleReservationRequest {
  businessDate: string;
  slotStartTime: string;
  rowVersion: string;
}
export interface ProviderRescheduleRequest extends RescheduleReservationRequest {
  patientConsentConfirmed: true;
  reason: string;
}
export interface AffectedReservation {
  reservationId: string;
  reference: string;
  patientNameAr?: string;
  patientNameEn?: string | null;
  businessDate: string;
  scheduledTime: string;
}
export interface ReservationConflict {
  affectedReservationsCount: number;
  affectedReservations: AffectedReservation[];
}
