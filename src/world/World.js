import * as THREE from 'three';
import { Tunnel } from './tunnel.js';
import { DataCloud } from './particles.js';
import { Post } from './post.js';

/* ══════════════════════════════════════════════════════════
   WORLD — the fixed WebGL stage behind the whole page.
   The scroll position is turned into one "journey" number:
     0 → 1   hero: dive through the text tunnel
     1 → 4   sections: orbit a particle cloud that morphs
             into a shape per section
   Stops are measured from the real section positions (pin
   spacers included) and re-measured on every refresh.
   ══════════════════════════════════════════════════════════ */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export async function createWorld({ canvas, state, reduced }) {
  const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
  });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 70 : 58, 1, 0.1, 200);

  // Fonts must be ready before the text rings are rasterised
  if (document.fonts?.load) {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 96px Syne'),
        document.fonts.load('700 80px "JetBrains Mono"'),
        document.fonts.load('500 80px "JetBrains Mono"'),
      ]),
      new Promise(r => setTimeout(r, 1800)),
    ]).catch(() => {});
  }

  const tunnel = new Tunnel({ maxAniso: renderer.capabilities.getMaxAnisotropy(), mobile });
  scene.add(tunnel.group);

  const CENTER = new THREE.Vector3(0, 0, -tunnel.length - 16); // particle cloud lives past the tunnel
  const START_Z = 7;
  const DIVE_END_Z = CENTER.z + 12;

  const cloud = new DataCloud({ count: mobile ? 4200 : 9000, pixelRatio });
  cloud.group.position.copy(CENTER);
  scene.add(cloud.group);

  const dust = makeDust(mobile ? 700 : 1600, tunnel.length);
  scene.add(dust);

  const post = new Post(renderer, scene, camera, { bloom: !mobile });

  /* ── Theme ─────────────────────────────────────────────── */
  function applyTheme() {
    const cs = getComputedStyle(document.documentElement);
    const get = (v, fb) => new THREE.Color((cs.getPropertyValue(v) || fb).trim() || fb);
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const theme = {
      dark,
      bg: get('--bg-base', '#080c14'),
      text: get('--text-main', '#e8edf5'),
      accent: get('--accent', '#4ea8de'),
      accent2: get('--accent-2', '#64ffda'),
    };
    // scene.background (not setClearColor): three bakes the clear colour in the colour
    // space of whatever target is bound at call time, which double-encodes it here
    scene.background = theme.bg;
    tunnel.setTheme(theme);
    cloud.setTheme(theme);
    post.setTheme(theme);
    dust.material.color.copy(theme.text);
    dust.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    dust.material.needsUpdate = true;
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ── Size ──────────────────────────────────────────────── */
  let W = 0, H = 0;
  function resize(force) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // mobile URL bars nudge the height constantly; ignore small changes
    if (!force && w === W && Math.abs(h - H) < 120) return;
    W = w; H = h;
    renderer.setSize(W, H, false);
    post.setSize(W, H, pixelRatio);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    cloud.material.uniforms.uPixelRatio.value = pixelRatio;
  }
  resize(true);

  /* ── Journey stops (scroll px → 0..4) ─────────────────── */
  const sections = ['#sobre-mi', '#aptitudes', '#proyectos', '#contacto'].map(s => document.querySelector(s));
  let stops = [0, 1, 2, 3, 4];
  function measure() {
    const vh = window.innerHeight;
    const top = el => (el ? el.getBoundingClientRect().top + window.scrollY : 0);
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    const s = [0, Math.max(top(sections[0]) - vh, vh * 0.9)];
    for (let i = 1; i < sections.length; i++) s.push(Math.min(top(sections[i]) - vh * 0.5, max));
    for (let i = 1; i < s.length; i++) s[i] = Math.max(s[i], s[i - 1] + 1);
    stops = s;
  }
  function journeyAt(y) {
    for (let i = 0; i < stops.length - 1; i++) {
      if (y < stops[i + 1]) return i + clamp((y - stops[i]) / (stops[i + 1] - stops[i]));
    }
    return stops.length - 1;
  }
  measure();
  window.addEventListener('resize', () => { resize(); measure(); }, { passive: true });
  window.addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', measure);
  state.remeasure = measure;

  /* ── Pointer ───────────────────────────────────────────── */
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, active: 0 };
  if (!reduced) {
    window.addEventListener('pointermove', e => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.active = e.pointerType === 'mouse' ? 1 : 0.6;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.active = 0; });
  }
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  /* ── Vanishing point follows the profile photo ────────── */
  const photo = document.querySelector('.profile-frame');
  function lensShift(weight) {
    if (!photo || weight < 0.001) { camera.clearViewOffset(); return; }
    const r = photo.getBoundingClientRect();
    const dx = (r.left + r.width / 2 - W / 2) * weight;
    const dy = (r.top + r.height / 2 - H / 2) * weight;
    camera.setViewOffset(W, H, -dx, -dy, W, H);
  }

  /* ── Loop ──────────────────────────────────────────────── */
  const clock = new THREE.Clock();
  let time = 0, j = 0, boost = 0, spin = 0, intro = reduced ? 1 : 0;
  let running = true, raf = 0;
  let frames = 0, slowFrames = 0, degraded = false;

  function frame() {
    raf = requestAnimationFrame(frame);
    const rawDt = Math.min(clock.getDelta(), 0.05);
    const dt = reduced ? 0 : rawDt;
    time += dt;
    intro = Math.min(1, intro + rawDt / 2.6);

    // Adaptive quality: drop bloom + resolution if the GPU struggles
    if (!degraded && frames < 150) {
      frames++;
      if (frames > 30 && rawDt > 0.028) slowFrames++;
      if (slowFrames > 45) {
        degraded = true;
        pixelRatio = 1;
        if (post.bloom) post.bloom.enabled = false;
        resize(true);
      }
    }

    const target = journeyAt(window.scrollY);
    j = reduced ? target : damp(j, target, 7, rawDt);
    boost = damp(boost, clamp(Math.abs(state.velocity || 0) / 45), 4, rawDt);

    const heroT = clamp(j);
    const introEase = 1 - Math.pow(1 - intro, 4);

    /* Camera */
    if (reduced) {
      if (heroT < 0.9) { camera.position.set(0, 0, START_Z); camera.lookAt(0, 0, -10); }
      else orbit(j);
    } else if (j < 1) {
      const dive = easeInOut(clamp(heroT / 0.96));
      const z = THREE.MathUtils.lerp(START_Z, DIVE_END_Z, dive) + (1 - introEase) * 16;
      camera.position.set(pointer.sx * 0.35, pointer.sy * 0.25, z);
      camera.lookAt(pointer.sx * 0.1, pointer.sy * 0.08, z - 10);
      camera.rotateZ(dive * (1 - dive) * 4 * 0.55 + (1 - introEase) * -0.6);
    } else {
      orbit(j);
    }

    function orbit(jj) {
      const k = jj - 1;
      const a = k * 0.62 + pointer.sx * 0.12;
      const R = mobile ? 14 : 12;
      tmp.set(Math.sin(a) * R, Math.sin(k * 1.4) * 1.6 + pointer.sy * 0.6, Math.cos(a) * R).add(CENTER);
      camera.position.copy(tmp);
      camera.lookAt(CENTER);
    }

    lensShift(reduced ? 1 - smooth(0.0, 0.6, heroT) : 1 - smooth(0.02, 0.5, heroT));

    pointer.sx = damp(pointer.sx, pointer.x * pointer.active, 3, rawDt);
    pointer.sy = damp(pointer.sy, pointer.y * pointer.active, 3, rawDt);

    /* Tunnel */
    const tunnelOpacity = reduced ? 1 - smooth(0.4, 0.85, heroT) : (1 - smooth(0.86, 0.99, j)) * introEase;
    tunnel.update(dt, { opacity: tunnelOpacity, boost: boost + (1 - introEase) * 1.5 });
    // the glow brightens as you approach, then dims before it would wash the screen
    tunnel.portal.material.opacity = tunnelOpacity * (0.35 + smooth(0.2, 0.7, heroT) * 0.45) * (1 - smooth(0.72, 0.9, heroT));
    dust.material.opacity = tunnelOpacity * 0.75;
    dust.visible = tunnelOpacity > 0.001;

    /* Cloud */
    const u = cloud.material.uniforms;
    u.uOpacity.value = reduced ? smooth(0.92, 1.0, j) : smooth(0.8, 1.0, j);
    cloud.group.visible = u.uOpacity.value > 0.001;
    if (cloud.group.visible) {
      const s = clamp(j - 1, 0, 3);
      const k = Math.floor(s);
      const f = s - k;
      u.uShape.value = Math.min(3, k + smooth(0.45, 0.95, f));
      u.uTime.value = time;
      u.uNoise.value = reduced ? 0.4 : 1 + boost * 1.5;
      // the cloud turns with the orbit (60 %), so each shape is seen at a
      // flattering angle — the contact ring never ends up edge-on
      spin += dt * boost * 0.8;
      cloud.group.rotation.y = (j - 1) * 0.62 * 0.6 + Math.sin(time * 0.11) * 0.35 + spin;
      cloud.group.rotation.x = Math.sin(time * 0.15) * 0.12;

      // project the pointer onto the plane through the cloud facing the camera
      if (pointer.active && !reduced) {
        raycaster.setFromCamera({ x: pointer.x, y: pointer.y }, camera);
        camera.getWorldDirection(tmp);
        plane.setFromNormalAndCoplanarPoint(tmp, CENTER);
        if (raycaster.ray.intersectPlane(plane, hit)) {
          cloud.group.worldToLocal(hit);
          u.uMouse.value.lerp(hit, 1 - Math.exp(-10 * rawDt));
        }
      }
      u.uMouseStrength.value = damp(u.uMouseStrength.value, pointer.active, 3, rawDt);
    }

    post.render(time, reduced ? 0 : 0.006 + boost * 0.05);
  }

  function start() { if (!running) { running = true; clock.getDelta(); frame(); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  frame();
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
  if (import.meta.env.DEV) window.__world = { renderer, post, tunnel, cloud, camera };

  return { stop, start, measure };
}

function makeDust(count, length) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.4 + Math.pow(Math.random(), 0.7) * 5.5;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r;
    pos[i * 3 + 2] = 6 - Math.random() * (length + 14);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = grad;
  x.fillRect(0, 0, 32, 32);
  const m = new THREE.PointsMaterial({
    size: 0.06, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, sizeAttenuation: true,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}
