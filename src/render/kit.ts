// Shared rendering kit for the immersive halls: post chain, procedural textures, camera flights, particles.
import { makeOperaActor, makeVillager } from "./paperFigure";
import { paintedTree, paintedBamboo, paperLantern } from "./guofeng";
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
        // v29: wisps — spread and curl grow with height so the column frays instead of a pillar
        const y = life * H, sp = 0.25 + life * life * 1.6;
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.6 + s + y * 1.4) * sp * life + (s % 7 - 3.5) * 0.12 * life * life;
        pos[i * 3 + 1] = box.min.y + y;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.5 + s + y * 1.1) * sp * life * 0.8;
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
  if (color >= 0) return paperLantern(); // v23: 纸灯笼 with ribs, tassel, soft glow
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


// ---------- vegetation & figures (painted 国画 / 墨竹 / 皮影) ----------
export function makeTree(seed = 1, scale = 1, kind: "camphor" | "pine" = "camphor"): THREE.Group {
  return paintedTree(seed, scale, kind); // v24: 国画写意 only (Quaternius/Kenney GLBs retired)
}

export function makeBamboo(seed = 1, n = 9): THREE.Group {
  return paintedBamboo(seed, n); // v24: 墨竹 only
}

export function makeFigure(color: number, seed = 1, scale = 1, role: "robed" | "performer" | "crowd" = "robed"): THREE.Group {
  // v24: painted 工笔/年画/皮影 cut-out figures
  return role === "performer" ? makeOperaActor(color, seed, scale) : makeVillager(color, seed, scale);
}
