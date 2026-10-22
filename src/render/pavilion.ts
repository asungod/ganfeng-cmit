import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { lowPower, shadowSize, Flight, loadHdri, makePost, particles, phMat, softDot, type Post } from "./kit";
import type { ImageId, MoodId } from "../data/tengwang";

const MARK: Record<ImageId, THREE.Vector3> = {
  luoxia: new THREE.Vector3(-10, 5.2, -18),
  guwu: new THREE.Vector3(-2.4, 3.4, -6),
  qiushui: new THREE.Vector3(0.2, 0.05, 2.2),
  changtian: new THREE.Vector3(1.5, 8.5, -10),
  yuzhou: new THREE.Vector3(-4.2, 0.12, 3.6),
  yanzhen: new THREE.Vector3(6.5, 7.2, -12),
  feige: new THREE.Vector3(3.4, 4.0, -12.5),
  hantan: new THREE.Vector3(-6.8, 0.04, 1.4),
};

export class PavilionScene {
  readonly canvas: HTMLCanvasElement;
  mood: MoodId = "luoxia";
  focus: ImageId = "luoxia";
  onProject: ((pts: Record<ImageId, { x: number; y: number }>) => void) | null = null;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raf = 0;
  private disposed = false;
  private t0 = performance.now();
  private duck: THREE.Group;
  private sun: THREE.Mesh;
  private sunLight: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private water: THREE.Group;
  private waterMesh: THREE.Mesh;
  private waterOrig: Float32Array;
  private fog: THREE.FogExp2;
  private glow: THREE.Sprite;
  private markers = new Map<ImageId, THREE.Object3D>();
  private look = new THREE.Vector3(2.6, 3.2, -12.5);
  private post!: Post;
  private flight!: Flight;
  private mist!: ReturnType<typeof particles>;
  private started = false;
  private lastKey = "";
  private lastT = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower() ? 1 : 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.78;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x8a6a68, 0.009);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0x1a1d38);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.camera.position.set(-4.2, 3.0, 1.5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.minPolarAngle = Math.PI * 0.32;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.copy(this.look);

    this.hemi = new THREE.HemisphereLight(0xffc8a0, 0x1a1418, 0.85);
    this.scene.add(this.hemi);

    this.sunLight = new THREE.DirectionalLight(0xffd4a0, 3.1);
    this.sunLight.position.copy(MARK.luoxia);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(shadowSize(), shadowSize());
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 40;
    this.sunLight.shadow.camera.left = -16;
    this.sunLight.shadow.camera.right = 16;
    this.sunLight.shadow.camera.top = 12;
    this.sunLight.shadow.camera.bottom = -8;
    this.scene.add(this.sunLight);

    const fill = new THREE.PointLight(0x88aacc, 0.55, 40);
    fill.position.set(-8, 4, 6);
    this.scene.add(fill);

    this.water = makeWater();
    this.waterMesh = this.water.children[0] as THREE.Mesh;
    this.waterOrig = (this.waterMesh.geometry.attributes.position.array as Float32Array).slice();
    this.scene.add(this.water);
    this.scene.add(makeHills());
    const pavilion = makePavilion();
    pavilion.position.set(3.4, 0, -12.5);
    pavilion.rotation.y = -0.42;
    pavilion.scale.setScalar(1.1);
    this.scene.add(pavilion);
    // riverbank: terraced mud + stone face + willow fringe (not a flat box)
    this.scene.add(makeRiverbank());
    this.markers.set("feige", pavilion);

    this.scene.add(makeBoats());
    this.duck = makeDuck();
    this.scene.add(this.duck);
    this.markers.set("guwu", this.duck);
    this.markers.set("yuzhou", this.scene.getObjectByName("boats")!);
    this.markers.set("yanzhen", makeGeese());
    this.scene.add(this.markers.get("yanzhen")!);

    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false }),
    );
    this.sun.position.copy(MARK.luoxia);
    this.scene.add(this.sun);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xff8a4a, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.glow.scale.setScalar(16);
    this.glow.position.copy(MARK.luoxia);
    this.scene.add(this.glow);

    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshStandardMaterial({ color: 0x143038, roughness: 0.2, metalness: 0.15 }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.copy(MARK.hantan);
    pool.position.y = 0.02;
    this.scene.add(pool);
    this.markers.set("hantan", pool);
    this.markers.set("luoxia", this.sun);
    this.markers.set("qiushui", this.water);
    this.markers.set("changtian", this.glow);

    this.mist = particles(220, new THREE.Box3(new THREE.Vector3(-34, 0.2, -30), new THREE.Vector3(30, 1.6, -9)), 0xf0d8c8, 2.6, 0.07, "mist");
    this.scene.add(this.mist.points);
    loadHdri(this.renderer, this.scene, "qwantani_dusk_2_puresky", true);
    this.scene.environmentIntensity = 0.55;
    this.post = makePost(this.renderer, this.scene, this.camera, 0.4, 0.95);
    this.flight = new Flight(this.camera, this.controls.target);
    this.resize();
    this.applyMood();
    // hero composition: pavilion right, setting sun left over the river
    this.camera.position.set(-9.5, 2.4, 3.5);
    this.controls.target.set(1.0, 3.6, -12.5);
    this.started = true;
    this.loop();
  }

  resize(): void {
    const w = this.canvas.clientWidth || 960;
    const h = this.canvas.clientHeight || 540;
    this.renderer.setSize(w, h, false);
    this.post?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    this.renderer.dispose();
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const t = (performance.now() - this.t0) / 1000;
    this.duck.position.set(-2.4 + Math.sin(t * 0.35) * 3.2, 3.35 + Math.sin(t * 1.1) * 0.25, -6 + Math.cos(t * 0.28) * 1.4);
    this.duck.rotation.y = Math.sin(t * 0.35) * 0.4;
    const geese = this.markers.get("yanzhen");
    if (geese) geese.position.x = 6.5 + Math.sin(t * 0.12) * 0.8;
    const pos = this.waterMesh.geometry.attributes.position as THREE.BufferAttribute;
    const orig = this.waterOrig;
    const amp = lowPower() ? 0.035 : 0.055;
    for (let i = 0; i < pos.count; i++) {
      const x = orig[i * 3];
      const y = orig[i * 3 + 1];
      const z =
        Math.sin(x * 0.18 + t * 1.15) * amp +
        Math.sin(y * 0.14 + t * 0.85) * amp * 0.7 +
        Math.sin((x + y) * 0.35 + t * 1.8) * amp * 0.35 +
        Math.sin(x * 0.55 - t * 2.2) * amp * 0.18;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    if (!lowPower() || (this.raf % 2 === 0)) this.waterMesh.geometry.computeVertexNormals();
    // glitter path gently pulses with the sun path
    const glitter = this.water.getObjectByName("glitterPath") as THREE.Mesh | undefined;
    if (glitter) {
      const gm = glitter.material as THREE.MeshBasicMaterial;
      gm.opacity = 0.42 + Math.sin(t * 0.6) * 0.12;
    }
    // wing flap on geese + lone duck
    const flap = (bird: THREE.Object3D, phase: number) => {
      const a = Math.sin(t * 4.5 + phase) * 0.35;
      const l = bird.getObjectByName("wingL");
      const r = bird.getObjectByName("wingR");
      if (l) l.rotation.z = 0.15 + a;
      if (r) r.rotation.z = -0.15 - a;
    };
    flap(this.duck, 0);
    const geeseG = this.markers.get("yanzhen");
    if (geeseG) geeseG.children.forEach((c, i) => flap(c, i * 0.7));
    const now = performance.now();
    this.flight.step(Math.min(0.3, (now - this.lastT) / 1000));
    this.lastT = now;
    this.mist.update(t);
    this.controls.update();
    this.post.render();
    this.emitProject();
  };

  private emitProject(): void {
    if (!this.onProject) return;
    const pts = {} as Record<ImageId, { x: number; y: number }>;
    (Object.keys(MARK) as ImageId[]).forEach((id) => {
      const obj = this.markers.get(id);
      const world = obj ? new THREE.Vector3() : MARK[id].clone();
      if (obj) obj.getWorldPosition(world);
      else world.copy(MARK[id]);
      const v = world.project(this.camera);
      pts[id] = { x: (v.x * 0.5 + 0.5) * 100, y: (-v.y * 0.5 + 0.5) * 100 };
    });
    this.onProject(pts);
  }

  applyMood(): void {
    const pal = palette(this.mood, this.focus);
    this.fog.color.set(pal.haze);
    this.scene.backgroundIntensity = pal.sky;
    this.hemi.color.set(pal.sun);
    this.hemi.groundColor.set(pal.hill);
    this.sunLight.color.set(pal.sun);
    this.sunLight.intensity = pal.key;
    ((this.water.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(pal.water);
    this.glow.material.color.set(pal.glow);
    this.look.copy(MARK[this.focus]);
    if (this.focus === "qiushui" || this.focus === "hantan") this.look.y = 0.4;
    if (this.focus === "changtian") this.look.set(2, 5.5, -8);
    if (this.focus === "feige") this.look.set(2.6, 3.2, -12.5);
    const key = this.focus + "|" + this.mood;
    if (this.started && this.lastKey && key !== this.lastKey) {
      const d = { luoxia: 20, guwu: 9, qiushui: 10, changtian: 15, yuzhou: 8, yanzhen: 12, feige: 15, hantan: 8 }[this.focus] ?? 10;
      const dir = new THREE.Vector3(-0.42, 0.18, 1).normalize();
      const eye = this.look.clone().addScaledVector(dir, d);
      eye.y = Math.max(1.4, eye.y);
      this.flight.go(eye, this.look.clone(), 2.0);
    }
    if (this.started) this.lastKey = key;
  }
}

function palette(mood: MoodId, focus: ImageId) {
  const dusk = { zenith: 0x1a1d38, haze: 0x9a6a5c, sky: 0.75, sun: 0xffc488, glow: 0xff7a3a, hill: 0x2a1a22, water: 0x6a7a88, key: 3.2 };
  if (mood === "sanyan") return { zenith: 0x2a3348, haze: 0x8a8a94, sky: 0.8, sun: 0xd8c0a0, glow: 0x88aacc, hill: 0x3d4450, water: 0x5a7080, key: 2.2 };
  if (mood === "yuzhou") return { zenith: 0x1c2438, haze: 0x8a5a52, sky: 0.65, sun: 0xe0905a, glow: 0xc06030, hill: 0x241818, water: 0x4a5a70, key: 2.4 };
  if (mood === "yanzhen") return { zenith: 0x14182a, haze: 0x4a4458, sky: 0.4, sun: 0xb86a55, glow: 0x884030, hill: 0x1a1216, water: 0x34405a, key: 1.6 };
  if (focus === "changtian") return { ...dusk, zenith: 0x2a3a58, water: 0x4a78a0 };
  return dusk;
}

function mat(color: number, roughness = 0.7, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeWater(): THREE.Group {
  const g = new THREE.Group();
  const segs = lowPower() ? 64 : 96;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, segs, segs),
    new THREE.MeshStandardMaterial({
      color: 0x5a7088,
      roughness: 0.08,
      metalness: 0.85,
      envMapIntensity: 1.85,
      flatShading: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.name = "waterMain";
  g.add(m);
  // deeper tint layer underneath for river body
  const deep = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x1a2838, roughness: 1, metalness: 0, transparent: true, opacity: 0.35 }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -0.35;
  g.add(deep);
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd8a8, transparent: true, opacity: 0.55, depthWrite: false, alphaMap: glitterAlpha() }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(-6.4, 0.08, -4.2);
  path.name = "glitterPath";
  g.add(path);
  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 14),
    new THREE.MeshBasicMaterial({ color: 0xf2d7a2, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(0, 0.05, -18);
  g.add(rim);
  return g;
}

function glitterAlpha(): THREE.Texture | null {
  // 落日水面反光：横向两侧淡出 + 细碎波光条纹，避免一整块亮板
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1024;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 1024);
  ctx.filter = "blur(3px)";
  ctx.scale(2, 2);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 300; i++) {
    const y = rnd() * 512;
    const spread = 18 + (y / 512) * 40;
    const x = 64 + (rnd() - 0.5) * 2 * spread;
    const v = Math.round(120 + rnd() * 135);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x - 6 - rnd() * 8, y, 12 + rnd() * 16, 1.5 + rnd() * 2);
  }
  ctx.filter = "none";
  const fade = ctx.createLinearGradient(0, 0, 128, 0);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(0.3, "rgba(0,0,0,0)");
  fade.addColorStop(0.7, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 128, 512);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function makeHills(): THREE.Group {
  // 层叠山脊（远淡近浓），替代早期的压扁球体，避免“积木感”
  const g = new THREE.Group();
  const layers: { z: number; base: number; amp: number; color: number; seed: number; gap?: [number, number] }[] = [
    { z: -34, base: 2.6, amp: 3.4, color: 0x5a4a5c, seed: 1.7 },
    { z: -27, base: 1.8, amp: 2.8, color: 0x463a4c, seed: 4.1 },
    { z: -20, base: 0.9, amp: 2.0, color: 0x30283a, seed: 7.3, gap: [-13, 2] },
    { z: -14, base: 0.4, amp: 1.5, color: 0x1e1a26, seed: 9.9, gap: [-16, 11] },
  ];
  for (const L of layers) {
    const shape = new THREE.Shape();
    const x0 = -70;
    const x1 = 70;
    shape.moveTo(x0, -1);
    for (let x = x0; x <= x1; x += 0.6) {
      const n =
        Math.sin(x * 0.11 + L.seed) * 0.5 +
        Math.sin(x * 0.27 + L.seed * 2.3) * 0.28 +
        Math.sin(x * 0.63 + L.seed * 0.7) * 0.12 +
        Math.abs(Math.sin(x * 0.045 + L.seed)) * 0.6;
      let y = L.base + L.amp * Math.max(0, n);
      if (L.gap && x > L.gap[0] && x < L.gap[1]) {
        const k = Math.min(x - L.gap[0], L.gap[1] - x) / 3;
        y *= Math.max(0.05, 1 - Math.min(1, k));
      }
      shape.lineTo(x, y);
    }
    shape.lineTo(x1, -1);
    shape.closePath();
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 1),
      new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    );
    m.position.z = L.z;
    m.castShadow = L.z > -22;
    g.add(m);
  }
  return g;
}

