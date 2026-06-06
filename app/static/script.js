/* ═══════════════════════════════════════════════
   RAJAHARIHARAN K – PORTFOLIO  |  script.js
   ═══════════════════════════════════════════════ */

'use strict';

/* ── Navbar scroll behaviour ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.boxShadow = window.scrollY > 40
    ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
});

/* ── Hamburger / mobile menu ── */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger?.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  const open = mobileMenu.classList.contains('open');
  hamburger.setAttribute('aria-expanded', open);
  const spans = hamburger.querySelectorAll('span');
  if (open) {
    spans[0].style.cssText = 'transform:rotate(45deg) translate(5px,5px)';
    spans[1].style.cssText = 'opacity:0';
    spans[2].style.cssText = 'transform:rotate(-45deg) translate(5px,-5px)';
  } else {
    spans.forEach(s => s.style.cssText = '');
  }
});

mobileMenu?.querySelectorAll('.mob-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.querySelectorAll('span').forEach(s => s.style.cssText = '');
  });
});

/* ── Typewriter effect ── */
const roles = [
  'Python Developer',
  'Backend Automation',
  'Team Leader',
  'REST API Engineer',
  'Django / FastAPI',
];
let rIdx = 0, cIdx = 0, deleting = false;
const typedEl = document.getElementById('typed-text');

function typeLoop() {
  if (!typedEl) return;
  const current = roles[rIdx];
  typedEl.textContent = deleting
    ? current.slice(0, cIdx--)
    : current.slice(0, cIdx++);

  let delay = deleting ? 55 : 90;
  if (!deleting && cIdx > current.length) { delay = 1800; deleting = true; }
  if (deleting && cIdx < 0)              { deleting = false; cIdx = 0; rIdx = (rIdx + 1) % roles.length; delay = 400; }
  setTimeout(typeLoop, delay);
}
typeLoop();

/* ── Scroll reveal ── */
function addReveal() {
  document.querySelectorAll(
    '.about-card, .stats-bar, .skill-group, .prof-bar-wrap, ' +
    '.timeline-item, .project-card, .edu-card, .learning-card, ' +
    '.contact-info, .contact-form-wrap, .section-header'
  ).forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 6) * 0.07}s`;
  });
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12 });

addReveal();
document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
  .forEach(el => revealObserver.observe(el));

/* ── Animated stat counters ── */
function animateCounter(el) {
  const raw    = el.dataset.target || '0';
  const target = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
  const dur    = 1600, fps = 60, frames = dur / (1000 / fps);
  let frame = 0;
  const step = () => {
    frame++;
    const progress = frame / frames;
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * ease);
    if (frame < frames) requestAnimationFrame(step);
    else el.textContent = target % 1 ? target : Math.round(target);
  };
  requestAnimationFrame(step);
}
const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.stat-number').forEach(animateCounter);
      statsObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('.stats-bar').forEach(el => statsObserver.observe(el));

/* ── Proficiency bars ── */
const profObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.prof-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.width + '%';
      });
      profObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.proficiency-section').forEach(el => profObserver.observe(el));

/* ── Active nav-link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + 100;
  sections.forEach(sec => {
    if (scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight) {
      navLinks.forEach(a => {
        a.style.color = '';
        if (a.getAttribute('href') === '#' + sec.id) {
          a.style.color = '#06b6d4';
        }
      });
    }
  });
}, { passive: true });

/* ── Contact form (AJAX to Flask /api/contact) ── */
const form    = document.getElementById('contact-form');
const formMsg = document.getElementById('form-msg');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<svg class="btn-icon spin-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity=".3"/><path d="M20 12a8 8 0 0 1-8 8v2a10 10 0 0 0 10-10z"/></svg> Sending…';

  const payload = {
    name:    document.getElementById('fname').value.trim(),
    email:   document.getElementById('femail').value.trim(),
    subject: document.getElementById('fsubject').value.trim(),
    message: document.getElementById('fmessage').value.trim(),
  };

  try {
    const res  = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    formMsg.style.display = 'block';
    if (data.success) {
      formMsg.className = 'form-feedback success';
      formMsg.textContent = data.message;
      form.reset();
    } else {
      formMsg.className = 'form-feedback error';
      formMsg.textContent = data.error || 'Something went wrong.';
    }
  } catch {
    formMsg.style.display = 'block';
    formMsg.className = 'form-feedback error';
    formMsg.textContent = 'Network error. Please try again.';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Send Message`;
    setTimeout(() => { formMsg.style.display = 'none'; }, 6000);
  }
});

/* ── Smooth-scroll for all anchor links ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ── Tilt effect on project cards ── */
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 10;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -10;
    card.style.transform = `translateY(-8px) rotateX(${y}deg) rotateY(${x}deg)`;
    card.style.transition = 'transform 0.1s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.4s ease';
  });
});

/* ── Spinner CSS injected ── */
const spinCSS = document.createElement('style');
spinCSS.textContent = `.spin-icon { animation: spin360 0.7s linear infinite; } @keyframes spin360 { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinCSS);
