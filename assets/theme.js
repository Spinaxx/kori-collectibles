(() => {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const initDrawers = () => {
    const menu = qs('[data-drawer="menu"]');
    const openBtn = qs('[data-open-menu]');
    if (menu && openBtn) {
      const set = (open) => {
        menu.hidden = !open;
        openBtn.setAttribute('aria-expanded', String(open));
        document.documentElement.style.overflow = open ? 'hidden' : '';
      };
      openBtn.addEventListener('click', () => set(true));
      qsa('[data-close-menu]', menu).forEach((el) => el.addEventListener('click', () => set(false)));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) set(false);
      });
    }

    const search = qs('[data-search-modal]');
    const searchOpen = qs('[data-open-search]');
    if (search && searchOpen) {
      const set = (open) => {
        search.hidden = !open;
        document.documentElement.style.overflow = open ? 'hidden' : '';
        if (open) {
          const input = qs('[data-predictive-input]', search) || qs('input[type="search"]', search);
          if (input) setTimeout(() => input.focus(), 10);
        } else {
          const results = qs('[data-predictive-results]', search);
          if (results) {
            results.hidden = true;
            results.innerHTML = '';
          }
        }
      };
      searchOpen.addEventListener('click', () => set(true));
      qsa('[data-close-search]', search).forEach((el) => el.addEventListener('click', () => set(false)));
      search.addEventListener('click', (e) => {
        if (e.target === search) set(false);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !search.hidden) set(false);
      });
    }

    const facets = qs('[data-facets]');
    const facetsOpen = qs('[data-open-facets]');
    if (facets && facetsOpen) {
      const activeBadge = facetsOpen.querySelector('.facet-group__count');
      facetsOpen.addEventListener('click', () => {
        const open = !facets.classList.contains('is-open');
        facets.classList.toggle('is-open', open);
        facetsOpen.setAttribute('aria-expanded', String(open));
        facetsOpen.textContent = open ? 'Hide filters' : 'Filters';
        if (!open && activeBadge) facetsOpen.appendChild(activeBadge);
      });
    }

    const sort = qs('[data-sort-by]');
    if (sort) {
      sort.addEventListener('change', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('sort_by', sort.value);
        window.location.assign(url.toString());
      });
    }

    qsa('[data-facet-select]').forEach((select) => {
      select.addEventListener('change', () => {
        const form = select.form;
        if (!form) return;
        // Drop empty selects so "All" clears that filter group.
        qsa('select[data-facet-select]', form).forEach((field) => {
          if (!field.value) field.disabled = true;
        });
        form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    });

    const tagSelect = qs('[data-tag-select]');
    if (tagSelect) {
      tagSelect.addEventListener('change', () => {
        const base = tagSelect.getAttribute('data-collection-url') || window.location.pathname;
        const option = tagSelect.options[tagSelect.selectedIndex];
        const tag = option && option.getAttribute('data-tag');
        if (!tagSelect.value || !tag) {
          window.location.assign(base);
          return;
        }
        window.location.assign(`${base}/${encodeURIComponent(tag)}`);
      });
    }
  };

  const formatMoney = (cents, format) => {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = (Number(cents) || 0) / 100;
    const formatted = value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const plain = String(format || '£{{amount}}').replace(/<[^>]*>/g, '');
    if (/\{\{\s*amount/.test(plain)) {
      return plain
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, formatted.replace('.', ','))
        .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, String(Math.round(value)))
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(value)))
        .replace(/\{\{\s*amount\s*\}\}/, formatted);
    }
    return `£${formatted}`;
  };

  // Predictive search returns decimal currency strings (e.g. "1400.00"), not cents.
  const formatSuggestMoney = (amount) => {
    const value = Number(amount);
    const safe = Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'GBP',
      }).format(safe);
    } catch (err) {
      return `£${safe.toFixed(2)}`;
    }
  };

  const escapeHtml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const initCartDrawer = () => {
    const drawer = qs('[data-cart-drawer]');
    if (!drawer) return;

    const moneyFormat = drawer.getAttribute('data-money-format') || '£{{amount}}';
    const emptyMessage =
      drawer.getAttribute('data-empty-message') || 'Your cart is empty.';
    const threshold = Number(drawer.getAttribute('data-free-shipping-threshold') || 0);
    const cartUrl = drawer.getAttribute('data-cart-url') || '/cart';
    const contents = qs('[data-cart-contents]', drawer);
    const footer = qs('[data-cart-footer]', drawer);

    let closeTimer = null;

    const setOpen = (open) => {
      const panel = qs('.cart-drawer__panel', drawer);
      qsa('[data-open-cart]').forEach((btn) => btn.setAttribute('aria-expanded', String(open)));
      document.documentElement.style.overflow = open ? 'hidden' : '';

      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }

      if (open) {
        drawer.classList.add('is-animating');
        drawer.hidden = false;
        // Two frames: first paint closed panel off-screen, then slide in.
        void drawer.offsetWidth;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            drawer.classList.add('is-open');
          });
        });
        return;
      }

      const finishClose = () => {
        drawer.classList.remove('is-open', 'is-animating');
        drawer.hidden = true;
        if (panel) panel.removeEventListener('transitionend', onEnd);
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      };
      const onEnd = (e) => {
        if (e.target !== panel) return;
        if (e.propertyName !== 'transform') return;
        finishClose();
      };

      if (!drawer.classList.contains('is-open')) {
        finishClose();
        return;
      }

      drawer.classList.add('is-animating');
      drawer.classList.remove('is-open');
      if (!panel) {
        finishClose();
        return;
      }
      panel.addEventListener('transitionend', onEnd);
      closeTimer = setTimeout(finishClose, 360);
    };

    const updateCountBadge = (count) => {
      qsa('[data-cart-count]').forEach((badge) => {
        badge.textContent = String(count);
        badge.hidden = count <= 0;
      });
    };

    const renderShipping = (totalPrice) => {
      const el = qs('[data-cart-shipping]', drawer);
      if (!el || !threshold) return;
      if (totalPrice >= threshold) {
        el.textContent = "You've unlocked free UK delivery";
      } else {
        el.textContent = `Spend ${formatMoney(threshold - totalPrice, moneyFormat)} more for free UK delivery`;
      }
    };

    const itemImage = (item) => {
      const src =
        item.featured_image && item.featured_image.url
          ? item.featured_image.url
          : item.image;
      if (!src) return '';
      const url = src.startsWith('//') ? `https:${src}` : src;
      return `<img src="${escapeHtml(url)}" alt="" width="72" height="96" loading="lazy">`;
    };

    const renderCart = (cart) => {
      updateCountBadge(cart.item_count || 0);
      const subtotal = qs('[data-cart-subtotal]', drawer);
      if (subtotal) subtotal.textContent = formatMoney(cart.total_price, moneyFormat);
      renderShipping(cart.total_price || 0);

      if (!cart.item_count) {
        contents.innerHTML = `
          <div class="cart-drawer__empty">
            <p>${escapeHtml(emptyMessage)}</p>
            <button type="button" class="button" data-close-cart style="margin-top:1rem;">Continue shopping</button>
          </div>`;
        if (footer) footer.hidden = true;
        return;
      }

      if (footer) footer.hidden = false;
      contents.innerHTML = `<ul class="cart-drawer__items" role="list">${cart.items
        .map((item) => {
          const variant =
            item.variant_title && item.variant_title !== 'Default Title'
              ? `<div class="cart-drawer__meta">${escapeHtml(item.variant_title)}</div>`
              : '';
          return `
            <li class="cart-drawer__item" data-key="${escapeHtml(item.key)}">
              <a class="cart-drawer__media" href="${escapeHtml(item.url)}">${itemImage(item)}</a>
              <div class="cart-drawer__details">
                <a class="cart-drawer__name" href="${escapeHtml(item.url)}">${escapeHtml(item.product_title)}</a>
                ${variant}
                <div class="cart-drawer__meta">${formatMoney(item.original_price, moneyFormat)}</div>
                <div class="cart-drawer__row">
                  <div class="cart-drawer__qty">
                    <button type="button" data-cart-qty="-1" data-key="${escapeHtml(item.key)}" aria-label="Decrease quantity">-</button>
                    <input type="number" min="0" value="${item.quantity}" aria-label="Quantity" data-cart-qty-input data-key="${escapeHtml(item.key)}">
                    <button type="button" data-cart-qty="1" data-key="${escapeHtml(item.key)}" aria-label="Increase quantity">+</button>
                  </div>
                  <div class="cart-drawer__line mono">${formatMoney(item.final_line_price, moneyFormat)}</div>
                </div>
                <button type="button" class="cart-drawer__remove" data-cart-remove data-key="${escapeHtml(item.key)}">Remove</button>
              </div>
            </li>`;
        })
        .join('')}</ul>`;
    };

    const fetchCart = async () => {
      const res = await fetch(`${cartUrl}.js`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Cart fetch failed');
      return res.json();
    };

    const changeLine = async (key, quantity) => {
      drawer.classList.add('is-loading');
      try {
        const res = await fetch(`${cartUrl}/change.js`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: key, quantity }),
        });
        if (!res.ok) throw new Error('Cart update failed');
        const cart = await res.json();
        renderCart(cart);
      } finally {
        drawer.classList.remove('is-loading');
      }
    };

    const refresh = async () => {
      const cart = await fetchCart();
      renderCart(cart);
      return cart;
    };

    const openCart = () => {
      const menu = qs('[data-drawer="menu"]');
      if (menu && !menu.hidden) {
        menu.hidden = true;
        const menuBtn = qs('[data-open-menu]');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      }
      setOpen(true);
      refresh().catch(() => {});
    };

    // Capture-phase delegation so the cart always opens even if other listeners fail.
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target instanceof Element ? e.target : e.target.parentElement;
        const opener = target && target.closest('[data-open-cart]');
        if (!opener) return;
        e.preventDefault();
        e.stopPropagation();
        openCart();
      },
      true
    );

    drawer.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : e.target.parentElement;
      if (!target) return;

      if (target.closest('[data-close-cart]')) {
        setOpen(false);
        return;
      }

      const remove = target.closest('[data-cart-remove]');
      if (remove) {
        changeLine(remove.getAttribute('data-key'), 0).catch(() => {});
        return;
      }

      const qtyBtn = target.closest('[data-cart-qty]');
      if (qtyBtn) {
        const key = qtyBtn.getAttribute('data-key');
        const delta = Number(qtyBtn.getAttribute('data-cart-qty'));
        const safeKey = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
        const input = qs(`[data-cart-qty-input][data-key="${safeKey}"]`, drawer);
        const next = Math.max(0, Number((input && input.value) || 0) + delta);
        changeLine(key, next).catch(() => {});
      }
    });

    drawer.addEventListener('change', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const input = target && target.closest('[data-cart-qty-input]');
      if (!input) return;
      const qty = Math.max(0, Number(input.value) || 0);
      changeLine(input.getAttribute('data-key'), qty).catch(() => {});
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hidden) setOpen(false);
    });

    // AJAX add-to-cart on product forms opens the drawer.
    qsa('form[action*="/cart/add"]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.disabled = true;
        try {
          const res = await fetch(`${cartUrl}/add.js`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form),
          });
          if (!res.ok) throw new Error('Add to cart failed');
          await refresh();
          setOpen(true);
        } catch (err) {
          form.submit();
        } finally {
          if (submit) submit.disabled = false;
        }
      });
    });

    window.KoriCart = { open: openCart, refresh, setOpen };
  };

  const initNavDropdowns = () => {
    const items = qsa('.nav-item');
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
    document.addEventListener('click', (e) => {
      items.forEach((item) => {
        if (item.open && !item.contains(e.target)) item.open = false;
      });
    });
  };

  const initHeroTilt = () => {
    const card = qs('[data-hero-card]');
    if (!card) return;

    const shine = qs('[data-hero-shine]', card);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const productUrl = card.getAttribute('data-hero-url');
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;

    const applyTilt = (clientX, clientY) => {
      if (reduceMotion) return;
      const r = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      card.style.transform = `rotateX(${(0.5 - y) * 24}deg) rotateY(${(x - 0.5) * 30}deg) scale(1.04)`;
      if (shine) {
        shine.style.opacity = '1';
        shine.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.5), transparent 55%)`;
      }
    };

    const resetTilt = () => {
      card.style.transform = '';
      if (shine) shine.style.opacity = '';
      card.classList.remove('is-tilting');
    };

    // Desktop hover follow
    card.addEventListener('mousemove', (e) => {
      if (dragging) return;
      card.classList.add('is-tilting');
      applyTilt(e.clientX, e.clientY);
    });
    card.addEventListener('mouseleave', () => {
      if (!dragging) resetTilt();
    });

    // Touch / drag
    const onStart = (clientX, clientY) => {
      dragging = true;
      moved = false;
      startX = clientX;
      startY = clientY;
      card.classList.add('is-tilting');
      applyTilt(clientX, clientY);
    };

    const onMove = (clientX, clientY, evt) => {
      if (!dragging) return;
      if (Math.abs(clientX - startX) > 8 || Math.abs(clientY - startY) > 8) moved = true;
      if (evt) evt.preventDefault();
      applyTilt(clientX, clientY);
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      resetTilt();
      if (!moved && productUrl) {
        window.location.assign(productUrl);
      }
      moved = false;
    };

    card.addEventListener(
      'touchstart',
      (e) => {
        if (!e.touches[0]) return;
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    card.addEventListener(
      'touchmove',
      (e) => {
        if (!e.touches[0]) return;
        onMove(e.touches[0].clientX, e.touches[0].clientY, e);
      },
      { passive: false }
    );
    card.addEventListener('touchend', onEnd);
    card.addEventListener('touchcancel', () => {
      dragging = false;
      resetTilt();
      moved = false;
    });

    card.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      onStart(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      onMove(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', onEnd);

    card.addEventListener('keydown', (e) => {
      if (!productUrl) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.assign(productUrl);
      }
    });
  };

  const initPredictiveSearch = () => {
    const forms = qsa('[data-predictive-search]');
    if (!forms.length) return;

    forms.forEach((form) => {
      const input = qs('[data-predictive-input]', form);
      const root = form.closest('.search-modal__box') || form.parentElement || document;
      const results = qs('[data-predictive-results]', root);
      if (!input || !results) return;

      const suggestUrl = form.getAttribute('data-suggest-url') || '/search/suggest';
      const searchUrl = form.getAttribute('data-search-url') || '/search';
      let timer = null;
      let controller = null;
      let lastQuery = '';

      const renderEmpty = (message) => {
        results.hidden = false;
        results.innerHTML = `<p class="predictive__status">${escapeHtml(message)}</p>`;
      };

      const renderProducts = (products, query) => {
        if (!products.length) {
          renderEmpty(`No matches for “${query}”`);
          return;
        }

        const items = products
          .map((product) => {
            const image =
              product.image ||
              (product.featured_image && (product.featured_image.url || product.featured_image)) ||
              '';
            const priceValue =
              product.price_min != null && product.price_min !== ''
                ? product.price_min
                : product.price;
            const price = formatSuggestMoney(priceValue);
            const vendor = product.vendor
              ? `<div class="predictive__meta">${escapeHtml(product.vendor)}</div>`
              : '';
            const media = image
              ? `<div class="predictive__media"><img src="${escapeHtml(image)}" alt="" width="48" height="48" loading="lazy"></div>`
              : `<div class="predictive__media"></div>`;

            return `
              <a class="predictive__item" href="${escapeHtml(product.url)}" role="option">
                ${media}
                <div class="predictive__copy">
                  <div class="predictive__title">${escapeHtml(product.title)}</div>
                  ${vendor}
                </div>
                <div class="predictive__price">${escapeHtml(price)}</div>
              </a>
            `;
          })
          .join('');

        results.hidden = false;
        results.innerHTML = `
          <div class="predictive__list" role="presentation">${items}</div>
          <div class="predictive__footer">
            <span>${products.length} suggestion${products.length === 1 ? '' : 's'}</span>
            <a href="${escapeHtml(searchUrl)}?type=product&options[prefix]=last&options[unavailable_products]=last&q=${encodeURIComponent(query)}">View all results</a>
          </div>
        `;
      };

      const fetchSuggestions = async (query) => {
        if (controller) controller.abort();
        controller = new AbortController();

        results.hidden = false;
        results.innerHTML = `<p class="predictive__status">Searching…</p>`;

        try {
          const jsonUrl = `${suggestUrl}.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=8&resources[options][unavailable_products]=last`;
          const res = await fetch(jsonUrl, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
          const data = await res.json();
          const products =
            (data.resources && data.resources.results && data.resources.results.products) || [];
          if (query !== lastQuery) return;
          renderProducts(products, query);
        } catch (err) {
          if (err.name === 'AbortError') return;
          renderEmpty('Could not load suggestions. Press Search to continue.');
        }
      };

      const onInput = () => {
        const query = input.value.trim();
        lastQuery = query;
        clearTimeout(timer);

        if (query.length < 2) {
          results.hidden = true;
          results.innerHTML = '';
          return;
        }

        timer = setTimeout(() => fetchSuggestions(query), 180);
      };

      input.addEventListener('input', onInput);
      input.addEventListener('search', onInput);
    });
  };

  const initSearchPageFallback = () => {
    const grid = qs('[data-search-grid]');
    if (!grid) return;

    const query = (grid.getAttribute('data-query') || '').trim();
    const resultCount = Number(grid.getAttribute('data-result-count') || 0);
    if (!query || resultCount > 0) return;

    const suggestUrl = grid.getAttribute('data-suggest-url') || '/search/suggest';
    const summary = qs('[data-search-summary]');
    const empty = qs('[data-search-empty]');

    const renderFallbackCards = (products) => {
      if (!products.length) {
        if (summary) summary.textContent = `No results for “${query}”`;
        if (empty) empty.hidden = false;
        return;
      }

      if (summary) {
        summary.textContent = `${products.length} result${products.length === 1 ? '' : 's'} for “${query}”`;
      }
      if (empty) empty.hidden = true;

      grid.innerHTML = products
        .map((product) => {
          const image =
            product.image ||
            (product.featured_image && (product.featured_image.url || product.featured_image)) ||
            '';
          const media = image
            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy">`
            : '';
          return `
            <a class="card" href="${escapeHtml(product.url)}">
              <div class="card__media">${media}</div>
              <div class="card__body">
                <div class="card__title">${escapeHtml(product.title)}</div>
                <div class="card__footer">
                  <span class="card__price">${escapeHtml(formatSuggestMoney(product.price))}</span>
                </div>
              </div>
            </a>
          `;
        })
        .join('');
    };

    (async () => {
      try {
        const jsonUrl = `${suggestUrl}.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=24&resources[options][unavailable_products]=last`;
        const res = await fetch(jsonUrl, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
        const data = await res.json();
        const products =
          (data.resources && data.resources.results && data.resources.results.products) || [];
        renderFallbackCards(products);
      } catch (err) {
        if (summary) summary.textContent = `No results for “${query}”`;
        if (empty) empty.hidden = false;
      }
    })();
  };

  const initProductForm = () => {
    const form = qs('.product-form');
    if (!form) return;

    const variantsEl = qs('[data-product-variants]', form);
    const priceEl = qs('[data-product-price]');
    const submit = qs('[data-product-submit]', form);
    const pills = qsa('.product-form__pill-input', form);
    if (!variantsEl || !pills.length) return;

    const addToCartEl = qs('[data-add-to-cart]', form);
    const soldOutEl = qs('[data-sold-out]', form);
    const addToCartLabel = addToCartEl ? addToCartEl.textContent.trim() : 'Add to cart';
    const soldOutLabel = soldOutEl ? soldOutEl.textContent.trim() : 'Sold out';

    let variants = [];
    try {
      variants = JSON.parse(variantsEl.textContent);
    } catch (err) {
      return;
    }

    const formatVariantPrice = (cents) => {
      const moneyFormat = (window.Shopify && Shopify.money_format) || '£{{amount}}';
      return formatMoney(cents, moneyFormat);
    };

    const updateVariant = (variantId) => {
      const variant = variants.find((item) => String(item.id) === String(variantId));
      if (!variant) return;

      qsa('.product-form__pill', form).forEach((pill) => {
        const input = qs('input', pill);
        pill.classList.toggle('is-selected', input && input.checked);
      });

      if (priceEl) {
        priceEl.textContent = formatVariantPrice(variant.price);
      }

      if (submit) {
        submit.disabled = !variant.available;
        submit.textContent = variant.available ? addToCartLabel : soldOutLabel;
      }
    };

    pills.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) updateVariant(input.value);
      });
    });

    const checked = pills.find((input) => input.checked);
    if (checked) updateVariant(checked.value);
  };

  const initAnnouncementMarquee = () => {
    const tracks = qsa('.announcement__track');
    if (!tracks.length) return;

    const buildUnit = (template) => {
      const unit = document.createDocumentFragment();
      const inner = template.cloneNode(true);
      unit.appendChild(inner);

      const gap = document.createElement('div');
      gap.className = 'announcement__gap';
      gap.setAttribute('aria-hidden', 'true');
      unit.appendChild(gap);

      return { unit, inner, gap };
    };

    const setup = (track) => {
      const seed = track.querySelector('.announcement__inner');
      if (!seed) return;

      const template = seed.cloneNode(true);
      track.replaceChildren();

      const first = buildUnit(template);
      track.appendChild(first.unit);
      const gapWidth = Math.max(0, window.innerWidth - first.inner.offsetWidth);
      first.gap.style.width = `${gapWidth}px`;
      const unitWidth = track.scrollWidth;

      const second = buildUnit(template);
      track.appendChild(second.unit);
      second.gap.style.width = `${gapWidth}px`;

      const duration = Math.max(24, unitWidth / 45);
      track.style.setProperty('--announcement-distance', `-${unitWidth}px`);
      track.style.setProperty('--announcement-duration', `${duration}s`);
      track.classList.add('is-ready');
    };

    tracks.forEach(setup);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        tracks.forEach((track) => {
          track.classList.remove('is-ready');
          track.style.removeProperty('--announcement-distance');
          track.style.removeProperty('--announcement-duration');
          setup(track);
        });
      }, 200);
    });
  };

  const boot = () => {
    try {
      initAnnouncementMarquee();
    } catch (err) {
      console.error('initAnnouncementMarquee failed', err);
    }
    try {
      initDrawers();
    } catch (err) {
      console.error('initDrawers failed', err);
    }
    try {
      initCartDrawer();
    } catch (err) {
      console.error('initCartDrawer failed', err);
    }
    try {
      initNavDropdowns();
      initHeroTilt();
      initPredictiveSearch();
      initSearchPageFallback();
      initProductForm();
    } catch (err) {
      console.error('theme boot extras failed', err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
