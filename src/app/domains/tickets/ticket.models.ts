import { PaymentMethod } from '../finance';

export type TicketActor = 'Doctor' | 'Reception' | 'Patient';
export type TicketStatus =
  'Waiting' | 'Called' | 'InProgress' | 'NoShow' | 'Completed' | 'Cancelled';

export interface TicketIdentity {
  readonly id?: string;
  readonly nameAr: string;
  readonly nameEn: string | null;
}

export interface TicketCallAttempt {
  readonly attemptNumber: number;
  readonly calledOnUtc: string;
  readonly outcome?: string | null;
  readonly confirmedOnUtc?: string | null;
}

/** Operational projection only; clinical records and other-patient data are deliberately absent. */
export interface PracticeTicket {
  readonly ticketId: string;
  readonly ticketNumber: string;
  readonly status: TicketStatus;
  readonly source: string;
  readonly practice: TicketIdentity;
  readonly doctor: TicketIdentity;
  readonly patient?: TicketIdentity;
  readonly reservationId?: string | null;
  readonly businessDate: string;
  readonly segment?: TicketIdentity | null;
  readonly visitType?: TicketIdentity | null;
  readonly priceSnapshot?: number;
  readonly currency?: string | null;
  readonly currencyCode?: string | null;
  readonly canRefund?: boolean;
  readonly isRefunded?: boolean;
  readonly refundableAmount?: number;
  readonly paymentId?: string | null;
  readonly paymentTransactionNumber?: string | null;
  readonly refundId?: string | null;
  readonly refundTransactionNumber?: string | null;
  readonly checkedInOnUtc?: string | null;
  readonly queueOrderTime?: string | null;
  readonly calledOnUtc?: string | null;
  readonly startedOnUtc?: string | null;
  readonly completedOnUtc?: string | null;
  readonly lastUpdatedOnUtc: string;
  readonly patientsAheadNow: number;
  readonly fastTrack: boolean;
  readonly callAttempts: readonly TicketCallAttempt[];
  readonly rowVersion: string;
}

export interface PracticeQueue {
  readonly inProgress: PracticeTicket | null;
  readonly called: PracticeTicket | null;
  readonly waiting: readonly PracticeTicket[];
  readonly noShow: readonly PracticeTicket[];
}

export interface CheckInTicketRequest {
  readonly paidAmount: number;
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
}

export interface ForceCheckInTicketRequest extends CheckInTicketRequest {
  readonly reason: string;
}

export interface CheckInSubmission extends CheckInTicketRequest {
  readonly force: boolean;
  readonly reason: string;
}

export interface CreateWalkInTicketRequest {
  readonly patientId: string;
  readonly segmentId: string;
  readonly visitTypeId: string;
  readonly paidAmount: number;
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
}

export interface TicketVersionRequest {
  readonly rowVersion: string;
}

export interface TicketReasonRequest extends TicketVersionRequest {
  readonly reason: string;
}
