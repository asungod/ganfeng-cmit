// Shared rendering kit for the immersive halls: post chain, procedural textures, camera flights, particles.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

let _low: boolean | null = null;
/** Low graphics: ?lowgfx, or a weak device (few cores / low memory / software GL). ?hifi forces high. */
export function lowPower(): boolean {
  if (_low !== null) return _low;
  const q = location.hash + location.search;
  if (/[?&#]hifi\b/.test(q)) return (_low = false);
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return (_low = /[?&#]lowgfx\b/.test(q) || (navigator.hardwareConcurrency ?? 8) <= 4 || mem <= 4);
}
export function shadowSize(): number {
  return lowPower() ? 512 : 1024;
}

export function makeRenderer(canvas: HTMLCanvasElement, exposure = 1.0): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower() ? 1 : 1.5));
  r.shadowMap.type = lowPower() ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = exposure;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  return r;
}

/** Vignette + warm/cool grade + fine grain, applied after tone mapping. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVig: { value: 0.42 },
    uLift: { value: new THREE.Vector3(0.012, 0.008, 0.02) },
    uGain: { value: new THREE.Vector3(1.04, 1.0, 0.95) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uVig; uniform vec3 uLift; uniform vec3 uGain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb * uGain + uLift * (1.0 - c.rgb);
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, 1.1); col = (col - 0.5) * 1.08 + 0.5;
      vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.2, length(d * vec2(1.15, 1.0)));
      col *= mix(1.0 - uVig, 1.0, v);
      col += (h(vUv * 1000.0 + uTime) - 0.5) * 0.018;
      gl_FragColor = vec4(col, c.a);
    }`,
};

export type Post = { composer: EffectComposer; bloom: UnrealBloomPass; grade: ShaderPass; render: () => void; setSize: (w: number, h: number) => void };

export function makePost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, bloomStrength = 0.6, threshold = 0.82): Post {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), bloomStrength, 0.5, threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  const t0 = performance.now();
  return {
    composer,
    bloom,
    grade,
    render: () => {
      if (lowPower()) return renderer.render(scene, camera);
      grade.uniforms.uTime.value = (performance.now() - t0) / 1000;
      composer.render();
    },
    setSize: (w, h) => {
      if (lowPower()) return;
      composer.setSize(w, h);
      bloom.setSize(w / 2, h / 2);
    },
  };
}

// ---------- procedural textures ----------
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function valueNoise(w: number, h: number, scale: number, seed: number, oct = 4): Float32Array {
  const r = rng(seed);
  const G = 64;
  const grid = new Float32Array(G * G).map(() => r());
  const at = (x: number, y: number) => grid[((y % G) + G) % G * G + (((x % G) + G) % G)];
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0, amp = 1, f = scale, norm = 0;
      for (let o = 0; o < oct; o++) {
        const fx = (x / w) * f, fy = (y / h) * f;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const v = (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
        a += v * amp; norm += amp; amp *= 0.5; f *= 2;
      }
      out[y * w + x] = a / norm;
    }
  return out;
}

function toTex(c: HTMLCanvasElement, rep: [number, number], srgb: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Color + normal map from a height function. kind controls the look. */
export function proceduralMaps(kind: "earth" | "wood" | "stone" | "tile" | "plaster" | "lacquer", rep: [number, number] = [1, 1], seed = 7) {
  const S = lowPower() ? 128 : 256;
  const n = valueNoise(S, S, kind === "wood" ? 3 : 6, seed, 5);
  const n2 = valueNoise(S, S, 24, seed + 3, 3);
  const hgt = new Float32Array(S * S);
  const col = document.createElement("canvas");
  col.width = col.height = S;
  const cx = col.getContext("2d")!;
  const img = cx.createImageData(S, S);
  const pal: Record<string, [number, number, number][]> = {
    earth: [[150, 104, 66], [186, 140, 92], [126, 86, 56]],
    wood: [[92, 54, 30], [128, 78, 42], [70, 40, 22]],
    stone: [[112, 108, 100], [146, 140, 128], [86, 82, 76]],
    tile: [[52, 52, 56], [72, 72, 78], [40, 40, 44]],
    plaster: [[218, 208, 188], [236, 228, 210], [196, 184, 162]],
    lacquer: [[132, 26, 20], [162, 36, 26], [104, 18, 14]],
  };
  const p = pal[kind];
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let h = n[i] * 0.7 + n2[i] * 0.3;
      if (kind === "earth") h += Math.sin((y / S) * Math.PI * 2 * 14 + n[i] * 3) * 0.08; // rammed layers
      if (kind === "wood") h = 0.5 + 0.5 * Math.sin((x / S) * 60 + n[i] * 9) * 0.6 + n2[i] * 0.3;
      if (kind === "stone") { const bx = (x % (S / 4)) < 2 || (y % (S / 8)) < 2; h = bx ? 0.1 : h; }
      if (kind === "tile") { const ry = (y % (S / 8)) / (S / 8); h = 0.4 + 0.6 * Math.sin(ry * Math.PI) * (0.8 + n2[i] * 0.2); }
      hgt[i] = h;
      const t = Math.min(1, Math.max(0, h));
      const a = t < 0.5 ? p[2] : p[1];
      const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const b = p[0];
      const mix = (u: number, v: number) => Math.round(u + (v - u) * (t < 0.5 ? 1 - k : k));
      img.data[i * 4] = mix(b[0], a[0]);
      img.data[i * 4 + 1] = mix(b[1], a[1]);
      img.data[i * 4 + 2] = mix(b[2], a[2]);
      img.data[i * 4 + 3] = 255;
    }
  cx.putImageData(img, 0, 0);
  const nc = document.createElement("canvas");
  nc.width = nc.height = S;
  const nx = nc.getContext("2d")!;
  const nimg = nx.createImageData(S, S);
  const str = kind === "plaster" || kind === "lacquer" ? 1.2 : 3.2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const dx = (hgt[y * S + ((x + 1) % S)] - hgt[y * S + ((x - 1 + S) % S)]) * str;
      const dy = (hgt[((y + 1) % S) * S + x] - hgt[((y - 1 + S) % S) * S + x]) * str;
      const v = new THREE.Vector3(-dx, -dy, 1).normalize();
      nimg.data[i * 4] = (v.x * 0.5 + 0.5) * 255;
      nimg.data[i * 4 + 1] = (v.y * 0.5 + 0.5) * 255;
      nimg.data[i * 4 + 2] = (v.z * 0.5 + 0.5) * 255;
      nimg.data[i * 4 + 3] = 255;
    }
  nx.putImageData(nimg, 0, 0);
  return { map: toTex(col, rep, true), normalMap: toTex(nc, rep, false) };
}

