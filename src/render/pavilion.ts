import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ImageId, MoodId } from "../data/tengwang";

const MARK: Record<ImageId, THREE.Vector3> = {
  luoxia: new THREE.Vector3(-10, 5.2, -18),
  guwu: new THREE.Vector3(-2.4, 3.4, -6),
  qiushui: new THREE.Vector3(0.2, 0.05, 2.2),
  changtian: new THREE.Vector3(1.5, 8.5, -10),
  yuzhou: new THREE.Vector3(-4.2, 0.12, 3.6),
  yanzhen: new THREE.Vector3(6.5, 7.2, -12),
  feige: new THREE.Vector3(7.4, 3.6, -7.2),
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
  private glow: THREE.Mesh;
  private markers = new Map<ImageId, THREE.Object3D>();
  private look = new THREE.Vector3(7.4, 2.4, -7.2);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x1a1d38, 0.016);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0x1a1d38);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.camera.position.set(1.6, 3.15, 7.2);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.18;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 14;
    this.controls.minPolarAngle = Math.PI * 0.32;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.copy(this.look);

    this.hemi = new THREE.HemisphereLight(0xffc8a0, 0x1a1418, 0.85);
    this.scene.add(this.hemi);

    this.sunLight = new THREE.DirectionalLight(0xffd4a0, 3.1);
    this.sunLight.position.copy(MARK.luoxia);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
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
    pavilion.position.set(7.4, 0, -7.2);
    this.scene.add(pavilion);
    this.markers.set("feige", pavilion);

    this.scene.add(makeBoats());
    this.duck = makeDuck();
    this.scene.add(this.duck);
    this.markers.set("guwu", this.duck);
    this.markers.set("yuzhou", this.scene.getObjectByName("boats")!);
    this.markers.set("yanzhen", makeGeese());
    this.scene.add(this.markers.get("yanzhen")!);

    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe6b8 }),
    );
    this.sun.position.copy(MARK.luoxia);
    this.scene.add(this.sun);
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.16, depthWrite: false }),
    );
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

    this.resize();
    this.applyMood();
    this.loop();
  }

  resize(): void {
    const w = this.canvas.clientWidth || 960;
    const h = this.canvas.clientHeight || 540;
    this.renderer.setSize(w, h, false);
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
    for (let i = 0; i < pos.count; i++) {
      const x = orig[i * 3];
      const y = orig[i * 3 + 1];
      pos.setZ(i, Math.sin(x * 0.22 + t * 1.2) * 0.04 + Math.sin(y * 0.16 + t * 0.8) * 0.025);
    }
    pos.needsUpdate = true;
    this.waterMesh.geometry.computeVertexNormals();
    this.controls.target.lerp(this.look, 0.04);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
    this.scene.background = new THREE.Color(pal.zenith);
    this.fog.color.set(pal.zenith);
    this.hemi.color.set(pal.sun);
    this.hemi.groundColor.set(pal.hill);
    this.sunLight.color.set(pal.sun);
    this.sunLight.intensity = pal.key;
    ((this.water.children[0] as THREE.Mesh).material as THREE.MeshPhongMaterial).color.set(pal.water);
    (this.glow.material as THREE.MeshBasicMaterial).color.set(pal.glow);
    this.look.copy(MARK[this.focus]);
    if (this.focus === "qiushui" || this.focus === "hantan") this.look.y = 0.4;
    if (this.focus === "changtian") this.look.set(2, 5.5, -8);
    if (this.focus === "feige") this.look.set(7.4, 3.2, -7.2);
  }
}

