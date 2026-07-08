# Redeem loyalty points with Shopify Flow (no custom app)

Shopify Flow creates the discount, deducts points, and saves the code to `custom.loyalty_redeem_code`. The theme form button only submits your **Shopify Form** — Flow does the rest.

> **Note:** `.flow` file import does **not** work for Shopify Forms workflows (they contain store-specific metaobject IDs). Build the workflow in the Flow editor — takes about 10 minutes. The cancel-points flow imports fine because it uses a standard order trigger; Forms workflows do not.

## How it works

1. Customer with ≥ 100 points clicks **Get my discount code** on `/pages/rewards`.
2. They submit your **Redeem loyalty points** Shopify Form (must be signed in).
3. Flow runs → creates a single-use £5 code → deducts 100 points → saves code to `custom.loyalty_redeem_code`.
4. Customer refreshes the rewards page → **Apply to cart** shows the code.

---

## 1. Metafields

You should already have `custom.loyalty_points`. Also add:

| Name | Key | Type | Storefront read |
|------|-----|------|-----------------|
| Loyalty redeem code | `custom.loyalty_redeem_code` | Single line text | **Yes** |

---

## 2. Shopify Form

1. **Settings → Apps → Shopify Forms** (install if needed).
2. Create form **Redeem loyalty points** — one confirm field is enough.
3. Success message: *"Your code is being generated — refresh this page in a few seconds."*
4. In the **theme editor**, on the rewards page, add the **Shopify Forms** block at `#loyalty-redeem-form`.

---

## 3. Build the Flow workflow (manual)

**Apps → Flow → Create workflow**

### Step 1 — Trigger

- Search **Metaobject entry created**
- In **Metaobject definition**, select **Redeem loyalty points** (your form)

### Step 2 — Condition (signed-in only)

- **Then → Condition**
- Variable: **Metaobject → formSubmittedBy → id**
- Operator: **is not empty**

### Step 3 — Run code

- On the **Yes** branch: **Then → Run code**
- Paste the full contents of `shopify-flow/redeem-loyalty-points.js` (from `const REDEEM_POINTS` through the closing `}`)

**Input (GraphQL)** — paste exactly this (no `customer` at root, no `metafield()` aliases):

```graphql
query {
  metaobject {
    formSubmittedBy {
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
}
```

Then use the **input mapper** below the query (same as your working award/cancel flows — do not write `loyaltyPoints: metafield(...)` in the query):

- `loyaltyPoints` → **Customer metafield** `custom.loyalty_points`
- `loyaltyRedeemCode` → **Customer metafield** `custom.loyalty_redeem_code`

If Flow shows *"Cannot query field customer"* or *"alias is not allowed"*, delete the query and paste the block above again.

**Outputs** — Flow should detect these from the script; if prompted, define:

- `discountCode` (String)
- `newLoyaltyPoints` (String)
- `redeemValueGbp` (String)
- `reused` (String)

### Step 4 — Condition (has a code)

- **Then → Condition**
- **Run code → discountCode** → **is not empty**

### Step 5 — Condition (not reusing old code)

- On **Yes** from step 4: **Then → Condition**
- **Run code → reused** → **equals** → `false`

### Step 6 — Create discount

- On **Yes** from step 5: **Then → Send Admin API request**
- Mutation: **discountCodeBasicCreate**
- Mutation inputs:

```json
{
  "basicCodeDiscount": {
    "title": "Loyalty reward {{ runCode.discountCode }}",
    "code": "{{ runCode.discountCode }}",
    "startsAt": "{{ 'now' | date: '%Y-%m-%dT%H:%M:%SZ' }}",
    "endsAt": "{{ 'now' | date: '%s' | plus: 172800 | date: '%Y-%m-%dT%H:%M:%SZ' }}",
    "customerSelection": {
      "customers": {
        "add": ["{{ metaobject.formSubmittedBy.id }}"]
      }
    },
    "customerGets": {
      "value": {
        "discountAmount": {
          "amount": "5.00",
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

Use the variable picker for Liquid fields if typing `{{ }}` is awkward. Hardcode `"5.00"` to match theme settings (`loyalty_redeem_value_gbp`).

### Step 7 — Deduct points

- **Then → Update customer metafield**
- Customer: **Metaobject → formSubmittedBy → id**
- Metafield: `custom.loyalty_points`
- Value: **Run code → newLoyaltyPoints**

### Step 8 — Save code for storefront

- **Then → Update customer metafield**
- Customer: **Metaobject → formSubmittedBy → id**
- Metafield: `custom.loyalty_redeem_code`
- Value: **Run code → discountCode**

### Turn on

**Save** → **Turn on workflow**.

---

## 4. Theme settings

**Theme settings → Loyalty rewards → Redemption method** → **Shopify Flow (form)**

---

## 5. Test

1. Sign in as a customer with ≥ 100 points.
2. Go to `/pages/rewards` → **Get my discount code** → submit the form.
3. Wait ~10 seconds, refresh the page — code should appear.
4. In admin, confirm `loyalty_points` dropped by 100.

Check **Flow → Run history** if anything fails.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `.flow` import fails | Expected — build manually (section 3). Forms workflows are store-specific. |
| Flow never runs | Wrong form on trigger; workflow not turned on; customer not signed in |
| Run code GraphQL errors | No root `customer`; no aliases like `loyaltyPoints: metafield(...)`. Use query above + input mapper |
| Run code shows 0 points | Map `loyaltyPoints` to `loyalty_points` key, not `custom_loyalty_points` |
| `newLoyaltyPoints` not in metafield step | Pick it from **Run code** outputs in the variable picker — do not type it |
| Discount create fails | Store needs discount permissions; try hardcoded `"amount": "5.00"` |
| No code on storefront | Add `loyalty_redeem_code` metafield with storefront read access |
| Customer not signed in | `formSubmittedBy` is empty — form must be submitted while logged in |

---

## Flow vs app proxy

| | Flow + Form | App proxy (`loyalty-redeem/`) |
|--|-------------|-------------------------------|
| Setup | Manual Flow (~10 min) | Deploy worker + custom app |
| Instant code on screen | No — refresh page | Yes |
| Customer must be signed in | Yes | Yes |