export function makePavilion(): THREE.Group {
  const g = new THREE.Group();
  const stone = phMat("stone_tiles", [2, 2], { color: 0x9a948a });
  const stoneDark = phMat("stone_tiles", [3, 3], { color: 0x6a645c });
  const wood = phMat("dark_wooden_planks", [1, 1], { color: 0x8a5a44 });
  const dan = phMat("lacquered_cherry_wood", [1, 2], { color: 0xc04030 });
  const gold = mat(0xc6a15b, 0.42, 0.35);
  const tile = new THREE.MeshStandardMaterial({ color: 0x2c3632, roughness: 0.48, metalness: 0.18, side: THREE.DoubleSide });

  // 高台：两级台基 + 正面踏步
  const base = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.5, 7.6), stoneDark);
  base.position.y = 0.25;
  base.receiveShadow = true;
  g.add(base);
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 6.4), stone);
  terrace.position.y = 0.8;
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  g.add(terrace);
  for (let i = 0; i < 5; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.32), stone);
    step.position.set(0, 0.11 + i * 0.22, 3.2 + 0.9 - i * 0.28);
    g.add(step);
  }
  balustrade(g, 7.2, 6.4, 1.1, stone, 0.32);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xff7a30, emissiveIntensity: 1.1, roughness: 0.4 });
  for (const [lx, lz] of [[-3.9, 3.4], [3.9, 3.4], [-1.3, 4.2], [1.3, 4.2]] as [number, number][]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6), wood);
    pole.position.set(lx, 1.1, lz);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 8), lampMat);
    lamp.position.set(lx, 1.8, lz);
    g.add(pole, lamp);
  }

  const paper = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xc07030, emissiveIntensity: 0.32, roughness: 0.6 });
  const stories = [
    { y0: 1.1, w: 4.8, d: 4.3, h: 1.45, roofW: 7.0, roofD: 6.3, rise: 1.0 },
    { y0: 3.0, w: 3.9, d: 3.5, h: 1.2, roofW: 5.8, roofD: 5.2, rise: 0.95 },
    { y0: 4.65, w: 3.0, d: 2.7, h: 1.05, roofW: 4.6, roofD: 4.2, rise: 1.35 },
  ];
  for (const s of stories) {
    const yc = s.y0 + s.h / 2;
    // 平座（楼层台面）
    const floor = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.7, 0.14, s.d + 0.7), wood);
    floor.position.y = s.y0 + 0.07;
    floor.castShadow = true;
    g.add(floor);
    if (s !== stories[0]) balustrade(g, s.w + 0.6, s.d + 0.6, s.y0 + 0.14, dan, 0.36);
    // 内收的墙身
    const body = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.78, s.h, s.d * 0.78), wood);
    body.position.y = yc;
    body.castShadow = true;
    g.add(body);
    // 四面格扇窗
    const bw = s.w * 0.78;
    const bd = s.d * 0.78;
    for (const face of [0, 1, 2, 3]) {
      const along = face % 2 === 0 ? bw : bd;
      const n = 4;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * (along / n);
        const win = new THREE.Mesh(new THREE.BoxGeometry((along / n) * 0.72, s.h * 0.56, 0.04), paper);
        const out = (face % 2 === 0 ? bd : bw) / 2 + 0.02;
        if (face === 0) win.position.set(off, yc + 0.05, out);
        if (face === 1) { win.position.set(out, yc + 0.05, off); win.rotation.y = Math.PI / 2; }
        if (face === 2) win.position.set(off, yc + 0.05, -out);
        if (face === 3) { win.position.set(-out, yc + 0.05, off); win.rotation.y = Math.PI / 2; }
        g.add(win);
      }
    }
    // 回廊檐柱：每面 5 柱
    const cw = s.w * 0.5;
    const cd = s.d * 0.5;
    for (let i = 0; i < 5; i++) {
      const k = -1 + (i * 2) / 4;
      for (const [x, z] of [[k * cw, cd], [k * cw, -cd], [cw, k * cd], [-cw, k * cd]] as [number, number][]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, s.h, 10), dan);
        col.position.set(x, yc, z);
        col.castShadow = true;
        g.add(col);
      }
    }
    // 额枋 + 斗拱层
    const beam = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.16, 0.12, s.d + 0.16), dan);
    beam.position.y = s.y0 + s.h - 0.06;
    g.add(beam);
    brackets(g, s.w + 0.3, s.d + 0.3, s.y0 + s.h + 0.06, gold);
    const roof = curvedRoof(s.roofW, s.roofD, s.rise, tile, gold, s === stories[2]);
    roof.position.y = s.y0 + s.h + 0.16;
    g.add(roof);
  }
  return g;
}