function palette(mood: MoodId, focus: ImageId) {
  const dusk = { zenith: 0x1a1d38, sun: 0xffd4a0, glow: 0xff7a3a, hill: 0x2a1a22, water: 0x3a6a88, key: 2.8 };
  if (mood === "sanyan") return { zenith: 0x2a3348, sun: 0xc9a07a, glow: 0x88aacc, hill: 0x3d4450, water: 0x3a6888, key: 1.8 };
  if (mood === "yuzhou") return { zenith: 0x1c2438, sun: 0xd4895a, glow: 0xc06030, hill: 0x241818, water: 0x2a5878, key: 2.0 };
  if (mood === "yanzhen") return { zenith: 0x14182a, sun: 0xb86a55, glow: 0x884030, hill: 0x1a1216, water: 0x2a4868, key: 1.7 };
  if (focus === "changtian") return { ...dusk, zenith: 0x2a3a58, water: 0x4a78a0 };
  return dusk;
}

function mat(color: number, roughness = 0.7, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeWater(): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90, 56, 56),
    new THREE.MeshPhongMaterial({
      color: 0x3a6a88,
      specular: 0xffe2c0,
      shininess: 90,
      flatShading: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  g.add(m);
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 22),
    new THREE.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(-6.4, 0.06, -4.2);
  g.add(path);
  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 12),
    new THREE.MeshBasicMaterial({ color: 0xf2d7a2, transparent: true, opacity: 0.14, depthWrite: false }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(0, 0.05, -16);
  g.add(rim);
  return g;
}

function makeHills(): THREE.Group {
  const g = new THREE.Group();
  const far = mat(0x3a2430, 0.95, 0);
  const near = mat(0x21151a, 0.92, 0);
  for (const [x, z, s, y, c] of [
    [-18, -22, 14, 3.2, far],
    [-6, -26, 18, 4.4, far],
    [8, -24, 16, 3.8, far],
    [20, -20, 12, 2.8, far],
    [-14, -14, 9, 2.2, near],
    [16, -15, 10, 2.4, near],
  ] as [number, number, number, number, THREE.MeshStandardMaterial][]) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), c);
    hill.scale.set(s, y, s * 0.7);
    hill.position.set(x, y * 0.15, z);
    hill.castShadow = true;
    g.add(hill);
  }
  return g;
}

function makePavilion(): THREE.Group {
  const g = new THREE.Group();
  const stone = mat(0x3a342c, 0.88, 0.08);
  const wood = mat(0x2b1812, 0.72, 0.04);
  const dan = mat(0x8c2d24, 0.55, 0.08);
  const gold = mat(0xc6a15b, 0.4, 0.35);

  const terrace = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.55, 6.4), stone);
  terrace.position.y = 0.28;
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  g.add(terrace);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.22, 7.4), stone);
  plinth.position.y = 0.02;
  g.add(plinth);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xff7a30, emissiveIntensity: 0.9, roughness: 0.4 });
  for (const [lx, lz] of [[-3.1, 2.8], [3.1, 2.8], [-3.1, -2.8], [3.1, -2.8]] as [number, number][]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6), wood);
    pole.position.set(lx, 1.1, lz);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampMat);
    lamp.position.set(lx, 1.95, lz);
    g.add(pole, lamp);
  }

  const stories = [
    { y: 1.15, w: 4.6, d: 4.2, h: 1.35, roofW: 6.6, roofD: 5.8, peak: false },
    { y: 2.7, w: 3.7, d: 3.4, h: 1.15, roofW: 5.4, roofD: 4.8, peak: false },
    { y: 4.05, w: 2.8, d: 2.6, h: 1.0, roofW: 4.2, roofD: 3.8, peak: true },
  ];
  for (const s of stories) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), wood);
    body.position.y = s.y;
    body.castShadow = true;
    g.add(body);
    const paper = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xc07030, emissiveIntensity: 0.55, roughness: 0.6 });
    for (const wx of [-0.28, 0, 0.28]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.16, s.h * 0.42, 0.06), paper);
      win.position.set(s.w * wx, s.y + 0.04, s.d * 0.5 + 0.02);
      g.add(win);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, s.h, 8), dan);
        col.position.set(sx * s.w * 0.42, s.y, sz * s.d * 0.42);
        g.add(col);
      }
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.5, 0.08, s.d + 0.5), gold);
    rail.position.y = s.y - s.h * 0.48;
    g.add(rail);
    const roof = hipRoof(s.roofW, s.roofD, s.peak ? 0.95 : 0.62, s.peak, dan, gold);
    roof.position.y = s.y + s.h * 0.5 + 0.04;
    g.add(roof);
  }
  return g;
}

