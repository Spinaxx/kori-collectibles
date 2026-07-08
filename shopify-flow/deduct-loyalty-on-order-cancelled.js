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
//     displayFinancialStatus
//     customer {
//       loyaltyPoints {
//         value
//       }
//     }
//     loyaltyPointsAwarded {
//       value
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
// Map `loyaltyPoints` → customer metafield custom.loyalty_points
// Map `loyaltyPointsAwarded` → order metafield custom.loyalty_points_awarded

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return { newLoyaltyPoints: '0' };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  let awarded = Number(order.loyaltyPointsAwarded?.value ?? 0);

  // Fallback for orders paid before loyalty_points_awarded was stored on the order.
  if (awarded <= 0) {
    const status = String(order.displayFinancialStatus || '').toUpperCase();
    const reversible = ['PAID', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];
    if (!reversible.includes(status)) {
      return { newLoyaltyPoints: String(current) };
    }

    const subtotal = Number(order.subtotalPriceSet?.shopMoney?.amount ?? 0);
    awarded = Math.round(subtotal);
  }

  if (awarded <= 0) {
    return { newLoyaltyPoints: String(current) };
  }

  const newBalance = Math.max(0, current - awarded);

  return {
    newLoyaltyPoints: String(newBalance),
  };
}
