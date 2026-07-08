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

## Loyalty rewards (Smile.io)

The theme is wired for **Smile.io** by default. Smile handles earning points, redemption, and the rewards panel.

### Theme checklist

1. **Theme editor** → App embeds → enable **Smile.io**
2. **Smile Admin** → Settings → **Developer tools** → enable **JavaScript SDK** (needed for header/cart point balances)
3. **Smile Admin** → Settings → **Platform** → **Apply Smile** if the launcher is missing
4. **Theme settings → Loyalty rewards** → provider: **Smile.io**
5. Optional: create a `/pages/rewards` page with the **rewards** template for program info

### What the theme shows

- Header points badge (live balance from Smile when signed in)
- Cart drawer link to open the Smile rewards panel
- Optional rewards info page with **Open rewards panel** button

### Customer accounts

Customers must check out while signed in to earn points. In Smile Admin, configure earn rules (e.g. points per £1 spent) and redemption rewards.

### Loyalty Hub (optional)

Smile Admin → On-site content → add **Loyalty Hub** to customer accounts for a full rewards page inside the account area.

### Manual metafield mode

Set **Theme settings → Loyalty provider** to **Customer metafield** only if you are not using Smile and are awarding points via Shopify Flow instead.