function balustrade(g: THREE.Group, w: number, d: number, y: number, m: THREE.Material, hgt: number): void {
  const hw = w / 2;
  const hd = d / 2;
  for (const [len, x, z, rot] of [
    [w, 0, hd, 0],
    [w, 0, -hd, 0],
    [d, hw, 0, Math.PI / 2],
    [d, -hw, 0, Math.PI / 2],
  ] as [number, number, number, number][]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.06), m);
    rail.position.set(x, y + hgt, z);
    rail.rotation.y = rot;
    g.add(rail);
    const lower = rail.clone();
    lower.position.y = y + hgt * 0.4;
    g.add(lower);
    const n = Math.max(3, Math.round(len / 0.45));
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + (len * i) / n;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, hgt + 0.06, 0.06), m);
      if (rot === 0) post.position.set(t, y + hgt / 2, z);
      else post.position.set(x, y + hgt / 2, t);
      g.add(post);
    }
  }
}

function brackets(g: THREE.Group, w: number, d: number, y: number, m: THREE.Material): void {
  const hw = w / 2;
  const hd = d / 2;
  const geo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  const cap = new THREE.BoxGeometry(0.26, 0.06, 0.12);
  const per = (len: number) => Math.max(4, Math.round(len / 0.42));
  const put = (x: number, z: number, rot: number) => {
    const b = new THREE.Mesh(geo, m);
    b.position.set(x, y, z);
    const c = new THREE.Mesh(cap, m);
    c.position.set(x, y + 0.09, z);
    c.rotation.y = rot;
    g.add(b, c);
  };
  for (let i = 0; i <= per(w); i++) {
    const x = -hw + (w * i) / per(w);
    put(x, hd, 0);
    put(x, -hd, 0);
  }
  for (let i = 1; i < per(d); i++) {
    const z = -hd + (d * i) / per(d);
    put(hw, z, Math.PI / 2);
    put(-hw, z, Math.PI / 2);
  }
}