export function pbr(kind: Parameters<typeof proceduralMaps>[0], rep: [number, number], opts: THREE.MeshStandardMaterialParameters = {}, seed = 7): THREE.MeshStandardMaterial {
  const m = proceduralMaps(kind, rep, seed);
  const rough = { earth: 0.95, wood: 0.7, stone: 0.85, tile: 0.6, plaster: 0.9, lacquer: 0.35 }[kind];
  return new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: rough, metalness: 0, ...opts });
}

/** Soft round sprite texture for particles / glows. */
export function softDot(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Drifting particle field (mist, smoke, fireflies). update(t) each frame. */
export function particles(count: number, box: THREE.Box3, color: number, size: number, opacity: number, mode: "mist" | "smoke" | "fly") {
  if (lowPower()) count = Math.ceil(count / 2);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const r = rng(count * 13 + size * 100);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box.min.x + r() * (box.max.x - box.min.x);
    pos[i * 3 + 1] = box.min.y + r() * (box.max.y - box.min.y);
    pos[i * 3 + 2] = box.min.z + r() * (box.max.z - box.min.z);
    seed[i] = r() * 100;
  }
  const base = pos.slice();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, map: softDot(), transparent: true, opacity, depthWrite: false,
    blending: mode === "fly" ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true, fog: true,
  });
  const pts = new THREE.Points(geo, mat);
  const H = box.max.y - box.min.y;
  const update = (t: number) => {
    for (let i = 0; i < count; i++) {
      const s = seed[i];
      if (mode === "smoke") {
        const life = ((t * 0.18 + s * 0.01) % 1);
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.6 + s) * 0.25 * life;
        pos[i * 3 + 1] = box.min.y + life * H;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.5 + s) * 0.25 * life;
      } else if (mode === "mist") {
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.05 + s) * 2.5;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.04 + s) * 1.5;
      } else {
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.4 + s) * 0.6;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7 + s * 2) * 0.35;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.3 + s) * 0.6;
      }
    }
    geo.attributes.position.needsUpdate = true;
    if (mode === "fly") mat.opacity = opacity * (0.7 + 0.3 * Math.sin(t * 2));
  };
  return { points: pts, update, material: mat };
}

