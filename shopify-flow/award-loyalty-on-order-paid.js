// Shopify Flow → Run code
// Inputs: order, currentPoints (order.customer.metafields.custom.loyalty_points.value)
// Outputs: shouldUpdate, newBalance, pointsAwarded

export default function main({ order, currentPoints }) {
  const customer = order?.customer;
  if (!customer?.id) {
    return { shouldUpdate: false };
  }

  const subtotal = Number(order.subtotalPriceSet?.shopMoney?.amount ?? 0);
  const pointsAwarded = Math.round(subtotal);
  const newBalance = Number(currentPoints ?? 0) + pointsAwarded;

  return {
    shouldUpdate: true,
    newBalance,
    pointsAwarded,
  };
}
