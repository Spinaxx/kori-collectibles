// Shopify Flow → Run code
// Inputs:
// - order
// - currentPoints (order.customer.metafields.custom.loyalty_points.value)
// - pointsAwarded (order.metafields.custom.loyalty_points_awarded.value)
// Outputs: shouldUpdate, newBalance, clearAwarded

export default function main({ order, currentPoints, pointsAwarded }) {
  const customer = order?.customer;
  if (!customer?.id) {
    return { shouldUpdate: false };
  }

  let awarded = Number(pointsAwarded ?? 0);

  // Fallback for older orders created before the award flow stored points on the order.
  if (awarded <= 0) {
    const status = String(order.displayFinancialStatus || '').toUpperCase();
    const reversible = ['PAID', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];
    if (!reversible.includes(status)) {
      return { shouldUpdate: false };
    }

    const subtotal = Number(order.subtotalPriceSet?.shopMoney?.amount ?? 0);
    awarded = Math.round(subtotal);
  }

  if (awarded <= 0) {
    return { shouldUpdate: false };
  }

  const newBalance = Math.max(0, Number(currentPoints ?? 0) - awarded);

  return {
    shouldUpdate: true,
    newBalance,
    clearAwarded: 0,
  };
}