/** Smooth camera flight: call step() each frame. */
export class Flight {
  private from = { p: new THREE.Vector3(), t: new THREE.Vector3() };
  private to = { p: new THREE.Vector3(), t: new THREE.Vector3() };
  private k = 1;
  private dur = 1.6;
  constructor(private cam: THREE.Camera, private target: THREE.Vector3) {}
  go(pos: THREE.Vector3, look: THREE.Vector3, dur = 1.6): void {
    this.from.p.copy(this.cam.position);
    this.from.t.copy(this.target);
    this.to.p.copy(pos);
    this.to.t.copy(look);
    this.k = 0;
    this.dur = dur;
  }
  get active(): boolean { return this.k < 1; }
  step(dt: number): void {
    if (this.k >= 1) return;
    this.k = Math.min(1, this.k + dt / this.dur);
    const e = this.k < 0.5 ? 4 * this.k ** 3 : 1 - (-2 * this.k + 2) ** 3 / 2;
    this.cam.position.lerpVectors(this.from.p, this.to.p, e);
    this.target.lerpVectors(this.from.t, this.to.t, e);
  }
}

/** Gradient sky dome (zenith → horizon → glow band toward sunDir). */
export function skyDome(radius: number): { mesh: THREE.Mesh; set: (zen: number, hor: number, glow: number, sunDir: THREE.Vector3, glowAmt?: number) => void } {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 0.1, -1) }, uAmt: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uGlow; uniform vec3 uSun; uniform float uAmt; varying vec3 vDir;
      void main(){ float y = clamp(vDir.y, -0.2, 1.0); vec3 c = mix(uHor, uZen, pow(smoothstep(-0.05, 0.75, y), 0.7));
        float s = max(dot(normalize(vDir), normalize(uSun)), 0.0); c += uGlow * (pow(s, 6.0) * 0.6 + pow(s, 64.0) * 1.6) * uAmt;
        c += uGlow * 0.18 * exp(-abs(y) * 9.0) * uAmt; gl_FragColor = vec4(c, 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
  return {
    mesh,
    set: (zen, hor, glow, sunDir, amt = 1) => {
      mat.uniforms.uZen.value.set(zen);
      mat.uniforms.uHor.value.set(hor);
      mat.uniforms.uGlow.value.set(glow);
      mat.uniforms.uSun.value.copy(sunDir).normalize();
      mat.uniforms.uAmt.value = amt;
    },
  };
}

/** Instanced roof tiles: rows of half-cylinders along a slope. */
export function tileRows(width: number, depth: number, mat: THREE.Material, step = 0.18): THREE.InstancedMesh {
  const geo = new THREE.CylinderGeometry(0.07, 0.07, depth, 6, 1, true, 0, Math.PI);
  geo.rotateX(Math.PI / 2);
  const n = Math.max(1, Math.floor(width / step));
  const im = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(-width / 2 + (i + 0.5) * step, 0, 0);
    im.setMatrixAt(i, m);
  }
  im.castShadow = true;
  im.receiveShadow = true;
  return im;
}

