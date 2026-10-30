// 赣南围屋 (v29: square, 四角炮楼) — procedural architecture + CC0 Poly Haven materials/sky.
// Art direction: weathered rammed-earth grey-brown, grey tile, soft low sun; night = lantern glow + fireflies.
import * as THREE from "three";
import { qingwaMat } from "./guofeng";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { HourId, RoomId } from "../data/hakka";
import { setPaperCamera } from "./paperFigure";
import { makeBamboo, makeFigure, makeTree, shadowSize, Flight, disposeScene, gableRoof, lantern, loadHdri, makePost, makeRenderer, particles, phMat, wbox, type Post } from "./kit";

type Pose = { eye: [number, number, number]; look: [number, number, number]; fov?: number };
/** Overview + per-room camera poses (metres; front of the house faces +z). */
const POSES: Record<RoomId | "overview", Pose> = {
  overview: { eye: [10, 14, 12], look: [0, 1.4, -1.0] }, // v41r3: open bays face camera more
  heping: { eye: [9, 4.2, 22], look: [0, 2.2, 6] },
  menlou: { eye: [3.2, 1.8, 16.5], look: [0, 3.0, 9] },
  tianjing: { eye: [0.2, 5.55, 2.65], look: [0.15, 1.55, 1.55], fov: 58 }, // v53r2: mid 天井 bird — sky strip + jars/folk/pavement, not side wall
  zutang: { eye: [0.0, 2.9, 3.55], look: [0, 1.5, -1.45], fov: 62 }, // v42g: slightly further mid 天井 — altar+桌, thin posts
  zhengwu: { eye: [0.0, 2.95, -3.85], look: [0, 1.45, -6.65], fov: 58 }, // v42g: mid rear 天井 — clear of 祖堂 side ends, 八仙桌 reads
  hengwu: { eye: [-5.2, 1.7, 3.5], look: [-7.5, 1.3, -2.0], fov: 55 }, // v38: follow wing out to x±9.4
  xiangdao: { eye: [5.2, 3.4, 7.0], look: [7.6, 1.9, -1.8], fov: 50 }, // v40: from courtyard into 巷道 — depth + both eaves
  jiaolou: { eye: [21, 4.2, 19], look: [11, 5.2, 9] }, // v34: outside, front-right 炮楼 with 射击孔, bamboo behind camera line
};

