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
          const input = qs('input[type="search"]', search);
          if (input) setTimeout(() => input.focus(), 10);
        }
      };
      searchOpen.addEventListener('click', () => set(true));
      qsa('[data-close-search]', search).forEach((el) => el.addEventListener('click', () => set(false)));
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

  const boot = () => {
    initDrawers();
    initNavDropdowns();
    initHeroTilt();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
