// Redeem flow — paste into Shopify Flow → Run code
//
// Trigger: Metaobject entry created (your "Redeem loyalty points" Shopify Form)
//
// STEP 1 — Register metafields (pick one method before the query will save):
//
// Method A — Log output BEFORE Run code (Forms workflows)
//   Add variable → Metaobject → formSubmittedBy → Metafields → loyalty_points
//   Add variable → Metaobject → formSubmittedBy → Metafields → loyalty_redeem_code
//   Log: {{ metaobject.formSubmittedBy.id }}
//   Save workflow, reopen Run code
//
// Method B — Input mapper below the query
//   loyaltyPoints → Metaobject → formSubmittedBy → custom.loyalty_points
//   loyaltyRedeemCode → Metaobject → formSubmittedBy → custom.loyalty_redeem_code
//
// STEP 2 — Input (GraphQL) — use camelCase on Customer (Forms redeem flow):
//   loyaltyPoints / loyaltyRedeemCode  ← redeem (Forms)
//   loyalty_points                     ← award & cancel (order.customer) only
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
// STEP 3 — Define outputs (GraphQL) — paste ALL fields before the script:
// type Output {
//   discountCode: String!
//   newLoyaltyPoints: String!
//   redeemValueGbp: String!
//   reused: String!
//   loyaltyPointsTag: String!
//   loyaltyPointsTagRemove: String!
//   loyaltyCodeTag: String!
//   loyaltyCodeTagRemove: String!
// }
//
// STEP 4 — Paste ONLY the JavaScript below (from const REDEEM_POINTS to the final }).
// Do NOT paste the comment block or GraphQL into the script box.
//
// "2 validation errors" = Define outputs missing fields (usually loyaltyCodeTag / loyaltyCodeTagRemove)
// or script pasted without export default function main.

const REDEEM_POINTS = 100;
const REDEEM_VALUE_GBP = 5;

function readMetafield(obj, snakeKey) {
  const value = obj?.[snakeKey]?.value;
  if (value !== null && value !== undefined) return value;
  const camelKey = snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return obj?.[camelKey]?.value;
}

function result(fields) {
  return {
    discountCode: fields.discountCode ?? '',
    newLoyaltyPoints: fields.newLoyaltyPoints ?? '0',
    redeemValueGbp: fields.redeemValueGbp ?? String(REDEEM_VALUE_GBP),
    reused: fields.reused ?? 'false',
    loyaltyPointsTag: fields.loyaltyPointsTag ?? 'loyalty-points:0',
    loyaltyPointsTagRemove: fields.loyaltyPointsTagRemove ?? 'loyalty-points:0',
    loyaltyCodeTag: fields.loyaltyCodeTag ?? '',
    loyaltyCodeTagRemove: fields.loyaltyCodeTagRemove ?? '',
  };
}

export default function main(input) {
  const customer = input.metaobject?.formSubmittedBy;

  if (!customer) {
    return result({
      discountCode: '',
      newLoyaltyPoints: '0',
      reused: 'false',
      loyaltyPointsTag: 'loyalty-points:0',
      loyaltyPointsTagRemove: 'loyalty-points:0',
    });
  }

  const current = Number(readMetafield(customer, 'loyalty_points') ?? 0);
  const existingCode = String(readMetafield(customer, 'loyalty_redeem_code') ?? '').trim();
  const pointsTagRemove = `loyalty-points:${current}`;

  if (existingCode) {
    return result({
      discountCode: existingCode,
      newLoyaltyPoints: String(current),
      reused: 'true',
      loyaltyPointsTag: `loyalty-points:${current}`,
      loyaltyPointsTagRemove: pointsTagRemove,
      loyaltyCodeTag: `loyalty-code:${existingCode}`,
    });
  }

  if (current < REDEEM_POINTS) {
    return result({
      discountCode: '',
      newLoyaltyPoints: String(current),
      reused: 'false',
      loyaltyPointsTag: `loyalty-points:${current}`,
      loyaltyPointsTagRemove: pointsTagRemove,
    });
  }

  const customerId = String(customer.id ?? '').replace(/\D/g, '') || '0';
  const code = `KORI-${customerId}-${Date.now().toString(36).toUpperCase()}`;
  const newBalance = Math.max(0, current - REDEEM_POINTS);

  return result({
    discountCode: code,
    newLoyaltyPoints: String(newBalance),
    reused: 'false',
    loyaltyPointsTag: `loyalty-points:${newBalance}`,
    loyaltyPointsTagRemove: pointsTagRemove,
    loyaltyCodeTag: `loyalty-code:${code}`,
  });
}
