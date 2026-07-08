(() => {
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
    initTilt();
    initFilters();
  });
})();
