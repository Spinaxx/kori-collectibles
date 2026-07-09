# Award & cancel loyalty Flow setup

The theme reads the customer **tag** `loyalty-points:150` on the storefront (metafields alone are not enough). Both workflows must update the metafield **and** sync tags.

**Cancel flow must know exactly how many points were awarded on that order.** Save `custom.loyalty_points_awarded` on the order when paid — cancel reads that value. Without it, cancelled orders often have **subtotal 0** and the old script wrongly deducted the full order **total**, zeroing the customer.

---

## Metafield definitions (one-time)

**Settings → Custom data**

| Owner | Name | Key | Type |
|-------|------|-----|------|
| Customer | Loyalty points | `custom.loyalty_points` | Integer |
| Customer | Loyalty redeem code | `custom.loyalty_redeem_code` | Single line text |
| Order | Loyalty points awarded | `custom.loyalty_points_awarded` | Integer |

Delete **`custom_loyalty_points`** on customers if it exists — wrong duplicate.

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
      tags
    }
  }
}
```

Map **`loyaltyPoints`** → customer metafield **`custom.loyalty_points`**.

**Define outputs (GraphQL):**

```graphql
type Output {
  "The new loyalty points total as a string"
  newLoyaltyPoints: String!
  "Points earned on this order"
  pointsAwarded: String!
  "Customer tag to add"
  loyaltyPointsTag: String!
  "Customer tag to remove first"
  loyaltyPointsTagRemove: String!
}
```

4. **Update customer metafield**  
   - Customer: **Order → Customer**  
   - Metafield: **Loyalty points** (`custom.loyalty_points`)  
   - Value: **Run code → newLoyaltyPoints**

5. **Update order metafield** ← **required for correct cancel**  
   - Order: **Order**  
   - Metafield: **Loyalty points awarded** (`custom.loyalty_points_awarded`)  
   - Value: **Run code → pointsAwarded**

6. **Remove customer tags** → **Run code → loyaltyPointsTagRemove**

7. **Add customer tags** → **Run code → loyaltyPointsTag**

8. **Save** → **Turn on workflow**

Awards **1 point per £1** subtotal (`Math.round(subtotal)`).

---

## Deduct points (order cancelled)

**File:** `shopify-flow/deduct-loyalty-on-order-cancelled.js`

**No Log output step** — it cannot read customer metafields and will show 0.

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
    loyaltyPointsAwarded {
      value
    }
    customer {
      loyaltyPoints {
        value
      }
      tags
    }
  }
}
```

Map **`loyaltyPoints`** → customer **`custom.loyalty_points`**.  
Map **`loyaltyPointsAwarded`** → order **`custom.loyalty_points_awarded`**.

**Define outputs (GraphQL):**

```graphql
type Output {
  "The new loyalty points total"
  newLoyaltyPoints: String!
  "Customer tag to add"
  loyaltyPointsTag: String!
  "Customer tag to remove first"
  loyaltyPointsTagRemove: String!
  "Points removed on this cancellation"
  pointsDeducted: String!
}
```

4. **Update customer metafield**  
   - Customer: **Order → Customer**  
   - Metafield: **Loyalty points** (`custom.loyalty_points`)  
   - Value: **Run code → newLoyaltyPoints**

5. **Remove customer tags** → **Run code → loyaltyPointsTagRemove**

6. **Add customer tags** → **Run code → loyaltyPointsTag**

7. **Save** → **Turn on workflow**

Deducts **`loyalty_points_awarded` on the order** (e.g. 144). Falls back to subtotal only if that order metafield is missing. **Never uses order total.**

---

## Fix your customer after a bad cancel

If balance should be **727** (871 − 144):

1. **Customers** → open customer  
2. **Loyalty points** metafield → **727**  
3. **Tags** → remove all `loyalty-points:...` tags → add **`loyalty-points:727`**

---

## If tag outputs are missing in Flow

Flow only shows outputs after you paste the **Define outputs** GraphQL block, save, re-paste JavaScript, and reopen Run code.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cancel zeroed balance (871 → 0) | Old script used order **total** when subtotal was 0. Update cancel JS; add order metafield step to **award** flow |
| Should deduct 144, deducted everything | Add **Update order metafield** on award; map `loyaltyPointsAwarded` on cancel Run code inputs |
| Tag not updated / old tag remains | `loyaltyPointsTagRemove` used wrong balance (0). Updated script reads metafield + `loyalty-points:` tag |
| Cancel flow sets balance to 0 | `loyaltyPoints` not mapped to `custom.loyalty_points` |
| `Value must be an integer` | Wrong key `custom_loyalty_points`; value has `{{ }}` or blank lines — use **Run code → newLoyaltyPoints** only |
| Flow writes unstructured metafield | Recreate Update metafield step; pick **Loyalty points** definition from list |
