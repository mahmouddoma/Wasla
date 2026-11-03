import type { CommercialCatalog, SubscriptionDetails } from '../app/domains/subscriptions';
import { signal } from '@angular/core';

/** Existing feature unit tests exercise their workflow with commercial access granted. */
export function subscriptionStateStub() {
  const details = signal(detailsFixture());
  return {
    details,
    usage: () => details().usage,
    terms: () => details().subscription,
    has: () => true,
    canCreatePractice: () => true,
    canCreateReception: () => true,
    needsReview: () => false,
    invalidate: () => undefined,
    refresh: async () => details(),
  };
}

export const catalogFixture: CommercialCatalog = {
  catalogVersion: 'test',
  currency: 'EGP',
  products: [
    {
      code: 'FULL_PLATFORM',
      nameAr: 'المنصة',
      nameEn: 'Platform',
      enabled: true,
      plans: [
        {
          code: 'STARTER',
          nameAr: 'الأساسية',
          nameEn: 'Starter',
          billingCycles: ['Monthly', 'Annual'],
          pricing: { monthlyPrice: 123, annualPrice: 1200, practiceLimit: 2, receptionLimit: 3 },
          features: [],
        },
      ],
    },
  ],
  trialOffer: {
    enabled: true,
    offerCode: 'TEST_TRIAL',
    durationDays: 20,
    startsOnDoctorApproval: true,
  },
  bookingOnly: {
    enabled: false,
    planCode: 'BOOKING_ONLY',
    maximumSelectablePractices: 0,
    pricingTiers: [],
  },
  paymentMethods: { cash: true, card: false, eWallet: false },
};
export function detailsFixture(): SubscriptionDetails {
  return {
    subscription: {
      id: 'sub-1',
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      kind: 'Paid',
      billingCycle: 'Monthly',
      status: 'Active',
      priceAmount: 123,
      currency: 'EGP',
      practiceLimit: 2,
      receptionLimit: 3,
      startsAtUtc: '2026-01-01T00:00:00Z',
      endsAtUtc: '2027-01-01T00:00:00Z',
      willNotRenew: false,
      rowVersion: 'AQID',
    },
    pendingSubscription: null,
    nextPeriod: null,
    usage: { practiceCount: 1, receptionCount: 1 },
    entitlements: [
      { featureCode: 'PRACTICE_MANAGEMENT', accessLevel: 'Full' },
      { featureCode: 'RECEPTION_MANAGEMENT', accessLevel: 'Full' },
    ],
    changeRequests: [],
    payments: null,
    history: null,
    rowVersion: 'AQID',
    doctor: { id: 'doctor-1', nameAr: 'طبيب', nameEn: 'Doctor', approvalStatus: 'Approved' },
  };
}

/** Synthetic deployed DTO, including the nested terms and snapshot property names. */
export function wireDetailsFixture() {
  const details = detailsFixture();
  return {
    ...details,
    subscription: {
      ...details.subscription,
      subscriptionKind: 'Paid',
      doctorId: 'doctor-1',
      terms: { productCode: 'FULL_PLATFORM', planCode: 'STARTER' },
    },
    entitlements: details.entitlements.map((grant) => ({
      featureCodeSnapshot: grant.featureCode,
      accessLevel: grant.accessLevel,
    })),
    doctor: { doctorId: 'doctor-1', nameAr: 'طبيب', nameEn: 'Doctor', approvalStatus: 'Approved' },
  };
}
