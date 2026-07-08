// Cancel flow — mirror the award flow setup exactly.
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
//     totalPriceSet {
//       shopMoney {
//         amount
//       }
//     }
//     customer {
//       loyaltyPoints {
//         value
//       }
//     }
//   }
// }
//
// Map loyaltyPoints → customer metafield custom.loyalty_points ONLY.
// Do NOT map to custom_loyalty_points — that is a different field.
//
// Update customer metafield action must also use key: loyalty_points
//
// Define outputs (GraphQL):
// "The output of Run Code"
// type Output {
//   "The new loyalty points total"
//   newLoyaltyPoints: String!
//   "Customer tag to add"
//   loyaltyPointsTag: String!
//   "Customer tag to remove first"
//   loyaltyPointsTagRemove: String!
// }
//
// Next steps:
// 1. Update customer metafield → custom.loyalty_points = newLoyaltyPoints
// 2. Remove customer tags → loyaltyPointsTagRemove
// 3. Add customer tags → loyaltyPointsTag

function earnedPoints(order) {
  const subtotal = parseFloat(order?.subtotalPriceSet?.shopMoney?.amount) || 0;
  if (subtotal > 0) {
    return Math.round(subtotal);
  }

  const total = parseFloat(order?.totalPriceSet?.shopMoney?.amount) || 0;
  return Math.round(total);
}

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return {
      newLoyaltyPoints: '0',
      loyaltyPointsTag: 'loyalty-points:0',
      loyaltyPointsTagRemove: 'loyalty-points:0',
    };
  }

  const raw = String(customer.loyaltyPoints?.value ?? '').trim();
  const current = parseInt(raw, 10) || 0;
  const earned = earnedPoints(order);

  if (earned <= 0) {
    return {
      newLoyaltyPoints: String(current),
      loyaltyPointsTag: `loyalty-points:${current}`,
      loyaltyPointsTagRemove: `loyalty-points:${current}`,
    };
  }

  const newBalance = Math.max(0, current - earned);

  return {
    newLoyaltyPoints: String(newBalance),
    loyaltyPointsTag: `loyalty-points:${newBalance}`,
    loyaltyPointsTagRemove: `loyalty-points:${current}`,
  };
}
