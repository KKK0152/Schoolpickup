// ===== LANDING PAGE JS =====

// Navbar scroll effect
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
  // Trigger on load
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
  // Close on link click
  mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

// ===== PARTICLES =====
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['rgba(96,165,250,0.6)', 'rgba(167,139,250,0.5)', 'rgba(52,211,153,0.4)', 'rgba(251,191,36,0.4)'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 8 + 4;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      bottom: 0;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${Math.random() * 15 + 10}s;
      animation-delay: ${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
}
createParticles();

// ===== SCROLL ANIMATION =====
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}
initScrollAnimations();

// ===== FEATURE TABS =====
function switchTab(tab) {
  ['parent', 'teacher', 'system'].forEach(t => {
    document.getElementById('tab-' + t)?.classList.toggle('active', t === tab);
    const content = document.getElementById('tab-content-' + t);
    if (content) content.classList.toggle('hidden', t !== tab);
  });
}

// ===== SMOOTH SCROLL for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== COUNTER ANIMATION =====
function animateCounters() {
  const nums = document.querySelectorAll('.stat-num');
  nums.forEach(el => {
    const text = el.textContent;
    const num = parseInt(text.replace(/\D/g, ''));
    if (isNaN(num) || num === 0) return;
    let start = 0;
    const duration = 1500;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = text.replace(/\d+/, Math.floor(eased * num));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Trigger counter when hero is visible
const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      heroObserver.disconnect();
    }
  });
}, { threshold: 0.3 });
const hero = document.querySelector('.hero');
if (hero) heroObserver.observe(hero);

console.log('%c🏫 SchoolPickup System', 'font-size:20px;font-weight:bold;color:#2563eb');
console.log('%cระบบบริหารจัดการการรับ–ส่งนักเรียน', 'font-size:14px;color:#475569');
