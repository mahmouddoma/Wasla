import { HttpErrorResponse } from '@angular/common/http';
import { AffectedReservation, ReservationConflict } from './reservation.models';
export function reservationConflict(error: unknown): ReservationConflict | null {
  if (
    !(error instanceof HttpErrorResponse) ||
    error.status !== 409 ||
    typeof error.error !== 'object' ||
    !error.error
  )
    return null;
  const value: unknown = error.error;
  if (typeof value !== 'object' || value === null) return null;
  if (!('affectedReservations' in value) || !Array.isArray(value.affectedReservations)) return null;
  const items = value.affectedReservations.filter(
    (item: unknown): item is AffectedReservation =>
      typeof item === 'object' &&
      item !== null &&
      'reservationId' in item &&
      typeof item.reservationId === 'string' &&
      'reference' in item &&
      typeof item.reference === 'string' &&
      'businessDate' in item &&
      typeof item.businessDate === 'string' &&
      'scheduledTime' in item &&
      typeof item.scheduledTime === 'string',
  );
  const count =
    'affectedReservationsCount' in value && typeof value.affectedReservationsCount === 'number'
      ? value.affectedReservationsCount
      : items.length;
  return { affectedReservationsCount: count, affectedReservations: items };
}