// 曲面屋顶：举折（上陡下缓）+ 翼角起翘，取代平直四坡面
export function curvedRoof(w: number, d: number, rise: number, tile: THREE.Material, gold: THREE.Material, top: boolean): THREE.Group {
  const g = new THREE.Group();
  const hw = w / 2;
  const hd = d / 2;
  const N = 36;
  const lift = top ? 0.5 : 0.42;
  const pos: number[] = [];
  const idx: number[] = [];
  const P = (u: number, v: number): [number, number, number] => {
    const x = u * hw;
    const z = v * hd;
    const dist = Math.min(hw - Math.abs(x), hd - Math.abs(z));
    const q = Math.min(1, dist / Math.min(hw, hd));
    const corner = Math.pow(Math.abs(u) * Math.abs(v), 5);
    const edge = Math.pow(Math.max(Math.abs(u), Math.abs(v)), 8);
    const y = rise * Math.pow(q, 1.7) + lift * corner + 0.06 * edge;
    const spread = 1 + 0.07 * corner;
    return [x * spread, y, z * spread];
  };
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      pos.push(...P(-1 + (2 * i) / N, -1 + (2 * j) / N));
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      const b = a + 1;
      const c = a + N + 1;
      const e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, tile);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  // 檐口金线：沿四边取样，随起翘一起弯
  const pts: THREE.Vector3[] = [];
  const M = 64;
  for (let k = 0; k < M * 4; k++) {
    const t = (k % M) / M;
    const side = Math.floor(k / M);
    const [u, v] = side === 0 ? [-1 + 2 * t, 1] : side === 1 ? [1, 1 - 2 * t] : side === 2 ? [1 - 2 * t, -1] : [-1, -1 + 2 * t];
    const [x, y, z] = P(u, v);
    pts.push(new THREE.Vector3(x, y - 0.02, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 256, 0.045, 6, true), gold));
  // 正脊 / 宝顶
  if (top) {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), gold);
    finial.position.y = rise + 0.18;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.3, 8), gold);
    stem.position.y = rise + 0.02;
    g.add(finial, stem);
  } else {
    const len = Math.max(0.4, (hw - hd) * 2 + 0.3);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.14), gold);
    ridge.position.y = rise + 0.04;
    g.add(ridge);
    for (const sx of [-1, 1]) {
      const chi = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), gold);
      chi.position.set((sx * len) / 2, rise + 0.2, 0);
      chi.rotation.z = -sx * 0.35;
      g.add(chi);
    }
  }
  return g;
}