const HOURS: Record<HourId, { sun: [number, number, number]; col: number; I: number; hemi: number; env: number; exp: number; fog: number; hdri: string; lamp: number }> = {
  dawn: { sun: [-30, 9, 18], col: 0xffc7a0, I: 2.2, hemi: 0.35, env: 0.6, exp: 0.95, fog: 0xb7b0b4, hdri: "qwantani_puresky", lamp: 0.2 },
  noon: { sun: [12, 40, 14], col: 0xfff2dc, I: 3.7, hemi: 0.9, env: 1.15, exp: 1.08, fog: 0xc8d2dc, hdri: "qwantani_puresky", lamp: 0.35 }, // v52g noon
  dusk: { sun: [34, 9, 10], col: 0xf0dcc8, I: 2.55, hemi: 0.95, env: 1.0, exp: 1.12, fog: 0x8a8078, hdri: "qwantani_sunset_puresky", lamp: 0.55 },
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
  private hourId: HourId = "dusk";
  private disposed = false;
  private solids: THREE.Mesh[] = [];
  private boxes: THREE.Box3[] = [];
  private fills: { l: THREE.PointLight; k: number }[] = [];
  private skyFill: THREE.DirectionalLight | null = null;
  private haze!: THREE.Mesh;
  private winMats: THREE.MeshStandardMaterial[] = [];
  private folk = new THREE.Group();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = makeRenderer(canvas, 1);
    (window as unknown as { __weiwu: unknown }).__weiwu = this;
    this.scene.fog = new THREE.Fog(0xb8aca0, 120, 380);
    this.scene.background = new THREE.Color(0xc89878);
    this.camera.position.set(...POSES.overview.eye);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minPolarAngle = Math.PI * 0.22; // v40: match overview — no pure nadir
    this.controls.minDistance = 22;
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
    this.addHaze();
    this.scene.updateMatrixWorld(true);
    this.boxes = this.solids.map((m) => new THREE.Box3().setFromObject(m).expandByScalar(0.35));
    this.fireflies = particles(90, new THREE.Box3(new THREE.Vector3(-22, 1.4, -20), new THREE.Vector3(22, 4.2, 26)), 0xffe08a, 0.12, 0.7, "fly"); // v36: higher + smaller — low additive dots bloomed into peach floor blobs
    this.scene.add(this.fireflies.points);
    this.post = makePost(this.renderer, this.scene, this.camera, 0.35);
    this.setHour("dusk");
    this.resize();
    this.loop();
  }

  private build(): void {
    const S = this.scene;
    // v25: cool plaster outer walls (less warm pebble under dusk HDRI)
    const earth = phMat("plaster_grey", [0.6, 0.6], { color: 0x68747c });
    const earthAlt = phMat("plaster_grey", [1, 1], { color: 0x747e86 });
    const earthIn = phMat("clay_plaster", [1, 1], { color: 0xeee6d6 });
    const tile = qingwaMat([3, 2]); // v23: 小青瓦
    const ridge = new THREE.MeshStandardMaterial({ color: 0x3e3e44, roughness: 0.7 });
    const wood = phMat("dark_wooden_planks", [1, 1]);
    const lac = phMat("lacquered_cherry_wood", [1, 1], { color: 0x9a3a26 });
    const stone = phMat("stone_tiles", [1, 1], { color: 0xb0a898 });
    const ground = phMat("stone_tiles", [18, 18], { color: 0x8a8884 }); // v24: cool grey stone yard (was warm brown mud)

    const g = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), ground);
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    S.add(g);
    // 禾坪 threshing yard (packed earth/stone) + 半月塘 pond
    const yard = wbox(26, 0.08, 9, phMat("stone_tiles", [1, 1], { color: 0x9a9890 }), 0.5);
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
      S.add(m); this.solids.push(m);
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
    // v38: perimeter sheds tiny + outboard only. No back-wall roofs (上堂 owns the north end).
    // Birdseye must read as open 天井 + distinct ridges, not a roof pile.
    const wallRoomDepth = 1.1;
    for (const sx of [-1, 1]) {
      const fx = sx * 8.0;
      const fzWall = D / 2;
      const fz = fzWall - wallRoomDepth / 2;
      const flen = 4.0;
      const fr = gableRoof(flen, wallRoomDepth, 0.55, tile, ridge);
      fr.position.set(fx, H - 0.05, fz);
      S.add(fr);
      const finner = wbox(flen, H - 0.6, 0.25, earthIn);
      finner.position.set(fx, (H - 0.6) / 2, fzWall - wallRoomDepth);
      S.add(finner); this.solids.push(finner);
    }

    // 门楼 gate house
    const gate = new THREE.Group();
    const gw = 3.4;
    for (const sx of [-1, 1]) {
      const p = wbox(0.7, 4.8, 1.4, earth);
      p.position.set(sx * (gw / 2 + 0.35), 2.4, 0);
      gate.add(p); this.solids.push(p);
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
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.06), [
      new THREE.MeshStandardMaterial({ color: 0x3a140e, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x3a140e, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x3a140e, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x3a140e, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: plaqueTexture(), roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0x3a140e, roughness: 0.6 }),
    ]);
    plaque.position.set(0, 4.1, 0.72);
    gate.add(plaque);
    const gr = gableRoof(gw + 1.2, 1.3, 0.7, tile, ridge); // v38: clear of 下堂
    gr.position.set(0, 4.9, 0.45);
    gate.add(gr);
    gate.position.set(0, 0, D / 2);
    S.add(gate);

    // central axis: 下堂 / 中堂(祖堂) / 上堂 halls with 天井 courtyards
    const furn = makeFurniture(wood, lac);
    const hall = (z: number, depth: number, name: "lower" | "zutang" | "upper") => {
      const hg = new THREE.Group();
      const hw = 5.8; // v38: narrower — wide 巷道 between halls and 横屋
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
      // v41r3: side walls stop short of front — earth wall ends were reading as fat porch pillars
      for (const sx of [-1, 1]) {
        const sideDepth = Math.max(1.2, depth - 0.65);
        const side = wbox(0.32, 4.2, sideDepth, earthIn);
        side.position.set((sx * hw) / 2, 2.1, -0.32);
        hg.add(side); this.solids.push(side);
      }
      const floor = wbox(hw, 0.25, depth, stone);
      floor.position.y = 0.12;
      hg.add(floor);
      // v41: thin 檐柱 at bay ends only — open doorway, interiors readable from birdseye
      // (was 4× fat Ø~0.36 poles + chunky bases = pillar forest)
      for (const cx of [-2.05, 2.05]) { // v42c: inboard enough to bookend room cams
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 4, 10), lac); // v42: Ø~0.10
        c.position.set(cx, 2.2, depth / 2 - 0.42);
        c.castShadow = true;
        hg.add(c);
        const baseM = new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.92 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.1, 8), baseM);
        base.position.set(cx, 0.22, depth / 2 - 0.42);
        hg.add(base);
      }
      const beam = wbox(hw, 0.22, 0.2, wood); // v41: slender 额枋
      beam.position.set(0, 4.15, depth / 2 - 0.42);
      hg.add(beam);
      // ceiling rafters
      for (let i = 0; i < 9; i++) {
        const r = wbox(hw, 0.12, 0.12, wood);
        r.position.set(0, 4.25, -depth / 2 + (i + 0.5) * (depth / 9));
        hg.add(r);
      }
      // v38: eaves flush-ish; depth shortened so neighbouring hall roofs never kiss
      const roof = gableRoof(hw + 0.05, Math.max(1.6, depth - 0.35), 1.4, tile, ridge);
      roof.position.y = 4.3;
      hg.add(roof);
      if (name === "zutang") {
        // altar, ancestral tablets, offerings, couplets, lanterns
        const screen = wbox(4.2, 3.6, 0.2, lac);
        screen.position.set(0, 1.8, -depth / 2 + 0.3);
        hg.add(screen);
        // v45: altar shares 八仙桌 joinery language (束腰/牙板/马蹄)
        const altar = furn.altar(); altar.position.set(0, 0.25, -depth / 2 + 0.8); hg.add(altar);
        const shrine = wbox(2.2, 1.6, 0.6, lac);
        shrine.position.set(0, 2.05, -depth / 2 + 0.5);
        hg.add(shrine);
        const gold = new THREE.MeshStandardMaterial({ color: 0xd8a64a, metalness: 0.8, roughness: 0.3 });
        // v29: painted 神主牌 (generic 历代祖先 wording — no real lineage)
        const tabTex = tabletTexture();
        const tabM = [0, 0, 0, 0, 1, 0].map((f) => (f ? new THREE.MeshStandardMaterial({ map: tabTex, roughness: 0.55 }) : new THREE.MeshStandardMaterial({ color: 0x5a1a10, roughness: 0.5 })));
        const big = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.06), tabM);
        big.position.set(0, 2.15, -depth / 2 + 0.83);
        hg.add(big);
        for (const sx of [-1, 1]) {
          const sm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.05), new THREE.MeshStandardMaterial({ color: 0x6a2014, roughness: 0.5 }));
          sm.position.set(sx * 0.55, 2.0, -depth / 2 + 0.82);
          hg.add(sm);
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
          const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xc8201a, emissive: 0xff6a20, emissiveIntensity: 0.6 }));
          candle.position.set(sx * 1.3, 1.4, -depth / 2 + 0.95);
          hg.add(candle);
          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
          flame.scale.y = 1.8;
          flame.position.set(sx * 1.3, 1.6, -depth / 2 + 0.95);
          hg.add(flame);
        }
        // v29: 三足香炉 centred on the altar (bowl + rim + legs + ears) with three sticks
        const bronze = new THREE.MeshStandardMaterial({ color: 0x6a4a28, metalness: 0.7, roughness: 0.45 });
        const lu = new THREE.Group();
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze);
        bowl.scale.y = 0.75; bowl.position.y = 0.2; lu.add(bowl);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 24), bronze);
        rim.rotation.x = Math.PI / 2; rim.position.y = 0.2; lu.add(rim);
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.12, 6), bronze);
          leg.position.set(Math.cos(a) * 0.13, 0.06, Math.sin(a) * 0.13); lu.add(leg);
        }
        for (const ex of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), bronze);
          ear.position.set(ex * 0.15, 0.24, 0); ear.rotation.y = Math.PI / 2; lu.add(ear);
        }
        const stickM = new THREE.MeshStandardMaterial({ color: 0x8a3a1a, emissive: 0xff5010, emissiveIntensity: 0.25 });
        for (let k = -1; k <= 1; k++) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), stickM);
          st.position.set(k * 0.05, 0.36, 0); lu.add(st);
        }
        lu.position.set(0, 1.25, -depth / 2 + 1.0);
        hg.add(lu);
        for (const sx of [-1.7, 1.7]) this.addLantern(hg, new THREE.Vector3(sx, 3.3, depth / 2 - 0.9));
      }
      // v34: warm interior fill so halls read at every hour
      const fl = new THREE.PointLight(0xffc890, 1, 7.5, 1.5); fl.position.set(0, 3.2, 0.2); hg.add(fl); this.fills.push({ l: fl, k: name === "zutang" ? 1.2 : 1.05 }); // v53r1: cut fill bloom ball on 神主墙
      if (!this.skyFill && name === "zutang") {
        // v52: noon courtyard skylight into 祖堂 (Directional through open front)
        this.skyFill = new THREE.DirectionalLight(0xfff2dc, 0);
        this.skyFill.position.set(0, 18, 8);
        this.skyFill.target.position.set(0, 1.2, -1);
        this.scene.add(this.skyFill, this.skyFill.target);
      }
      if (name === "zutang") { // 八仙桌 + 太师椅 pair before the altar
        const t = furn.baxian(); t.position.set(0, 0.25, -depth / 2 + 2.0); hg.add(t);
        for (const sx of [-1, 1]) { const c = furn.chair(); c.position.set(sx * 0.95, 0.25, -depth / 2 + 2.0); c.rotation.y = -sx * Math.PI / 2; hg.add(c); }
      } else if (name === "lower") { // v41: centre 八仙桌 so open bay reads lived-in from overview
        const t = furn.baxian(); t.position.set(0, 0.25, 0.15); hg.add(t);
        for (const sx of [-1, 1]) { const b = furn.bench(1.5); b.position.set(sx * 1.2, 0.25, 0.15); b.rotation.y = -sx * Math.PI / 2; hg.add(b); }
      } else for (const sx of [-1, 1]) { const b = furn.bench(1.8); b.position.set(sx * 2.85, 0.25, 0); b.rotation.y = Math.PI / 2; hg.add(b); }
      if (name === "upper") { // v36: 八仙桌 + 条凳 pair so 正屋 reads as a lived hall
        const t = furn.baxian(); t.position.set(0, 0.25, -depth / 2 + 1.1); hg.add(t);
        for (const sx of [-1, 1]) { const b = furn.bench(1.4); b.position.set(sx * 1.15, 0.25, -depth / 2 + 1.1); b.rotation.y = -sx * Math.PI / 2; hg.add(b); }
      }
      hg.position.z = z;
      S.add(hg);
    };
    hall(5.0, 3.0, "lower"); // v38: south, short — big mid 天井
    hall(-0.8, 3.4, "zutang"); // v38: mid, short
    hall(-6.5, 2.3, "upper"); // v38: north, inside rear wall, big rear 天井
    // 天井 paved courtyards between the halls (sunken, stone)
    for (const z of [2.0, -4.2]) {
      const tj = wbox(6.2, 0.06, 2.8, stone);
      tj.position.set(0, 0.03, z);
      S.add(tj);
    }
    // v41r2: courtyard life — 水缸 + 石凳 so mid 天井 isn't empty pavement
    {
      const pot = new THREE.MeshStandardMaterial({ color: 0x4a5a52, roughness: 0.75 });
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.7, 16), pot);
      jar.position.set(-2.2, 0.4, 2.0); S.add(jar);
      const jar2 = jar.clone(); jar2.position.set(2.4, 0.4, -4.15); S.add(jar2);
      for (const [x, z] of [[-0.8, 2.35], [0.9, 1.7], [-1.0, -4.35]] as [number, number][]) {
        const st = wbox(0.55, 0.28, 0.4, stone); st.position.set(x, 0.2, z); S.add(st);
      }
    }
    // v37: a few courtyard villagers in open 天井 (never under roofs) — for oblique paper-board read
    {
      const cols = [0x3f5f86, 0x7a4a38, 0xc85a6a, 0x4a6a56, 0x8a6a42, 0x5a4830];
      // v40: courtyard + 巷道 figures (lane cam needs someone in frame)
      const spots: [number, number, number][] = [
        [-1.4, 0, 2.0], [1.2, 0, 1.8], [0.1, 0, 2.4],
        [-1.5, 0, -4.1], [1.3, 0, -4.4], [0.0, 0, -3.9],
        [-1.8, 0, 3.6], [1.7, 0, 3.3],
        [6.9, 0, 2.2], [7.2, 0, -0.8], [-6.9, 0, 1.5],
      ];
      spots.forEach(([x, y, z], i) => {
        const f = makeFigure(cols[i % cols.length], 40 + i * 5, 1.08, "crowd");
        f.position.set(x, y, z);
        f.rotation.y = (i % 2 ? 0.2 : -0.15) + (i * 0.4);
        this.folk.add(f);
      });
      S.add(this.folk);
    }
    // 横屋 side rows (two long wings) and 巷道 lanes
    for (const sx of [-1, 1]) {
      const wing = new THREE.Group();
      const body = wbox(2.1, 3.2, 5.4, earthIn);
      body.position.set(0, 1.7, 0);
      wing.add(body); this.solids.push(body);
      for (let i = 0; i < 3; i++) {
        const door = wbox(0.85, 2.0, 0.1, wood);
        door.position.set(-sx * 1.06, 1.0, -2.0 + i * 2.0);
        door.rotation.y = Math.PI / 2;
        wing.add(door);
      }
      for (let i = 0; i < 3; i++) {
        const wm = new THREE.MeshStandardMaterial({ map: latticeTex(), color: 0xffffff, emissive: 0xffb060, emissiveIntensity: 0, roughness: 0.8 });
        this.winMats.push(wm);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.65), wm);
        w.position.set(-sx * 1.07, 1.9, -1.0 + i * 2.0); w.rotation.y = -sx * Math.PI / 2; wing.add(w);
      }
      // v38: short mid-wing only — clears 下堂/上堂 ends so birdseye shows open plan
      const r = gableRoof(5.0, 1.55, 0.65, tile, ridge);
      r.rotation.y = Math.PI / 2;
      r.position.y = 3.25;
      wing.add(r);
      wing.position.set(sx * 8.9, 0, -0.6); // v38c: ~5m 巷道 + clearer gap to outer wall
      S.add(wing);
    }
    // v34: 横屋 lane life — 灶台, 水缸, 簸箕, 农具, 条凳 (west lane), and a few in the east 巷道
    for (const [sx, list] of [[-1, ["zao", "gang", "nong", "bench"]], [1, ["gang", "bench"]]] /* v36: dropped 簸箕 — peach disc under fill+bloom */ as [number, string[]][]) {
      const xw = sx * 6.9; // v38c: props in mid-巷道
      list.forEach((k, i) => {
        const o = k === "zao" ? furn.zao() : k === "gang" ? furn.gang() : k === "boji" ? furn.boji() : k === "nong" ? furn.nong() : furn.bench(1.4);
        o.position.set(xw, 0, 2.6 - i * 2.2); if (k === "bench") o.rotation.y = Math.PI / 2; if (k === "boji" || k === "nong") o.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
        S.add(o);
      });
      const lf = new THREE.PointLight(0xffc080, 1, 9, 1.5); lf.position.set(sx * 6.0, 3.0, -0.5); S.add(lf); this.fills.push({ l: lf, k: 0.55 });
    }
    // v34: outer-wall detail on back and sides — 射击孔 rows, 瓦檐 coping, 水渠 drain, so no flat wall-only views
    for (const [ax, az, ry, len] of [[0, -D / 2 - T / 2 - 0.01, 0, W], [-W / 2 - T / 2 - 0.01, 0, Math.PI / 2, D], [W / 2 + T / 2 + 0.01, 0, Math.PI / 2, D]] as [number, number, number, number][]) {
      for (let i = -4; i <= 4; i++) {
        const off = i * (len / 10);
        if (Math.abs(off) > len / 2 - 2.4) continue;
        const sl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.05), slitM);
        sl.position.set(ax + Math.cos(ry) * off, 4.1, az - Math.sin(ry) * off); sl.rotation.y = ry; S.add(sl);
        if (i % 2 === 0) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.06), slitM); win.position.set(ax + Math.cos(ry) * off, 2.4, az - Math.sin(ry) * off); win.rotation.y = ry; S.add(win);
          const fr = wbox(0.8, 0.1, 0.12, wood); fr.position.copy(win.position).setY(2.05); fr.rotation.y = ry; S.add(fr); }
      }
    }
    // v38: wall coping in earth tone (not 瓦 ridge) + rear split so no flat "roof bar" behind 上堂
    for (const [x, z, w, d] of [[0, D / 2, W + 0.8, T + 0.8], [-W / 2, 0, T + 0.8, D + 0.8], [W / 2, 0, T + 0.8, D + 0.8]] as [number, number, number, number][]) {
      const cap = wbox(w, 0.14, d, earth); cap.position.set(x, H + 0.07, z); S.add(cap);
    }
    for (const sx of [-1, 1]) {
      const cap = wbox(W / 2 - 3.2, 0.14, T + 0.8, earth);
      cap.position.set(sx * (W / 4 + 1.6), H + 0.07, -D / 2);
      S.add(cap);
    }
    const drainM = new THREE.MeshStandardMaterial({ color: 0x2a3234, roughness: 0.3, metalness: 0.2 });
    for (const [x, z, w, d] of [[0, -D / 2 - 0.9, W + 2, 0.45], [-W / 2 - 0.9, 0, 0.45, D + 2], [W / 2 + 0.9, 0, 0.45, D + 2]]) {
      const dr = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), drainM); dr.position.set(x, 0.02, z); S.add(dr);
      const kb = wbox(w + (d < 1 ? 0 : 0.3), 0.12, d < 1 ? d + 0.3 : d, stone); kb.position.set(x, 0.0, z); S.add(kb);
    }
    for (const [x, z, n, sc] of [[-6, -12, 5, 0.8], [5, -12.5, 6, 0.85], [-14, 3, 5, 0.8], [14.5, -1, 5, 0.8], [-14, -11, 4, 0.75]] as [number, number, number, number][]) {
      const b = makeBamboo(Math.abs(x * 7 + z) | 0, n); b.position.set(x, 0, z); b.scale.setScalar(sc); S.add(b);
    }
    // 角楼 corner towers (4 storeys, hip-ish roof)
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
      const tw = new THREE.Group();
      const b = wbox(3.6, 9.5, 3.6, earthAlt);
      b.position.y = 4.75;
      tw.add(b); this.solids.push(b);
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
    // v29: 围龙 half-ring + 化胎 removed — 赣南围屋 reads as a closed square (四角炮楼) per the panel text
    this.smoke = particles(16, new THREE.Box3(new THREE.Vector3(-0.7, 1.5, -3.75), new THREE.Vector3(0.7, 3.0, -3.6)), 0xd8d0c8, 0.22, 0.12, "smoke");
    S.add(this.smoke.points);
    // facade lanterns at the gate
    for (const sx of [-1.4, 1.4]) this.addLantern(S, new THREE.Vector3(sx, 3.6, D / 2 + 1.1));
    // v24: 墨竹 flanking the 门楼 approach (visible in menlou cam) + courtyard sides; 樟 at enclosure corners
    for (const [x, z, k] of [[-11, 7, 1.1], [11, 6.5, 1.05], [-13, -6, 1.2], [13, -5, 1.15], [-8, 12.5, 0.95], [8.5, 12.2, 0.9]] as [number, number, number][]) {
      const t = makeTree(Math.abs(x * 3 + z) | 0, k);
      t.position.set(x, 0, z);
      S.add(t);
    }
    // v25: midground 墨竹 only — frames approach, keeps 门楼 face clear (no cam-foreground clumps)
    for (const [x, z, n, sc] of [
      [-4.5, 12.2, 5, 0.82], [7.6, 12.0, 5, 0.82],
      [-5.5, 10.2, 4, 0.75], [8.2, 10.0, 4, 0.75],
      // v38: keep bamboo outside 巷道 so birdseye gap hall↔横屋 stays readable
      [-12.2, 3.5, 5, 0.72], [12.2, 3.8, 5, 0.72],
    ] as [number, number, number, number][]) {
      const b = makeBamboo(Math.abs(x * 5 + z) | 0, n);
      b.position.set(x, 0, z);
      b.scale.setScalar(sc);
      S.add(b);
    }
    // distant hills for silhouette
    const hillM = new THREE.MeshStandardMaterial({ color: 0x4a5a48, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(18 + (i % 3) * 6, 20, 10), hillM);
      const a = (i / 9) * Math.PI * 2 + 0.2; // v34: hills all round so no bare horizon
      h.scale.y = 0.45;
      h.position.set(Math.cos(a) * 110, -3, Math.sin(a) * 90 - 10);
      S.add(h);
    }
  }

  private addHaze(): void {
    // v34: painted 远山雾 horizon ring hides the HDRI's pale horizon band; tinted per hour
    const c = document.createElement("canvas"); c.width = 4; c.height = 256; const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,0.92)"); g.addColorStop(0.75, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    this.haze = new THREE.Mesh(new THREE.CylinderGeometry(160, 160, 60, 48, 1, true), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false }));
    this.haze.position.y = 12; this.haze.renderOrder = -1; this.scene.add(this.haze);
  }

  private addLantern(parent: THREE.Object3D, p: THREE.Vector3): void {
    const l = lantern(0xff4a22);
    l.position.copy(p);
    parent.add(l);
    this.lampMeshes.push(l.children[0] as THREE.Mesh);
    if (this.lamps.length < 6) {
      const pl = new THREE.PointLight(0xffa070, 1, 5.5, 2); // v26: shorter, softer spill on plaster
      pl.position.copy(p).add(new THREE.Vector3(0, -0.3, 0));
      parent.add(pl);
      this.lamps.push(pl);
    }
  }

  setHour(h: HourId): void {
    const c = HOURS[h];
    this.hourId = h;
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
    for (const l of this.lamps) l.intensity = c.lamp * (h === "night" ? 1.6 : 0.9);
    for (const m of this.lampMeshes) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + c.lamp * 1.4;
    this.fireflies.points.visible = h === "night"; // v36: dusk no longer shows fireflies (peach blobs on 横屋 floor)
    const hz = { dawn: 0xa8a0a4, noon: 0xb8c4d0, dusk: 0x5e5458, night: 0x0c0f18 }[h];
    (this.haze.material as THREE.MeshBasicMaterial).color.set(hz);
    const fk = { dawn: 1.15, noon: 1.55, dusk: 1.9, night: 3.2 }[h]; // v53r2: cooler noon punch on 红木
    for (const f of this.fills) f.l.intensity = fk * f.k;
    if (this.skyFill) this.skyFill.intensity = { dawn: 0.35, noon: 1.55, dusk: 0.25, night: 0 }[h];
    for (const m of this.winMats) m.emissiveIntensity = { dawn: 0.1, noon: 0.45, dusk: 0.5, night: 1.1 }[h]; // v52g
    this.post.bloom.strength = h === "night" ? 0.7 : 0.16; // v53r1: noon bloom was round glow on 祖堂 wall
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
    this.camera.fov = p.fov ?? 42; this.camera.updateProjectionMatrix();
    this.controls.minDistance = r === "overview" ? 16 : 0.05; // v41: allow closer hall read
    this.controls.maxPolarAngle = r === "overview" ? Math.PI * 0.495 : Math.PI * 0.92;
    this.controls.minPolarAngle = r === "overview" ? Math.PI * 0.22 : Math.PI * 0.2; // v40: block pure nadir sticks
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
    setPaperCamera(this.camera);
    this.folk.traverse((o) => {
      const an = o.userData.anim as ((t: number) => void) | undefined;
      if (an) an(now / 1000);
    });
    this.controls.update();
    this.collide();
    { // v30: dim exposure/sky when looking into the low dusk sun (backlit washout)
      const c = HOURS[this.hourId];
      const d = new THREE.Vector3(); this.camera.getWorldDirection(d);
      const sd = new THREE.Vector3(...c.sun).normalize();
      const k = Math.max(0, d.dot(sd)); const f = this.hourId === "night" ? 0 : k * k;
      this.renderer.toneMappingExposure = c.exp * (1 - 0.3 * f);
      this.scene.backgroundIntensity = this.hourId === "night" ? 0.5 : (this.hourId === "dusk" ? 0.45 : 1) - 0.4 * f;
      this.post.bloom.strength = (this.hourId === "night" ? 0.7 : 0.16) * (1 - 0.7 * f); // v53r1
    }
    this.post.render();
  };

  /** v34: never let the camera sit inside a wall/wing/tower — push out along the shallowest axis */
  private collide(): void {
    const p = this.camera.position;
    if (p.y < 0.4) p.y = 0.4;
    for (const b of this.boxes) {
      if (!b.containsPoint(p)) continue;
      const dx1 = p.x - b.min.x, dx2 = b.max.x - p.x, dz1 = p.z - b.min.z, dz2 = b.max.z - p.z, dy = b.max.y - p.y;
      const m = Math.min(dx1, dx2, dz1, dz2, dy);
      if (m === dx1) p.x = b.min.x; else if (m === dx2) p.x = b.max.x; else if (m === dz1) p.z = b.min.z; else if (m === dz2) p.z = b.max.z; else p.y = b.max.y;
    }
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    disposeScene(this.scene);
    this.renderer.dispose();
  }
}