/** Gable roof (two slopes) with instanced tile ridges and slightly upturned eaves. */
export function gableRoof(w: number, d: number, rise: number, tileMat: THREE.Material, ridgeMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const half = d / 2 + 0.25;
  const slope = Math.hypot(half, rise);
  const ang = Math.atan2(rise, half);
  for (const s of [-1, 1]) {
    const plane = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.06, slope), tileMat);
    plane.position.set(0, rise / 2, (s * half) / 2);
    plane.rotation.x = s * ang;
    plane.castShadow = plane.receiveShadow = true;
    g.add(plane);
    const tiles = tileRows(w + 0.4, slope, tileMat, 0.2);
    tiles.position.copy(plane.position);
    tiles.rotation.x = s * ang;
    tiles.position.y += 0.05 * Math.cos(ang);
    tiles.position.z += -s * 0.05 * Math.sin(ang);
    g.add(tiles);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.16, 0.18), ridgeMat);
  ridge.position.y = rise + 0.04;
  ridge.castShadow = true;
  g.add(ridge);
  for (const sx of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 6), ridgeMat);
    horn.position.set(sx * (w / 2 + 0.38), rise + 0.16, 0);
    horn.rotation.z = -sx * 0.9;
    g.add(horn);
  }
  return g;
}

export function lantern(color = 0xff5a2a): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.4, roughness: 0.5 }),
  );
  body.scale.y = 1.25;
  g.add(body);
  const capM = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.7, roughness: 0.35 });
  for (const y of [0.25, -0.25]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), capM);
    cap.position.y = y;
    g.add(cap);
  }
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xd8322a }));
  tassel.position.y = -0.38;
  g.add(tassel);
  return g;
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const x of mats) {
      for (const k of ["map", "normalMap", "roughnessMap", "emissiveMap"] as const) (x as THREE.MeshStandardMaterial)[k]?.dispose?.();
      x.dispose();
    }
  });
}

// ---------- CC0 assets (Poly Haven), lazy-loaded per hall ----------
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
const ASSET = "./assets3d/";
const texLoader = new THREE.TextureLoader();

export function loadHdri(renderer: THREE.WebGLRenderer, scene: THREE.Scene, name: string, bg = true, onDone?: () => void): void {
  scene.userData.hdri = name;
  new RGBELoader().load(`${ASSET}${name}_1k.hdr`, (tex) => {
    if (scene.userData.hdri !== name) return tex.dispose(); // a newer request won the race
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(tex).texture;
    pm.dispose();
    if (bg) scene.background = tex;
    onDone?.();
  });
}

