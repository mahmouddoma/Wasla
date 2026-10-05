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
  followUpEligibilityId?: string | null;
  followUpEligibilityStatus?: string | null;
  followUpValidUntil?: string | null;
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
  followUpEligibilityId?: string;
  followUpEligibilityRowVersion?: string;
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

export function normalizeReservation(raw: unknown): Reservation {
  if (!raw || typeof raw !== 'object') return raw as Reservation;
  const r = raw as Record<string, unknown>;

  const reference =
    (r['reference'] as string) || (r['reservationReference'] as string) || '';

  const patientRaw = r['patient'] as Record<string, unknown> | undefined;
  const patient: ReservationIdentity = patientRaw
    ? {
        id: patientRaw['id'] as string | undefined,
        nameAr: (patientRaw['nameAr'] as string) || '',
        nameEn: (patientRaw['nameEn'] as string) || null,
        phoneNumber: (patientRaw['phoneNumber'] as string) || null,
      }
    : {
        id: (r['patientId'] as string) || undefined,
        nameAr: (r['patientNameAr'] as string) || '',
        nameEn: (r['patientNameEn'] as string) || null,
        phoneNumber:
          (r['patientPhoneNumber'] as string) || (r['phoneNumber'] as string) || null,
      };

  const doctorRaw = r['doctor'] as Record<string, unknown> | undefined;
  const doctor: ReservationIdentity = doctorRaw
    ? {
        id: doctorRaw['id'] as string | undefined,
        nameAr: (doctorRaw['nameAr'] as string) || '',
        nameEn: (doctorRaw['nameEn'] as string) || null,
      }
    : {
        id: (r['doctorId'] as string) || undefined,
        nameAr: (r['doctorNameAr'] as string) || '',
        nameEn: (r['doctorNameEn'] as string) || null,
      };

  const practiceRaw = r['practice'] as Record<string, unknown> | undefined;
  const practice: ReservationIdentity = practiceRaw
    ? {
        id: practiceRaw['id'] as string | undefined,
        nameAr: (practiceRaw['nameAr'] as string) || '',
        nameEn: (practiceRaw['nameEn'] as string) || null,
      }
    : {
        id:
          (r['doctorPracticeId'] as string) ||
          (r['practiceId'] as string) ||
          undefined,
        nameAr: (r['practiceNameAr'] as string) || '',
        nameEn: (r['practiceNameEn'] as string) || null,
      };

  const apptRaw = r['appointment'] as Record<string, unknown> | undefined;
  const businessDate =
    (apptRaw?.['businessDate'] as string) || (r['businessDate'] as string) || '';
  const slotStartTime =
    (apptRaw?.['slotStartTime'] as string) ||
    (r['localTime'] as string) ||
    (r['slotStartTime'] as string) ||
    '';
  const scheduledTime =
    (apptRaw?.['scheduledTime'] as string) ||
    (r['scheduledTime'] as string) ||
    slotStartTime;

  const appointment: ReservationAppointment = {
    businessDate,
    slotStartTime,
    scheduledTime,
    appointmentStartUtc:
      (apptRaw?.['appointmentStartUtc'] as string) ||
      (r['appointmentStartUtc'] as string) ||
      undefined,
    appointmentEndUtc:
      (apptRaw?.['appointmentEndUtc'] as string) ||
      (r['appointmentEndUtc'] as string) ||
      undefined,
    durationMinutes:
      (apptRaw?.['durationMinutes'] as number) ||
      (r['durationMinutes'] as number) ||
      undefined,
    timeZoneId:
      (apptRaw?.['timeZoneId'] as string) ||
      (r['timeZoneId'] as string) ||
      undefined,
  };

  const segRaw = r['segment'] as Record<string, unknown> | undefined;
  const segment: ReservationIdentity | undefined = segRaw
    ? {
        id: segRaw['id'] as string | undefined,
        nameAr: (segRaw['nameAr'] as string) || '',
        nameEn: (segRaw['nameEn'] as string) || null,
      }
    : r['segmentNameAr']
      ? {
          id: (r['segmentId'] as string) || undefined,
          nameAr: (r['segmentNameAr'] as string) || '',
          nameEn: (r['segmentNameEn'] as string) || null,
        }
      : undefined;

  const vtRaw = r['visitType'] as Record<string, unknown> | undefined;
  const visitType: ReservationIdentity | undefined = vtRaw
    ? {
        id: vtRaw['id'] as string | undefined,
        nameAr: (vtRaw['nameAr'] as string) || '',
        nameEn: (vtRaw['nameEn'] as string) || null,
      }
    : r['visitTypeNameAr']
      ? {
          id: (r['visitTypeId'] as string) || undefined,
          nameAr: (r['visitTypeNameAr'] as string) || '',
          nameEn: (r['visitTypeNameEn'] as string) || null,
        }
      : undefined;

  const capRaw = r['capabilities'] as Record<string, unknown> | undefined;
  const capabilities: ReservationCapabilities = capRaw
    ? {
        canCancel: Boolean(capRaw['canCancel']),
        canReschedule: Boolean(capRaw['canReschedule']),
        canRestoreFromNoShow: Boolean(capRaw['canRestoreFromNoShow']),
        cancelBlockedReason: (capRaw['cancelBlockedReason'] as string) || null,
        rescheduleBlockedReason:
          (capRaw['rescheduleBlockedReason'] as string) || null,
        restoreBlockedReason: (capRaw['restoreBlockedReason'] as string) || null,
        patientCancellationCutoffUtc:
          (capRaw['patientCancellationCutoffUtc'] as string) || null,
        remainingPatientReschedules:
          typeof capRaw['remainingPatientReschedules'] === 'number' ? capRaw['remainingPatientReschedules'] : undefined,
      }
    : {
        canCancel: Boolean(r['canCancel']),
        canReschedule: Boolean(r['canReschedule']),
        canRestoreFromNoShow: Boolean(r['canRestoreFromNoShow']),
      };

  return {
    reservationId: (r['reservationId'] as string) || '',
    reference,
    status: (r['status'] as string) || '',
    isLate: Boolean(r['isLate']),
    patient,
    doctor,
    practice,
    doctorPracticeId:
      (r['doctorPracticeId'] as string) || (practice.id as string) || '',
    appointment,
    segment,
    visitType,
    price: typeof r['price'] === 'number' ? r['price'] : undefined,
    currency: (r['currency'] as string) || undefined,
    bookingSource: (r['bookingSource'] as string) || undefined,
    bookingNote: (r['bookingNote'] as string) || null,
    createdOnUtc: (r['createdOnUtc'] as string) || undefined,
    cancelledOnUtc: (r['cancelledOnUtc'] as string) || null,
    cancellationReason: (r['cancellationReason'] as string) || null,
    capabilities,
    timeline: Array.isArray(r['timeline'])
      ? (r['timeline'] as ReservationTimelineEvent[])
      : [],
    rowVersion: (r['rowVersion'] as string) || '',
    followUpEligibilityId: (r['followUpEligibilityId'] as string) || null,
    followUpEligibilityStatus: (r['followUpEligibilityStatus'] as string) || null,
    followUpValidUntil: (r['followUpValidUntil'] as string) || null,
  };
}
