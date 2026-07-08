# Kori Collectibles — custom Shopify theme

A from-scratch Online Store 2.0 theme for a UK TCG shop, taking structure cues from Chaos Cards, The Card Vault, and Magic Madhouse — without copying their look.

## Storefront patterns included

- Sticky header with mega menu + mobile drawer + search modal
- Announcement strip (shipping / restocks)
- Homepage: hero with random in-stock single (£5+), shop-by-game tiles, featured products, promo cards, trust strip
- Collection pages with filters, sort, mobile filter sheet
- Product page with variant picker + add to cart
- Cart with free-shipping progress threshold
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

## Loyalty rewards (Kori Collectors Club)

The theme includes a rewards page, header points badge, and cart earn preview. **Points are stored on each customer's shop account** via a customer metafield — the theme displays the balance but does not award points by itself.

### 1. Enable customer accounts

Shopify admin → **Settings → Customer accounts**. Use Shopify-hosted accounts (recommended).

### 2. Create the customer metafield

Admin → **Settings → Custom data → Customers → Add definition**

- Name: `Loyalty points`
- Namespace and key: `custom.loyalty_points`
- Type: **Integer**

### 3. Create the rewards page

Admin → **Online store → Pages → Add page**

- Title: `Rewards` (handle `/pages/rewards`)
- Theme template: **rewards**

Then **Theme settings → Loyalty rewards** → pick the Rewards page.

### 4. Award points after orders (pick one)

**Option A — Shopify Flow** (Shopify plan and above)

1. Apps → **Flow** → Create workflow
2. Trigger: **Order paid**
3. Condition: Customer is not null
4. Action: **Update customer metafield** `custom.loyalty_points`
5. Value: current balance + (`order subtotal in GBP` × points rate)

**Option B — Loyalty app** (any plan)

Install [Smile.io](https://apps.shopify.com/smile-io), Rivo, or similar. Point the theme metafield setting at the app's field, or use the app's own widgets.

### 5. Redemption

Automatic checkout redemption needs an app or custom Shopify app. Until then, redeem manually with discount codes or store credit when customers contact you.