/** v26 匠额: painted 门匾 with a generic 客家 hall name (泛称 — not any real 围屋's plaque). */
function plaqueTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 312;
  const g = c.getContext("2d")!;
  const seeds = Array.from({ length: 160 }, () => [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()]);
  const paint = () => {
    const grd = g.createLinearGradient(0, 0, 0, c.height);
    grd.addColorStop(0, "#4a1810"); grd.addColorStop(0.5, "#5c2016"); grd.addColorStop(1, "#3e140c");
    g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
    for (const [a, b, d, e, f] of seeds) { // 木纹 + 漆裂
      g.strokeStyle = `rgba(20,6,2,${0.05 + a * 0.1})`; g.lineWidth = 1 + b * 2;
      const y = d * c.height; g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(300, y + (e - 0.5) * 14, 700, y + (f - 0.5) * 14, 1024, y); g.stroke();
    }
    g.strokeStyle = "#b08a3e"; g.lineWidth = 10; g.strokeRect(18, 18, c.width - 36, c.height - 36);
    g.strokeStyle = "rgba(176,138,62,0.55)"; g.lineWidth = 3; g.strokeRect(38, 38, c.width - 76, c.height - 76);
    g.fillStyle = "#d8b45a"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '190px "Ma Shan Zheng", "KaiTi", serif';
    g.shadowColor = "rgba(0,0,0,0.5)"; g.shadowOffsetY = 4; g.shadowBlur = 6;
    g.fillText("世德堂", c.width / 2, c.height / 2 + 8);
    g.shadowColor = "transparent"; g.shadowOffsetY = 0; g.shadowBlur = 0;
    g.fillStyle = "#a8281c"; g.fillRect(c.width - 112, c.height - 112, 48, 48); // 小朱印
  };
  paint();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  document.fonts?.load('190px "Ma Shan Zheng"').then(() => { paint(); t.needsUpdate = true; }).catch(() => {});
  return t;
}

