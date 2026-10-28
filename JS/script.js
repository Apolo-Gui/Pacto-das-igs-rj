 const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  });

const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
