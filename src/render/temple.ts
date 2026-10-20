// 西山万寿宫庙会 — procedural temple courtyard. Art direction: red lacquer + gold, incense haze, lantern glow at night.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ActId, SlotId } from "../data/wanshou";
import { curvedRoof } from "./pavilion";
import { Flight, disposeScene, lantern, loadHdri, makePost, makeRenderer, particles, phMat, wbox, type Post } from "./kit";

const SLOT: Record<SlotId, { sun: [number, number, number]; col: number; I: number; hemi: number; env: number; exp: number; fog: number; hdri: string; bg: number; lamp: number }> = {
  chendan: { sun: [-30, 12, 20], col: 0xffc4a0, I: 2.6, hemi: 0.45, env: 0.8, exp: 1.0, fog: 0xa89aa4, hdri: "qwantani_puresky", bg: 0.8, lamp: 0.5 },
  baitian: { sun: [14, 38, 18], col: 0xfff0d8, I: 3.6, hemi: 0.6, env: 1.0, exp: 0.95, fog: 0xc0c8d0, hdri: "qwantani_puresky", bg: 1, lamp: 0 },
  yewan: { sun: [-10, 30, -14], col: 0x7a90ff, I: 0.45, hemi: 0.14, env: 0.3, exp: 0.95, fog: 0x0e1018, hdri: "qwantani_night_puresky", bg: 0.45, lamp: 2.8 },
};
const POSE: Record<ActId | "overview", { eye: [number, number, number]; look: [number, number, number] }> = {
  overview: { eye: [11, 12, 15], look: [0, 3, -7] },
  kaichao: { eye: [5, 2.6, 9], look: [0, 3.2, -6] },
  xiban: { eye: [-9, 3.6, -3.5], look: [0, 3.2, 12] },
};

