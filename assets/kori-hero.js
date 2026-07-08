(() => {
  const initCard = () => {
    const card = document.querySelector('[data-kori-hero-card]');
    const dataEl = document.querySelector('[data-kori-hero-candidates]');
    if (!card || !dataEl) return;

    let candidates = [];
    try {
      candidates = JSON.parse(dataEl.textContent.trim());
    } catch (e) {
      return;
    }
    if (!Array.isArray(candidates) || !candidates.length) return;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const imageEl = card.querySelector('[data-kori-hero-image]');
    const fallbackEl = card.querySelector('[data-kori-hero-fallback]');

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
    const card = document.getElementById('KoriHeroCard');
    const shine = document.getElementById('KoriHeroShine');
    if (!card || !shine) return;
    if (window.matchMedia('(hover: none)').matches) return;

    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.transform = `rotateX(${(0.5 - y) * 22}deg) rotateY(${(x - 0.5) * 26}deg) scale(1.03)`;
      shine.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.4), transparent 55%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initCard();
    initTilt();
  });
})();
