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

### 1. Customer metafield

Admin → **Settings → Custom data → Customers → Add definition**

- Name: `Loyalty points`
- Namespace and key: `custom.loyalty_points`
- Type: **Integer**

### 2. Shopify Flow workflow

Apps → **Flow** → Create workflow:

1. **Trigger:** Order paid
2. **Condition:** Customer is not null
3. **Action:** Update customer metafield → `custom.loyalty_points`
4. **Value** (use Flow's variable editor):

```
{{ order.customer.metafields.custom.loyalty_points.value | default: 0 | plus: order.subtotalPriceSet.shopMoney.amount | divided_by: 100 | floor }}
```

That awards **1 point per £1** of subtotal. Match the rate in **Theme settings → Loyalty rewards → Points earned per £1**.

### 3. Theme settings

**Theme settings → Loyalty rewards**

- Enable rewards program
- Show floating rewards button
- Set redeem threshold (default 100 points = £5 off)
- Redemption email (where customers claim rewards)

### 4. Optional rewards page

Create a page with the **rewards** template for full program details.

### Redemption

When a customer has enough points, the panel shows **Email to redeem**. Send them a discount code manually (or build a second Flow later to automate it).

### Testing

1. Create a test customer account
2. Place an order while signed in
3. After payment, check the customer metafield in admin
4. Sign in on the storefront — balance should show in the header and rewards panel
