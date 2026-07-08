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
      facetsOpen.addEventListener('click', () => facets.classList.add('is-open'));
      qsa('[data-close-facets]', facets).forEach((el) =>
        el.addEventListener('click', () => facets.classList.remove('is-open'))
      );
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

  const initHeroCard = () => {
    const card = qs('[data-hero-card]');
    const dataEl = qs('[data-hero-candidates]');
    if (!card || !dataEl) return;

    let candidates = [];
    try {
      candidates = JSON.parse(dataEl.textContent.trim());
    } catch (e) {
      return;
    }
    if (!candidates.length) return;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const img = qs('[data-hero-image]', card);
    if (pick.url) {
      card.href = pick.url;
      card.setAttribute('aria-label', pick.title);
    }
    if (img && pick.image) {
      img.src = pick.image;
      img.alt = pick.title;
      img.hidden = false;
    }

    const shine = qs('[data-hero-shine]', card);
    if (!shine || window.matchMedia('(hover: none)').matches) return;
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.transform = `rotateX(${(0.5 - y) * 18}deg) rotateY(${(x - 0.5) * 22}deg) scale(1.03)`;
      shine.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.4), transparent 55%)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initDrawers();
    initNavDropdowns();
    initHeroCard();
  });
})();
