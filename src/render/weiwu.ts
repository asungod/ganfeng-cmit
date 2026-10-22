// 客家围龙屋 — procedural architecture + CC0 Poly Haven materials/sky.
// Art direction: weathered rammed-earth grey-brown, grey tile, soft low sun; night = lantern glow + fireflies.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { HourId, RoomId } from "../data/hakka";
import { makeBamboo, makeTree, shadowSize, Flight, disposeScene, gableRoof, lantern, loadHdri, makePost, makeRenderer, particles, phMat, wbox, type Post } from "./kit";

type Pose = { eye: [number, number, number]; look: [number, number, number] };
/** Overview + per-room camera poses (metres; front of the house faces +z). */
const POSES: Record<RoomId | "overview", Pose> = {
  overview: { eye: [46, 32, 10], look: [0, 0, -8] },
  heping: { eye: [9, 4.2, 22], look: [0, 2.2, 6] },
  menlou: { eye: [3.2, 1.8, 16.5], look: [0, 3.0, 9] },
  tianjing: { eye: [0.4, 1.6, 3.0], look: [0, 3.4, 0.2] },
  zutang: { eye: [0, 1.7, 2.4], look: [0, 1.7, -4] },
  zhengwu: { eye: [0, 1.7, -4.1], look: [0, 1.6, -8] },
  hengwu: { eye: [-2.9, 1.7, 3.9], look: [-5.6, 1.5, -2.5] },
  xiangdao: { eye: [-4.7, 1.7, 4.3], look: [-4.7, 2.0, -6] },
  jiaolou: { eye: [12.5, 9, 12.5], look: [8, 4, 6.5] },
};

const HOURS: Record<HourId, { sun: [number, number, number]; col: number; I: number; hemi: number; env: number; exp: number; fog: number; hdri: string; lamp: number }> = {
  dawn: { sun: [-30, 9, 18], col: 0xffc7a0, I: 2.2, hemi: 0.35, env: 0.6, exp: 0.95, fog: 0xb7b0b4, hdri: "qwantani_puresky", lamp: 0.2 },
  noon: { sun: [12, 40, 14], col: 0xfff2dc, I: 3.4, hemi: 0.45, env: 0.9, exp: 0.85, fog: 0xc8d2dc, hdri: "qwantani_puresky", lamp: 0 },
  dusk: { sun: [34, 7, 10], col: 0xf2e6da, I: 2.0, hemi: 0.42, env: 0.75, exp: 0.9, fog: 0xb8aca0, hdri: "qwantani_sunset_puresky", lamp: 0.6 },
  night: { sun: [-14, 30, -10], col: 0x8aa4ff, I: 0.35, hemi: 0.12, env: 0.25, exp: 1.15, fog: 0x10131e, hdri: "qwantani_night_puresky", lamp: 2.6 },
};