function hipRoof(w: number, d: number, rise: number, peak: boolean, dan: THREE.MeshStandardMaterial, gold: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  const hw = w / 2;
  const hd = d / 2;
  const lift = 0.28;
  const rx = peak ? 0 : hw * 0.22;
  const geo = new THREE.BufferGeometry();
  const v: number[] = [];
  const push = (a: number[]) => v.push(...a);
  const ridgeL: [number, number, number] = [-rx, rise, 0];
  const ridgeR: [number, number, number] = [rx, rise, 0];
  const fl: [number, number, number] = [-hw, lift, hd];
  const fr: [number, number, number] = [hw, lift, hd];
  const bl: [number, number, number] = [-hw, lift, -hd];
  const br: [number, number, number] = [hw, lift, -hd];
  const tri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => push([...a, ...b, ...c]);
  tri(fl, fr, ridgeR); tri(fl, ridgeR, ridgeL);
  tri(br, bl, ridgeL); tri(br, ridgeL, ridgeR);
  tri(fl, ridgeL, bl);
  tri(fr, br, ridgeR);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, dan);
  roof.castShadow = true;
  g.add(roof);
  for (const [x, z] of [[-hw, hd], [hw, hd], [-hw, -hd], [hw, -hd]] as [number, number][]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 4), dan);
    wing.position.set(x * 1.04, lift + 0.35, z * 1.04);
    wing.rotation.z = x < 0 ? 0.55 : -0.55;
    wing.rotation.x = z > 0 ? -0.35 : 0.35;
    wing.castShadow = true;
    g.add(wing);
  }
  const eave = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.07, d * 1.06), gold);
  eave.position.y = 0.02;
  g.add(eave);
  const tile = mat(0x6a241c, 0.62, 0.12);
  for (let i = 1; i <= 4; i++) {
    const k = i / 5;
    const row = new THREE.Mesh(new THREE.BoxGeometry(w * (1 - k * 0.18), 0.03, d * (1 - k * 0.18)), tile);
    row.position.y = lift + (rise - lift) * k + 0.04;
    g.add(row);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.35, rx * 2 + 0.4), 0.1, 0.14), gold);
  ridge.position.y = rise + 0.08;
  g.add(ridge);
  const chiwen = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 5), gold);
  chiwen.position.set(0, rise + 0.28, 0);
  g.add(chiwen);
  return g;
}

function makeBoats(): THREE.Group {
  const g = new THREE.Group();
  g.name = "boats";
  const hull = mat(0x1a120e, 0.8, 0);
  for (const [x, z, s] of [
    [-4.2, 3.6, 1],
    [-2.6, 4.4, 0.72],
    [-5.1, 4.8, 0.55],
  ] as [number, number, number][]) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.18 * s, 1.1 * s, 4, 8), hull);
    b.rotation.z = Math.PI / 2;
    b.position.set(x, 0.1, z);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9 * s, 0.04), hull);
    mast.position.set(x, 0.5 * s, z);
    g.add(b, mast);
  }
  return g;
}

function makeDuck(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0x1a120e, 0.7, 0));
  body.scale.set(1.6, 0.7, 1);
  const wing = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0x24160e, 0.7, 0));
  wing.scale.set(2.2, 0.2, 0.7);
  wing.position.set(0.1, 0.02, 0);
  g.add(body, wing);
  return g;
}

function makeGeese(): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(MARK.yanzhen);
  const m = new THREE.MeshBasicMaterial({ color: 0x1a120e });
  for (let i = 0; i < 9; i++) {
    const side = i < 5 ? -1 : 1;
    const k = i < 5 ? i : i - 4;
    const bird = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 3), m);
    bird.rotation.x = Math.PI / 2;
    bird.position.set(side * k * 0.55, -k * 0.28, 0);
    g.add(bird);
  }
  return g;
}
