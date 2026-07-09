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

### Avoid duplicate unstructured metafields

Shopify stores **defined** metafields (Custom data) and **unstructured** metafields separately. Flow can write to the wrong one even when namespace/key look identical.

**Symptoms:** Defined **Loyalty points** stays stale; a second identical value appears under **Unstructured metafields** on the customer.

**Fix (award, cancel, redeem — all workflows):**

1. **Delete** every **Update customer metafield** step that writes `loyalty_points`.
2. **Add a new** Update customer metafield step.
3. For **Metafield**, use the **dropdown / picker** and choose the definition named **Loyalty points** — do not type namespace and key by hand.
4. Confirm it shows **`custom.loyalty_points`** tied to the **definition** (you should see the definition name, not a blank custom entry).
5. **Value:** Add variable → **Run code → newLoyaltyPoints** only.
6. In **Run code input mapper**, map **`loyalty_points`** to the **same defined metafield** (Customer → Metafields → Loyalty points).

**Clean up affected customers:** Admin → Customer → delete the unstructured `loyalty_points` entry → set the **defined** Loyalty points field to the correct total.

**Definition must exist first:** Settings → Custom data → Customers → **Loyalty points** → namespace `custom`, key `loyalty_points`, type **Integer**.

If Update customer metafield keeps creating unstructured copies, use **Send Admin API request** instead (see below).

#### Alternative: Send Admin API request (defined metafield write)

Replace **Update customer metafield** with **Send Admin API request**:

- Mutation: **metafieldsSet**
- Variables:

```json
{
  "metafields": [
    {
      "ownerId": "{{ order.customer.id }}",
      "namespace": "custom",
      "key": "loyalty_points",
      "type": "number_integer",
      "value": "{{ runCode.newLoyaltyPoints }}"
    }
  ]
}
```

Use the variable picker for `ownerId` and `value` — do not type liquid with blank lines. This writes to the defined integer field when the definition exists.

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
      loyalty_points {
        value
      }
      tags
    }
  }
}
```

Map **`loyalty_points`** → customer metafield **`custom.loyalty_points`**.

Use **snake_case** in the query (`loyalty_points`, not `loyaltyPoints`). Flow names GraphQL fields after the metafield key.

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
    loyalty_points_awarded {
      value
    }
    customer {
      loyalty_points {
        value
      }
      tags
    }
  }
}
```

Map **`loyalty_points`** → customer **`custom.loyalty_points`**.  
Map **`loyalty_points_awarded`** → order **`custom.loyalty_points_awarded`**.

If you see `Cannot query field "loyalty_points_awarded" on type "Order"`, create the **order** metafield definition first, **save** the workflow, then reopen Run code.

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
| `Cannot query field loyaltyPoints on Customer` | Use **`loyalty_points`** (snake_case) in the GraphQL query, not `loyaltyPoints` |
| `Cannot query field loyaltyPointsAwarded on Order` | Create order metafield `loyalty_points_awarded`; use **`loyalty_points_awarded`** in query |
| Cancel flow sets balance to 0 | `loyalty_points` not mapped to `custom.loyalty_points` in input mapper |
| `Value must be an integer` | Wrong key `custom_loyalty_points`; value has `{{ }}` or blank lines — use **Run code → newLoyaltyPoints** only |
| Flow writes unstructured metafield | Recreate Update step; pick **Loyalty points** definition from dropdown; or use **metafieldsSet** Admin API mutation |