export class WeiwuScene {
  room: RoomId | "overview" = "overview";
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  private controls: OrbitControls;
  private flight: Flight;
  private post: Post;
  private sun = new THREE.DirectionalLight(0xffffff, 3);
  private hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6a4a30, 0.4);
  private lamps: THREE.PointLight[] = [];
  private lampMeshes: THREE.Mesh[] = [];
  private fireflies;
  private smoke!: ReturnType<typeof particles>;
  private raf = 0;
  private last = performance.now();
  private hdri = "";
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = makeRenderer(canvas, 1);
    (window as unknown as { __weiwu: unknown }).__weiwu = this;
    this.scene.fog = new THREE.Fog(0xb8aca0, 40, 170);
    this.scene.background = new THREE.Color(0xc89878);
    this.camera.position.set(...POSES.overview.eye);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 70;
    this.controls.target.set(...POSES.overview.look);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.25;
    this.flight = new Flight(this.camera, this.controls.target);
    canvas.addEventListener("pointerdown", () => (this.controls.autoRotate = false));

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize(), shadowSize());
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -30; sc.right = sc.top = 30; sc.near = 1; sc.far = 140;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    this.build();
    this.fireflies = particles(140, new THREE.Box3(new THREE.Vector3(-22, 0.3, -20), new THREE.Vector3(22, 3, 26)), 0xffe08a, 0.22, 0.9, "fly");
    this.scene.add(this.fireflies.points);
    this.post = makePost(this.renderer, this.scene, this.camera, 0.35);
    this.setHour("dusk");
    this.resize();
    this.loop();
  }

  private build(): void {
    const S = this.scene;
    const earth = phMat("earth_grey", [0.5, 0.5], { color: 0xb8ac9c });
    const earthAlt = phMat("plaster_grey", [1, 1], { color: 0xa89c8c });
    const earthIn = phMat("clay_plaster", [1, 1], { color: 0xeee6d6 });
    const tile = phMat("ceramic_roof_01", [3, 2], { color: 0x4e4e50 });
    const ridge = new THREE.MeshStandardMaterial({ color: 0x3e3e44, roughness: 0.7 });
    const wood = phMat("dark_wooden_planks", [1, 1]);
    const lac = phMat("lacquered_cherry_wood", [1, 1], { color: 0x9a3a26 });
    const stone = phMat("stone_tiles", [1, 1], { color: 0xb0a898 });
    const ground = phMat("brown_mud_dry", [24, 24]);

    const g = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), ground);
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    S.add(g);
    // 禾坪 threshing yard (packed earth/stone) + 半月塘 pond
    const yard = wbox(26, 0.08, 9, phMat("stone_tiles", [1, 1], { color: 0xa8a090 }), 0.5);
    yard.position.set(0, 0.04, 13);
    // v18: dark slab removed (yard no longer added)
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 48, Math.PI, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x2e4a48, roughness: 0.04, metalness: 0.75, envMapIntensity: 2.2 }),
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(0, 0.03, 26);
    pond.rotation.z = Math.PI;
    S.add(pond);
    // stone kerb + reeds so the 半月塘 sits in the ground instead of a flat disc
    const kerbM = phMat("stone_tiles", [1, 1], { color: 0x9a9080 });
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI;
      const k = wbox(1.3, 0.28, 0.5, kerbM);
      k.position.set(Math.cos(a) * 8.7, 0.12, 26 - Math.sin(a) * 8.7);
      k.rotation.y = -a + Math.PI / 2;
      S.add(k);
    }
    const reedM = new THREE.MeshStandardMaterial({ color: 0x5a6a38, roughness: 0.9 });
    for (let i = 0; i < 40; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      const rr = 7.6 + Math.random() * 0.8;
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.9 + Math.random() * 0.6, 4), reedM);
      reed.position.set(Math.cos(a) * rr, 0.45, 26 - Math.sin(a) * rr);
      reed.rotation.z = (Math.random() - 0.5) * 0.3;
      S.add(reed);
    }

    // Outer rammed-earth enclosure (main block 22 × 18), wall rooms with inner roofs
    const W = 22, D = 18, H = 5.2, T = 0.6;
    const wall = (w: number, d: number, x: number, z: number, h = H) => {
      const m = wbox(w, h, d, earth);
      m.position.set(x, h / 2, z);
      S.add(m);
      return m;
    };
    wall(W, T, 0, -D / 2);
    wall(T, D, -W / 2, 0);
    wall(T, D, W / 2, 0);
    // front wall with gate opening
    wall(W / 2 - 1.6, T, -(W / 4 + 0.8), D / 2);
    wall(W / 2 - 1.6, T, W / 4 + 0.8, D / 2);
    // small high windows (gun slits) — dark insets
    const slitM = new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 });
    for (let i = -4; i <= 4; i++) {
      if (Math.abs(i) < 1) continue;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.05), slitM);
      s.position.set(i * 2.2, 4.1, D / 2 + T / 2 + 0.01);
      S.add(s);
    }
    // perimeter wall-rooms: shed roof all around inside the outer wall
    const ring = (len: number, x: number, z: number, rotY: number) => {
      const r = gableRoof(len, 4.2, 1.3, tile, ridge);
      r.position.set(x, H - 0.4, z);
      r.rotation.y = rotY;
      S.add(r);
      const inner = wbox(len, H - 0.6, 0.3, earthIn);
      inner.position.set(x + Math.sin(rotY) * 0, (H - 0.6) / 2, z);
      if (rotY === 0) inner.position.z += z > 0 ? -2.1 : 2.1;
      else inner.position.x += x > 0 ? -2.1 : 2.1;
      S.add(inner);
    };
    ring(W, 0, -D / 2 + 2.1, 0);
    ring(W / 2 - 1.6, -(W / 4 + 0.8), D / 2 - 2.1, 0);
    ring(W / 2 - 1.6, W / 4 + 0.8, D / 2 - 2.1, 0);
    ring(D - 8.4, -W / 2 + 2.1, 0, Math.PI / 2);
    ring(D - 8.4, W / 2 - 2.1, 0, Math.PI / 2);

    // 门楼 gate house
    const gate = new THREE.Group();
    const gw = 3.4;
    for (const sx of [-1, 1]) {
      const p = wbox(0.7, 4.8, 1.4, earth);
      p.position.set(sx * (gw / 2 + 0.35), 2.4, 0);
      gate.add(p);
    }
    const lintel = wbox(gw + 1.4, 0.9, 1.4, earth);
    lintel.position.y = 4.45;
    gate.add(lintel);
    const doorFrame = wbox(gw, 3.3, 0.12, wood);
    doorFrame.position.set(0, 1.65, -0.45);
    for (const sx of [-1, 1]) {
      const leaf = wbox(gw / 2 - 0.08, 3.1, 0.1, wood);
      leaf.position.set(sx * (gw / 4 + 0.32), 1.55, -0.35);
      gate.add(leaf);
    }
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.06), new THREE.MeshStandardMaterial({ color: 0x5a1a12, roughness: 0.4 }));
    plaque.position.set(0, 4.1, 0.72);
    gate.add(plaque);
    const gr = gableRoof(gw + 2.2, 2.4, 0.9, tile, ridge);
    gr.position.y = 4.9;
    gate.add(gr);
    gate.position.set(0, 0, D / 2);
    S.add(gate);

    // central axis: 下堂 / 中堂(祖堂) / 上堂 halls with 天井 courtyards
    const hall = (z: number, depth: number, name: "lower" | "zutang" | "upper") => {
      const hg = new THREE.Group();
      const hw = 8;
      if (name === "upper") {
        const back = wbox(hw, 4.2, 0.35, earthIn);
        back.position.set(0, 2.1, -depth / 2);
        hg.add(back);
      } else {
        // central doorway on the axis so you can see through the halls
        for (const sx of [-1, 1]) {
          const half = wbox(hw / 2 - 0.9, 4.2, 0.35, earthIn);
          half.position.set(sx * (hw / 4 + 0.45), 2.1, -depth / 2);
          hg.add(half);
        }
        const over = wbox(1.8, 1.2, 0.35, earthIn);
        over.position.set(0, 3.6, -depth / 2);
        hg.add(over);
      }
      for (const sx of [-1, 1]) {
        const side = wbox(0.35, 4.2, depth, earthIn);
        side.position.set((sx * hw) / 2, 2.1, 0);
        hg.add(side);
      }
      const floor = wbox(hw, 0.25, depth, stone);
      floor.position.y = 0.12;
      hg.add(floor);
      // lacquered columns on the open front + beam
      for (const cx of [-2.6, -0.9, 0.9, 2.6]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 4, 16), lac);
        c.position.set(cx, 2.2, depth / 2 - 0.3);
        c.castShadow = true;
        hg.add(c);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 12), stone);
        base.position.set(cx, 0.32, depth / 2 - 0.3);
        hg.add(base);
      }
      const beam = wbox(hw, 0.35, 0.3, wood);
      beam.position.set(0, 4.1, depth / 2 - 0.3);
      hg.add(beam);
      // ceiling rafters
      for (let i = 0; i < 9; i++) {
        const r = wbox(hw, 0.12, 0.12, wood);
        r.position.set(0, 4.25, -depth / 2 + (i + 0.5) * (depth / 9));
        hg.add(r);
      }
      const roof = gableRoof(hw + 0.6, depth + 0.4, 1.9, tile, ridge);
      roof.position.y = 4.3;
      hg.add(roof);
      if (name === "zutang") {
        // altar, ancestral tablets, offerings, couplets, lanterns
        const screen = wbox(4.2, 3.6, 0.2, lac);
        screen.position.set(0, 1.8, -depth / 2 + 0.3);
        hg.add(screen);
        const altar = wbox(3.2, 1.0, 0.9, lac);
        altar.position.set(0, 0.75, -depth / 2 + 0.8);
        hg.add(altar);
        const shrine = wbox(2.2, 1.6, 0.6, lac);
        shrine.position.set(0, 2.05, -depth / 2 + 0.5);
        hg.add(shrine);
        const gold = new THREE.MeshStandardMaterial({ color: 0xd8a64a, metalness: 0.8, roughness: 0.3 });
        for (let i = -2; i <= 2; i++) {
          const tab = wbox(0.13, 0.46, 0.04, gold);
          tab.position.set(i * 0.3, 2.0 + (Math.abs(i) === 2 ? -0.05 : 0), -depth / 2 + 0.81);
          hg.add(tab);
        }
        const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.5 }));
        plaque.position.set(0, 3.45, -depth / 2 + 0.25);
        hg.add(plaque);
        const pl2 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 0.09), gold);
        pl2.position.copy(plaque.position).add(new THREE.Vector3(0, 0, 0.01));
        pl2.scale.set(0.92, 0.75, 1);
        hg.add(pl2);
        for (const sx of [-1, 1]) {
          const cp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 0.05), new THREE.MeshStandardMaterial({ color: 0xa81e18, roughness: 0.6 }));
          cp.position.set(sx * 1.8, 2.3, -depth / 2 + 0.22);
          hg.add(cp);
          const incense = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 12), gold);
          incense.position.set(sx * 0.9, 1.36, -depth / 2 + 0.85);
          hg.add(incense);
          const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xc8201a, emissive: 0xff6a20, emissiveIntensity: 0.6 }));
          candle.position.set(sx * 1.3, 1.4, -depth / 2 + 0.95);
          hg.add(candle);
          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
          flame.scale.y = 1.8;
          flame.position.set(sx * 1.3, 1.6, -depth / 2 + 0.95);
          hg.add(flame);
        }
        for (const sx of [-1.7, 1.7]) this.addLantern(hg, new THREE.Vector3(sx, 3.3, depth / 2 - 0.9));
      }
      hg.position.z = z;
      S.add(hg);
    };
    hall(5.2, 4, "lower");
    hall(-1.9, 5, "zutang");
    hall(-6.6, 3.2, "upper");
    // 天井 paved courtyards between the halls (sunken, stone)
    for (const z of [1.6, -4.7]) {
      const tj = wbox(7.4, 0.06, 2.2, stone);
      tj.position.set(0, 0.03, z);
      S.add(tj);
    }
    // 横屋 side rows (two long wings) and 巷道 lanes
    for (const sx of [-1, 1]) {
      const wing = new THREE.Group();
      const body = wbox(2.6, 3.4, 12, earthIn);
      body.position.set(0, 1.7, 0);
      wing.add(body);
      for (let i = 0; i < 5; i++) {
        const door = wbox(0.9, 2.0, 0.1, wood);
        door.position.set(-sx * 1.31, 1.0, -4.8 + i * 2.4);
        door.rotation.y = Math.PI / 2;
        wing.add(door);
      }
      const r = gableRoof(12, 2.6, 0.9, tile, ridge);
      r.rotation.y = Math.PI / 2;
      r.position.y = 3.4;
      wing.add(r);
      wing.position.set(sx * 6.7, 0, -0.5);
      S.add(wing);
    }
    // 角楼 corner towers (4 storeys, hip-ish roof)
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
      const tw = new THREE.Group();
      const b = wbox(3.6, 9.5, 3.6, earthAlt);
      b.position.y = 4.75;
      tw.add(b);
      for (let lv = 0; lv < 3; lv++)
        for (const [ax, az, ry] of [[0, 1.81, 0], [1.81, 0, Math.PI / 2], [0, -1.81, 0], [-1.81, 0, Math.PI / 2]]) {
          const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.05), slitM);
          s.position.set(ax, 3 + lv * 2.4, az);
          s.rotation.y = ry;
          tw.add(s);
        }
      const r = gableRoof(4.2, 4.2, 1.5, tile, ridge);
      r.position.y = 9.5;
      tw.add(r);
      tw.position.set(x, 0, z);
      S.add(tw);
    }
    // 围龙 semicircular rear ring (围龙屋 signature)
    const R = 13, segs = 13;
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI + (i / segs) * Math.PI;
      const a1 = Math.PI + ((i + 1) / segs) * Math.PI;
      const am = (a0 + a1) / 2;
      const len = 2 * R * Math.sin((a1 - a0) / 2) + 0.12;
      const seg = new THREE.Group();
      const outer = wbox(len, 4.2, 0.55, earth);
      outer.position.set(0, 2.1, -1.6);
      seg.add(outer);
      const inner = wbox(len * 0.85, 3.2, 0.3, earthIn);
      inner.position.set(0, 1.6, 1.4);
      seg.add(inner);
      const rf = gableRoof(len, 3.4, 1.0, tile, ridge);
      rf.position.y = 3.8;
      seg.add(rf);
      seg.position.set(Math.cos(am) * R, 0, -D / 2 + Math.sin(am) * R * 0.75);
      seg.rotation.y = -am - Math.PI / 2;
      S.add(seg);
    }
    // 化胎 mound inside the ring
    const mound = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), ground);
    mound.scale.set(1, 0.08, 0.55);
    mound.position.set(0, 0, -D / 2 - 2.5);
    mound.receiveShadow = true;
    S.add(mound);
    this.smoke = particles(60, new THREE.Box3(new THREE.Vector3(-1, 1.5, -3.8), new THREE.Vector3(1, 3.8, -3.6)), 0xd8d0c8, 0.35, 0.18, "smoke");
    S.add(this.smoke.points);
    // facade lanterns at the gate
    for (const sx of [-1.4, 1.4]) this.addLantern(S, new THREE.Vector3(sx, 3.6, D / 2 + 1.1));
    // camphor trees + bamboo clumps for scale and life (procedural)
    const trees: [number, number, number][] = []; // v18: low-poly trees removed
    trees.forEach(([x, z, k], i) => {
      const t = makeTree(i + 1, k * 1.45);
      t.position.set(x, 0, z);
      S.add(t);
    });
    for (const [x, z] of [[-18, -17], [20, 16]]) {
      const b = makeBamboo(x * 3 + z, 11);
      b.position.set(x, 0, z);
      S.add(b);
    }
    // distant hills for silhouette
    const hillM = new THREE.MeshStandardMaterial({ color: 0x4a5a48, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(18 + (i % 3) * 6, 20, 10), hillM);
      const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.9;
      h.scale.y = 0.45;
      h.position.set(Math.cos(a) * 110, -3, Math.sin(a) * 90 - 10);
      S.add(h);
    }
  }

  private addLantern(parent: THREE.Object3D, p: THREE.Vector3): void {
    const l = lantern(0xff4a22);
    l.position.copy(p);
    parent.add(l);
    this.lampMeshes.push(l.children[0] as THREE.Mesh);
    if (this.lamps.length < 6) {
      const pl = new THREE.PointLight(0xff8a4a, 1, 9, 2);
      pl.position.copy(p).add(new THREE.Vector3(0, -0.3, 0));
      parent.add(pl);
      this.lamps.push(pl);
    }
  }

  setHour(h: HourId): void {
    const c = HOURS[h];
    this.sun.position.set(...c.sun);
    this.sun.color.set(c.col);
    this.sun.intensity = c.I;
    this.hemi.intensity = c.hemi;
    this.scene.environmentIntensity = c.env;
    this.renderer.toneMappingExposure = c.exp;
    (this.scene.fog as THREE.Fog).color.set(c.fog);
    if (this.hdri !== c.hdri) {
      this.hdri = c.hdri;
      loadHdri(this.renderer, this.scene, c.hdri, !(h === "night"));
      if (h === "night") this.scene.background = new THREE.Color(0x0b0d16);
    }
    this.scene.backgroundIntensity = h === "night" ? 0.5 : 1;
    for (const l of this.lamps) l.intensity = c.lamp * 2.2;
    for (const m of this.lampMeshes) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + c.lamp * 1.4;
    this.fireflies.points.visible = h === "night" || h === "dusk";
    this.post.bloom.strength = h === "night" ? 0.75 : 0.28;
  }

  setRoom(r: RoomId | "overview", instant = false): void {
    this.room = r;
    const p = POSES[r] ?? POSES.overview;
    this.controls.autoRotate = r === "overview";
    const eye = new THREE.Vector3(...p.eye), look = new THREE.Vector3(...p.look);
    if (instant) {
      this.camera.position.copy(eye);
      this.controls.target.copy(look);
    } else this.flight.go(eye, look, r === "overview" ? 2.2 : 1.8);
    this.controls.minDistance = r === "overview" ? 8 : 0.05;
    this.controls.maxPolarAngle = r === "overview" ? Math.PI * 0.495 : Math.PI * 0.92;
    this.controls.minPolarAngle = r === "overview" ? 0 : Math.PI * 0.2;
  }

  resize(): void {
    const w = this.canvas.clientWidth || 960, h = this.canvas.clientHeight || 540;
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.3, (now - this.last) / 1000);
    this.last = now;
    this.flight.step(dt);
    this.fireflies.update(now / 1000);
    this.smoke.update(now / 1000);
    this.controls.update();
    this.post.render();
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    disposeScene(this.scene);
    this.renderer.dispose();
  }
}
