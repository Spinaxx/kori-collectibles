# Kori Collectibles — Shopify theme

A custom Online Store 2.0 theme for **Kori Collectibles**, a Pokémon TCG shop. Dark ink background, holo accents, ticker bar, tilt hero card, energy-type binder filters, and trust strip.

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

The theme Liquid files need a Shopify store + CLI (or GitHub theme sync) to render with real cart/checkout.

## Connect to Shopify via GitHub

1. Shopify admin → **Online Store → Themes**
2. **Add theme** → **Connect from GitHub**
3. Select this repo and the `main` branch
4. Preview, then publish when ready

## Theme editor checklist

1. **Header** — link a navigation menu (Singles, Sealed, Grading, Location)
2. **Binder grid** — choose your Singles collection
3. **Hero** — optional real card image for the tilt card
4. **Footer** — Instagram / Discord URLs

## Local files of note

- `assets/kori.css` — design system
- `assets/kori.js` — tilt + filters
- `sections/hero.liquid`, `binder-grid.liquid`, `trust.liquid`
- `snippets/product-card.liquid`
