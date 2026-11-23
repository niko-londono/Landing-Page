import './style.css';
import Lenis from 'lenis';

/* ══════════════════════════════════════════════════════════
   NIKO CS PORTFOLIO — main.js
   Modules: ThemeToggle · ScrollProgress · Stage (Lenis + WebGL) ·
            TypedBadge · SplitName · ParallaxEngine ·
            RevealObserver · AptitudeBars · HeaderScroll · MobileMenu ·
            SmoothScroll · MagneticCards · Lightbox
   ══════════════════════════════════════════════════════════ */

/* ── Utils ────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Shared between the scroll engine and the WebGL world
const stage = { lenis: null, velocity: 0, remeasure: null };

// GSAP is loaded from the CDN with `defer`; resolve once both globals exist
const gsapReady = new Promise(resolve => {
  (function check() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') resolve();
    else setTimeout(check, 50);
  })();
});

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
    // the WebGL world watches data-theme itself (MutationObserver)
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
   3. STAGE — Lenis smooth scroll driven by GSAP's ticker, and
   the Three.js world (lazy-loaded so the page paints first).
   ══════════════════════════════════════════════════════════ */
;(function Stage() {
  gsapReady.then(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (!REDUCED) {
      const lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), wheelMultiplier: 0.9 });
      stage.lenis = lenis;
      lenis.on('scroll', (e) => { stage.velocity = e.velocity; ScrollTrigger.update(); });
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  });

  const canvas = $('#webgl');
  if (!canvas) return;
  const hasGL = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch { return false; }
  })();
  const dropCanvas = () => canvas.parentNode && canvas.parentNode.removeChild(canvas);
  if (!hasGL) { dropCanvas(); return; }

  // ScrollTrigger must exist first so the world can listen to its refreshes
  gsapReady
    .then(() => import('./world/World.js'))
    .then(({ createWorld }) => createWorld({ canvas, state: stage, reduced: REDUCED }))
    .catch(err => { console.warn('WebGL world disabled:', err); dropCanvas(); });
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

/* Wraps every word of an element's text nodes in .scrub-word spans,
   keeping inline markup (e.g. <strong>) intact. Returns the spans. */
