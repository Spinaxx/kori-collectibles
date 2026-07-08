// Cancel flow — paste into Shopify Flow → Run code
//
// BEFORE Run code: add a Log output step that references Customer →
// Metafield → loyalty_points so Flow registers the metafield.
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
//       loyaltyPoints {
//         value
//       }
//     }
//   }
// }
//
// Define outputs (GraphQL):
// "The output of Run Code"
// type Output {
//   "The new loyalty points total"
//   newLoyaltyPoints: String!
// }
//
// Step after Run code: Update customer metafield → custom.loyalty_points
// Value: Add variable → Run code → newLoyaltyPoints (do not type by hand)

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return { newLoyaltyPoints: '0' };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const subtotal = Number(order.subtotalPriceSet?.shopMoney?.amount ?? 0);
  const earned = Math.round(subtotal);

  if (earned <= 0) {
    return { newLoyaltyPoints: String(current) };
  }

  const newBalance = Math.max(0, current - earned);

  return {
    newLoyaltyPoints: String(newBalance),
  };
}
