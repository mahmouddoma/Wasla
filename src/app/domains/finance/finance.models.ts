export type FinancialActor = 'Doctor' | 'Reception' | 'Patient' | 'Admin';
export type TransactionType = 'Payment' | 'Refund';
export type PaymentMethod = 'Cash' | 'Card' | 'Wallet';
export type RefundReasonCode =
  | 'PatientRequestedCancellation'
  | 'DoctorUnavailable'
  | 'DuplicatePayment'
  | 'WrongPaymentMethod'
  | 'OperationalError'
  | 'Other';

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}

export interface FinancialTransactionQuery {
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly practiceId?: string;
  readonly transactionType?: TransactionType | '';
  readonly transactionNumber?: string;
  readonly ticketNumber?: string;
  readonly patientId?: string;
  readonly method?: PaymentMethod | '';
  readonly pageNumber?: number;
  readonly pageSize?: number;
}

export interface FinancialTransactionItem {
  readonly transactionType: TransactionType;
  readonly transactionId: string;
  readonly transactionNumber: string;
  readonly originalPaymentTransactionNumber?: string | null;
  readonly paymentId?: string | null;
  readonly patientId?: string;
  readonly patientNameAr?: string;
  readonly patientNameEn?: string | null;
  readonly doctorId?: string;
  readonly doctorNameAr?: string;
  readonly doctorNameEn?: string | null;
  readonly ticketId?: string;
  readonly ticketNumber?: number | string;
  readonly doctorPracticeId: string;
  readonly practiceNameAr: string;
  readonly practiceNameEn?: string | null;
  readonly amount: number;
  readonly currencyCode: string;
  readonly method: PaymentMethod;
  readonly referenceNumber?: string | null;
  readonly occurredOnUtc: string;
  readonly businessDate: string;
  readonly performedByDisplayName?: string | null;
  readonly isCorrected?: boolean;
  readonly isRefunded?: boolean;
  readonly refundReasonCode?: RefundReasonCode | null;
  readonly refundReason?: string | null;
}

export interface RefundPaymentRequest {
  readonly refundMethod: PaymentMethod;
  readonly refundReasonCode: RefundReasonCode;
  readonly reason: string | null;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
}

export interface RefundPaymentResponse {
  readonly refundId: string;
  readonly transactionNumber: string;
  readonly originalPaymentTransactionNumber: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly refundedOnUtc: string;
  readonly businessDate: string;
}

export interface CorrectPaymentRequest {
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
  readonly correctionReason: string;
  readonly rowVersion: string;
}

export interface CorrectRefundRequest {
  readonly refundMethod: PaymentMethod;
  readonly refundReasonCode: RefundReasonCode;
  readonly reason: string | null;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
  readonly correctionReason: string;
  readonly rowVersion: string;
}

export interface CorrectionResponse {
  readonly correctionId: string;
  readonly transactionId: string;
  readonly transactionNumber: string;
  readonly correctedOnUtc: string;
}

export interface PaymentRecord {
  readonly id: string;
  readonly transactionNumber: string;
  readonly ticketId: string;
  readonly reservationId?: string | null;
  readonly amount: number;
  readonly currencyCode: string;
  readonly status: string;
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber?: string | null;
  readonly notes?: string | null;
  readonly businessDate: string;
  readonly collectedOnUtc: string;
  readonly collectedByDisplayName?: string | null;
  readonly rowVersion: string;
}

export interface RefundRecord {
  readonly id: string;
  readonly transactionNumber: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly refundMethod: PaymentMethod;
  readonly refundReasonCode: RefundReasonCode;
  readonly reason?: string | null;
  readonly referenceNumber?: string | null;
  readonly notes?: string | null;
  readonly businessDate: string;
  readonly refundedOnUtc: string;
  readonly refundedByDisplayName?: string | null;
  readonly rowVersion: string;
}

export interface CorrectionAudit {
  readonly id: string;
  readonly correctionReason: string;
  readonly correctedByDisplayName: string;
  readonly correctedOnUtc: string;
  readonly oldValues?: Readonly<Record<string, unknown>>;
  readonly newValues?: Readonly<Record<string, unknown>>;
}

