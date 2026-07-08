(() => {
  const initHeroCard = () => {
    const card = document.querySelector('[data-hero-card]');
    const dataEl = document.querySelector('[data-hero-candidates]');
    if (!card || !dataEl) return;

    let candidates = [];
    try {
      candidates = JSON.parse(dataEl.textContent.trim());
    } catch (e) {
      return;
    }

    if (!Array.isArray(candidates) || candidates.length === 0) return;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const imageEl = card.querySelector('[data-hero-image]');
    const fallbackEl = card.querySelector('[data-hero-fallback]');

    if (pick.url) {
      card.href = pick.url;
      card.setAttribute('aria-label', pick.title);
    }

    if (imageEl && pick.image) {
      imageEl.src = pick.image;
      imageEl.alt = pick.title;
      imageEl.hidden = false;
      if (fallbackEl) fallbackEl.hidden = true;
    }
  };

  const initTilt = () => {
    const tiltCard = document.getElementById('tiltCard');
    const tiltShine = document.getElementById('tiltShine');
    if (!tiltCard || !tiltShine) return;

    tiltCard.addEventListener('mousemove', (e) => {
      const r = tiltCard.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 22;
      const ry = (x - 0.5) * 26;
      tiltCard.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(1.03)`;
      tiltShine.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.4), transparent 55%)`;
    });

    tiltCard.addEventListener('mouseleave', () => {
      tiltCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    });
  };

  const initHeaderMenu = () => {
    const openBtn = document.querySelector('[data-menu-open]');
    const mobileMenu = document.querySelector('[data-mobile-menu]');
    if (openBtn && mobileMenu) {
      const setOpen = (open) => {
        mobileMenu.hidden = !open;
        openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.documentElement.style.overflow = open ? 'hidden' : '';
      };

      openBtn.addEventListener('click', () => setOpen(true));
      mobileMenu.querySelectorAll('[data-menu-close]').forEach((el) => {
        el.addEventListener('click', () => setOpen(false));
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mobileMenu.hidden) setOpen(false);
      });
    }

    const dropdowns = document.querySelectorAll('.header-dropdown');
    dropdowns.forEach((details) => {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        dropdowns.forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });

    document.addEventListener('click', (e) => {
      dropdowns.forEach((details) => {
        if (details.open && !details.contains(e.target)) details.open = false;
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHeroCard();
    initTilt();
    initHeaderMenu();
  });
})();
