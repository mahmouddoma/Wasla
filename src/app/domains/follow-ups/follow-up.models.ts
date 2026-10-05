export type FollowUpStatus = 'Available' | 'Reserved' | 'Consumed' | 'Expired';
/** Booking authority never grants access to a dependent's clinical record. */
export interface FollowUpEligibility {
  readonly eligibilityId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly practiceId: string;
  readonly validUntil: string;
  readonly status: FollowUpStatus;
  readonly canBook: boolean;
  readonly reservedReservationId?: string | null;
  readonly reservedTicketId?: string | null;
  readonly rowVersion: string;
}
export interface FollowUpPage {
  readonly items: readonly FollowUpEligibility[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
export interface FollowUpQuery {
  patientId?: string;
  status?: FollowUpStatus;
  pageNumber: number;
  pageSize: number;
}
export interface FollowUpBookingContext {
  readonly patientId?: string;
  readonly followUpEligibilityId?: string;
}
