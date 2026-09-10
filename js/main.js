// ============================================================
// TANTA TINTA — shared site behavior
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  if (toggle && navList) {
    toggle.addEventListener('click', () => {
      const open = navList.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navList.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navList.classList.remove('open');
        toggle.classList.remove('open');
      });
    });
  }

  // Mark active nav link based on current file name
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });

  // Reveal-on-scroll for cards / media
  const revealables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealables.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = entry.target.dataset.revealDelay || '0ms';
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealables.forEach(el => io.observe(el));
  } else {
    revealables.forEach(el => el.classList.add('is-visible'));
  }

  // Contact / quote forms: no backend wired up yet, so route to WhatsApp with a prefilled message
  document.querySelectorAll('form[data-whatsapp-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = form.dataset.whatsappNumber || '';
      const data = new FormData(form);
      let msg = (form.dataset.whatsappIntro || 'Hi Tanta Tinta!') + '\n';
      data.forEach((value, key) => {
        if (value) msg += `\n${key}: ${value}`;
      });
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    });
  });
});
