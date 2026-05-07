import './style.css';

/* ══════════════════════════════════════════════════════════
   NIKO CS PORTFOLIO — main.js
   Modules: ThemeToggle · ScrollProgress · NetworkCanvas ·
            ParallaxEngine · RevealObserver · TypedBadge ·
            AptitudeBars · MobileMenu · HeaderScroll
   ══════════════════════════════════════════════════════════ */

/* ── Utils ────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function lerp(a, b, t) { return a + (b - a) * t; }

/* ══════════════════════════════════════════════════════════
   1. THEME TOGGLE — Dark / Light Mode
   ══════════════════════════════════════════════════════════ */
;(function ThemeToggle() {
  const html   = document.documentElement;
  const btn    = $('#themeToggle');
  if (!btn) return;

  // Load saved preference or respect OS preference
  const saved = localStorage.getItem('niko-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved ?? (prefersDark ? 'dark' : 'light');
  html.setAttribute('data-theme', initial);

  btn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('niko-theme', next);

    // Re-draw canvas with new theme colours
    if (typeof window._networkDraw === 'function') window._networkDraw();
  });
})();

/* ══════════════════════════════════════════════════════════
   2. SCROLL PROGRESS BAR
   ══════════════════════════════════════════════════════════ */
;(function ScrollProgress() {
  const bar = $('#scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const max   = document.body.scrollHeight - window.innerHeight;
    const pct   = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct.toFixed(2) + '%';
  }, { passive: true });
})();

/* ══════════════════════════════════════════════════════════
   3. NETWORK / GRAPH CANVAS (background)
   Interactive neural-network nodes with mouse repulsion
   ══════════════════════════════════════════════════════════ */
;(function NetworkCanvas() {
  const canvas = $('#networkCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, nodes = [], mouse = { x: -9999, y: -9999 };
  const NODE_COUNT = 55;
  const MAX_DIST   = 145;
  const SPEED      = 0.35;

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      node: isDark ? 'rgba(78,168,222,' : 'rgba(30,107,191,',
      line: isDark ? 'rgba(78,168,222,' : 'rgba(30,107,191,',
    };
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: Math.random() * 2.5 + 1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const c = getThemeColors();

    // Update positions
    for (const n of nodes) {
      // Mouse repulsion
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        const force = (120 - dist) / 120 * 0.8;
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      }

      // Damping
      n.vx *= 0.98;
      n.vy *= 0.98;

      // Speed cap
      const sp = Math.hypot(n.vx, n.vy);
      if (sp > SPEED * 3) { n.vx = n.vx / sp * SPEED * 3; n.vy = n.vy / sp * SPEED * 3; }

      n.x += n.vx;
      n.y += n.vy;

      // Wrap edges
      if (n.x < 0) n.x = W;
      if (n.x > W) n.x = 0;
      if (n.y < 0) n.y = H;
      if (n.y > H) n.y = 0;

      // Draw node
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = c.node + '0.7)';
      ctx.fill();
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.hypot(dx, dy);
        if (d < MAX_DIST) {
          const alpha = (1 - d / MAX_DIST) * 0.5;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = c.line + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  // Expose re-draw for theme toggle
  window._networkDraw = draw;

  window.addEventListener('resize', () => { resize(); createNodes(); }, { passive: true });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener('touchmove', e => {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
  }, { passive: true });

  resize();
  createNodes();
  draw();
})();

/* ══════════════════════════════════════════════════════════
   4. BINARY FIELD — Random 0/1 text in Hero background
   ══════════════════════════════════════════════════════════ */
;(function BinaryField() {
  const field = $('#binaryField');
  if (!field) return;

  // Fill with random binary text
  const CHARS = 800;
  let str = '';
  for (let i = 0; i < CHARS; i++) {
    str += (Math.random() > 0.5 ? '1' : '0') + ' ';
    if (i % 60 === 59) str += '\n';
  }
  field.textContent = str;

  // Randomly flip some bits periodically
  let text = str.split('');
  setInterval(() => {
    for (let i = 0; i < 15; i++) {
      const idx = Math.floor(Math.random() * text.length);
      if (text[idx] === '0') text[idx] = '1';
      else if (text[idx] === '1') text[idx] = '0';
    }
    field.textContent = text.join('');
  }, 300);
})();

/* ══════════════════════════════════════════════════════════
   5. TYPED BADGE — Terminal typewriter effect
   ══════════════════════════════════════════════════════════ */
;(function TypedBadge() {
  const el = $('#typedBadge');
  if (!el) return;

  const phrases = [
    '>_ console.log("¡Hola, mundo!");',
    '>_ git commit -m "Portfolio v2.0"',
    '>_ npm run build -- --mode=premium',
    '>_ python -c "print(\'Hello, World!\')"',
    '>_ echo "Bienvenido al portafolio"',
  ];

  let phraseIdx = 0;
  let charIdx   = 0;
  let deleting  = false;

  function type() {
    const phrase = phrases[phraseIdx];

    if (!deleting) {
      el.textContent = phrase.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === phrase.length) {
        deleting = true;
        setTimeout(type, 2200);
        return;
      }
      setTimeout(type, 55);
    } else {
      el.textContent = phrase.slice(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        setTimeout(type, 400);
        return;
      }
      setTimeout(type, 28);
    }
  }

  setTimeout(type, 800);
})();

