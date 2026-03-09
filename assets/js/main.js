import Alpine from 'alpinejs';
import '../css/main.css';

window.Alpine = Alpine;
Alpine.start();

let ticking = false;
function updateScrollProgress() {
  const scrollTop = document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const el = document.getElementById('scrollProgress');
  if (el) el.style.width = (scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0) + '%';
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateScrollProgress);
    ticking = true;
  }
}, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px',
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  if (sessionStorage.getItem('sukoda_visited')) {
    preloader.classList.add('hidden');
  } else {
    sessionStorage.setItem('sukoda_visited', '1');
    setTimeout(() => preloader.classList.add('hidden'), 400);
  }
});
