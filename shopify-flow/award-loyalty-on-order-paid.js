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
//   "Customer tag to add (storefront reads this)"
//   loyaltyPointsTag: String!
//   "Customer tag to remove before adding the new one"
//   loyaltyPointsTagRemove: String!
// }
//
// After Update customer metafield, add Flow steps:
// 1. Remove customer tags → loyaltyPointsTagRemove
// 2. Add customer tags → loyaltyPointsTag

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

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const subtotal = Number(order.subtotalPriceSet?.shopMoney?.amount ?? 0);
  const earned = Math.round(subtotal);
  const newBalance = current + earned;

  return {
    newLoyaltyPoints: String(newBalance),
    loyaltyPointsTag: `loyalty-points:${newBalance}`,
    loyaltyPointsTagRemove: `loyalty-points:${current}`,
  };
}
