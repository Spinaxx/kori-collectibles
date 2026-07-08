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

Create a second workflow:

1. **Trigger:** Order cancelled
2. **Condition:** Customer is not null (`order.customer.id` is not empty)
3. **Action:** Run code — paste `shopify-flow/deduct-loyalty-on-order-cancelled.js`

   **Select inputs** (GraphQL):

   ```graphql
   query {
     order {
       subtotalPriceSet {
         shopMoney {
           amount
         }
       }
       currentSubtotalPriceSet {
         shopMoney {
           amount
         }
       }
       totalPriceSet {
         shopMoney {
           amount
         }
       }
       totalRefundedSet {
         shopMoney {
           amount
         }
       }
       customer {
         id
         loyaltyPoints {
           value
         }
       }
     }
   }
   ```

   Map `loyaltyPoints` → customer metafield **`custom.loyalty_points`** (key: `loyalty_points`, not `custom_loyalty_points`).

   **Define outputs** (GraphQL):

   ```graphql
   type Output {
     "The customer's new loyalty points balance after deduction"
     newLoyaltyPoints: String!
   }
   ```

   The code mirrors the award flow: `earned = Math.round(order total)`, then `new balance = current - earned` (minimum 0). It tries subtotal first, then falls back to other order totals because cancelled orders often report `0` subtotal.

4. **Action:** Update customer metafield → `custom.loyalty_points` = **Run code → newLoyaltyPoints**

   Important: the key must be `loyalty_points` to match the award flow and theme.

Or import `shopify-flow/Deduct loyalty points on order cancelled.flow` directly in Flow.

**Import tip:** Shopify `.flow` files include a SHA256 checksum prefix. If import fails, use the file from the repo as-is (do not edit it by hand), or run `python3 shopify-flow/build-flow.py` to regenerate it. Import the file named `Deduct loyalty points on order cancelled.flow` (not a copy with `(1)` in the name).

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