/* ══════════════════════════════════════════════════════════
   6. PARALLAX ENGINE — GSAP ScrollTrigger powered
   Professional multi-layer depth scrolling with scrub
   ══════════════════════════════════════════════════════════ */
;(function ParallaxEngine() {
  // Respect prefers-reduced-motion
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  // Wait for GSAP to load (deferred scripts)
  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Disable on small screens for performance
    const mm = gsap.matchMedia();

    mm.add('(min-width: 769px)', () => {
      // ── Hero parallax layers ──
      const hero = document.querySelector('.hero');
      if (!hero) return;

      // Deep background (binary field) — moves fast
      const layerDeep = hero.querySelector('.layer-deep');
      if (layerDeep) {
        gsap.to(layerDeep, {
          y: () => window.innerHeight * 0.45,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          }
        });
      }

      // Mid layer (floating symbols) — medium speed
      const layerMid = hero.querySelector('.layer-mid');
      if (layerMid) {
        gsap.to(layerMid, {
          y: () => window.innerHeight * 0.25,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          }
        });
      }

      // Hero text — moves down subtly
      const heroText = hero.querySelector('.hero-text');
      if (heroText) {
        gsap.to(heroText, {
          y: 60,
          opacity: 0.4,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: '80% top',
            scrub: 1,
          }
        });
      }

      // Hero visual (photo) — slower drift up for depth
      const heroVisual = hero.querySelector('.hero-visual');
      if (heroVisual) {
        gsap.to(heroVisual, {
          y: -40,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 2,
          }
        });
      }

      // Stat cards — drift independently
      const statCards = hero.querySelectorAll('.stat-card');
      statCards.forEach((card, i) => {
        gsap.to(card, {
          y: (30 + i * 20),
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 1 + i * 0.5,
          }
        });
      });

      // Scroll hint — fade out quickly
      const scrollHint = hero.querySelector('.scroll-hint');
      if (scrollHint) {
        gsap.to(scrollHint, {
          y: 40,
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: '20% top',
            scrub: 0.5,
          }
        });
      }

      // ── Section parallax reveals ──
      // About section — slight upward shift
      const aboutSection = document.querySelector('.about');
      if (aboutSection) {
        gsap.from(aboutSection.querySelector('.about-text'), {
          y: 40,
          ease: 'none',
          scrollTrigger: {
            trigger: aboutSection,
            start: 'top 85%',
            end: 'top 40%',
            scrub: 1,
          }
        });
        gsap.from(aboutSection.querySelector('.skills-block'), {
          y: 60,
          ease: 'none',
          scrollTrigger: {
            trigger: aboutSection,
            start: 'top 80%',
            end: 'top 35%',
            scrub: 1.5,
          }
        });
      }

      // Grid line zoom on hero
      const heroGrid = hero;
      if (heroGrid) {
        gsap.to(heroGrid, {
          '--grid-opacity': 0,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: '60% top',
            end: 'bottom top',
            scrub: 1,
          }
        });
      }
    });
  }

  init();
})();

