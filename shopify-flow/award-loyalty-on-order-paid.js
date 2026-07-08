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
//       loyaltyPoints {
//         value
//       }
//     }
//   }
// }
//
// Define outputs (GraphQL):
// type Output {
//   "The new loyalty points total as a string"
//   newLoyaltyPoints: String!
// }
//
// Map `loyaltyPoints` to customer metafield custom.loyalty_points in the Run code input picker.

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return { newLoyaltyPoints: '0' };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const subtotal = Number(order.subtotalPriceSet?.shopMoney?.amount ?? 0);
  const earned = Math.round(subtotal);
  const newBalance = current + earned;

  return {
    newLoyaltyPoints: String(newBalance),
  };
}
