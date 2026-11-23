import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* Lens pass: chromatic aberration that grows with scroll speed,
   a soft vignette and animated film grain. Runs after OutputPass,
   on display (sRGB) values, so the grain stays subtle in the darks. */
const LensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0 },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.045 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      vec2 off = dir * dist * uAberration;
      vec4 base = texture2D(tDiffuse, vUv);
      float r = texture2D(tDiffuse, vUv + off).r;
      float b = texture2D(tDiffuse, vUv - off).b;
      vec3 col = vec3(r, base.g, b);
      col *= 1.0 - smoothstep(0.35, 0.95, dist) * uVignette;
      float n = hash(vUv * 1000.0 + fract(uTime * 7.31)) - 0.5;
      col += n * uGrain;
      gl_FragColor = vec4(col, base.a);
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera, { bloom = true }) {
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 0 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = null;
    if (bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.85, 0.55, 0.12);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    this.lens = new ShaderPass(LensShader);
    this.composer.addPass(this.lens);
  }

  setTheme({ dark }) {
    if (this.bloom) this.bloom.enabled = dark;
    this.lens.uniforms.uVignette.value = dark ? 0.55 : 0.1;
    this.lens.uniforms.uGrain.value = dark ? 0.035 : 0.025;
  }

  setSize(w, h, pr) {
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
  }

  render(time, aberration) {
    this.lens.uniforms.uTime.value = time;
    this.lens.uniforms.uAberration.value = aberration;
    this.composer.render();
  }
}