export interface PaymentDetail {
  readonly payment: PaymentRecord;
  readonly refund: RefundRecord | null;
  readonly patient: { readonly id: string; readonly nameAr: string; readonly nameEn?: string | null };
  readonly doctor: { readonly id: string; readonly nameAr: string; readonly nameEn?: string | null };
  readonly practice: { readonly id: string; readonly nameAr: string; readonly nameEn?: string | null };
  readonly ticketNumber: number | string;
  readonly segmentSnapshot?: string | null;
  readonly visitTypeSnapshot?: string | null;
  readonly isRefunded: boolean;
  readonly canRefund: boolean;
  readonly refundableAmount: number;
  readonly paymentCorrections: readonly CorrectionAudit[];
  readonly refundCorrections: readonly CorrectionAudit[];
}

export interface PaymentReceipt {
  readonly paymentTransactionNumber: string;
  readonly patientId: string;
  readonly patientNameAr: string;
  readonly patientNameEn?: string | null;
  readonly doctorId: string;
  readonly doctorNameAr: string;
  readonly doctorNameEn?: string | null;
  readonly doctorPracticeId: string;
  readonly practiceNameAr: string;
  readonly practiceNameEn?: string | null;
  readonly ticketNumber: number | string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber?: string | null;
  readonly paidOnUtc: string;
  readonly businessDate: string;
  readonly recordedByDisplayName?: string | null;
}

export interface RefundReceipt {
  readonly refundTransactionNumber: string;
  readonly originalPaymentTransactionNumber: string;
  readonly patientId: string;
  readonly patientNameAr: string;
  readonly patientNameEn?: string | null;
  readonly doctorId: string;
  readonly doctorNameAr: string;
  readonly doctorNameEn?: string | null;
  readonly doctorPracticeId: string;
  readonly practiceNameAr: string;
  readonly practiceNameEn?: string | null;
  readonly ticketNumber: number | string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly refundMethod: PaymentMethod;
  readonly refundReasonCode: RefundReasonCode;
  readonly refundReason?: string | null;
  readonly referenceNumber?: string | null;
  readonly refundedOnUtc: string;
  readonly businessDate: string;
  readonly recordedByDisplayName?: string | null;
}

export interface RevenueSummary {
  readonly grossRevenue: number;
  readonly totalRefunds: number;
  readonly netRevenue: number;
  readonly paymentCount: number;
  readonly refundCount: number;
  readonly currencyCode: string;
}

export interface RevenueSeriesItem {
  readonly date?: string;
  readonly practiceId?: string;
  readonly practiceNameAr?: string;
  readonly practiceNameEn?: string | null;
  readonly segmentId?: string;
  readonly segmentNameAr?: string;
  readonly segmentNameEn?: string | null;
  readonly visitTypeId?: string;
  readonly visitTypeCode?: string;
  readonly visitTypeNameAr?: string;
  readonly visitTypeNameEn?: string | null;
  readonly grossRevenue: number;
  readonly refunds: number;
  readonly netRevenue: number;
  readonly paymentCount?: number;
  readonly refundCount?: number;
}

export interface MethodSeriesItem {
  readonly method: PaymentMethod;
  readonly amount: number;
  readonly transactionCount: number;
}

export interface DoctorRevenueDashboard {
  readonly summary: RevenueSummary;
  readonly dailyTrend: readonly RevenueSeriesItem[];
  readonly byPractice: readonly RevenueSeriesItem[];
  readonly paymentMethods: readonly MethodSeriesItem[];
  readonly refundMethods: readonly MethodSeriesItem[];
  readonly bySegment: readonly RevenueSeriesItem[];
  readonly byVisitType: readonly RevenueSeriesItem[];
}

export interface AdminRevenueRow extends RevenueSeriesItem {
  readonly doctorId: string;
  readonly doctorNameAr: string;
  readonly doctorNameEn?: string | null;
  readonly practiceId: string;
  readonly practiceNameAr: string;
}

export interface AdminRevenueAggregates {
  readonly summary: RevenueSummary;
  readonly byDoctorPractice: readonly AdminRevenueRow[];
}