/* ══════════════════════════════════════════════════════════
   7. REVEAL ON SCROLL — IntersectionObserver
   ══════════════════════════════════════════════════════════ */
;(function RevealObserver() {
  const targets = $$('[data-reveal]');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);

          // Trigger aptitude bars once revealed
          const bars = $$('.apt-fill', entry.target.closest('section') || document);
          if (bars.length) triggerBars(bars);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  targets.forEach(t => observer.observe(t));
})();

/* ══════════════════════════════════════════════════════════
   8. APTITUDE BARS — Animate progress fills
   ══════════════════════════════════════════════════════════ */
function triggerBars(bars) {
  bars.forEach(bar => {
    const w = parseInt(bar.dataset.width, 10);
    if (!isNaN(w)) bar.style.width = w + '%';
  });
}

;(function AptitudeBars() {
  const section = $('#aptitudes');
  if (!section) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        triggerBars($$('.apt-fill', section));
        observer.disconnect();
      }
    },
    { threshold: 0.2 }
  );
  observer.observe(section);
})();

/* ══════════════════════════════════════════════════════════
   9. HEADER SCROLL EFFECT
   ══════════════════════════════════════════════════════════ */
;(function HeaderScroll() {
  const header = $('#mainHeader');
  if (!header) return;

  let last = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    last = scrollY;
  }, { passive: true });
})();

/* ══════════════════════════════════════════════════════════
   10. MOBILE MENU
   ══════════════════════════════════════════════════════════ */
;(function MobileMenu() {
  const toggle = $('#menuToggle');
  const links  = $('#navLinks');
  if (!toggle || !links) return;

  let isOpen = false;

  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    toggle.classList.toggle('open', isOpen);
    links.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      isOpen = false;
      toggle.classList.remove('open');
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !links.contains(e.target) && !toggle.contains(e.target)) {
      isOpen = false;
      toggle.classList.remove('open');
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
})();

/* ══════════════════════════════════════════════════════════
   11. SMOOTH SCROLL — nav anchor links
   ══════════════════════════════════════════════════════════ */
;(function SmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   12. CARD MAGNETIC HOVER EFFECT
   Subtle 3D tilt on project and aptitude cards
   ══════════════════════════════════════════════════════════ */
;(function MagneticCards() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const cards = $$('.project-card:not(.project-card--ghost), .aptitude-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);
      const rotX  = (-dy * 6).toFixed(2);
      const rotY  = ( dx * 6).toFixed(2);
      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   13. CURSOR GLOW (desktop only)
   Soft radial gradient that follows the cursor on the hero
   ══════════════════════════════════════════════════════════ */
;(function CursorGlow() {
  const hero = $('.hero');
  if (!hero || window.innerWidth < 1024) return;

  const glow = document.createElement('div');
  glow.style.cssText = `
    position:absolute;
    width:500px;height:500px;
    border-radius:50%;
    background:radial-gradient(circle,var(--accent-glow) 0%,transparent 70%);
    pointer-events:none;
    transform:translate(-50%,-50%);
    top:50%;left:50%;
    z-index:1;
    transition:top 0.1s ease,left 0.1s ease;
    will-change:top,left;
  `;
  hero.appendChild(glow);

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    glow.style.left = (e.clientX - rect.left) + 'px';
    glow.style.top  = (e.clientY - rect.top)  + 'px';
  }, { passive: true });
})();

console.log('%c> Portafolio de Nicolás Londoño — v2.0 inicializado 🚀', 'color:#4ea8de;font-family:monospace;font-size:13px;');
