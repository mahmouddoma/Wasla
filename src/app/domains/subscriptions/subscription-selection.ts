import { CommercialCatalog, SubscriptionSelection } from './subscription.models';

export function isAvailableSelection(
  catalog: CommercialCatalog | null,
  selection: SubscriptionSelection | null,
  allowTrial = false,
): boolean {
  if (!catalog?.currency || !selection) return false;
  const product = catalog.products.find(
    (item) => item.enabled && item.code === selection.productCode,
  );
  const plan = product?.plans.find((item) => item.code === selection.planCode);
  if (!product || !plan) return false;
  if (selection.offerCode)
    return (
      allowTrial &&
      product.code === 'FULL_PLATFORM' &&
      plan.code === 'STARTER' &&
      catalog.trialOffer.enabled &&
      selection.offerCode === catalog.trialOffer.offerCode &&
      !selection.billingCycle
    );
  if (product.code === 'ONLINE_BOOKING_ONLY') {
    const count = selection.selectedPracticeCount;
    return (
      catalog.bookingOnly.enabled &&
      plan.code === catalog.bookingOnly.planCode &&
      selection.billingCycle === 'Monthly' &&
      typeof count === 'number' &&
      Number.isInteger(count) &&
      count >= (catalog.bookingOnly.minimumSelectedPractices ?? 1) &&
      count <= 2147483647 &&
      typeof catalog.bookingOnly.monthlyUnitPrice === 'number' &&
      Number.isFinite(catalog.bookingOnly.monthlyUnitPrice)
    );
  }
  if (
    !selection.billingCycle ||
    !plan.billingCycles.includes(selection.billingCycle) ||
    !plan.pricing
  )
    return false;
  const price =
    selection.billingCycle === 'Annual' ? plan.pricing.annualPrice : plan.pricing.monthlyPrice;
  return price !== null && Number.isFinite(price) && price >= 0;
}
