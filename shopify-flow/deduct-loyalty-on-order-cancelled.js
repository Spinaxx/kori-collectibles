// Cancel flow — paste into Shopify Flow → Run code
//
// Select inputs (GraphQL):
// query {
//   order {
//     subtotalPriceSet {
//       shopMoney {
//         amount
//       }
//     }
//     currentSubtotalPriceSet {
//       shopMoney {
//         amount
//       }
//     }
//     totalPriceSet {
//       shopMoney {
//         amount
//       }
//     }
//     totalRefundedSet {
//       shopMoney {
//         amount
//       }
//     }
//     customer {
//       id
//       loyaltyPoints {
//         value
//       }
//     }
//   }
// }
//
// Define outputs (GraphQL):
// type Output {
//   "The customer's new loyalty points balance after deduction"
//   newLoyaltyPoints: String!
// }
//
// Map loyaltyPoints → customer metafield custom.loyalty_points (key: loyalty_points)

function orderAmount(order) {
  const candidates = [
    order?.subtotalPriceSet?.shopMoney?.amount,
    order?.currentSubtotalPriceSet?.shopMoney?.amount,
    order?.totalPriceSet?.shopMoney?.amount,
    order?.totalRefundedSet?.shopMoney?.amount,
  ];

  for (const value of candidates) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }

  return 0;
}

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return { newLoyaltyPoints: '0' };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const earned = Math.round(orderAmount(order));

  if (earned <= 0) {
    return { newLoyaltyPoints: String(current) };
  }

  const newBalance = Math.max(0, current - earned);

  return {
    newLoyaltyPoints: String(newBalance),
  };
}
