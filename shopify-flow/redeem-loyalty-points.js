// Redeem flow — paste into Shopify Flow → Run code
//
// Trigger: Metaobject entry created (your "Redeem loyalty points" Shopify Form)
//
// BEFORE Run code: add a Log output step and register metafields (Flow requirement).
//   1. Add action → Log output (on the same Yes branch, before Run code)
//   2. Add variable → Metaobject → formSubmittedBy → metafield custom.loyalty_points
//      (alias name: loyaltyPoints)
//   3. Add variable → Metaobject → formSubmittedBy → metafield custom.loyalty_redeem_code
//      (alias name: loyaltyRedeemCode)
//   4. Log message can be anything, e.g. {{ metaobject.formSubmittedBy.id }}
//
// Input (GraphQL) — only AFTER metafields are registered via Log output:
// query {
//   metaobject {
//     formSubmittedBy {
//       id
//       loyaltyPoints {
//         value
//       }
//       loyaltyRedeemCode {
//         value
//       }
//     }
//   }
// }
//
// Do NOT use: root "customer", email field, or metafield() aliases in the query.
//
// Define outputs (GraphQL):
// type Output {
//   "Discount code to create (empty if not eligible)"
//   discountCode: String!
//   "Customer points balance after redemption"
//   newLoyaltyPoints: String!
//   "GBP value of the reward"
//   redeemValueGbp: String!
//   "true when customer already has an unused code"
//   reused: String!
// }
//
// Next steps in Flow (after Run code):
// 1. Condition: discountCode is not empty
// 2. Condition: reused equals false
// 3. Send Admin API request → discountCodeBasicCreate (see REDEEM-SETUP.md)
// 4. Update customer metafield → custom.loyalty_points = newLoyaltyPoints
// 5. Update customer metafield → custom.loyalty_redeem_code = discountCode

const REDEEM_POINTS = 100;
const REDEEM_VALUE_GBP = 5;

export default function main(input) {
  const customer = input.customer ?? input.metaobject?.formSubmittedBy;

  if (!customer) {
    return {
      discountCode: '',
      newLoyaltyPoints: '0',
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'false',
    };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const existingCode = String(customer.loyaltyRedeemCode?.value ?? '').trim();

  if (existingCode) {
    return {
      discountCode: existingCode,
      newLoyaltyPoints: String(current),
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'true',
    };
  }

  if (current < REDEEM_POINTS) {
    return {
      discountCode: '',
      newLoyaltyPoints: String(current),
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'false',
    };
  }

  const customerId = String(customer.id ?? '').replace(/\D/g, '') || '0';
  const code = `KORI-${customerId}-${Date.now().toString(36).toUpperCase()}`;
  const newBalance = Math.max(0, current - REDEEM_POINTS);

  return {
    discountCode: code,
    newLoyaltyPoints: String(newBalance),
    redeemValueGbp: String(REDEEM_VALUE_GBP),
    reused: 'false',
  };
}