function splitWords(root) {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      const span = document.createElement('span');
      span.className = 'scrub-word';
      span.textContent = part;
      frag.appendChild(span);
      out.push(span);
    });
    node.replaceWith(frag);
  }
  return out;
}

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
  if (REDUCED) return;

  function init() {
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
        const textBits = $$('.badge, .hero-greet, .title-tag, .hero-description, .hero-actions, .social-row', hero);

        // Viewfinder crop (as fractions of the frame) — corners follow these edges
        const CROP = { top: 0.08, right: 0.13, bottom: 0.18, left: 0.13 };

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: '+=170%',
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            refreshPriority: 1, // created late but sits above every other trigger
          },
        });

        tl
          // The WebGL camera dives through the text tunnel over this pin;
          // the DOM layer clears out of its way.
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
          }, 0.05)
          // Second half of the pin: the photo — now the eye of the vortex —
          // rushes past the lens and the camera dives in behind it
          .to('.hero-visual-wrapper', {
            scale: 2.4,
            opacity: 0,
            filter: 'blur(14px)',
            ease: 'power2.in',
            duration: 0.55,
          }, 1.0)
          .to({}, { duration: 0.45 }); // let the dive breathe before unpinning
      });
      ScrollTrigger.refresh();
    }

    /* ── Pointer parallax (fine pointers only) ───────────── */
    mm.add('(min-width: 993px) and (hover: hover) and (pointer: fine)', () => {
      // [element, xDepth(px), yDepth(px), extra]
      const layers = [
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

    /* ── Layered depth in every section ──────────────────── */
    // [data-depth] = how far an element travels while its section crosses the
    // viewport. Positive drifts up faster (closer), negative lags (farther).
    // Only wrappers / elements with no CSS transform get this attribute.
    $$('[data-depth]').forEach(el => {
      const depth = parseFloat(el.dataset.depth) || 0;
      const travel = () => depth * window.innerHeight * (window.innerWidth < 769 ? 0.12 : 0.28);
      gsap.fromTo(el, { y: () => travel() }, {
        y: () => -travel(),
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section, footer') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });

    // Lead paragraph lights up word by word as it is read
    $$('[data-scrub]').forEach(p => {
      const words = splitWords(p);
      gsap.fromTo(words, { opacity: 0.15 }, {
        opacity: 1,
        ease: 'none',
        stagger: 0.08,
        scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 50%', scrub: true },
      });
    });

    // Award photos: zoom out and slide inside their frames on the way in,
    // dim on the way out; the floating close-up rides a closer layer.
    $$('.achievement-img-wrap').forEach(wrap => {
      const layer = $('.achievement-parallax', wrap);
      gsap.fromTo(layer, { yPercent: -7, scale: 1.18 }, {
        yPercent: 7,
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.fromTo(layer, { filter: 'brightness(1)' }, {
        filter: 'brightness(0.45)',
        ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'center 35%', end: 'bottom top', scrub: true },
      });
      const inset = $('.achievement-inset', wrap);
      if (inset) {
        gsap.fromTo(inset, { y: 60 }, {
          y: -40,
          ease: 'none',
          scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    });

    // Fonts and images change layout after first paint; re-measure triggers
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  gsapReady.then(init);
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
    isOpen ? stage.lenis?.stop() : stage.lenis?.start();
  });

  // Close on link click
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      isOpen = false;
      toggle.classList.remove('open');
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      stage.lenis?.start();
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
      stage.lenis?.start();
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
      if (stage.lenis) { stage.lenis.scrollTo(target, { offset: -80, duration: 1.6 }); return; }
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   13. CARD MAGNETIC HOVER EFFECT
   Subtle 3D tilt on project and aptitude cards
   ══════════════════════════════════════════════════════════ */
;(function MagneticCards() {
  if (REDUCED) return;

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
   15. LIGHTBOX — click any [data-gallery] photo to view it large
   Native <dialog>: Esc closes, focus is trapped and restored.
   Photos sharing a data-gallery value form one set (arrows,
   keyboard ← →, swipe). The image grows out of its thumbnail.
   ══════════════════════════════════════════════════════════ */
;(function Lightbox() {
  const dialog = $('#lightbox');
  const triggers = $$('[data-gallery]');
  if (!dialog || !triggers.length || typeof dialog.showModal !== 'function') return;

  const img     = $('.lb-img', dialog);
  const caption = $('.lb-caption', dialog);
  const counter = $('.lb-counter', dialog);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // gallery name -> [{ src, alt, el }] ordered by data-index
  const galleries = {};
  triggers.forEach(btn => {
    const thumb = $('img', btn);
    (galleries[btn.dataset.gallery] ||= []).push({
      src: thumb.currentSrc || thumb.src,
      alt: thumb.alt,
      el: thumb,
      index: Number(btn.dataset.index) || 0,
    });
  });
  Object.values(galleries).forEach(list => list.sort((a, b) => a.index - b.index));

  let set = [];
  let pos = 0;

  function show(i, fromEl) {
    pos = (i + set.length) % set.length;
    const item = set[pos];
    img.src = item.src;
    img.alt = item.alt;
    caption.textContent = item.alt;
    counter.textContent = `${pos + 1} / ${set.length}`;
    dialog.classList.toggle('is-single', set.length < 2);

    if (reduced.matches || !img.animate) return;
    const run = () => {
      if (fromEl) {
        // FLIP: start at the thumbnail's box, settle into place
        const a = fromEl.getBoundingClientRect();
        const b = img.getBoundingClientRect();
        if (!b.width) return;
        const dx = a.left + a.width / 2 - (b.left + b.width / 2);
        const dy = a.top + a.height / 2 - (b.top + b.height / 2);
        const s  = Math.max(a.width / b.width, 0.15);
        img.animate(
          [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6 },
           { transform: 'none', opacity: 1 }],
          { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      } else {
        img.animate(
          [{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      }
    };
    img.complete && img.naturalWidth ? run() : img.addEventListener('load', run, { once: true });
  }

  function open(btn) {
    set = galleries[btn.dataset.gallery];
    const start = set.findIndex(it => btn.contains(it.el));
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    stage.lenis?.stop();
    show(Math.max(start, 0), $('img', btn));
  }

  triggers.forEach(btn => btn.addEventListener('click', () => open(btn)));

  $('.lb-close', dialog).addEventListener('click', () => dialog.close());
  $('.lb-prev', dialog).addEventListener('click', () => show(pos - 1));
  $('.lb-next', dialog).addEventListener('click', () => show(pos + 1));

  // Click on the dark area (the dialog itself, not its content) closes
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    stage.lenis?.start();
    img.removeAttribute('src');
  });
  dialog.addEventListener('keydown', (e) => {
    if (set.length < 2) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(pos - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(pos + 1); }
  });

  // Swipe between photos on touch screens
  let touchX = null;
  dialog.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (touchX === null || set.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();

console.log('%c> Portafolio de Nicolás Londoño — v2.0 inicializado 🚀', 'color:#4ea8de;font-family:monospace;font-size:13px;');
