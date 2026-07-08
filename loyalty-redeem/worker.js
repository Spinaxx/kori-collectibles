/**
 * Kori Collectibles — loyalty points redemption (Shopify app proxy).
 *
 * Deploy to Cloudflare Workers, Vercel, or any Node host. Point your Shopify
 * custom app's app proxy at this handler (subpath: kori-loyalty, suffix: redeem).
 *
 * Required env:
 *   SHOPIFY_SHOP_DOMAIN          e.g. kori-collectibles.myshopify.com
 *   SHOPIFY_ADMIN_API_TOKEN      custom app token (read/write customers, write_discounts)
 *   SHOPIFY_API_SECRET           app client secret (verifies app proxy signature)
 *   LOYALTY_REDEEM_POINTS        default 100
 *   LOYALTY_REDEEM_VALUE_GBP     default 5
 */

const REDEEM_POINTS = Number(process.env.LOYALTY_REDEEM_POINTS || 100);
const REDEEM_VALUE_GBP = Number(process.env.LOYALTY_REDEEM_VALUE_GBP || 5);

async function adminGraphql(shop, token, query, variables = {}) {
  const response = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map((e) => e.message).join('; ') || response.statusText;
    throw new Error(message || 'Admin API request failed');
  }
  return payload.data;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function verifyProxySignature(url, secret) {
  const params = new URLSearchParams(url.search);
  const signature = params.get('signature');
  if (!signature || !secret) return false;

  params.delete('signature');
  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

async function getCustomerBalance(shop, token, customerGid) {
  const data = await adminGraphql(
    shop,
    token,
    `query ($id: ID!) {
      customer(id: $id) {
        id
        email
        loyaltyPoints: metafield(namespace: "custom", key: "loyalty_points") { value }
        redeemCode: metafield(namespace: "custom", key: "loyalty_redeem_code") { value }
      }
    }`,
    { id: customerGid }
  );

  return data.customer;
}

async function setCustomerMetafields(shop, token, customerGid, fields) {
  const data = await adminGraphql(
    shop,
    token,
    `mutation ($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    {
      metafields: fields.map((field) => ({
        ownerId: customerGid,
        namespace: 'custom',
        ...field,
      })),
    }
  );

  const errors = data.metafieldsSet?.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }
}

async function createDiscountCode(shop, token, { code, customerGid, amount }) {
  const startsAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const data = await adminGraphql(
    shop,
    token,
    `mutation ($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) { nodes { code } }
            }
          }
        }
        userErrors { field message }
      }
    }`,
    {
      basicCodeDiscount: {
        title: `Loyalty redemption ${code}`,
        code,
        startsAt,
        endsAt,
        customerSelection: {
          customers: { add: [customerGid] },
        },
        customerGets: {
          value: {
            discountAmount: {
              amount: amount.toFixed(2),
              appliesOnEachItem: false,
            },
          },
          items: { all: true },
        },
        usageLimit: 1,
        appliesOncePerCustomer: true,
      },
    }
  );

  const errors = data.discountCodeBasicCreate?.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }

  return (
    data.discountCodeBasicCreate?.codeDiscountNode?.codeDiscount?.codes?.nodes?.[0]?.code || code
  );
}

async function getDiscountUsage(shop, token, code) {
  const data = await adminGraphql(
    shop,
    token,
    `query ($code: String!) {
      codeDiscountNodeByCode(code: $code) {
        codeDiscount {
          ... on DiscountCodeBasic {
            status
            asyncUsageCount
          }
        }
      }
    }`,
    { code }
  );

  const discount = data.codeDiscountNodeByCode?.codeDiscount;
  if (!discount) return { active: false, used: true };
  const used = Number(discount.asyncUsageCount || 0) > 0;
  const active = discount.status === 'ACTIVE' && !used;
  return { active, used };
}

async function handleStatus(request, env = {}) {
  const shop = env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_SHOP_DOMAIN;
  const token = env.SHOPIFY_ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_TOKEN;
  const secret = env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET;

  if (!shop || !token || !secret) {
    return json({ error: 'Loyalty status service is not configured.' }, 503);
  }

  const url = new URL(request.url);
  const valid = await verifyProxySignature(url, secret);
  if (!valid) {
    return json({ error: 'Invalid request signature.' }, 401);
  }

  const customerId = url.searchParams.get('logged_in_customer_id');
  if (!customerId) {
    return json({ error: 'Sign in to view loyalty status.' }, 401);
  }

  const customerGid = `gid://shopify/Customer/${customerId}`;
  const customer = await getCustomerBalance(shop, token, customerGid);
  if (!customer) {
    return json({ error: 'Customer not found.' }, 404);
  }

  const balance = Number(customer.loyaltyPoints?.value ?? 0);
  const redeemCode = customer.redeemCode?.value?.trim() || '';
  let activeCode = null;

  if (redeemCode) {
    const usage = await getDiscountUsage(shop, token, redeemCode);
    if (usage.active) {
      activeCode = redeemCode;
    }
  }

  return json({
    balance,
    redeemCode: activeCode,
    applyUrl: activeCode ? `/discount/${encodeURIComponent(activeCode)}` : null,
  });
}

