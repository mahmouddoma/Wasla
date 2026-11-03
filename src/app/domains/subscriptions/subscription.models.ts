/** Commercial contracts from WAS-666–WAS-680. Prices and grants are server-owned. */
export type BillingCycle = 'Monthly' | 'Annual';
export type AccessLevel = 'Full' | 'ReadOnly';
export type SubscriptionStatus =
  'Pending' | 'Active' | 'Expired' | 'Cancelled' | 'Superseded' | 'Scheduled';
export interface SubscriptionSelection {
  productCode: string;
  planCode: string;
  billingCycle?: BillingCycle | null;
  offerCode?: string | null;
  selectedPracticeCount?: number | null;
}
export interface CommercialFeature {
  code: string;
  nameAr?: string;
  nameEn?: string;
  accessLevel: AccessLevel;
  isReleaseReady?: boolean;
}
export interface CommercialPlan {
  code: string;
  nameAr: string;
  nameEn: string;
  billingCycles: BillingCycle[];
  pricing: {
    monthlyPrice: number | null;
    annualPrice: number | null;
    practiceLimit: number;
    receptionLimit: number;
  } | null;
  features: CommercialFeature[];
}
export interface CommercialProduct {
  code: string;
  nameAr: string;
  nameEn: string;
  enabled: boolean;
  plans: CommercialPlan[];
}
export interface CommercialCatalog {
  catalogVersion: string;
  currency: string;
  products: CommercialProduct[];
  trialOffer: {
    enabled: boolean;
    offerCode: string;
    durationDays: number;
    startsOnDoctorApproval: boolean;
  };
  bookingOnly: {
    enabled: boolean;
    planCode: string;
    maximumSelectablePractices: number;
    pricingTiers: readonly {
      minPracticeCount: number;
      maxPracticeCount: number;
      monthlyPrice: number;
    }[];
  };
  paymentMethods: { cash: boolean; card: boolean; eWallet: boolean };
}
export interface Subscription {
  id: string;
  productCode: string;
  planCode: string;
  kind: string;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  priceAmount: number;
  currency: string;
  practiceLimit: number;
  receptionLimit: number;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  trialStartedAtUtc?: string | null;
  trialEndsAtUtc?: string | null;
  willNotRenew: boolean;
  rowVersion: string;
}
export type SubscriptionChangeType =
  | 'UpgradePlan'
  | 'DowngradePlan'
  | 'IncreaseBookingPracticeLimit'
  | 'DecreaseBookingPracticeLimit'
  | 'ChangeBillingCycle';
export interface SubscriptionChangeRequest {
  id: string;
  changeType: SubscriptionChangeType;
  status: 'Pending' | 'Approved' | 'Cancelled' | 'Applied' | 'Scheduled' | 'Rejected';
  targetPlanCode: string | null;
  targetBillingCycle: BillingCycle | null;
  targetPracticeCount: number | null;
  targetPriceSnapshot: number | null;
  differenceAmount: number | null;
  effectiveAtUtc: string | null;
  reason: string | null;
  rejectionReason: string | null;
  rowVersion: string;
}
export interface SubscriptionDetails {
  subscription: Subscription | null;
  pendingSubscription: Subscription | null;
  nextPeriod: Subscription | null;
  usage: { practiceCount: number; receptionCount: number };
  entitlements: { featureCode: string; accessLevel: AccessLevel }[];
  changeRequests: SubscriptionChangeRequest[];
  payments: SubscriptionPayment[] | null;
  history:
    | readonly {
        id: string;
        eventType: string | null;
        occurredOnUtc: string;
        reason: string | null;
        newStatus: SubscriptionStatus;
      }[]
    | null;
  rowVersion: string;
  doctor: { id: string; nameAr: string; nameEn: string | null; approvalStatus: string } | null;
}
export interface SubscriptionPayment {
  id: string;
  amountReceived: number;
  paymentMethod: string;
  paidAtUtc: string;
  reference: string | null;
}
export interface RequestSubscriptionChange {
  changeType: SubscriptionChangeType;
  targetPlanCode?: string | null;
  targetPracticeCount?: number | null;
  targetBillingCycle?: BillingCycle | null;
  reason: string;
  rowVersion?: string;
}
export interface SubscriptionPaymentRequest {
  rowVersion: string;
  paymentMethod: 'Cash' | 'Card' | 'EWallet';
  amountReceived: number;
  paidAtUtc?: string | null;
  reference?: string | null;
  notes?: string | null;
}
export interface SubscriptionChangeDecision {
  rowVersion: string;
  changeRowVersion: string;
  paymentMethod?: SubscriptionPaymentRequest['paymentMethod'];
  amountReceived?: number;
  paidAtUtc?: string | null;
  reference?: string | null;
  notes?: string | null;
}
export interface RenewSubscriptionRequest extends SubscriptionPaymentRequest {
  targetPlanCode?: string | null;
  targetPracticeCount?: number | null;
  targetBillingCycle?: BillingCycle | null;
}
export interface SubscriptionListQuery {
  pageNumber: number;
  pageSize: number;
  search?: string;
  productCode?: string;
  planCode?: string;
  status?: string;
  createdFromUtc?: string;
  createdToUtc?: string;
  endsFromUtc?: string;
  endsToUtc?: string;
}
export interface SubscriptionListItem extends Subscription {
  doctorId?: string;
  doctorNameAr?: string;
  doctorNameEn?: string | null;
}
export interface SubscriptionPage {
  items: SubscriptionListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
export interface LegacyTransitionBatch {
  id: string;
  startedAtUtc: string;
  endsAtUtc: string;
  durationDays: number;
  status: string;
  completedOnUtc: string | null;
  rowVersion: string;
}
