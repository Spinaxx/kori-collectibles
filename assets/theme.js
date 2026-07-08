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
    const shine = qs('[data-hero-shine]', card || document);
    if (!card || !shine) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let active = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let pointerId = null;

    const applyTilt = (clientX, clientY) => {
      const r = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      const rotX = (0.5 - y) * 22;
      const rotY = (x - 0.5) * 28;
      card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.04)`;
      shine.style.opacity = '1';
      shine.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.45), transparent 55%)`;
    };

    const resetTilt = () => {
      card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
      shine.style.opacity = '';
      card.classList.remove('is-tilting');
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      active = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      pointerId = e.pointerId;
      card.classList.add('is-tilting');
      card.setPointerCapture?.(e.pointerId);
      applyTilt(e.clientX, e.clientY);
    };

    const onPointerMove = (e) => {
      if (!active || (pointerId != null && e.pointerId !== pointerId)) return;
      if (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6) {
        moved = true;
      }
      if (e.pointerType === 'touch') {
        e.preventDefault();
      }
      applyTilt(e.clientX, e.clientY);
    };

    const onPointerUp = (e) => {
      if (!active || (pointerId != null && e.pointerId !== pointerId)) return;
      active = false;
      pointerId = null;
      resetTilt();
    };

    card.addEventListener('pointerdown', onPointerDown);
    card.addEventListener('pointermove', onPointerMove, { passive: false });
    card.addEventListener('pointerup', onPointerUp);
    card.addEventListener('pointercancel', onPointerUp);
    card.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') onPointerUp(e);
    });

    // If the user dragged the card, don't follow the product link.
    card.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initDrawers();
    initNavDropdowns();
    initHeroTilt();
  });
})();
