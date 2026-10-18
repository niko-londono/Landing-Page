import './style.css';

/* ══════════════════════════════════════════════════════════
   NIKO CS PORTFOLIO — main.js
   Modules: ThemeToggle · ScrollProgress · NetworkCanvas ·
            BinaryField · TypedBadge · SplitName · ParallaxEngine ·
            RevealObserver · AptitudeBars · HeaderScroll · MobileMenu ·
            SmoothScroll · MagneticCards · CursorGlow
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
    // NetworkCanvas reads the theme every frame — no redraw call needed
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
   6. SPLIT NAME — wraps the hero name in word/char spans
   Screen readers keep the plain text via aria-label.
   ══════════════════════════════════════════════════════════ */
;(function SplitName() {
  const el = $('[data-split]');
  if (!el) return;

  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';

  text.split(/\s+/).forEach((word, i, words) => {
    const w = document.createElement('span');
    w.className = 'word' + (i === words.length - 1 ? ' word--accent' : '');
    w.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch;
      w.appendChild(c);
    }
    el.appendChild(w);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
})();

/* ══════════════════════════════════════════════════════════
   7. PARALLAX ENGINE — layered depth, GSAP ScrollTrigger
   · Entrance: name letters rise out of a mask, photo wipes in
   · Hero is pinned while the scene pulls apart in depth:
     grid zooms in, binary field recedes, symbols fly past the
     camera, the name scatters letter by letter and the photo
     crops into a viewfinder that the corner brackets track
   · Pointer parallax: each layer answers the mouse by depth
   · Sections: giant outlined numbers and award photos drift
     at their own speed
   Each effect owns separate properties (entrance vs scroll vs
   mouse) so tweens on the same element never fight.
   ══════════════════════════════════════════════════════════ */
;(function ParallaxEngine() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  // GSAP is loaded with `defer` before this module; retry briefly just in case
  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(init, 100);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const hero = $('.hero');
    if (!hero) return;

    const EASE_OUT = 'expo.out';
    const chars    = $$('.name-highlight .char', hero);
    const words    = $$('.name-highlight .word', hero);
    const media    = $('.profile-media', hero);
    const img      = $('.profile-img', hero);
    const frame    = $('.profile-frame', hero);
    const corners  = $$('.corner', hero);
    const stats    = $$('.stat-card', hero);
    const status   = $('.profile-status', hero);

    /* ── Entrance (runs once on load, all sizes) ─────────── */
    words.forEach(w => w.classList.add('is-masked'));
    // The scroll scene is built only once the entrance has settled, so the
    // scrubbed tweens record final (not mid-entrance) values.
    const intro = gsap.timeline({
      defaults: { ease: EASE_OUT },
      onComplete: () => {
        words.forEach(w => w.classList.remove('is-masked'));
        buildScene();
      },
    });
    intro
      .from(chars, { yPercent: 115, duration: 1.1, stagger: 0.028 }, 0.15)
      .fromTo(media,
        { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.12 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.4, ease: 'expo.inOut' }, 0.1)
      .fromTo(corners, { scale: 0 }, { scale: 1, duration: 0.7, stagger: 0.06 }, 1.0)
      .fromTo(stats,
        { clipPath: 'inset(0% 0% 100% 0% round 12px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 0.9, stagger: 0.12 }, 1.1);

    const mm = gsap.matchMedia();

    /* ── Pinned depth scene (desktop) ────────────────────── */
    function buildScene() {
      mm.add('(min-width: 993px)', () => {
        const syms = $$('.float-sym', hero);
        const textBits = $$('.badge, .hero-greet, .title-tag, .hero-description, .hero-actions, .social-row', hero);

        // Viewfinder crop (as fractions of the frame) — corners follow these edges
        const CROP = { top: 0.08, right: 0.13, bottom: 0.18, left: 0.13 };

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: '+=90%',
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            refreshPriority: 1, // created late but sits above every other trigger
          },
        });

        tl
          // Depth 0 — grid rushes toward the viewer and dissolves
          .to('.hero-grid', { scale: 1.9, opacity: 0, ease: 'power1.in', duration: 1 }, 0)
          // Depth 1 — binary field recedes
          .to('.layer-deep', { scale: 0.8, opacity: 0.3, duration: 1 }, 0)
          // Depth 2 — symbols burst outward past the camera
          .to(syms, {
            x: (i, el) => (el.offsetLeft + el.offsetWidth / 2 - hero.offsetWidth / 2) * 0.9,
            y: (i, el) => (el.offsetTop + el.offsetHeight / 2 - hero.offsetHeight / 2) * 0.9,
            scale: 2.6,
            rotation: (i) => (i % 2 ? 1 : -1) * (14 + i * 4),
            opacity: 0,
            ease: 'power2.in',
            duration: 1,
          }, 0)
          .to('.scroll-hint', { y: 30, opacity: 0, duration: 0.12 }, 0)
          // Name comes apart letter by letter
          .fromTo(chars,
            { x: 0, y: 0, rotation: 0, opacity: 1 },
            {
              x: () => gsap.utils.random(-60, 60),
              y: () => gsap.utils.random(-180, -60),
              rotation: () => gsap.utils.random(-35, 35),
              opacity: 0,
              ease: 'power2.in',
              duration: 0.45,
              stagger: { each: 0.018, from: 'random' },
            }, 0.12)
          // Supporting copy lifts away with a soft focus pull
          .fromTo(textBits,
            { y: 0, opacity: 1, filter: 'blur(0px)' },
            { y: -70, opacity: 0, filter: 'blur(6px)', ease: 'power2.in', duration: 0.4, stagger: 0.05 }, 0.2)
          // Photo turns away into depth…
          .to('.hero-visual-wrapper', {
            // glides to the centre of the stage as the copy clears out
            // offset* ignore transforms, so re-measuring mid-scroll stays correct
            x: () => {
              const w = $('.hero-visual-wrapper', hero);
              const centre = w.offsetParent.offsetLeft + w.offsetLeft + w.offsetWidth / 2;
              return (hero.offsetWidth / 2 - centre) * 0.6;
            },
            y: -40,
            rotationY: -16,
            scale: 0.88,
            transformOrigin: '50% 50%',
            ease: 'power1.inOut',
            duration: 1,
          }, 0)
          // …while its crop tightens into a viewfinder and the image pushes in
          .to(img, {
            clipPath: `inset(${CROP.top * 100}% ${CROP.right * 100}% ${CROP.bottom * 100}% ${CROP.left * 100}% round 20px)`,
            scale: 1.16,
            ease: 'power1.inOut',
            duration: 0.8,
          }, 0.1)
          .to(corners, {
            x: (i, el) => {
              const w = frame.offsetWidth;
              return el.classList.contains('tl') || el.classList.contains('bl') ? w * CROP.left : -w * CROP.right;
            },
            y: (i, el) => {
              const h = frame.offsetHeight;
              return el.classList.contains('tl') || el.classList.contains('tr') ? h * CROP.top : -h * CROP.bottom;
            },
            ease: 'power1.inOut',
            duration: 0.8,
          }, 0.1)
          .to(status, { y: () => -frame.offsetHeight * CROP.bottom, ease: 'power1.inOut', duration: 0.8 }, 0.1)
          // Stat cards fly toward the camera, each at its own depth
          .to(stats, {
            x: (i) => (i ? 1 : -1) * 140,
            scale: (i) => 1.5 + i * 0.25,
            opacity: 0,
            ease: 'power2.in',
            duration: 0.6,
            stagger: 0.08,
          }, 0.05);
      });
      ScrollTrigger.refresh();
    }

    /* ── Pointer parallax (fine pointers only) ───────────── */
    mm.add('(min-width: 993px) and (hover: hover) and (pointer: fine)', () => {
      // [element, xDepth(px), yDepth(px), extra]
      const layers = [
        [$('#binaryField', hero), -14, -10],
        [$('.layer-mid', hero),    32,  22],
        [frame,                    10,   8, { rot: 7 }],
        ...stats.map((s, i) => [s, 26 + i * 12, 18 + i * 8]),
      ].filter(([el]) => el);

      if (frame) gsap.set(frame, { transformPerspective: 900 });

      const movers = layers.map(([el, dx, dy, extra]) => ({
        dx, dy, extra,
        // xPercent/yPercent channel keeps the mouse separate from scroll x/y
        x: gsap.quickTo(el, extra ? 'x' : 'xPercent', { duration: 0.9, ease: 'power3' }),
        y: gsap.quickTo(el, extra ? 'y' : 'yPercent', { duration: 0.9, ease: 'power3' }),
        rx: extra && gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3' }),
        ry: extra && gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3' }),
        el,
      }));

      function move(nx, ny) {
        for (const m of movers) {
          if (m.extra) {
            m.x(nx * m.dx); m.y(ny * m.dy);
            m.rx(-ny * m.extra.rot); m.ry(nx * m.extra.rot);
          } else {
            // convert px depth into a percentage of the element's own size
            m.x((nx * m.dx) / m.el.offsetWidth * 100);
            m.y((ny * m.dy) / m.el.offsetHeight * 100);
          }
        }
      }

      const onMove = (e) => {
        const r = hero.getBoundingClientRect();
        if (r.bottom < 0) return;
        move((e.clientX / window.innerWidth) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      };
      const onLeave = () => move(0, 0);

      hero.addEventListener('mousemove', onMove, { passive: true });
      hero.addEventListener('mouseleave', onLeave);
      return () => {
        hero.removeEventListener('mousemove', onMove);
        hero.removeEventListener('mouseleave', onLeave);
        move(0, 0);
      };
    });

    /* ── Section depth (all sizes) ───────────────────────── */
    $$('.section-index').forEach(el => {
      gsap.fromTo(el, { yPercent: 45 }, {
        yPercent: -45,
        ease: 'none',
        scrollTrigger: {
          // relative to its own heading: centred when the heading is centred
          trigger: el.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    // Award photos slide inside their frames
    $$('.achievement-img-wrap').forEach(wrap => {
      gsap.fromTo($('.achievement-parallax', wrap), { yPercent: -7 }, {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Code window floats a layer above the About copy
    mm.add('(min-width: 769px)', () => {
      const snippet = $('.code-snippet');
      if (!snippet) return;
      gsap.fromTo(snippet, { y: 50 }, {
        y: -30,
        ease: 'none',
        scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Fonts and images change layout after first paint; re-measure triggers
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  init();
})();

/* ══════════════════════════════════════════════════════════
   8. REVEAL ON SCROLL — IntersectionObserver
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
   9. APTITUDE BARS — Animate progress fills
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
   10. HEADER SCROLL EFFECT
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
   11. MOBILE MENU
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
   12. SMOOTH SCROLL — nav anchor links
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
   13. CARD MAGNETIC HOVER EFFECT
   Subtle 3D tilt on project and aptitude cards
   ══════════════════════════════════════════════════════════ */
;(function MagneticCards() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const cards = $$('.aptitude-card');

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
   14. CURSOR GLOW (desktop only)
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
    top:0;left:0;
    margin:-250px 0 0 -250px;
    z-index:1;
    will-change:transform;
  `;
  hero.appendChild(glow);

  // Transform-only follow (no layout); GSAP smooths it when available
  let setX = (v) => { glow.style.transform = `translate(${v}px, ${glow._y || 0}px)`; glow._x = v; };
  let setY = (v) => { glow.style.transform = `translate(${glow._x || 0}px, ${v}px)`; glow._y = v; };
  if (typeof gsap !== 'undefined') {
    setX = gsap.quickTo(glow, 'x', { duration: 0.6, ease: 'power3' });
    setY = gsap.quickTo(glow, 'y', { duration: 0.6, ease: 'power3' });
  }
  setX(hero.offsetWidth / 2); setY(hero.offsetHeight / 2);

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    setX(e.clientX - rect.left);
    setY(e.clientY - rect.top);
  }, { passive: true });
})();

console.log('%c> Portafolio de Nicolás Londoño — v2.0 inicializado 🚀', 'color:#4ea8de;font-family:monospace;font-size:13px;');
