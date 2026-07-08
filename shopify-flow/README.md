# Shopify Flow `.flow` files

## What imports successfully

| File | Status |
|------|--------|
| `Deduct loyalty points on order cancelled.flow` | Works — standard order trigger |

Regenerate with `python3 shopify-flow/build-flow.py`.

## Redeem workflow — import does not work

Shopify Forms workflows embed **store-specific metaobject IDs**. Exports created outside your admin (or from another store) are rejected on import. This is why `Redeem loyalty points.flow` fails even with a valid checksum.

**Build redeem manually:** follow `REDEEM-SETUP.md` section 3 (~10 minutes).

The `build-redeem-flow.py` script is kept for reference only.
