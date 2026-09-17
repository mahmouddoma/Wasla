import { TRANSLATIONS } from '../../core/i18n/translations';
import { Reservation, ReservationMetadata, BookablePatient } from '../../domains/reservations';
export const reservationFixture: Reservation = {
  reservationId: 'r1',
  reference: 'R-100',
  status: 'Confirmed',
  isLate: false,
  patient: { id: 'p1', nameAr: TRANSLATIONS['reservations.patient'].ar, nameEn: 'Test patient' },
  doctor: { id: 'd1', nameAr: TRANSLATIONS['reservations.doctor'].ar, nameEn: 'Test doctor' },
  practice: {
    id: 'clinic',
    nameAr: TRANSLATIONS['reservations.practice'].ar,
    nameEn: 'Test clinic',
  },
  doctorPracticeId: 'clinic',
  appointment: { businessDate: '2026-09-20', slotStartTime: '17:00' },
  bookingNote: 'PRIVATE NOTE',
  capabilities: { canCancel: true, canReschedule: true, canRestoreFromNoShow: false },
  timeline: [],
  rowVersion: 'v1',
};
export const patientFixture: BookablePatient = {
  patientId: 'p1',
  nameAr: TRANSLATIONS['reservations.patient'].ar,
  nameEn: 'Test patient',
  dateOfBirth: '1990-01-01',
  gender: 'Male',
  isSelf: true,
  relationshipType: null,
};
export const metadataFixture: ReservationMetadata = {
  statuses: [
    { code: 'Confirmed', nameAr: TRANSLATIONS['reservations.status'].ar, nameEn: 'Confirmed' },
  ],
  bookingSources: [],
  patientCancellationReasons: [
    {
      code: 'Other',
      nameAr: TRANSLATIONS['reservations.reason'].ar,
      nameEn: 'Other',
      requiresComment: true,
    },
  ],
  providerCancellationReasons: [],
  maximumAdvanceBookingDays: 30,
  maxPatientReschedulesPerReservation: 2,
};
