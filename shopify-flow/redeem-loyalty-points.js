// Redeem flow — paste into Shopify Flow → Run code
//
// Trigger: Metaobject entry created (your "Redeem loyalty points" Shopify Form)
//
// ⚠️  If you see: Field 'loyaltyPoints' doesn't exist on type 'Customer'
//     Flow has not registered your metafield aliases yet. Do ONE of the two options
//     below BEFORE the query will save. The error is normal until you do this.
//
// OPTION A — Log output (recommended for Forms workflows)
//   1. On the Yes branch, add Log output BEFORE Run code
//   2. Click "Add variable" → Metaobject → formSubmittedBy → Metafields → loyalty_points
//      Alias MUST be exactly: loyaltyPoints
//   3. Add variable again → same path → loyalty_redeem_code
//      Alias MUST be exactly: loyaltyRedeemCode
//   4. Log message: {{ metaobject.formSubmittedBy.id }}
//   5. Save the workflow, then open Run code — the GraphQL errors should clear
//
// OPTION B — Run code input mapper (same as award flow)
//   1. Paste the GraphQL query below (errors are OK for now)
//   2. Scroll BELOW the query — Flow shows mapping rows for loyaltyPoints / loyaltyRedeemCode
//   3. Map loyaltyPoints → Metaobject → formSubmittedBy → custom.loyalty_points
//   4. Map loyaltyRedeemCode → Metaobject → formSubmittedBy → custom.loyalty_redeem_code
//   5. Do NOT map to custom_loyalty_points — that is a different metafield
//
// Input (GraphQL) — only AFTER metafields are registered (Option A or B):
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
