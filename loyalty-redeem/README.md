# Loyalty redemption app proxy

Instant point redemption creates a single-use discount code and deducts points from `custom.loyalty_points`.

## What the storefront does

1. Customer clicks **Redeem** on the rewards page or loyalty panel.
2. Theme calls your app proxy: `/apps/kori-loyalty/redeem`
3. The handler verifies the logged-in customer, checks their balance, creates a £5 off code (default), deducts 100 points, and returns the code.
4. Customer taps **Apply to cart** → `/discount/CODE`

## 1. Customer metafield (optional but recommended)

Admin → **Settings → Custom data → Customers → Add definition**

| Field | Value |
|-------|--------|
| Name | Loyalty redeem code |
| Namespace and key | `custom.loyalty_redeem_code` |
| Type | Single line text |
| Storefront API access | Read |

Stores the customer’s active unused code so they can see it again after refresh.

## 2. Shopify custom app

1. [Shopify Partners](https://partners.shopify.com) → Apps → Create app → **Create app manually**
2. **Configuration → URLs** — set App URL to your deployed worker URL
3. **Configuration → App proxy**
   - Subpath prefix: `apps`
   - Subpath: `kori-loyalty`
   - Proxy URL: `https://YOUR-HOST/` (worker root — handles `/redeem` and `/status`)
4. **API credentials → Admin API access scopes**
   - `read_customers`
   - `write_customers`
   - `write_discounts`
5. Install the app on your store
6. Copy **Admin API access token** and **API secret key**

## 3. Deploy the worker

### Cloudflare Workers (recommended)

```bash
cd loyalty-redeem
npx wrangler secret put SHOPIFY_SHOP_DOMAIN
npx wrangler secret put SHOPIFY_ADMIN_API_TOKEN
npx wrangler secret put SHOPIFY_API_SECRET
npx wrangler secret put LOYALTY_REDEEM_POINTS   # optional, default 100
npx wrangler secret put LOYALTY_REDEEM_VALUE_GBP # optional, default 5
npx wrangler deploy worker.js
```

Point the app proxy at your Worker URL.

### Node (Railway, Fly.io, etc.)

```bash
cd loyalty-redeem
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com \
SHOPIFY_ADMIN_API_TOKEN=shpat_... \
SHOPIFY_API_SECRET=shpss_... \
PORT=8787 node worker.js
```

## 4. Theme settings

**Theme settings → Loyalty rewards**

| Setting | Default | Purpose |
|---------|---------|---------|
| Redemption app proxy URL | `/apps/kori-loyalty/redeem` | Instant redemption (proxy method only) |
| Loyalty status app proxy URL | `/apps/kori-loyalty/status` | Syncs balance + active code on every page load |

Change only if you used a different app proxy subpath.

## 5. Status endpoint (Flow + storefront display)

Even when using **Shopify Flow** for redemption, deploy this worker so the theme can read the customer's live balance and active code via the Admin API.

`GET /apps/kori-loyalty/status` (signed app proxy request when loaded from the storefront) returns:

```json
{
  "balance": 150,
  "redeemCode": "KORI-123-ABC",
  "applyUrl": "/discount/KORI-123-ABC"
}
```

The theme calls this automatically for signed-in customers.

## 6. Test

1. Sign in with a customer who has ≥ 100 points
2. Open `/pages/rewards`
3. Click **Redeem 100 points**
4. Copy or apply the code
5. Confirm `custom.loyalty_points` dropped by 100 in admin

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Redemption service is not configured” | App proxy not installed or worker env vars missing |
| “Invalid request signature” | Wrong `SHOPIFY_API_SECRET` or proxy URL mismatch |
| “Sign in to redeem” | Customer not logged in on storefront |
| Code created but points unchanged | Check `write_customers` scope and metafield definition |

## Security

- Never put the Admin API token in theme code.
- The app proxy HMAC signature ensures only Shopify can call your endpoint with a valid customer session.
