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
    const nameEl = card.querySelector('[data-hero-name]');
    const priceEl = card.querySelector('[data-hero-price]');
    const descEl = card.querySelector('[data-hero-desc]');
    const setEl = card.querySelector('[data-hero-set]');
    const imageEl = card.querySelector('[data-hero-image]');
    const fallbackEl = card.querySelector('[data-hero-fallback]');

    if (nameEl) nameEl.textContent = pick.title;
    if (priceEl) priceEl.textContent = pick.price;
    if (descEl) descEl.textContent = pick.desc;
    if (setEl) setEl.textContent = pick.set || '';
    if (pick.url) {
      card.href = pick.url;
      card.setAttribute('aria-label', `${pick.title} — ${pick.price}`);
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

  const initFilters = () => {
    const root = document.querySelector('[data-binder-filters]');
    if (!root) return;

    const tabs = root.querySelectorAll('.filter-tab');
    const slots = document.querySelectorAll('[data-binder-grid] .slot');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const energy = tab.dataset.e;

        slots.forEach((slot) => {
          if (energy === 'all' || slot.dataset.e === energy) {
            slot.classList.add('show');
          } else {
            slot.classList.remove('show');
          }
        });
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHeroCard();
    initTilt();
    initFilters();
  });
})();
