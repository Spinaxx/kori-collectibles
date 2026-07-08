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

### Step 3 — Register metafields (required — fixes GraphQL errors)

If Run code shows:

> Field `loyaltyPoints` doesn't exist on type `Customer`  
> Field `loyaltyRedeemCode` doesn't exist on type `Customer`

That is **expected** until Flow knows those aliases. `loyaltyPoints` is not a built-in customer field — it is Flow's name for **`custom.loyalty_points`**, which you must register first (same idea as mapping `loyaltyPoints` in your award flow).

Pick **one** method:

#### Method A — Log output (recommended)

On the **Yes** branch from step 2, **before** Run code:

1. **Then → Log output**
2. Click **Add variable** (do not type metafield paths in the message box)
3. Path: **Metaobject → formSubmittedBy → Metafields → loyalty_points**
4. When Flow asks for an alias, enter exactly: **`loyaltyPoints`**
5. **Add variable** again → same path → **loyalty_redeem_code** → alias **`loyaltyRedeemCode`**
6. Log message: `{{ metaobject.formSubmittedBy.id }}`
7. **Save** the workflow

#### Method B — Run code mapper (like award flow)

1. Add **Run code** and paste the GraphQL query from step 4 below (errors are OK)
2. Scroll **below** the Input query — Flow lists unmapped fields
3. Map **`loyaltyPoints`** → **Metaobject → formSubmittedBy → `custom.loyalty_points`**
4. Map **`loyaltyRedeemCode`** → **Metaobject → formSubmittedBy → `custom.loyalty_redeem_code`**
5. Errors should clear once both mappings are set

**Common mistakes**

- Log output on the **No** branch instead of **Yes**
- Log output **after** Run code instead of before
- Typing `loyalty_points` in the log message instead of using **Add variable**
- Mapping to **`custom_loyalty_points`** (wrong key — use **`loyalty_points`** only)
- Alias typo: `LoyaltyPoints` or `loyalty_points` instead of **`loyaltyPoints`**

You can delete the Log output step after Run code saves successfully.

### Step 4 — Run code

- **Then → Run code** (after step 3)
- Paste the full contents of `shopify-flow/redeem-loyalty-points.js` (from `const REDEEM_POINTS` through the closing `}`)

**Input (GraphQL)** — no `email`, no root `customer`, no `metafield()` aliases in the query:

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

If errors persist, step 3 is incomplete — save the workflow after Log output, then reopen Run code.

**Define outputs (GraphQL)** — paste this in the **Define outputs** box on the Run code step. Flow will **not** show `loyaltyPointsTagRemove` (or the other tag fields) until this block is saved:

```graphql
type Output {
  "Discount code to create (empty if not eligible)"
  discountCode: String!
  "Customer points balance after redemption"
  newLoyaltyPoints: String!
  "GBP value of the reward"
  redeemValueGbp: String!
  "true when customer already has an unused code"
  reused: String!
  "Customer tag for the new balance"
  loyaltyPointsTag: String!
  "Customer tag to remove before updating balance"
  loyaltyPointsTagRemove: String!
  "Customer tag for the active discount code"
  loyaltyCodeTag: String!
  "Previous code tag to remove (empty if none)"
  loyaltyCodeTagRemove: String!
}
```

Then **re-paste** the JavaScript from `shopify-flow/redeem-loyalty-points.js` (the `export default function main` part), **Save** the workflow, and reopen the Run code step. The tag outputs should appear under **Run code** in the variable picker.

If they still do not appear, delete the Run code step, add a new one, paste input query + outputs + script again, and reconnect the following steps.

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

Use the variable picker for Liquid fields if typing `{{ }}` is awkward. Hardcode `"5.00"` to match theme settings (`loyalty_redeem_value_gbp`). **Do not add `endsAt`** — omit it so the discount never expires.

### Step 8 — Deduct points

- **Then → Update customer metafield**
- Customer: **Metaobject → formSubmittedBy → id**
- Metafield: `custom.loyalty_points`
- Value: **Run code → newLoyaltyPoints**

### Step 9 — Save code for storefront (required)

The rewards page reads `custom.loyalty_redeem_code` to display the code. **Without this step, the discount exists in admin but customers never see it on the storefront.**

- **Then → Update customer metafield**
- Customer: **Metaobject → formSubmittedBy → id**
- Metafield: `custom.loyalty_redeem_code` (namespace `custom`, key `loyalty_redeem_code`)
- Value: **Run code → discountCode** (pick from variable picker — do not type it)

In **Settings → Custom data → Customers → Loyalty redeem code**, enable **Storefront API access** (read).

### Step 10 — Sync customer tags (required for storefront display)

Shopify **does not reliably expose customer metafields to the theme**, even when admin shows the correct values. The theme reads **customer tags** instead — no app required.

After step 9, on the same branch:

**Remove old tags**

- **Then → Remove customer tags**
- Customer: **Metaobject → formSubmittedBy → id**
- Tags: **Run code → loyaltyPointsTagRemove**
- Add a second remove step (or comma-separate if Flow allows) for **Run code → loyaltyCodeTagRemove** — only when that output is not empty (skip if you cannot condition on empty; removing a missing tag is safe)

**Add new tags**

- **Then → Add customer tags**
- Customer: **Metaobject → formSubmittedBy → id**
- Tags: **Run code → loyaltyPointsTag**
- Add **Run code → loyaltyCodeTag** when discount was created

Tag format the theme expects:

| Tag | Example |
|-----|---------|
| Points balance | `loyalty-points:150` |
| Active discount code | `loyalty-code:KORI-123-ABC` |

**One-time fix for existing customers:** Admin → **Customers** → open the customer → **Tags** → add `loyalty-points:XXX` (match their metafield balance) and `loyalty-code:YYY` if they have an active code. Refresh `/pages/rewards`.

Add the same **Remove / Add customer tags** steps to your **award** and **cancel** Flow workflows (outputs are in `award-loyalty-on-order-paid.js` and `deduct-loyalty-on-order-cancelled.js`).

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
| `loyaltyPoints` / `loyaltyRedeemCode` not on Customer | **Expected until step 3 is done.** Add Log output before Run code, or map both fields below the Run code query. Save workflow, then reopen Run code. |
| Run code GraphQL errors | No root `customer`, no `email`, no `metafield()` aliases in the query |
| Run code shows 0 points | Confirm Log output aliases; metafield key is `loyalty_points` not `custom_loyalty_points` |
| `newLoyaltyPoints` not in metafield step | Pick it from **Run code** outputs in the variable picker — do not type it |
| `loyaltyPointsTagRemove` not in variable picker | Paste the full **Define outputs** GraphQL block from step 4 (includes all four tag fields). Save workflow, re-paste JS, reopen Run code. |
| Discount create fails | Store needs discount permissions; try hardcoded `"amount": "5.00"` |
| No code on storefront | Add **step 9** (metafield) and **step 10** (customer tags). |
| Code/balance in admin but not on site | Add customer tags (step 10). Metafields alone are not enough for the theme. |
| Balance shows 0 but admin has points | Add tag `loyalty-points:XXX` on the customer in admin, or add tag sync steps to award/redeem Flow. |
| Discount expires too soon | Remove `endsAt` from the discount mutation (see step 7) |
| Customer not signed in | `formSubmittedBy` is empty — form must be submitted while logged in |

---

## Flow vs app proxy (optional)

| | Flow + Form | App proxy (`loyalty-redeem/`) |
|--|-------------|-------------------------------|
| Setup | Manual Flow (~10 min) | Deploy worker + custom app |
| Instant code on screen | No — refresh page | Yes |
| Customer must be signed in | Yes | Yes |
