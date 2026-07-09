// Cancel flow — paste into Shopify Flow → Run code
//
// NO Log output step. It cannot read customer metafields and will show 0.
//
// Run code → Input (GraphQL):
// query {
//   order {
//     subtotalPriceSet {
//       shopMoney {
//         amount
//       }
//     }
//     loyaltyPointsAwarded {
//       value
//     }
//     customer {
//       loyaltyPoints {
//         value
//       }
//       tags
//     }
//   }
// }
//
// Map loyaltyPoints → customer metafield custom.loyalty_points ONLY.
// Map loyaltyPointsAwarded → order metafield custom.loyalty_points_awarded
//   (set by the award flow when the order was paid — most reliable deduct amount)
//
// Do NOT map to custom_loyalty_points — that is a different field.
//
// Define outputs (GraphQL):
// type Output {
//   "The new loyalty points total"
//   newLoyaltyPoints: String!
//   "Customer tag to add"
//   loyaltyPointsTag: String!
//   "Customer tag to remove first"
//   loyaltyPointsTagRemove: String!
//   "Points removed on this cancellation"
//   pointsDeducted: String!
// }
//
// Next steps:
// 1. Update customer metafield → custom.loyalty_points = newLoyaltyPoints
// 2. Remove customer tags → loyaltyPointsTagRemove
// 3. Add customer tags → loyaltyPointsTag

function balanceFromTags(tags) {
  if (!Array.isArray(tags)) return null;

  for (const tag of tags) {
    const stripped = String(tag).trim();
    if (!stripped.includes('loyalty-points:')) continue;
    const value = parseInt(stripped.split('loyalty-points:')[1]?.trim(), 10);
    if (!Number.isNaN(value)) return value;
  }

  return null;
}

function currentBalance(customer) {
  const rawMeta = customer?.loyaltyPoints?.value;
  if (rawMeta !== null && rawMeta !== undefined && String(rawMeta).trim() !== '') {
    const fromMeta = parseInt(String(rawMeta).trim(), 10);
    if (!Number.isNaN(fromMeta)) return fromMeta;
  }

  const fromTag = balanceFromTags(customer?.tags);
  if (fromTag !== null) return fromTag;

  return 0;
}

function pointsToDeduct(order) {
  const fromOrder = parseInt(String(order?.loyaltyPointsAwarded?.value ?? '').trim(), 10);
  if (fromOrder > 0) return fromOrder;

  const subtotal = parseFloat(order?.subtotalPriceSet?.shopMoney?.amount) || 0;
  if (subtotal > 0) return Math.round(subtotal);

  // Do NOT fall back to order total — on cancelled orders subtotal is often 0
  // and total can be much larger than points actually awarded.
  return 0;
}

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return {
      newLoyaltyPoints: '0',
      loyaltyPointsTag: 'loyalty-points:0',
      loyaltyPointsTagRemove: 'loyalty-points:0',
      pointsDeducted: '0',
    };
  }

  const current = currentBalance(customer);
  const deduct = pointsToDeduct(order);

  if (deduct <= 0) {
    return {
      newLoyaltyPoints: String(current),
      loyaltyPointsTag: `loyalty-points:${current}`,
      loyaltyPointsTagRemove: `loyalty-points:${current}`,
      pointsDeducted: '0',
    };
  }

  const newBalance = Math.max(0, current - deduct);

  return {
    newLoyaltyPoints: String(newBalance),
    loyaltyPointsTag: `loyalty-points:${newBalance}`,
    loyaltyPointsTagRemove: `loyalty-points:${current}`,
    pointsDeducted: String(deduct),
  };
}