export function makeBoats(): THREE.Group {
  // 乌篷小舟：侧面月牙形船身挤出 + 半圆篷 + 细桅，替代胶囊体
  const g = new THREE.Group();
  g.name = "boats";
  const hull = mat(0x2a1a12, 0.78, 0);
  const awning = mat(0x15100c, 0.9, 0);
  const prof = new THREE.Shape();
  prof.moveTo(-0.75, 0.16);
  prof.quadraticCurveTo(-0.45, -0.1, 0, -0.12);
  prof.quadraticCurveTo(0.45, -0.1, 0.75, 0.2);
  prof.lineTo(0.62, 0.1);
  prof.lineTo(-0.62, 0.08);
  prof.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(prof, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 12 });
  hullGeo.translate(0, 0, -0.15);
  const awnGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 12, 1, true, 0, Math.PI);
  awnGeo.rotateZ(Math.PI / 2);
  awnGeo.rotateY(Math.PI / 2);
  for (const [x, z, s, r] of [
    [-4.2, 3.6, 1, 0.3],
    [-2.6, 4.4, 0.72, -0.5],
    [-5.1, 4.8, 0.55, 0.9],
  ] as [number, number, number, number][]) {
    const boat = new THREE.Group();
    const h = new THREE.Mesh(hullGeo, hull);
    h.castShadow = true;
    const aw = new THREE.Mesh(awnGeo, awning);
    aw.rotation.y = Math.PI / 2;
    aw.position.set(0.05, 0.1, 0);
    aw.scale.set(1, 1, 1);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.8, 6), hull);
    mast.position.set(-0.35, 0.5, 0);
    boat.add(h, aw, mast);
    boat.scale.setScalar(s);
    boat.rotation.y = r;
    boat.position.set(x, 0.06, z);
    g.add(boat);
  }
  return g;
}

