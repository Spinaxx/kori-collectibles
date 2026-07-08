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
      const setFacets = (open) => {
        facets.classList.toggle('is-open', open);
        document.documentElement.style.overflow = open ? 'hidden' : '';
      };
      facetsOpen.addEventListener('click', () => setFacets(true));
      qsa('[data-close-facets]', facets).forEach((el) =>
        el.addEventListener('click', () => setFacets(false))
      );
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && facets.classList.contains('is-open')) setFacets(false);
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

  const formatMoney = (cents) => {
    const value = Number(cents || 0) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'GBP',
      }).format(value);
    } catch (err) {
      return `£${value.toFixed(2)}`;
    }
  };

  const escapeHtml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const initPredictiveSearch = () => {
    const form = qs('[data-predictive-search]');
    const input = qs('[data-predictive-input]');
    const results = qs('[data-predictive-results]');
    if (!form || !input || !results) return;

    const suggestUrl = form.getAttribute('data-suggest-url') || '/search/suggest.json';
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
          const price = formatMoney(product.price);
          const vendor = product.vendor ? `<div class="predictive__meta">${escapeHtml(product.vendor)}</div>` : '';
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
          <a href="${escapeHtml(searchUrl)}?type=product&q=${encodeURIComponent(query)}">View all results</a>
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
          (data.resources && data.resources.results && data.resources.results.products) ||
          [];
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
  };

  const boot = () => {
    initDrawers();
    initNavDropdowns();
    initHeroTilt();
    initPredictiveSearch();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
