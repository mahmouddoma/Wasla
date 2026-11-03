import * as Wire from './contracts';
import {
  CommercialCatalog,
  RequestSubscriptionChange,
  Subscription,
  SubscriptionDetails,
  SubscriptionPage,
} from './subscription.models';

export function mapCatalog(raw: Wire.CommercialCatalogResponse): CommercialCatalog {
  return {
    ...raw,
    catalogVersion: raw.catalogVersion ?? '',
    currency: raw.currency ?? '',
    products: (raw.products ?? []).map((product) => ({
      ...product,
      code: product.code ?? '',
      nameAr: product.nameAr ?? '',
      nameEn: product.nameEn ?? '',
      plans: (product.plans ?? []).map((plan) => ({
        ...plan,
        code: plan.code ?? '',
        nameAr: plan.nameAr ?? '',
        nameEn: plan.nameEn ?? '',
        billingCycles: [...(plan.billingCycles ?? [])],
        features: (plan.features ?? []).map((feature) => ({
          ...feature,
          code: feature.code ?? '',
          nameAr: feature.nameAr ?? '',
          nameEn: feature.nameEn ?? '',
        })),
      })),
    })),
    trialOffer: { ...raw.trialOffer, offerCode: raw.trialOffer?.offerCode ?? '' },
    bookingOnly: {
      ...raw.bookingOnly,
      planCode: raw.bookingOnly?.planCode ?? '',
      pricingTiers: raw.bookingOnly?.pricingTiers ?? [],
    },
  };
}
export function mapSubscription(
  raw: Wire.DoctorSubscription | null | undefined,
): Subscription | null {
  if (!raw) return null;
  return {
    ...raw,
    kind: raw.subscriptionKind,
    productCode: raw.terms?.productCode ?? '',
    planCode: raw.terms?.planCode ?? '',
    currency: raw.currency ?? '',
    rowVersion: raw.rowVersion ?? '',
  };
}
export function mapDetails(raw: Wire.SubscriptionDetails): SubscriptionDetails {
  return {
    subscription: mapSubscription(raw.subscription),
    pendingSubscription: mapSubscription(raw.pendingSubscription),
    nextPeriod: mapSubscription(raw.nextPeriod),
    usage: raw.usage ?? { practiceCount: 0, receptionCount: 0 },
    entitlements: (raw.entitlements ?? [])
      .filter((grant) => !!grant.featureCodeSnapshot)
      .map((grant) => ({
        featureCode: grant.featureCodeSnapshot!,
        accessLevel: grant.accessLevel,
      })),
    changeRequests: (raw.changeRequests ?? []).map((change) => ({
      ...change,
      changeType:
        change.changeType === 'Upgrade'
          ? 'UpgradePlan'
          : change.changeType === 'Downgrade'
            ? 'DowngradePlan'
            : 'ChangeBillingCycle',
      reason: null,
      rowVersion: change.rowVersion ?? '',
    })),
    payments:
      raw.payments?.map((payment) => ({ ...payment, amountReceived: payment.amount })) ?? null,
    history: raw.history,
    rowVersion: raw.rowVersion ?? '',
    doctor: raw.doctor
      ? { ...raw.doctor, id: raw.doctor.doctorId, nameAr: raw.doctor.nameAr ?? '' }
      : null,
  };
}
export function mapPage(raw: Wire.DoctorSubscriptionPagedResponse): SubscriptionPage {
  return {
    ...raw,
    items: (raw.items ?? []).map((item) => ({
      ...mapSubscription(item)!,
      doctorId: item.doctorId,
    })),
  };
}
export function changeRequestToWire(
  request: RequestSubscriptionChange,
): Wire.SubscriptionChangeType {
  if (request.changeType === 'ChangeBillingCycle') return 'BillingCycle';
  return ['UpgradePlan', 'IncreaseBookingPracticeLimit'].includes(request.changeType)
    ? 'Upgrade'
    : 'Downgrade';
}
