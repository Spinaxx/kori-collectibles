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

### Step 3 — Log output (register metafields)

Flow cannot read customer metafields in Run code until they are added to the workflow environment. This is the same reason your **award/cancel** flows work when imported (they ship with metafield mappings baked in).

On the **Yes** branch, **before** Run code:

1. **Then → Log output**
2. **Add variable** → **Metaobject → formSubmittedBy** → choose metafield **`custom.loyalty_points`**
   - When prompted for an alias, use **`loyaltyPoints`**
3. **Add variable** again → **Metaobject → formSubmittedBy** → **`custom.loyalty_redeem_code`**
   - Alias: **`loyaltyRedeemCode`**
4. Log message: `{{ metaobject.formSubmittedBy.id }}` (content does not matter)

You can delete this Log step later once Run code saves successfully.

### Step 4 — Run code

- **Then → Run code**
- Paste the full contents of `shopify-flow/redeem-loyalty-points.js` (from `const REDEEM_POINTS` through the closing `}`)

**Input (GraphQL)** — only after Step 3. No `email`, no root `customer`, no `metafield()` in the query:

```graphql
query {
  metaobject {
    formSubmittedBy {
      id
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

If you still see *Cannot query field "loyaltyPoints"*, the Log output step is missing or the metafields were not added with aliases `loyaltyPoints` / `loyaltyRedeemCode`.

**Outputs** — Flow should detect these from the script; if prompted, define:

- `discountCode` (String)
- `newLoyaltyPoints` (String)
- `redeemValueGbp` (String)
- `reused` (String)

### Step 5 — Condition (has a code)

- **Then → Condition**
- **Run code → discountCode** → **is not empty**

### Step 6 — Condition (not reusing old code)

- On **Yes** from step 5: **Then → Condition**
- **Run code → reused** → **equals** → `false`

### Step 7 — Create discount

- On **Yes** from step 6: **Then → Send Admin API request**
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

### Step 8 — Deduct points

- **Then → Update customer metafield**
- Customer: **Metaobject → formSubmittedBy → id**
- Metafield: `custom.loyalty_points`
- Value: **Run code → newLoyaltyPoints**

### Step 9 — Save code for storefront

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
| `loyaltyPoints` / `loyaltyRedeemCode` not on Customer | Add **Log output** before Run code; register both metafields with those alias names |
| Run code GraphQL errors | No root `customer`, no `email`, no `metafield()` aliases in the query |
| Run code shows 0 points | Confirm Log output aliases; metafield key is `loyalty_points` not `custom_loyalty_points` |
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
