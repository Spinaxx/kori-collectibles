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
// }
//
// Next step: Update customer metafield → custom.loyalty_points
// Value: Add variable → Run code → newLoyaltyPoints

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
    return { newLoyaltyPoints: '0' };
  }

  const raw = customer.loyaltyPoints ? customer.loyaltyPoints.value : null;
  const current = parseInt(raw, 10) || 0;
  const earned = earnedPoints(order);

  if (earned <= 0) {
    return { newLoyaltyPoints: String(current) };
  }

  const newBalance = Math.max(0, current - earned);

  return {
    newLoyaltyPoints: String(newBalance),
  };
}
