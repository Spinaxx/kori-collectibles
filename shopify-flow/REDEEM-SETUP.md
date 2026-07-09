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

That is **expected** until Flow registers those metafields (step 3 below).

**Redeem uses camelCase** in the GraphQL query (`loyaltyPoints`, `loyaltyRedeemCode`). Award and cancel use **snake_case** (`loyalty_points`) on `order.customer` — different Flow context, different field names.

Pick **one** method:

#### Method A — Log output (optional — skip if Method B works)

On the **Yes** branch from step 2, **before** Run code:

1. **Then → Log output**
2. In the message box, **delete everything** (no blank lines — empty message logs as `"\n"` and looks broken)
3. Type: `Customer ` then click **Add variable** → **Metaobject → formSubmittedBy → id** (inserts a chip)
4. Click **Add variable** again (separate from the message — use the step’s variable list if shown):
   - Path: **Metaobject → formSubmittedBy → Metafields → loyalty_points**
   - Alias: **`loyaltyPoints`** (exact spelling)
5. **Add variable** again:
   - Path: **loyalty_redeem_code**
   - Alias: **`loyaltyRedeemCode`**
6. Message should look like: `Customer ` + `[formSubmittedBy id chip]` — not empty, not only newlines
7. **Save** the workflow → reopen **Run code** → query errors should clear

**Log output run history showing `{ "message": "\n" }`** = message field was empty or only whitespace. Clear it and add the customer id chip as above. You can **delete** this step once Run code saves.

#### Method B — Run code mapper (try this first — no Log step needed)

1. Add **Run code** and paste the GraphQL query from step 4 below (errors are OK)
2. Scroll **below** the Input query
3. Map **`loyaltyPoints`** → **Metaobject → formSubmittedBy → `custom.loyalty_points`**
4. Map **`loyaltyRedeemCode`** → **Metaobject → formSubmittedBy → `custom.loyalty_redeem_code`**

**Common mistakes**

- Log message empty or only blank lines → run history shows `{ "message": "\n" }` — add customer id variable chip to message
- Log output on the **No** branch instead of **Yes**
- Using **`loyalty_points`** in the redeem query — Flow wants **`loyaltyPoints`** here
- Mapping to **`custom_loyalty_points`** (wrong key — use **`loyalty_points`** metafield only)

You can delete the Log output step after Run code saves successfully.

### Step 4 — Run code

**Delete** any existing Run code step and add a fresh one. Configure in this order:

#### A — Define outputs (GraphQL) — paste first

```graphql
type Output {
  discountCode: String!
  newLoyaltyPoints: String!
  redeemValueGbp: String!
  reused: String!
  loyaltyPointsTag: String!
  loyaltyPointsTagRemove: String!
  loyaltyCodeTag: String!
  loyaltyCodeTagRemove: String!
}
```

All **8 fields** are required. **"2 validation errors"** usually means `loyaltyCodeTag` and `loyaltyCodeTagRemove` are missing from this block.

#### B — Input (GraphQL)

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
      tags
    }
  }
}
```

Map **`loyaltyPoints`** and **`loyaltyRedeemCode`** in the input mapper (see step 3). Use **camelCase** — not `loyalty_points` (that is for award/cancel only).

Add **`tags`** so Run code can read `loyalty-points:XXX` when the defined metafield is empty but the tag is set.

#### C — JavaScript — paste only the script

Open `shopify-flow/redeem-loyalty-points.js` and paste **only** from `const REDEEM_POINTS = 100` through the final `}` of `export default function main`.

Do **not** paste the comment block or GraphQL into the script box.

#### D — Save

**Save** the workflow → close and reopen Run code → confirm no validation errors.

If input/output show `{ "message": "\n" }`, Run code failed validation and did not run — fix Define outputs and re-paste the script.

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
| Run code shows `{ "message": "\n" }` | Validation failed — paste all **8** Define outputs; paste script from `const REDEEM_POINTS` through `export default function main` |
| `2 validation errors` output mismatch | Define outputs missing `loyaltyCodeTag` and `loyaltyCodeTagRemove` — use the full 8-field block in step 4A |
| `loyalty_points` doesn't exist on Customer (redeem) | Wrong — redeem query must use **`loyaltyPoints`** and **`loyaltyRedeemCode`** (camelCase) |
| `loyaltyPoints` is null in run history | Mapper points at empty/wrong metafield, or balance only on **tag** — add `tags` to query; fix mapper to **Loyalty points** definition; set defined field value on customer |
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
