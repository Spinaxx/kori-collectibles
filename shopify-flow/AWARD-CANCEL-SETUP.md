# Award & cancel loyalty Flow setup

The theme reads the customer **tag** `loyalty-points:150` on the storefront (metafields alone are not enough). Both workflows must update the metafield **and** sync tags.

---

## Award points (order paid)

**File:** `shopify-flow/award-loyalty-on-order-paid.js`

### Workflow steps

1. **Trigger:** Order paid  
2. **Condition:** Customer is not null  
3. **Run code** — paste the JavaScript from `award-loyalty-on-order-paid.js`

**Input (GraphQL):**

```graphql
query {
  order {
    subtotalPriceSet {
      shopMoney {
        amount
      }
    }
    customer {
      loyaltyPoints {
        value
      }
    }
  }
}
```

Map **`loyaltyPoints`** → customer metafield **`custom.loyalty_points`**.

**Define outputs (GraphQL)** — paste exactly:

```graphql
type Output {
  "The new loyalty points total as a string"
  newLoyaltyPoints: String!
  "Customer tag to add"
  loyaltyPointsTag: String!
  "Customer tag to remove first"
  loyaltyPointsTagRemove: String!
}
```

4. **Update customer metafield**  
   - Customer: **Order → Customer** (from variable picker)  
   - Metafield: pick **Loyalty points** definition — namespace `custom`, key **`loyalty_points`**  
   - **NOT** `custom_loyalty_points` (wrong field; causes failures)  
   - Value: click **Add variable** → **Run code → newLoyaltyPoints** only — do not type `{{ }}` or paste liquid with blank lines

5. **Remove customer tags**  
   - Customer: `order.customer`  
   - Tags: **Run code → loyaltyPointsTagRemove**

6. **Add customer tags**  
   - Customer: `order.customer`  
   - Tags: **Run code → loyaltyPointsTag**

7. **Save** → **Turn on workflow**

Awards **1 point per £1** subtotal (`Math.round(subtotal)`).

---

## Deduct points (order cancelled)

**File:** `shopify-flow/deduct-loyalty-on-order-cancelled.js`

**No Log output step** — it cannot read customer metafields and will show `0`.

### Workflow steps

1. **Trigger:** Order cancelled  
2. **Condition:** `order.customer.id` is not empty  
3. **Run code** — paste the JavaScript from `deduct-loyalty-on-order-cancelled.js`

**Input (GraphQL):**

```graphql
query {
  order {
    subtotalPriceSet {
      shopMoney {
        amount
      }
    }
    totalPriceSet {
      shopMoney {
        amount
      }
    }
    customer {
      loyaltyPoints {
        value
      }
    }
  }
}
```

Map **`loyaltyPoints`** → customer metafield **`custom.loyalty_points`** (not `custom_loyalty_points`).

**Define outputs (GraphQL):**

```graphql
type Output {
  "The new loyalty points total"
  newLoyaltyPoints: String!
  "Customer tag to add"
  loyaltyPointsTag: String!
  "Customer tag to remove first"
  loyaltyPointsTagRemove: String!
}
```

4. **Update customer metafield**  
   - Customer: **Order → Customer** (from variable picker)  
   - Metafield: pick **Loyalty points** definition — namespace `custom`, key **`loyalty_points`**  
   - **NOT** `custom_loyalty_points` (wrong field; causes failures)  
   - Value: click **Add variable** → **Run code → newLoyaltyPoints** only — do not type `{{ }}` or paste liquid with blank lines

5. **Remove customer tags** → **Run code → loyaltyPointsTagRemove**

6. **Add customer tags** → **Run code → loyaltyPointsTag**

7. **Save** → **Turn on workflow**

Deducts `round(order subtotal)` points (falls back to order total if subtotal is 0 on cancelled orders).

---

## If tag outputs are missing in Flow

Flow only shows `loyaltyPointsTag` / `loyaltyPointsTagRemove` after you paste the **Define outputs** GraphQL block above, save the workflow, re-paste the JavaScript, and reopen Run code.

If they still do not appear, delete the Run code step, add a new one, paste input + outputs + script again, and reconnect the steps below it.

---

## One-time fix for existing customers

Admin → **Customers** → open customer → **Tags** → add:

`loyalty-points:XXX` (match their metafield balance)

Refresh `/pages/rewards`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cancel flow sets balance to 0 | `loyaltyPoints` not mapped to `custom.loyalty_points` in Run code inputs |
| Balance correct in admin, 0 on site | Missing tag sync steps, or no `loyalty-points:XXX` tag on customer |
| `loyaltyPointsTagRemove` not in picker | Paste Define outputs block; save; re-paste JS |
| Two different balances in admin | Duplicate metafields `loyalty_points` vs `custom_loyalty_points` — use only `loyalty_points` |
| `Value must be an integer` / value is `\n\n\n728` | Wrong key `custom_loyalty_points`; value field has typed liquid or blank lines — use variable picker **Run code → newLoyaltyPoints** only |
| Flow writes unstructured metafield | Recreate Update metafield step; pick **Loyalty points** definition from list, not free-typed namespace/key |