async function handleRedeem(request, env = {}) {
  const shop = env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_SHOP_DOMAIN;
  const token = env.SHOPIFY_ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_TOKEN;
  const secret = env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET;
  const redeemPoints = Number(env.LOYALTY_REDEEM_POINTS || process.env.LOYALTY_REDEEM_POINTS || REDEEM_POINTS);
  const redeemValue = Number(env.LOYALTY_REDEEM_VALUE_GBP || process.env.LOYALTY_REDEEM_VALUE_GBP || REDEEM_VALUE_GBP);

  if (!shop || !token || !secret) {
    return json({ error: 'Redemption service is not configured.' }, 503);
  }

  const url = new URL(request.url);
  const valid = await verifyProxySignature(url, secret);
  if (!valid) {
    return json({ error: 'Invalid request signature.' }, 401);
  }

  const customerId = url.searchParams.get('logged_in_customer_id');
  if (!customerId) {
    return json({ error: 'Sign in to redeem points.' }, 401);
  }

  const customerGid = `gid://shopify/Customer/${customerId}`;
  const customer = await getCustomerBalance(shop, token, customerGid);
  if (!customer) {
    return json({ error: 'Customer not found.' }, 404);
  }

  const balance = Number(customer.loyaltyPoints?.value ?? 0);
  if (balance < redeemPoints) {
    return json(
      {
        error: `You need at least ${redeemPoints} points to redeem.`,
        balance,
        pointsNeeded: redeemPoints - balance,
      },
      400
    );
  }

  const existingCode = customer.redeemCode?.value;
  if (existingCode) {
    const usage = await getDiscountUsage(shop, token, existingCode);
    if (usage.active) {
      return json({
        code: existingCode,
        applyUrl: `/discount/${encodeURIComponent(existingCode)}`,
        balance,
        reused: true,
      });
    }

    await setCustomerMetafields(shop, token, customerGid, [
      { key: 'loyalty_redeem_code', value: '', type: 'single_line_text_field' },
    ]);
  }

  const code = `KORI-${customerId}-${Date.now().toString(36).toUpperCase()}`;
  const createdCode = await createDiscountCode(shop, token, {
    code,
    customerGid,
    amount: redeemValue,
  });

  const newBalance = Math.max(0, balance - redeemPoints);
  await setCustomerMetafields(shop, token, customerGid, [
    { key: 'loyalty_points', value: String(newBalance), type: 'number_integer' },
    { key: 'loyalty_redeem_code', value: createdCode, type: 'single_line_text_field' },
  ]);

  return json({
    code: createdCode,
    applyUrl: `/discount/${encodeURIComponent(createdCode)}`,
    balance: newBalance,
    pointsDeducted: redeemPoints,
    valueGbp: redeemValue,
  });
}

function isStatusRequest(url) {
  const path = url.pathname.replace(/\/+$/, '');
  return path === '/status' || path.endsWith('/status');
}

export default {
  async fetch(request, env = {}) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405);
    }

    const url = new URL(request.url);

    try {
      if (isStatusRequest(url)) {
        return await handleStatus(request, env);
      }
      return await handleRedeem(request, env);
    } catch (error) {
      console.error('loyalty proxy failed', error);
      return json({ error: error.message || 'Loyalty request failed.' }, 500);
    }
  },
};
