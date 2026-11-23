import * as THREE from 'three';
import { simplexNoise } from './noise.js';

/* ══════════════════════════════════════════════════════════
   DATA CLOUD — one particle system that morphs between a
   shape per section (all targets live in attributes, the
   vertex shader blends them):
     0 · Sobre mí   → neural sphere (curious mind)
     1 · Aptitudes  → five data columns (90/88/82/78/75 %)
     2 · Proyectos  → legacy block → ETL stream → new core
     3 · Contacto   → open portal ring
   ══════════════════════════════════════════════════════════ */

const APTITUDES = [0.90, 0.88, 0.82, 0.78, 0.75];

function rand(seed) {
  // tiny deterministic PRNG so the cloud looks the same every visit
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildShapes(count) {
  const r = rand(7);
  const s0 = new Float32Array(count * 3);
  const s1 = new Float32Array(count * 3);
  const s2 = new Float32Array(count * 3);
  const s3 = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const a = r(), b = r(), c = r(), d = r();
    rnd.set([a, b, c, d], i * 4);

    // 0 — fibonacci sphere, a third of the points sink inside as a core
    {
      const y = 1 - (i / (count - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      const R = a < 0.72 ? 3.4 : 1.2 + b * 1.9;
      s0[i3] = Math.cos(th) * rad * R;
      s0[i3 + 1] = y * R;
      s0[i3 + 2] = Math.sin(th) * rad * R;
    }

    // 1 — five columns of points, heights = aptitude %
    {
      const col = i % 5;
      const h = APTITUDES[col] * 6.2;
      const x = (col - 2) * 1.75;
      const ang = b * Math.PI * 2;
      const shell = a < 0.8 ? 0.55 : 0.55 * Math.sqrt(c);
      s1[i3] = x + Math.cos(ang) * shell;
      s1[i3 + 1] = -3.1 + c * h;
      s1[i3 + 2] = Math.sin(ang) * shell;
      // a few points float above as the "remaining" headroom
      if (d > 0.93) s1[i3 + 1] = -3.1 + h + 0.3 + (6.2 - h + 0.6) * b;
    }

    // 2 — two cubes (surface) + stream particles (positions computed in shader)
    {
      if (a < 0.6) {
        const left = b < 0.5;
        const size = left ? 1.5 : 1.75;
        const face = Math.floor(c * 6);
        const u = (r() - 0.5) * 2 * size, v = (r() - 0.5) * 2 * size;
        let p = [u, v, size];
        if (face === 1) p = [u, v, -size];
        if (face === 2) p = [size, u, v];
        if (face === 3) p = [-size, u, v];
        if (face === 4) p = [u, size, v];
        if (face === 5) p = [u, -size, v];
        s2[i3] = p[0] + (left ? -3.9 : 3.9);
        s2[i3 + 1] = p[1];
        s2[i3 + 2] = p[2];
      } else {
        // marker: z = 999 → shader places it on the flowing arc
        s2[i3] = 0; s2[i3 + 1] = 0; s2[i3 + 2] = 999;
      }
    }

    // 3 — torus portal, with a sparse inner galaxy
    {
      const u = b * Math.PI * 2;
      if (a < 0.78) {
        const v = c * Math.PI * 2;
        const R = 3.3, tube = 0.42 + d * 0.18;
        s3[i3] = (R + tube * Math.cos(v)) * Math.cos(u);
        s3[i3 + 1] = (R + tube * Math.cos(v)) * Math.sin(u);
        s3[i3 + 2] = tube * Math.sin(v);
      } else {
        const rr = Math.pow(c, 0.6) * 2.6;
        s3[i3] = Math.cos(u + rr * 1.4) * rr;
        s3[i3 + 1] = Math.sin(u + rr * 1.4) * rr;
        s3[i3 + 2] = (d - 0.5) * 0.4;
      }
    }
  }
  return { s0, s1, s2, s3, rnd };
}

const vertex = /* glsl */ `
  ${simplexNoise}
  attribute vec3 aS1;
  attribute vec3 aS2;
  attribute vec3 aS3;
  attribute vec4 aRnd;
  uniform float uTime;
  uniform float uShape;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uNoise;
  uniform vec3 uMouse;
  uniform float uMouseStrength;
  varying float vAlpha;
  varying float vTint;

  vec3 streamPos(vec4 rnd) {
    float t = fract(rnd.x + uTime * (0.05 + rnd.y * 0.06));
    vec3 a = vec3(-3.9, 0.0, 0.0), b = vec3(3.9, 0.0, 0.0);
    vec3 p = mix(a, b, t);
    p.y += sin(t * 3.14159) * 2.9;
    float ang = rnd.z * 6.2831 + t * 9.0;
    float rad = (0.12 + rnd.w * 0.5) * sin(t * 3.14159);
    p.y += cos(ang) * rad;
    p.z += sin(ang) * rad;
    return p;
  }

  void main() {
    vec3 p2 = aS2.z > 900.0 ? streamPos(aRnd) : aS2;
    float w0 = clamp(1.0 - abs(uShape - 0.0), 0.0, 1.0);
    float w1 = clamp(1.0 - abs(uShape - 1.0), 0.0, 1.0);
    float w2 = clamp(1.0 - abs(uShape - 2.0), 0.0, 1.0);
    float w3 = clamp(1.0 - abs(uShape - 3.0), 0.0, 1.0);
    vec3 pos = position * w0 + aS1 * w1 + p2 * w2 + aS3 * w3;

    // turbulence: always a breath of it, a storm mid-morph
    float m = fract(uShape);
    float storm = 4.0 * m * (1.0 - m);
    float amp = uNoise * (0.18 + storm * 1.6) * (0.6 + aRnd.w * 0.8);
    pos += snoiseVec3(pos * 0.32 + vec3(uTime * 0.12, aRnd.x * 2.0, uTime * 0.07)) * amp;

    // pointer pushes the cloud away
    vec3 toM = pos - uMouse;
    float dm = length(toM);
    pos += normalize(toM + 1e-4) * smoothstep(2.4, 0.0, dm) * 1.1 * uMouseStrength;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uSize * (0.45 + aRnd.y * aRnd.y * 1.6);
    gl_PointSize = size * uPixelRatio * (12.0 / -mv.z);

    vAlpha = 0.35 + aRnd.z * 0.65;
    vAlpha *= smoothstep(0.5, 3.0, -mv.z);
    vTint = step(0.8, aRnd.x);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vTint;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float disc = smoothstep(0.5, 0.08, d);
    float alpha = disc * vAlpha * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(uColorA, uColorB, vTint), alpha);
  }
`;

export class DataCloud {
  constructor({ count = 9000, pixelRatio = 1 }) {
    const { s0, s1, s2, s3, rnd } = buildShapes(count);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(s0, 3));
    g.setAttribute('aS1', new THREE.BufferAttribute(s1, 3));
    g.setAttribute('aS2', new THREE.BufferAttribute(s2, 3));
    g.setAttribute('aS3', new THREE.BufferAttribute(s3, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
        uShape: { value: 0 },
        uSize: { value: 2.2 },
        uPixelRatio: { value: pixelRatio },
        uNoise: { value: 1 },
        uMouse: { value: new THREE.Vector3(99, 99, 99) },
        uMouseStrength: { value: 0 },
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, this.material);
    this.group = new THREE.Group();
    this.group.add(this.points);
  }

  setTheme({ accent, accent2, dark }) {
    const u = this.material.uniforms;
    u.uColorA.value.copy(accent);
    u.uColorB.value.copy(accent2);
    u.uSize.value = dark ? 2.2 : 2.6;
    this.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.material.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
