// Award flow — paste into Shopify Flow → Run code
//
// Select inputs (GraphQL):
// query {
//   order {
//     subtotalPriceSet {
//       shopMoney {
//         amount
//       }
//     }
//     customer {
//       loyalty_points {
//         value
//       }
//       tags
//     }
//   }
// }
//
// Use snake_case — Flow exposes metafields by key name (not loyaltyPoints).
// Map loyalty_points → customer metafield custom.loyalty_points
//
// Define outputs (GraphQL):
// type Output {
//   "The new loyalty points total as a string"
//   newLoyaltyPoints: String!
//   "Points earned on this order (save to order metafield for cancel flow)"
//   pointsAwarded: String!
//   "Customer tag to add (storefront reads this)"
//   loyaltyPointsTag: String!
//   "Customer tag to remove before adding the new one"
//   loyaltyPointsTagRemove: String!
// }
//
// After Run code:
// 1. Update customer metafield → custom.loyalty_points = newLoyaltyPoints
// 2. Update order metafield → custom.loyalty_points_awarded = pointsAwarded
// 3. Remove customer tags → loyaltyPointsTagRemove
// 4. Add customer tags → loyaltyPointsTag

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

function readMetafield(obj, snakeKey) {
  return obj?.[snakeKey]?.value ?? obj?.[snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase())]?.value;
}

function currentBalance(customer) {
  const rawMeta = readMetafield(customer, 'loyalty_points');
  if (rawMeta !== null && rawMeta !== undefined && String(rawMeta).trim() !== '') {
    const fromMeta = parseInt(String(rawMeta).trim(), 10);
    if (!Number.isNaN(fromMeta)) return fromMeta;
  }

  const fromTag = balanceFromTags(customer?.tags);
  if (fromTag !== null) return fromTag;

  return 0;
}

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return {
      newLoyaltyPoints: '0',
      pointsAwarded: '0',
      loyaltyPointsTag: 'loyalty-points:0',
      loyaltyPointsTagRemove: 'loyalty-points:0',
    };
  }

  const current = currentBalance(customer);
  const subtotal = Number(order.subtotalPriceSet?.shopMoney?.amount ?? 0);
  const earned = Math.round(subtotal);
  const newBalance = current + earned;

  return {
    newLoyaltyPoints: String(newBalance),
    pointsAwarded: String(earned),
    loyaltyPointsTag: `loyalty-points:${newBalance}`,
    loyaltyPointsTagRemove: `loyalty-points:${current}`,
  };
}