export class TempleScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  private controls: OrbitControls;
  private flight: Flight;
  private post: Post;
  private sun = new THREE.DirectionalLight(0xffffff, 3);
  private hemi = new THREE.HemisphereLight(0xdfe8ff, 0x5a3a2a, 0.4);
  private lamps: THREE.PointLight[] = [];
  private lampMeshes: THREE.Mesh[] = [];
  private smoke: ReturnType<typeof particles>;
  private haze: ReturnType<typeof particles>;
  private procession = new THREE.Group();
  private audience = new THREE.Group();
  private stageLight = new THREE.SpotLight(0xffd8a0, 0, 30, 0.6, 0.5, 1.2);
  private hdri = "";
  private raf = 0;
  private last = performance.now();
  private disposed = false;
  private act: ActId = "kaichao";

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = makeRenderer(canvas, 0.9);
    (window as unknown as { __temple: unknown }).__temple = this;
    this.scene.fog = new THREE.Fog(0xa89aa4, 35, 160);
    this.scene.background = new THREE.Color(0x1a1418);
    this.camera.position.set(...POSE.overview.eye);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 70;
    this.controls.target.set(...POSE.overview.look);
    this.flight = new Flight(this.camera, this.controls.target);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -28; sc.right = sc.top = 28; sc.near = 1; sc.far = 140;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.hemi);
    this.build();
    this.smoke = particles(160, new THREE.Box3(new THREE.Vector3(-0.6, 1.4, -0.6), new THREE.Vector3(0.6, 9, 0.6)), 0xe8e0d8, 0.9, 0.22, "smoke");
    this.scene.add(this.smoke.points);
    this.haze = particles(160, new THREE.Box3(new THREE.Vector3(-16, 0.5, -14), new THREE.Vector3(16, 4, 16)), 0xf0e0d0, 2.4, 0.035, "mist");
    this.scene.add(this.haze.points);
    this.post = makePost(this.renderer, this.scene, this.camera, 0.45, 0.85);
    this.resize();
    this.set("kaichao", "chendan", true);
    this.loop();
  }

  private build(): void {
    const S = this.scene;
    const stone = phMat("stone_tiles", [1, 1], { color: 0xd0cabe });
    const paving = phMat("stone_tiles", [14, 14], { color: 0xe0dad0 });
    const redWall = phMat("red_plaster_weathered", [1, 1], { color: 0xc04a3a });
    const lac = phMat("lacquered_cherry_wood", [1, 2], { color: 0xb02a1e });
    const wood = phMat("dark_wooden_planks", [1, 1], { color: 0x7a4a34 });
    const tile = new THREE.MeshStandardMaterial({ color: 0x2e3a36, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd6a548, metalness: 0.85, roughness: 0.3 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0x5a4a30, metalness: 0.9, roughness: 0.45 });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), paving);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    S.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x3a3a2c, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.02;
    S.add(outer);

    // enclosure: red walls with grey tile coping
    const W = 34, D = 36, H = 3.6;
    const wall = (w: number, d: number, x: number, z: number) => {
      const m = wbox(w, H, d, redWall);
      m.position.set(x, H / 2, z);
      S.add(m);
      const cap = wbox(w + 0.4, 0.25, d + 0.4, tile);
      cap.position.set(x, H + 0.12, z);
      S.add(cap);
    };
    wall(W, 0.5, 0, -D / 2);
    wall(0.5, D, -W / 2, 0);
    wall(0.5, D, W / 2, 0);
    wall(W / 2 - 3, 0.5, -(W / 4 + 1.5), D / 2);
    wall(W / 2 - 3, 0.5, W / 4 + 1.5, D / 2);

    const building = (w: number, d: number, h: number, platform: number, roofs: number, z: number, open: boolean) => {
      const g = new THREE.Group();
      const base = wbox(w + 2, platform, d + 2, stone);
      base.position.y = platform / 2;
      g.add(base);
      for (let i = 0; i < 4; i++) {
        const st = wbox(4, 0.18, 0.4, stone);
        st.position.set(0, 0.09 + i * (platform / 4), d / 2 + 1 + 1.2 - i * 0.4);
        g.add(st);
      }
      const body = wbox(w * 0.84, h, d * 0.8, redWall);
      body.position.y = platform + h / 2;
      g.add(body);
      if (open) {
        const doorM = new THREE.MeshStandardMaterial({ color: 0x2a0d08, roughness: 0.6, emissive: 0x3a1408, emissiveIntensity: 0.6 });
        for (let i = -2; i <= 2; i++) {
          const dr = wbox(w * 0.13, h * 0.78, 0.08, doorM);
          dr.position.set(i * w * 0.16, platform + h * 0.39, d * 0.4 + 0.05);
          g.add(dr);
          const lat = wbox(w * 0.13, h * 0.78, 0.04, wood);
          lat.position.copy(dr.position).add(new THREE.Vector3(0, 0, 0.06));
          lat.scale.set(0.96, 0.96, 1);
          (lat.material as THREE.MeshStandardMaterial).transparent = false;
          g.add(lat);
        }
      }
      const cols = 6;
      for (let i = 0; i < cols; i++) {
        const x = -w / 2 + (i * w) / (cols - 1);
        for (const z of [d / 2, -d / 2]) {
          const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, h, 16), lac);
          c.position.set(x, platform + h / 2, z);
          c.castShadow = true;
          g.add(c);
        }
      }
      const beam = wbox(w + 0.4, 0.45, d + 0.4, lac);
      beam.position.y = platform + h;
      g.add(beam);
      // dougong band (gold/green brackets)
      const brk = new THREE.MeshStandardMaterial({ color: 0x2f6a5a, roughness: 0.6 });
      for (let i = 0; i < Math.floor(w / 0.8); i++) {
        for (const z of [d / 2 + 0.25, -d / 2 - 0.25]) {
          const b = wbox(0.3, 0.32, 0.4, i % 2 ? brk : gold);
          b.position.set(-w / 2 + 0.4 + i * 0.8, platform + h + 0.38, z);
          g.add(b);
        }
      }
      let y = platform + h + 0.55;
      for (let r = 0; r < roofs; r++) {
        const top = r === roofs - 1;
        const roof = curvedRoof(w + 3.2 - r * 2.2, d + 3 - r * 1.6, top ? 2.4 : 1.2, tile, gold, top);
        roof.position.y = y;
        g.add(roof);
        if (!top) {
          const drum = wbox(w * 0.7 - r, 1.4, d * 0.6, redWall);
          drum.position.y = y + 1.1;
          g.add(drum);
          y += 1.9;
        }
      }
      g.position.z = z;
      S.add(g);
      return g;
    };
    // 高明殿 main hall (double eave), 山门 gate, 戏台 opera stage facing the hall
    building(14, 8, 5.2, 1.4, 2, -10, true);
    const gate = building(8, 4, 4.2, 0.6, 1, D / 2, false);
    gate.children.forEach((c) => { if ((c as THREE.Mesh).geometry?.type === "BoxGeometry" && c.position.y > 2 && c.position.y < 4) c.visible = false; });
    // gate opening
    const stage = new THREE.Group();
    const sb = wbox(9, 1.8, 6, stone);
    sb.position.y = 0.9;
    stage.add(sb);
    const floor = wbox(8.6, 0.12, 5.6, wood);
    floor.position.y = 1.86;
    stage.add(floor);
    const back = wbox(8.4, 4, 0.2, lac);
    back.position.set(0, 3.9, 2.6);
    stage.add(back);
    const curtain = wbox(3.2, 2.4, 0.06, new THREE.MeshStandardMaterial({ color: 0x9a1a14, roughness: 0.8 }));
    curtain.position.set(0, 3.2, 2.45);
    stage.add(curtain);
    for (const x of [-4.1, 4.1]) for (const z of [-2.7, 2.7]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 4, 14), lac);
      c.position.set(x, 3.9, z);
      c.castShadow = true;
      stage.add(c);
    }
    const sroof = curvedRoof(11, 8, 2.0, tile, gold, true);
    sroof.position.y = 6;
    stage.add(sroof);
    // performers (simple robed figures) — visible during the opera
    const robe = [0xc8302a, 0x2a6aa8, 0xe0b040];
    for (let i = 0; i < 3; i++) {
      const f = figure(robe[i], 1.05);
      f.position.set(-1.8 + i * 1.8, 1.92, 0.3 - (i % 2) * 0.6);
      f.rotation.y = Math.PI;
      f.name = "performer";
      stage.add(f);
    }
    stage.position.set(0, 0, 11.5);
    S.add(stage);
    this.stageLight.position.set(0, 9, 4);
    this.stageLight.target.position.set(0, 2, 11.5);
    this.stageLight.castShadow = true;
    S.add(this.stageLight, this.stageLight.target);

    // 香炉 incense burner (ding) on the axis
    const ding = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 1.0, 24), bronze);
    bowl.position.y = 1.3;
    ding.add(bowl);
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.8, 8), bronze);
      const a = (i / 3) * Math.PI * 2;
      leg.position.set(Math.cos(a) * 0.6, 0.4, Math.sin(a) * 0.6);
      ding.add(leg);
    }
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.0, 24), bronze);
    lid.position.y = 2.3;
    ding.add(lid);
    const pedestal = wbox(2.4, 0.3, 2.4, stone);
    pedestal.position.y = 0.15;
    ding.add(pedestal);
    ding.traverse((o) => { o.castShadow = true; });
    S.add(ding);

    // lantern strings across the courtyard
    for (let r = 0; r < 3; r++) {
      const z = -4 + r * 6;
      for (let i = -3; i <= 3; i++) this.addLantern(new THREE.Vector3(i * 2.6, 5.2 - Math.cos((i / 3) * 1.2) * 0.6, z));
    }
    // banners
    for (const x of [-10, 10]) for (const z of [-5, 5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 8), wood);
      pole.position.set(x, 3.5, z);
      pole.castShadow = true;
      S.add(pole);
      const flag = wbox(0.9, 3.2, 0.03, new THREE.MeshStandardMaterial({ color: 0xd8b040, roughness: 0.7, side: THREE.DoubleSide }));
      flag.position.set(x + 0.5, 5, z);
      S.add(flag);
    }
    // procession: worshippers with incense banners walking the axis
    for (let i = 0; i < 18; i++) {
      const f = figure(i % 3 === 0 ? 0xd8b040 : 0x8a5a3a, 1);
      f.position.set((i % 2 ? 0.8 : -0.8), 0, 14 - i * 1.1);
      this.procession.add(f);
    }
    S.add(this.procession);
    // audience facing the stage
    for (let i = 0; i < 46; i++) {
      const row = Math.floor(i / 9), col = i % 9;
      const f = figure([0x4a5a6a, 0x6a4a3a, 0x3a4a3a, 0x7a6a5a][i % 4], 0.95);
      f.position.set(-6 + col * 1.5 + (row % 2) * 0.6, 0, 6.5 - row * 1.4);
      f.rotation.y = 0;
      this.audience.add(f);
    }
    S.add(this.audience);
    // ancient camphor trees + distant hills (西山)
    const leaf = new THREE.MeshStandardMaterial({ color: 0x2c4424, roughness: 0.85, flatShading: true });
    const bark = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 });
    for (const [x, z] of [[-14, -14], [14, -14]]) {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 5, 10), bark);
      trunk.position.y = 2.5;
      trunk.castShadow = true;
      t.add(trunk);
      for (let i = 0; i < 16; i++) {
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 + (i % 4) * 0.2, 0), leaf);
        const a = i * 2.4, rr = 0.8 + (i % 5) * 0.5;
        c.position.set(Math.sin(a) * rr, 5 + (i % 4) * 0.8, Math.cos(a) * rr);
        c.castShadow = true;
        t.add(c);
      }
      t.position.set(x, 0, z);
      S.add(t);
    }
    const hillM = new THREE.MeshStandardMaterial({ color: 0x3a4a40, roughness: 1 });
    for (let i = 0; i < 10; i++) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(22 + (i % 3) * 8, 20, 10), hillM);
      const a = Math.PI * 1.0 + (i / 9) * Math.PI;
      h.scale.y = 0.5;
      h.position.set(Math.cos(a) * 120, -4, Math.sin(a) * 110);
      S.add(h);
    }
  }

  private addLantern(p: THREE.Vector3): void {
    const l = lantern(0xff3a1a);
    l.position.copy(p);
    this.scene.add(l);
    this.lampMeshes.push(l.children[0] as THREE.Mesh);
    if (this.lamps.length < 7 && Math.abs(p.x) < 4) {
      const pl = new THREE.PointLight(0xff7a3a, 1, 12, 2);
      pl.position.copy(p).add(new THREE.Vector3(0, -0.4, 0));
      this.scene.add(pl);
      this.lamps.push(pl);
    }
  }

  set(act: ActId, slot: SlotId, instant = false): void {
    const c = SLOT[slot];
    this.sun.position.set(...c.sun);
    this.sun.color.set(c.col);
    this.sun.intensity = c.I;
    this.hemi.intensity = c.hemi;
    this.scene.environmentIntensity = c.env;
    this.renderer.toneMappingExposure = c.exp;
    (this.scene.fog as THREE.Fog).color.set(c.fog);
    if (this.hdri !== c.hdri) {
      this.hdri = c.hdri;
      loadHdri(this.renderer, this.scene, c.hdri, !(slot === "yewan"));
      if (slot === "yewan") this.scene.background = new THREE.Color(0x0b0d16);
    }
    this.scene.backgroundIntensity = c.bg;
    for (const l of this.lamps) l.intensity = c.lamp * 2.5;
    for (const m of this.lampMeshes) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + c.lamp * 0.6;
    this.post.bloom.strength = slot === "yewan" ? 0.55 : 0.25;
    this.procession.visible = act === "kaichao";
    this.audience.visible = act === "xiban";
    this.smoke.material.opacity = act === "kaichao" ? 0.32 : 0.14;
    const night = slot === "yewan";
    this.haze.material.color.set(night ? 0x2a2a38 : 0xf0e0d0);
    this.smoke.material.color.set(night ? 0x8a7a70 : 0xe8e0d8);
    this.stageLight.intensity = act === "xiban" ? (slot === "yewan" ? 3.5 : 1.5) : 0;
    this.scene.traverse((o) => { if (o.name === "performer") o.visible = act === "xiban"; });
    if (act !== this.act || instant) {
      this.act = act;
      const p = POSE[act];
      const eye = new THREE.Vector3(...p.eye), look = new THREE.Vector3(...p.look);
      if (instant) {
        this.camera.position.set(...POSE.overview.eye);
        this.controls.target.set(...POSE.overview.look);
      } else this.flight.go(eye, look, 2.0);
    }
  }

  overview(): void {
    this.flight.go(new THREE.Vector3(...POSE.overview.eye), new THREE.Vector3(...POSE.overview.look), 2.0);
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
    const t = now / 1000;
    this.flight.step(dt);
    this.smoke.update(t);
    this.haze.update(t);
    if (this.procession.visible)
      this.procession.children.forEach((f, i) => {
        f.position.z = 15 - ((t * 0.6 + i * 1.1) % 20);
        f.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.04;
      });
    this.scene.traverse((o) => { if (o.name === "performer" && o.visible) o.rotation.y = Math.PI + Math.sin(t * 0.8 + o.position.x) * 0.6; });
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

/** Stylised robed figure (no faces): cone robe + head + hat. */
function figure(color: number, s: number): THREE.Group {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.32, 1.25, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  robe.position.y = 0.62;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc8a080, roughness: 0.7 }));
  head.position.y = 1.4;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 }));
  hat.position.y = 1.53;
  g.add(robe, head, hat);
  g.traverse((o) => { o.castShadow = true; });
  g.scale.setScalar(s);
  return g;
}
