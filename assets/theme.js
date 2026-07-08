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

  // Predictive search returns decimal currency strings (e.g. "1400.00"), not cents.
  const formatMoney = (amount) => {
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
            const price = formatMoney(priceValue);
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
                  <span class="card__price">${escapeHtml(formatMoney(product.price))}</span>
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

  const boot = () => {
    initDrawers();
    initNavDropdowns();
    initHeroTilt();
    initPredictiveSearch();
    initSearchPageFallback();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