/** Poly Haven PBR set (diff / nor_gl / rough, 1k jpg). */
export function phMat(name: string, rep: [number, number], opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const ld = (k: string, srgb: boolean) => {
    const t = texLoader.load(`${ASSET}${name}_${k}_1k.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return new THREE.MeshStandardMaterial({ map: ld("diff", true), normalMap: ld("nor", false), roughnessMap: ld("rough", false), roughness: 1, metalness: 0, ...opts });
}

/** Box with world-scaled UVs so textures don't stretch across long walls. */
export function wbox(w: number, h: number, d: number, m: THREE.Material, uvScale = 1): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
    const sx = nx > 0.5 ? d : w;
    const sy = ny > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * sx * uvScale * 0.33, uv.getY(i) * sy * uvScale * 0.33);
  }
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}


// ---------- vegetation & figures (procedural, no external models) ----------
/** Irregular flattened foliage mass — deliberately non-spherical. */
function canopyBlob(rx: number, ry: number, rz: number, seed: number, detail = 2): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 5.2 + seed) * Math.cos(v.y * 4.1 + seed * 1.4) * Math.sin(v.z * 4.7 + seed * 0.8) * 0.28 +
      Math.sin((v.x + v.z) * 9.0 + seed * 2.2) * 0.1;
    v.x *= rx * (1 + n);
    v.y *= ry * (1 + n * 0.5);
    v.z *= rz * (1 + n);
    if (v.y < -0.1) v.y *= 0.55;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Crossed leaf-card spray for bamboo / thin canopy detail. */
function leafCards(mat: THREE.Material, seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = rng(seed);
  for (let i = 0; i < 3; i++) {
    const w = 0.55 + r() * 0.35, h = 0.25 + r() * 0.15;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    card.position.set((r() - 0.5) * 0.2, (r() - 0.5) * 0.1, (r() - 0.5) * 0.2);
    card.rotation.set(r() * 0.6 - 0.3, (i / 3) * Math.PI + r() * 0.4, r() * 0.5 - 0.25);
    g.add(card);
  }
  return g;
}

/** Camphor / pine — tapered trunk, limbs, layered flattened canopy (not sphere-on-stick). */
export function makeTree(seed = 1, scale = 1, kind: "camphor" | "pine" = "camphor"): THREE.Group {
  const g = new THREE.Group();
  const r = rng(seed * 977 + 3);
  const low = lowPower();
  const bark = phMat("dark_wooden_planks", [0.35, 1.1], { roughness: 0.95 });
  const barkFlat = new THREE.MeshStandardMaterial({ color: 0x3a281c, roughness: 0.95 });

  if (kind === "pine") {
    const trunkH = 5.4 + r() * 1.2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.28, trunkH, 8), bark);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    g.add(trunk);
    const greens = [0x152418, 0x1c2e1e, 0x223424, 0x182818];
    const layers = low ? 5 : 7;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.85 - t * 1.4 + r() * 0.12, 1.2 - t * 0.15, low ? 8 : 11),
        new THREE.MeshStandardMaterial({ color: greens[i % greens.length], roughness: 0.93 }),
      );
      cone.position.y = 1.9 + i * 0.78;
      cone.rotation.y = r() * Math.PI;
      cone.scale.set(0.92 + r() * 0.16, 1, 0.88 + r() * 0.18);
      cone.castShadow = true;
      g.add(cone);
    }
  } else {
    const trunkH = 3.6 + r() * 1.5;
    const trunkProf = [
      new THREE.Vector2(0.36, 0),
      new THREE.Vector2(0.3, trunkH * 0.2),
      new THREE.Vector2(0.22, trunkH * 0.5),
      new THREE.Vector2(0.13, trunkH * 0.82),
      new THREE.Vector2(0.07, trunkH),
    ];
    const trunk = new THREE.Mesh(new THREE.LatheGeometry(trunkProf, 12), bark);
    trunk.castShadow = true;
    trunk.rotation.z = (r() - 0.5) * 0.06;
    g.add(trunk);
    const nBranch = low ? 5 : 7;
    for (let b = 0; b < nBranch; b++) {
      const a = (b / nBranch) * Math.PI * 2 + r() * 0.35;
      const len = 1.5 + r() * 1.3;
      const elev = trunkH * (0.5 + r() * 0.4);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, len, 6), barkFlat);
      br.position.set(Math.cos(a) * len * 0.4, elev, Math.sin(a) * len * 0.4);
      br.rotation.z = Math.cos(a) * (-0.75 - r() * 0.3);
      br.rotation.x = Math.sin(a) * (0.75 + r() * 0.3);
      br.castShadow = true;
      g.add(br);
    }
    // teardrop canopy: many small irregular clumps in an ellipsoid volume (organic outline)
    const greens = [0x1a2c14, 0x223418, 0x2a3e20, 0x334828, 0x1e3018, 0x3a4e2c, 0x283a1c];
    const nClump = low ? 12 : 22;
    for (let i = 0; i < nClump; i++) {
      // sample ellipsoid: wider at mid, taper at top (camphor silhouette)
      const t = r();
      const yNorm = Math.pow(t, 0.7); // bias upward
      const y = trunkH * 0.55 + yNorm * trunkH * 0.95;
      const radAtY = Math.sin(yNorm * Math.PI) * (2.2 + r() * 0.6);
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(r()) * radAtY;
      const sx = 0.55 + r() * 0.55;
      const sy = 0.35 + r() * 0.35;
      const sz = 0.5 + r() * 0.55;
      const m = new THREE.MeshStandardMaterial({ color: greens[Math.floor(r() * greens.length)], roughness: 0.9 });
      const blob = new THREE.Mesh(canopyBlob(sx, sy, sz, seed * 19 + i, low ? 1 : 2), m);
      blob.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      blob.rotation.set(r() * 0.8, r() * Math.PI, r() * 0.8);
      blob.castShadow = true;
      blob.receiveShadow = true;
      g.add(blob);
    }
    // soft silhouette: thin leaf cards on canopy rim (breaks hard polygon edges)
    if (!low) {
      const rimLeaf = new THREE.MeshStandardMaterial({ color: 0x2a3e20, roughness: 0.88, side: THREE.DoubleSide });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + r() * 0.3;
        const cards = leafCards(rimLeaf, seed + 200 + i);
        cards.position.set(Math.cos(a) * 2.3, trunkH * 0.95 + r() * 0.8, Math.sin(a) * 2.3);
        cards.scale.setScalar(1.2 + r() * 0.6);
        g.add(cards);
      }
    }
  }
  g.scale.setScalar(scale);
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

/** Bamboo — thin culms + elongated leaf cards (not green balls). */
export function makeBamboo(seed = 1, n = 9): THREE.Group {
  const g = new THREE.Group();
  const r = rng(seed * 31 + 7);
  const stemM = new THREE.MeshStandardMaterial({ color: 0x5a6a30, roughness: 0.55 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2e4820, roughness: 0.85, side: THREE.DoubleSide });
  const count = lowPower() ? Math.min(n, 6) : n;
  for (let i = 0; i < count; i++) {
    const h = 5.2 + r() * 3.2;
    const x = (r() - 0.5) * 1.6, z = (r() - 0.5) * 1.6;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, h, 6), stemM);
    s.position.set(x, h / 2, z);
    s.rotation.set((r() - 0.5) * 0.18, 0, (r() - 0.5) * 0.18);
    s.castShadow = true;
    g.add(s);
    for (let k = 0; k < 5; k++) {
      const spray = leafCards(leafM, seed * 9 + i * 5 + k);
      spray.position.set(x + (r() - 0.5) * 0.5, h * (0.5 + k * 0.1), z + (r() - 0.5) * 0.5);
      spray.scale.setScalar(0.85 + r() * 0.4);
      g.add(spray);
    }
  }
  return g;
}

/** Stylized low-poly human with clear head / torso / arms / legs.
 *  No full-body cone robe (that reads as a chess pawn). Cloak = open back panel only.
 *  role: robed | performer | crowd */
export function makeFigure(color: number, seed = 1, scale = 1, role: "robed" | "performer" | "crowd" = "robed"): THREE.Group {
  const g = new THREE.Group();
  const r = rng(Math.floor(seed * 53 + 11));
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
  const under = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.55).getHex(), roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89a72, roughness: 0.7 });
  const hairM = new THREE.MeshStandardMaterial({ color: 0x12100e, roughness: 0.55 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.9 });
  const segs = role === "crowd" ? 8 : 11;

  // legs (pants) — always visible, slight stance
  for (const sx of [-1, 1]) {
    const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, segs), under);
    pant.position.set(sx * 0.1, 0.32, 0);
    g.add(pant);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.2), shoe);
    boot.position.set(sx * 0.1, 0.04, 0.03);
    g.add(boot);
  }
  // pelvis
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.16), under);
  pelvis.position.y = 0.62;
  g.add(pelvis);

  // torso — wider shoulders than hips (human proportion cue)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.18), cloth);
  torso.position.y = 0.9;
  g.add(torso);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.16), cloth);
  shoulders.position.y = 1.12;
  g.add(shoulders);

  // neck + head (oversized for distance readability)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, segs), skin);
  neck.position.y = 1.22;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, segs, 10), skin);
  head.position.y = 1.38;
  head.scale.set(1, 1.05, 0.92);
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.132, segs, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), hairM);
  hair.position.y = 1.39;
  g.add(hair);

  // arms with elbows
  for (const sx of [-1, 1] as const) {
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.3, segs), cloth);
    upper.position.y = -0.15;
    arm.add(upper);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), cloth);
    elbow.position.y = -0.3;
    arm.add(elbow);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.28, segs), role === "performer" ? cloth : skin);
    lower.position.y = -0.44;
    arm.add(lower);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 6, 6), skin);
    hand.position.y = -0.6;
    arm.add(hand);
    if (role === "performer") {
      // flowing sleeve ribbon
      const ribbon = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.55),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
      );
      ribbon.position.set(sx * 0.05, -0.35, -0.02);
      arm.add(ribbon);
      arm.rotation.z = sx * (1.15 + r() * 0.35);
      arm.rotation.x = -0.55 - r() * 0.35;
    } else if (role === "crowd") {
      arm.rotation.z = sx * 0.25;
      arm.rotation.x = 0.2;
    } else {
      arm.rotation.z = sx * 0.45;
      arm.rotation.x = -0.6;
    }
    arm.position.set(sx * 0.24, 1.1, 0);
    g.add(arm);
  }

  // open cloak behind the body (doesn't hide limbs)
  if (role !== "crowd" || r() < 0.4) {
    const cloak = new THREE.Mesh(
      new THREE.PlaneGeometry(role === "performer" ? 0.7 : 0.55, role === "performer" ? 1.0 : 0.85),
      new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide }),
    );
    cloak.position.set(0, 0.75, -0.12);
    cloak.rotation.x = 0.12;
    g.add(cloak);
  }
  // short front apron (waist → mid-thigh) — breaks torso/leg without pawn cone
  if (role !== "crowd") {
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.4),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0.02, 0.05, 0.08).getHex(), roughness: 0.9, side: THREE.DoubleSide }),
    );
    apron.position.set(0, 0.55, 0.1);
    g.add(apron);
  }
  if (role === "performer") {
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0xf0e0a0, roughness: 0.5, metalness: 0.25 }));
    sash.position.y = 0.7;
    g.add(sash);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 8), new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.45 }));
    crown.position.y = 1.58;
    g.add(crown);
    const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.38, 5), new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.5 }));
    plume.position.y = 1.82;
    g.add(plume);
  } else if (role === "crowd" && r() < 0.6) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.025, 14), new THREE.MeshStandardMaterial({ color: 0x8a7040, roughness: 0.9 }));
    brim.position.y = 1.42;
    g.add(brim);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.09, 10), new THREE.MeshStandardMaterial({ color: 0x7a6030, roughness: 0.9 }));
    top.position.y = 1.48;
    g.add(top);
  } else if (r() < 0.55) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), hairM);
    bun.position.set(0, 1.52, -0.02);
    g.add(bun);
  } else {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.18, 0.09, 10), new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.85 }));
    hat.position.y = 1.52;
    g.add(hat);
  }

  if (role === "robed" && r() < 0.6) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.8 }));
    stick.position.set(0.14, 1.0, 0.2);
    stick.rotation.x = -0.45;
    g.add(stick);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff6020, emissive: 0xff4010, emissiveIntensity: 0.9 }));
    tip.position.set(0.14, 1.22, 0.32);
    g.add(tip);
  }

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.scale.setScalar(scale * (role === "performer" ? 1.25 : 1.12) * (0.94 + r() * 0.12));
  if (role !== "performer") g.rotation.y = (r() - 0.5) * 0.35;
  return g;
}