/** v29 神主牌: generic 历代祖先 tablet face (泛称, no real 姓氏/lineage). */
function tabletTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d")!;
  const paint = () => {
    g.fillStyle = "#5a1a10"; g.fillRect(0, 0, 256, 512);
    g.strokeStyle = "#c89a48"; g.lineWidth = 10; g.strokeRect(12, 12, 232, 488);
    g.fillStyle = "#e0b860"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '64px "Ma Shan Zheng", "KaiTi", serif';
    "历代祖先之位".split("").forEach((ch, i) => g.fillText(ch, 128, 62 + i * 78));
  };
  paint();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  document.fonts?.load('64px "Ma Shan Zheng"').then(() => { paint(); t.needsUpdate = true; }).catch(() => {});
  return t;
}

/** v45b 中国风 furnishings — Ming/Qing silhouettes readable from visitor high-angle cam:
 *  八仙桌 (tall 束腰+牙板), 官帽椅 (segmented wooden 搭脑, no torus), 条凳, matching altar.
 */
function woodGrainMap(base = "#c45a38", grain = "#8a3420"): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = base; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = grain; x.globalAlpha = 0.35; x.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    const y = 4 + i * 7 + (i % 3) * 1.5;
    x.beginPath(); x.moveTo(0, y);
    for (let px = 0; px <= 128; px += 8) x.lineTo(px, y + Math.sin(px * 0.08 + i) * 1.8);
    x.stroke();
  }
  x.globalAlpha = 0.18; x.fillStyle = "#2a140c";
  for (let i = 0; i < 10; i++) x.fillRect(10 + (i * 37) % 110, 8 + (i * 53) % 110, 3, 14 + (i % 4) * 3);
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}
function makeFurniture(wood: THREE.Material, lac: THREE.Material) {
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = wbox(w, h, d, m); b.position.set(x, y, z); b.castShadow = true; return b;
  };
  const brick = new THREE.MeshStandardMaterial({ color: 0x8a6a58, roughness: 0.95 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1e1c1a, roughness: 0.5, metalness: 0.6 });
  const pot = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.35 });
  // v53r2: mid 红木 — further desat (正屋 noon still scarlet)
  const grain = woodGrainMap("#946040", "#4e2a1a");
  const rose = (lac as THREE.MeshStandardMaterial).clone();
  rose.map = grain; rose.color = new THREE.Color(0x6e4530); rose.roughness = 0.94; rose.metalness = 0.01;
  rose.envMapIntensity = 0.1;
  const L = rose;
  const apron = (lac as THREE.MeshStandardMaterial).clone();
  apron.map = grain; apron.color = new THREE.Color(0x4a2a1a); apron.roughness = 0.96; apron.metalness = 0.01;
  apron.envMapIntensity = 0.08;
  const A = apron;
  const addHoof = (g: THREE.Group, x: number, z: number, m: THREE.Material) => {
    g.add(box(0.12, 0.045, 0.12, m, x, 0.03, z));
    g.add(box(0.09, 0.04, 0.09, m, x, 0.07, z));
  };
  /** 官帽椅搭脑: thick wooden yoke — deep in Z so SIDE view (chairs face table) still reads as wood */
  const addYokeRail = (g: THREE.Group, y0: number, z0: number, halfW: number, m: THREE.Material) => {
    const zd = 0.1;
    g.add(box(halfW * 1.2, 0.08, zd, m, 0, y0, z0));
    for (const s of [-1, 1] as const) {
      g.add(box(0.16, 0.08, zd, m, s * (halfW * 0.7), y0 + 0.03, z0));
      g.add(box(0.13, 0.085, zd, m, s * (halfW * 0.95), y0 + 0.07, z0));
      g.add(box(0.1, 0.1, zd + 0.01, m, s * (halfW * 1.12), y0 + 0.12, z0));
    }
  };
  return {
    baxian(): THREE.Group {
      const g = new THREE.Group();
      // v45b: top inset so 牙板 peeks under high-angle visitor cam
      g.add(box(1.02, 0.055, 1.02, L, 0, 0.88, 0));
      g.add(box(0.98, 0.12, 0.98, A, 0, 0.79, 0)); // tall dark 束腰
      const ah = 0.2;
      g.add(box(0.96, ah, 0.07, A, 0, 0.66, 0.52));
      g.add(box(0.96, ah, 0.07, A, 0, 0.66, -0.52));
      g.add(box(0.07, ah, 0.96, A, 0.52, 0.66, 0));
      g.add(box(0.07, ah, 0.96, A, -0.52, 0.66, 0));
      for (const z of [-0.52, 0.52] as const) for (const x of [-0.32, 0, 0.32] as const) g.add(box(0.16, 0.07, 0.06, A, x, 0.54, z));
      for (const x of [-0.52, 0.52] as const) for (const z of [-0.32, 0, 0.32] as const) g.add(box(0.06, 0.07, 0.16, A, x, 0.54, z));
      for (const [x, z] of [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]] as const) {
        g.add(box(0.18, 0.08, 0.055, A, x, 0.72, z * 0.98));
        g.add(box(0.055, 0.08, 0.18, A, x * 0.98, 0.72, z));
      }
      for (const [x, z] of [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]] as const) {
        g.add(box(0.1, 0.66, 0.1, L, x, 0.35, z));
        addHoof(g, x, z, L);
      }
      for (const z of [-0.46, 0.46] as const) {
        g.add(box(0.84, 0.055, 0.055, L, 0, 0.2, z));
        g.add(box(0.24, 0.09, 0.055, L, 0, 0.275, z));
      }
      for (const x of [-0.46, 0.46] as const) {
        g.add(box(0.055, 0.055, 0.84, L, x, 0.2, 0));
        g.add(box(0.055, 0.09, 0.24, L, x, 0.275, 0));
      }
      return g;
    },
    chair(): THREE.Group {
      const g = new THREE.Group();
      // v45b: thicker members — chairs rotate to face table so SIDE silhouette must read as wood
      g.add(box(0.66, 0.06, 0.54, L, 0, 0.52, 0.04));
      g.add(box(0.6, 0.11, 0.06, A, 0, 0.44, 0.29));
      g.add(box(0.6, 0.11, 0.06, A, 0, 0.44, -0.21));
      g.add(box(0.06, 0.11, 0.48, A, -0.3, 0.44, 0.04));
      g.add(box(0.06, 0.11, 0.48, A, 0.3, 0.44, 0.04));
      for (const [x, z] of [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.27], [0.28, 0.27]] as const) {
        g.add(box(0.075, 0.5, 0.075, L, x, 0.25, z));
        addHoof(g, x, z, L);
      }
      g.add(box(0.52, 0.05, 0.05, L, 0, 0.16, -0.2));
      g.add(box(0.56, 0.055, 0.06, L, 0, 0.13, 0.27));
      g.add(box(0.05, 0.05, 0.42, L, -0.28, 0.17, 0.035));
      g.add(box(0.05, 0.05, 0.42, L, 0.28, 0.17, 0.035));
      for (const x of [-0.28, 0.28] as const) g.add(box(0.075, 0.68, 0.075, L, x, 0.88, -0.2));
      g.add(box(0.22, 0.46, 0.055, L, 0, 0.82, -0.2));
      g.add(box(0.05, 0.4, 0.05, L, -0.14, 0.8, -0.2));
      g.add(box(0.05, 0.4, 0.05, L, 0.14, 0.8, -0.2));
      addYokeRail(g, 1.22, -0.2, 0.3, L);
      for (const s of [-1, 1] as const) {
        g.add(box(0.07, 0.07, 0.44, L, s * 0.28, 0.8, 0.05));
        g.add(box(0.07, 0.07, 0.12, L, s * 0.28, 0.84, 0.26));
        g.add(box(0.075, 0.34, 0.075, L, s * 0.28, 0.66, 0.29));
        g.add(box(0.085, 0.08, 0.085, L, s * 0.28, 0.86, 0.31));
      }
      return g;
    },
    /** matching altar / 供桌 — same 束腰+牙板+马蹄 language as 八仙桌 */
    altar(): THREE.Group {
      const g = new THREE.Group();
      const W = 3.15, D = 0.88;
      g.add(box(W - 0.08, 0.07, D - 0.06, L, 0, 1.02, 0)); // inset top
      g.add(box(W - 0.15, 0.12, D - 0.08, A, 0, 0.9, 0)); // tall 束腰
      g.add(box(W - 0.2, 0.22, 0.08, A, 0, 0.74, D / 2 + 0.02));
      g.add(box(W - 0.2, 0.22, 0.08, A, 0, 0.74, -(D / 2 + 0.02)));
      g.add(box(0.08, 0.22, D - 0.1, A, W / 2 + 0.01, 0.74, 0));
      g.add(box(0.08, 0.22, D - 0.1, A, -(W / 2 + 0.01), 0.74, 0));
      for (const x of [-1.0, -0.35, 0.35, 1.0] as const) g.add(box(0.2, 0.08, 0.07, A, x, 0.6, D / 2 + 0.02));
      for (const [x, z] of [[-(W / 2 - 0.16), -(D / 2 - 0.1)], [W / 2 - 0.16, -(D / 2 - 0.1)], [-(W / 2 - 0.16), D / 2 - 0.1], [W / 2 - 0.16, D / 2 - 0.1]] as const) {
        g.add(box(0.13, 0.6, 0.13, L, x, 0.33, z));
        addHoof(g, x, z, L);
      }
      g.add(box(W - 0.45, 0.055, 0.055, L, 0, 0.18, D / 2 - 0.1));
      g.add(box(W - 0.45, 0.055, 0.055, L, 0, 0.18, -(D / 2 - 0.1)));
      return g;
    },
    bench(len: number): THREE.Group {
      const g = new THREE.Group();
      g.add(box(len, 0.05, 0.3, L, 0, 0.46, 0));
      g.add(box(len - 0.12, 0.08, 0.045, A, 0, 0.4, 0.13));
      g.add(box(len - 0.12, 0.08, 0.045, A, 0, 0.4, -0.13));
      for (const x of [-len / 2 + 0.12, len / 2 - 0.12] as const) {
        for (const z of [-0.11, 0.11] as const) {
          g.add(box(0.055, 0.43, 0.055, L, x, 0.215, z));
          addHoof(g, x, z, L);
        }
        g.add(box(0.045, 0.035, 0.2, L, x, 0.14, 0));
      }
      g.add(box(len - 0.32, 0.035, 0.035, L, 0, 0.12, 0));
      return g;
    },
    zao(): THREE.Group { const g = new THREE.Group(); g.add(box(1.0, 0.8, 1.4, brick, 0, 0.4, 0)); g.add(box(1.04, 0.05, 1.44, new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9 }), 0, 0.82, 0)); // v40: no white slab from birdseye
      for (const z of [-0.33, 0.33]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), iron); w.position.set(0, 0.9, z); w.rotation.x = Math.PI; g.add(w); }
      g.add(box(0.32, 2.4, 0.32, brick, -0.3, 2.0, 0.55)); const mouth = box(0.3, 0.25, 0.02, iron, 0.51, 0.3, 0); mouth.rotation.y = Math.PI / 2; g.add(mouth); return g; },
    gang(): THREE.Group { const g = new THREE.Group(); const j = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.75, 20), pot); j.position.y = 0.38; g.add(j);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), wood); lid.position.y = 0.77; g.add(lid); return g; },
    boji(): THREE.Group { // v36: dark woven 簸箕 leaning on the wall — was flat peach discs under warm fill+bloom
      const g = new THREE.Group();
      const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
      x.fillStyle = "#4a3a22"; x.fillRect(0, 0, 128, 128);
      x.strokeStyle = "#6a5634"; x.lineWidth = 2;
      for (let i = 0; i < 128; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
      x.strokeStyle = "#2a1e10"; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.stroke();
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 1, metalness: 0 });
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.08, 24), mat);
      d.rotation.x = Math.PI / 2.4; d.position.set(0, 0.35, 0); g.add(d);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 6, 24), new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 1 }));
      rim.rotation.copy(d.rotation); rim.position.copy(d.position); g.add(rim); return g; },
    nong(): THREE.Group { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const h = box(0.04, 1.5, 0.04, wood, -0.12, 0.75, -0.3 + k * 0.3); h.rotation.z = 0.18; g.add(h);
        const bl = box(0.04, 0.22, 0.2, iron, -0.02, 0.12, -0.3 + k * 0.3); g.add(bl); } return g; },
  };
}
/** 木窗格 lattice: dark wood grid over paper */
function latticeTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
  x.fillStyle = "#e8d8b0"; x.fillRect(0, 0, 128, 128); x.strokeStyle = "#3a2414"; x.lineWidth = 6;
  for (let i = 0; i <= 128; i += 21) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
  x.lineWidth = 12; x.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
