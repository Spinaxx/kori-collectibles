# Redeem loyalty points with Shopify Flow (no custom app)

Shopify Flow can **create the discount code** and **deduct points**. It cannot listen for a theme button click on its own — you need a **Flow trigger** such as a **Shopify Form submission**.

This is the recommended setup if you do not want to deploy the `loyalty-redeem/` app proxy.

## How it works

1. Customer has ≥ 100 points and clicks **Get my discount code** on the rewards page.
2. They submit a one-field **Shopify Form** (no typing needed if signed in).
3. Flow runs on **Metaobject entry created** → creates a single-use code → deducts points → saves code to `custom.loyalty_redeem_code`.
4. Customer refreshes the rewards page (or checks email if you add a Flow email step) and taps **Apply to cart**.

## 1. Customer metafields

You should already have `custom.loyalty_points`. Also add:

| Name | Namespace.key | Type | Storefront read |
|------|----------------|------|-----------------|
| Loyalty redeem code | `custom.loyalty_redeem_code` | Single line text | Yes |

## 2. Create the Shopify Form

1. Install **Shopify Forms** (free) if needed.
2. Create a form named **Redeem loyalty points**.
   - One field is enough (e.g. hidden or a simple “Confirm” message).
   - Success message: “Your code is being generated — refresh this page in a few seconds.”
3. On the **rewards page** in the theme editor, add the **Shopify Forms** app block inside the redeem section (below the offer card).

The theme includes a `#loyalty-redeem-form` anchor — point the form block there.

## 3. Import or build the Flow workflow

**Fast path:** **Apps → Flow → Import** → choose  
`shopify-flow/Redeem loyalty points.flow`

After import:

1. Open the **Metaobject entry created** trigger and select your **Redeem loyalty points** form (Shopify Forms ID **1063387**).
2. Open **Run code** and confirm `loyaltyPoints` maps to `custom.loyalty_points` and `loyaltyRedeemCode` maps to `custom.loyalty_redeem_code`.
3. Add these steps on the **Yes** branch after the last condition (in order):
   - **Send Admin API request** → `discountCodeBasicCreate` (mutation JSON below)
   - **Update customer metafield** → `custom.loyalty_points` = Run code → `newLoyaltyPoints`
   - **Update customer metafield** → `custom.loyalty_redeem_code` = Run code → `discountCode`
4. Turn the workflow **on** only after those steps are in place.

**Optional:** try `shopify-flow/Redeem loyalty points (full).flow` if you want the discount step pre-wired (may fail import on some stores).

**Import tip:** Shopify `.flow` files include a SHA256 checksum prefix. Do not edit them by hand. If import fails, pull the latest file from the repo or run `python3 shopify-flow/build-redeem-flow.py` to regenerate.

**Manual path:** **Apps → Flow → Create workflow**

### Trigger

**Metaobject entry created** → select the metaobject definition for your **Redeem loyalty points** form.

### Condition (recommended)

- **formSubmittedBy** (or customer on the metaobject) **is not empty**  
  So only signed-in customers can redeem.

- Optional: add a **Get customer data** step first, then check `loyalty_points` ≥ 100.

### Run code

Paste `shopify-flow/redeem-loyalty-points.js`.

**GraphQL inputs** — map metafields in the picker:

```graphql
query {
  customer {
    id
    email
    loyaltyPoints {
      value
    }
    loyaltyRedeemCode {
      value
    }
  }
}
```

Map `loyaltyPoints` → `custom.loyalty_points` and `loyaltyRedeemCode` → `custom.loyalty_redeem_code`.

Pass **customer** from the metaobject trigger (`formSubmittedBy` / customer reference).

**Outputs:** `discountCode`, `newLoyaltyPoints`, `redeemValueGbp`, `reused`

### Condition

`reused` **equals** `false`  
(and `discountCode` **is not empty**)

Skip discount creation if the customer already has an unused code.

### Send Admin API request

Action: **Send Admin API request**  
Mutation: `discountCodeBasicCreate`

Use **Run code → discountCode** for the code and **redeemValueGbp** for the amount. Example mutation inputs (adjust Liquid variables to match your step names):

```json
{
  "basicCodeDiscount": {
    "title": "Loyalty reward {{ runCode.discountCode }}",
    "code": "{{ runCode.discountCode }}",
    "startsAt": "{{ 'now' | date: '%Y-%m-%dT%H:%M:%SZ' }}",
    "endsAt": "{{ 'now' | date: '%s' | plus: 172800 | date: '%Y-%m-%dT%H:%M:%SZ' }}",
    "customerSelection": {
      "customers": {
        "add": ["gid://shopify/Customer/{{ customer.legacyResourceId }}"]
      }
    },
    "customerGets": {
      "value": {
        "discountAmount": {
          "amount": "{{ runCode.redeemValueGbp }}",
          "appliesOnEachItem": false
        }
      },
      "items": { "all": true }
    },
    "usageLimit": 1,
    "appliesOncePerCustomer": true
  }
}
```

If Liquid in the mutation JSON is awkward, hardcode `"amount": "5.00"` to match theme settings.

### Update customer metafields

1. `custom.loyalty_points` = **Run code → newLoyaltyPoints**
2. `custom.loyalty_redeem_code` = **Run code → discountCode**

### Optional: email the code

Add **Send internal email** or a transactional email app action with the discount code in the body.

## 4. Theme settings

**Theme settings → Loyalty rewards → Redemption method** → **Shopify Flow (form)**

No app proxy required. The redeem button scrolls to your embedded form.

## 5. Test

1. Customer with ≥ 100 points, signed in.
2. Open `/pages/rewards` → **Get my discount code** → submit the form.
3. Wait a few seconds, refresh — code should appear with **Apply to cart**.
4. Confirm `loyalty_points` dropped by 100 in admin.

## Flow vs app proxy

| | Shopify Flow + Form | App proxy (`loyalty-redeem/`) |
|--|---------------------|-------------------------------|
| Extra deploy | No | Yes (worker + custom app) |
| Instant code on screen | No — refresh or email | Yes |
| Uses Flow app only | Yes | Flow for earn/cancel; proxy for redeem |
| Customer must be signed in | Yes (form submitter) | Yes |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Flow never runs | Form metaobject trigger not selected; workflow not turned on |
| Points not deducted | Update metafield step uses `newLoyaltyPoints` from Run code |
| No code on storefront | `loyalty_redeem_code` metafield missing storefront read access |
| Discount create fails | Check `write_discounts` scope on the Flow app / API permissions |
| `loyaltyPoints` reads 0 in Run code | Map to `loyalty_points` key, not `custom_loyalty_points` |