/** Low-poly goose / 孤鹜: body + neck + head + flared wings (not a cone). */
function makeBird(scale = 1, dark = 0x1a1410): THREE.Group {
  const g = new THREE.Group();
  const feather = mat(dark, 0.75, 0);
  const belly = mat(0x2a2218, 0.8, 0);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), belly);
  body.scale.set(1.7, 0.75, 1);
  body.castShadow = true;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.28, 8), feather);
  neck.position.set(0.18, 0.12, 0);
  neck.rotation.z = -0.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), feather);
  head.position.set(0.32, 0.22, 0);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 5), mat(0xc07030, 0.6, 0.1));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.4, 0.2, 0);
  const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), feather);
  wingL.scale.set(1.8, 0.12, 0.7);
  wingL.position.set(0, 0.04, 0.16);
  wingL.rotation.y = 0.25;
  wingL.rotation.z = 0.15;
  wingL.name = "wingL";
  const wingR = wingL.clone();
  wingR.position.z = -0.16;
  wingR.rotation.y = -0.25;
  wingR.rotation.z = -0.15;
  wingR.name = "wingR";
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), feather);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.28, 0.02, 0);
  g.add(body, neck, head, beak, wingL, wingR, tail);
  g.scale.setScalar(scale);
  return g;
}

function makeDuck(): THREE.Group {
  // 孤鹜 — single wild goose silhouette against the dusk
  return makeBird(2.4, 0x18120e);
}

