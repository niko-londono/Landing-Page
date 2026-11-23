import * as THREE from 'three';

/* ══════════════════════════════════════════════════════════
   TEXT TUNNEL — rings of typography stacked along -Z.
   Seen from the front they read as a vortex of concentric
   text (the vanishing point sits on the profile photo); on
   scroll the camera dives through them.
   Each ring is a flat annulus with polar UVs, so a single
   line of text wraps around the circle facing the camera.
   ══════════════════════════════════════════════════════════ */

const LINES = [
  { text: 'NICOLÁS LONDOÑO  ✦  CIENCIAS DE LA COMPUTACIÓN  ✦  ', font: '700 96px "Space Grotesk"', accent: true },
  { text: '01001110 01001001 01001011 01001111  ', font: '500 80px "JetBrains Mono"' },
  { text: 'SELECT * FROM talento WHERE curiosidad = ∞;  ', font: '700 80px "JetBrains Mono"' },
  { text: 'ETL → MIGRACIÓN CORE BPD → DEPARTAMENTO DEL AÑO 2024 · 2025  ', font: '700 80px "JetBrains Mono"', accent: true },
  { text: 'λx → f(g(x))   O(n log n)   { }   [ ]   =>   ∑   ', font: '500 80px "JetBrains Mono"' },
  { text: 'SQL SERVER · ORACLE · SAS · POWER BI · LINUX · GIT · ', font: '700 80px "JetBrains Mono"' },
  { text: 'PROBLEM SOLVING  ·  ANALYTICAL SKILLS  ·  DATA MIGRATION  ·  ', font: '700 80px "Space Grotesk"' },
  { text: 'git commit -m "construir algo que funcione"  ', font: '400 80px "JetBrains Mono"' },
];

const TEX_H = 128;

function makeTextTexture(line, maxAniso) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = line.font;
  const w = Math.ceil(ctx.measureText(line.text).width);
  canvas.width = Math.min(4096, w);
  canvas.height = TEX_H;
  // setting width resets the context state
  ctx.font = line.font;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  if (w > canvas.width) ctx.scale(canvas.width / w, 1);
  ctx.fillText(line.text, 0, TEX_H * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAniso;
  tex.colorSpace = THREE.NoColorSpace;
  tex.userData.aspect = canvas.width / TEX_H;
  return tex;
}

// Flat ring in the XY plane; u runs clockwise around the circle (so the
// text reads left→right at the top), v runs outward (letters stand upright).
function makeAnnulus(inner, band, repeats, segments = 160) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = t * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    pos.push(c * inner, s * inner, 0, c * (inner + band), s * (inner + band), 0);
    const u = (1 - t) * repeats;
    uv.push(u, 0, u, 1);
    if (i < segments) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const ringVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const ringFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uScroll;
  uniform float uFar;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    float a = texture2D(uMap, vec2(vUv.x + uScroll, vUv.y)).r;
    // fade in from the fog, and dissolve right before passing the lens
    float far  = 1.0 - smoothstep(uFar * 0.45, uFar, vDepth);
    float near = smoothstep(0.35, 2.2, vDepth);
    float alpha = a * uOpacity * far * near;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export class Tunnel {
  constructor({ maxAniso = 4, mobile = false }) {
    this.group = new THREE.Group();
    this.rings = [];
    this.textures = LINES.map(l => makeTextTexture(l, maxAniso));

    const count = mobile ? 26 : 38;
    this.spacing = 1.55;
    this.length = count * this.spacing;

    for (let i = 0; i < count; i++) {
      const li = i === 0 ? 0 : (i * 3 + (i >> 2)) % LINES.length;
      const line = LINES[li];
      const tex = this.textures[li];
      // radius breathes along the tunnel so the walls look layered, not tubular
      const inner = (mobile ? 2.6 : 3.1) + Math.sin(i * 1.27) * 0.75 + (i % 3) * 0.45;
      const band = line.accent ? 0.46 : 0.26 + (i % 4) * 0.045;
      const letterW = band * tex.userData.aspect;
      const repeats = Math.max(1, Math.round((Math.PI * 2 * (inner + band * 0.5)) / letterW));

      const mat = new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uMap: { value: tex },
          uColor: { value: new THREE.Color() },
          uOpacity: { value: 1 },
          uScroll: { value: Math.random() },
          uFar: { value: 46 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(makeAnnulus(inner, band, repeats), mat);
      mesh.position.z = -i * this.spacing;
      mesh.rotation.z = Math.random() * Math.PI * 2;
      mesh.frustumCulled = false;
      mesh.userData = {
        accent: !!line.accent,
        dim: line.accent ? 1 : 0.42 + (i % 3) * 0.16,
        spin: (i % 2 ? 1 : -1) * (0.035 + ((i * 37) % 11) / 11 * 0.09),
      };
      this.group.add(mesh);
      this.rings.push(mesh);
    }

    // Light at the end of the tunnel
    const glowTex = makeGlowTexture();
    this.portal = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.portal.position.z = -this.length - 4;
    this.portal.scale.setScalar(9);
    this.group.add(this.portal);
  }

  setTheme({ text, accent, dark }) {
    for (const r of this.rings) {
      const m = r.material;
      m.uniforms.uColor.value.copy(r.userData.accent ? accent : text);
      m.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.needsUpdate = true;
    }
    this.portal.material.color.copy(accent);
    this.portal.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.portal.material.opacity = dark ? 1 : 0.35;
    this.portal.material.needsUpdate = true;
  }

  update(dt, { opacity, boost }) {
    this.group.visible = opacity > 0.001;
    if (!this.group.visible) return;
    for (const r of this.rings) {
      const d = r.userData;
      r.rotation.z += d.spin * dt * (1 + boost * 5);
      r.material.uniforms.uOpacity.value = opacity * d.dim;
    }
  }

  dispose() {
    this.textures.forEach(t => t.dispose());
    this.rings.forEach(r => { r.geometry.dispose(); r.material.dispose(); });
  }
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
