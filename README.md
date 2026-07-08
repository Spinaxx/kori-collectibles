# Holo Row — Shopify theme

A custom Online Store 2.0 theme for **Holo Row**, a Pokémon TCG shop. Design matches the storefront mockup: dark ink background, holo accents, ticker bar, tilt hero card, energy-type binder filters, and trust strip.

## What’s included

| Area | Notes |
|------|--------|
| Homepage | Hero + binder grid + trust section |
| Header | Sticky nav + scrolling restock ticker |
| Products | Card-style binder grid; filters by energy type |
| Product page | Dark TCG layout with add to cart |
| Collection / cart | Styled to match |

Demo product cards show until you attach a real collection in the theme editor.

## Product setup (important)

Energy filters work from **tags** or metafields:

1. Tag each single with one of: `fire`, `water`, `grass`, `electric`, `psychic`
2. Optional tags: `rare` or `holo` (adds holographic sweep)
3. Optional metafields (namespace `custom`):
   - `energy_type` — text
   - `set_code` — text (e.g. `HR·07 · 014/165`)

Create a collection (e.g. **Singles**) and select it on the Binder grid section in the theme editor.

## Preview the design now

Open `preview.html` in a browser for the static mockup.

The theme Liquid files need a Shopify store + CLI to render with real cart/checkout.

## Connect to Shopify

### 1. Install tools

```bash
# Node (if needed) via https://nodejs.org or Homebrew:
brew install node

npm install -g @shopify/cli @shopify/theme
```

### 2. Create a store

- [Shopify Partners](https://partners.shopify.com/) → create a **development store**, or
- Start a trial at [shopify.com](https://www.shopify.com/)

### 3. Preview this theme live

From this folder:

```bash
shopify theme dev --store your-store.myshopify.com
```

That uploads a development theme and opens a preview URL with hot reload.

### 4. Push / publish

```bash
shopify theme push --unpublished
# Then publish from admin, or:
shopify theme publish
```

## Theme editor checklist

1. **Header** — link a navigation menu (Singles, Sealed, Grading, Location)
2. **Binder grid** — choose your Singles collection
3. **Hero** — optional real card image for the tilt card
4. **Footer** — Instagram / Discord URLs

## Local files of note

- `assets/holo-row.css` — design system
- `assets/holo-row.js` — tilt + filters
- `sections/hero.liquid`, `binder-grid.liquid`, `trust.liquid`
- `snippets/product-card.liquid`
