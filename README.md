# Kori Collectibles — custom Shopify theme

A from-scratch Online Store 2.0 theme for a UK TCG shop, taking structure cues from Chaos Cards, The Card Vault, and Magic Madhouse — without copying their look.

## Storefront patterns included

- Sticky header with mega menu + mobile drawer + search modal
- Announcement strip (shipping / restocks)
- Homepage: hero with random in-stock single (£5+), shop-by-game tiles, featured products, promo cards, trust strip
- Collection pages with filters, sort, mobile filter sheet
- Product page with variant picker + add to cart
- Cart with free-shipping progress threshold
- Native loyalty panel (Shopify Flow + customer metafield)
- Search, pages, collections list, 404

## Theme editor setup

1. Connect/publish this GitHub theme
2. **Navigation** → ensure `main-menu` has Singles / Sealed / Games etc.
3. Homepage **Hero** → set Singles collection
4. **Featured collection** → pick New Arrivals / Singles
5. **Game grid** + **Promo cards** → link each tile to the right collection
6. Theme settings → upload logo, set social links

## Product tips

- Use product type or tags `single` / `singles` for singles (or assign a Singles collection on the hero)
- Tag sealed as `sealed` / `etb` / product type containing booster
- Tag `preorder` for the pre-order badge

## Loyalty rewards (Shopify Flow)

Native rewards with a Smile-style floating button and panel. Points live on each customer as a metafield and are awarded by **Shopify Flow**.

You can uninstall Smile.io and disable its app embed in the theme editor.

### 1. Customer metafields

Admin → **Settings → Custom data → Customers → Add definition**

- Name: `Loyalty points`
- Namespace and key: `custom.loyalty_points`
- Type: **Integer**
- **Storefront API access:** read (required for the theme to display the balance)

**Only use this one definition.** Do not create a second metafield with key `custom_loyalty_points` — that is a different field and causes award/cancel/theme to disagree on the balance.

The storefront reads `custom.loyalty_points` everywhere via **Theme settings → Loyalty rewards → Customer points metafield** (default `custom.loyalty_points`). The rewards page uses the same source — it no longer has its own metafield setting.

Admin → **Settings → Custom data → Orders → Add definition**

- Name: `Loyalty points awarded`
- Namespace and key: `custom.loyalty_points_awarded`
- Type: **Integer**
- Info: Set by Flow when points are awarded so cancellations can deduct the exact amount.

### 2. Award points (order paid)

Apps → **Flow** → Create workflow:

1. **Trigger:** Order paid
2. **Condition:** Customer is not null
3. **Action:** Run code — paste `shopify-flow/award-loyalty-on-order-paid.js`

   **Select inputs** (GraphQL):

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

   In the input mapper, connect `loyaltyPoints` to the customer metafield `custom.loyalty_points`.

   **Define outputs** (GraphQL):

   ```graphql
   type Output {
     "The new loyalty points total as a string"
     newLoyaltyPoints: String!
   }
   ```

4. **Action:** Update customer metafield → `custom.loyalty_points` = **Run code → newLoyaltyPoints**

5. **(Optional but recommended)** Add a second Run code output or a separate calculation step, then **Update order metafield** → `custom.loyalty_points_awarded` = points earned (`Math.round` of order subtotal). This makes cancellations exact. If you skip this, the cancel flow can still fall back to the subtotal formula.

Awards **1 point per £1** of subtotal (`Math.round(subtotal)`). Match the rate in **Theme settings → Loyalty rewards → Points earned per £1**.

### 3. Deduct points (order cancelled)

**Delete any Log output step** — Flow cannot read customer metafields with liquid dot notation, so Log output will show `0` even when the customer has 286 points.

Mirror the award flow:

1. **Trigger:** Order cancelled
2. **Condition:** `order.customer.id` is not empty
3. **Run code** — paste `shopify-flow/deduct-loyalty-on-order-cancelled.js`

   **Select inputs** (GraphQL):

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

   **Critical:** below the query, map `loyaltyPoints` → customer metafield **`loyalty_points`** (namespace `custom`). This is the same mapping as your working award flow — without it, current balance reads as `0` and the workflow wipes points.

   **Define outputs** (GraphQL):

   ```graphql
   "The output of Run Code"
   type Output {
     "The new loyalty points total"
     newLoyaltyPoints: String!
   }
   ```

4. **Update customer metafield**
   - Customer: `order.customer.id`
   - Metafield: namespace `custom`, key `loyalty_points`
   - Value: **Add variable** → **Run code** → **newLoyaltyPoints**

The code does: `new balance = current balance - round(order total)`, minimum 0. It falls back to `totalPriceSet` if subtotal is `0` on cancelled orders.

Or import `shopify-flow/Deduct loyalty points on order cancelled.flow` directly in Flow, then re-check the `loyaltyPoints` mapping in Run code inputs.

### 4. Theme settings

**Theme settings → Loyalty rewards**

- Enable rewards program
- Show floating rewards button
- Set redeem threshold (default 100 points = £5 off)
- Redemption email (where customers claim rewards)

### 5. Optional rewards page

Create a page with the **rewards** template for full program details.

### Redemption

When a customer has enough points, the panel shows **Email to redeem**. Send them a discount code manually (or build a second Flow later to automate it).

### Testing

1. Create a test customer account
2. Place an order while signed in
3. After payment, check the customer metafield and `loyalty_points_awarded` on the order in admin
4. Cancel the order — customer points should drop by the awarded amount
5. Sign in on the storefront — balance should show in the account drawer and rewards panel

### Troubleshooting: two different point balances

If `custom.loyalty_points` and Flow’s `loyaltyPoints` show different numbers, you have **two customer metafields** and the workflows are not using the same one.

| What you see | Namespace | Key | Used by |
|---|---|---|---|
| **Correct (theme)** | `custom` | `loyalty_points` | Storefront, should be used by both Flows |
| **Wrong duplicate** | `custom` | `custom_loyalty_points` | Often created by a misconfigured cancel flow |

`loyaltyPoints` in Run code is **not** a separate Shopify field — it is Flow’s alias for whichever customer metafield you map it to in the Run code input picker. If that mapping points at `custom_loyalty_points` while the update step writes to `loyalty_points` (or vice versa), reads and writes hit different fields.

**Fix:**

1. Admin → **Settings → Custom data → Customers** — check for both `loyalty_points` and `custom_loyalty_points`.
2. Open a test customer in admin — note which field has the real balance (e.g. 286).
3. Copy that value into **`custom.loyalty_points`** if needed.
4. In **both** Flow workflows (award + cancel):
   - Run code input mapper: `loyaltyPoints` → **`loyalty_points`** (not `custom_loyalty_points`)
   - Update customer metafield action: namespace `custom`, key **`loyalty_points`**
5. Delete the stray `custom_loyalty_points` definition once balances are consolidated (optional but recommended).