function makeGeese(): THREE.Group {
  // 雁阵 — loose V of articulated geese, not cone placeholders
  const g = new THREE.Group();
  g.position.copy(MARK.yanzhen);
  g.name = "geese";
  const slots: [number, number, number, number][] = [
    [0, 0, 0, 1.8],
    [-1.2, -0.45, 0.25, 1.55],
    [1.2, -0.45, 0.25, 1.55],
    [-2.3, -0.95, 0.4, 1.4],
    [2.3, -0.95, 0.4, 1.4],
    [-3.3, -1.5, 0.55, 1.25],
    [3.3, -1.5, 0.55, 1.25],
    [-4.2, -2.1, 0.7, 1.15],
    [4.2, -2.1, 0.7, 1.15],
  ];
  for (let i = 0; i < slots.length; i++) {
    const [x, y, z, sc] = slots[i];
    const b = makeBird(sc, i === 0 ? 0x1c1410 : 0x15100c);
    b.position.set(x, y, z);
    b.rotation.y = Math.PI * 0.5 + (i % 2 ? -0.08 : 0.08);
    b.rotation.z = (i % 2 ? -0.05 : 0.05);
    g.add(b);
  }
  return g;
}

/** Terraced riverbank with irregular waterline — replaces flat embankment box. */
function makeRiverbank(): THREE.Group {
  const g = new THREE.Group();
  const mud = phMat("brown_mud_dry", [6, 3], { color: 0x7a6a58 });
  const stone = phMat("stone_tiles", [8, 2], { color: 0x7a7468 });
  // main terrace under pavilion
  const top = new THREE.Mesh(new THREE.BoxGeometry(16, 0.55, 7.5), mud);
  top.position.set(4.0, 0.35, -14.0);
  top.rotation.y = -0.42;
  top.receiveShadow = true;
  top.castShadow = true;
  g.add(top);
  // stone retaining face toward the river
  const face = new THREE.Mesh(new THREE.BoxGeometry(16.2, 1.1, 0.45), stone);
  face.position.set(2.6, 0.05, -10.6);
  face.rotation.y = -0.42;
  face.castShadow = true;
  g.add(face);
  // sloping mud steps into water (irregular boxes)
  const steps: [number, number, number, number][] = [
    [1.2, -0.15, -9.2, 10],
    [-0.5, -0.28, -8.0, 12],
    [-2.0, -0.38, -6.8, 14],
  ];
  for (const [x, y, z, w] of steps) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 1.6), mud);
    step.position.set(x + 3.5, y, z - 4);
    step.rotation.y = -0.38 + (x * 0.02);
    step.receiveShadow = true;
    g.add(step);
  }
  // rocky waterline scatter
  const rockM = new THREE.MeshStandardMaterial({ color: 0x5a544c, roughness: 0.92 });
  for (let i = 0; i < 14; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (i % 4) * 0.06, 0), rockM);
    r.position.set(-4 + i * 1.15 + (i % 3) * 0.2, -0.35, -7.5 - (i % 5) * 0.4);
    r.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    r.scale.set(1 + (i % 3) * 0.3, 0.6 + (i % 2) * 0.3, 1);
    r.castShadow = true;
    g.add(r);
  }
  return g;
}
