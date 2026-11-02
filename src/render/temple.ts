// 西山万寿宫庙会 — procedural temple courtyard. Art direction: red lacquer + gold, incense haze, lantern glow at night.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ActId, SlotId } from "../data/wanshou";
import { curvedRoof } from "./pavilion";
import { setPaperCamera } from "./paperFigure";
import { qingwaMat, xuandeLu } from "./guofeng";
import { makeFigure, makeTree, shadowSize, Flight, disposeScene, lantern, loadHdri, makePost, makeRenderer, particles, phMat, wbox, type Post , wisps } from "./kit";

const SLOT: Record<SlotId, { sun: [number, number, number]; col: number; I: number; hemi: number; env: number; exp: number; fog: number; hdri: string; bg: number; lamp: number }> = {
  chendan: { sun: [-30, 12, 20], col: 0xffc4a0, I: 2.6, hemi: 0.45, env: 0.8, exp: 1.0, fog: 0xa89aa4, hdri: "qwantani_puresky", bg: 0.8, lamp: 0.5 },
  baitian: { sun: [14, 38, 18], col: 0xfff0d8, I: 3.85, hemi: 0.78, env: 1.05, exp: 1.02, fog: 0xc0c8d0, hdri: "qwantani_puresky", bg: 1, lamp: 0 }, // v52
  yewan: { sun: [-10, 30, -14], col: 0x7a90ff, I: 0.45, hemi: 0.14, env: 0.3, exp: 0.95, fog: 0x0e1018, hdri: "qwantani_night_puresky", bg: 0.45, lamp: 2.8 },
};
const POSE: Record<ActId | "overview" | "kanxi" | "guanzhong", { eye: [number, number, number]; look: [number, number, number] }> = {
  overview: { eye: [12, 9.2, 16], look: [-0.5, 1.0, 3.5] }, // v42g: SE high, look left-of-folk — action in clear center-right
  kaichao: { eye: [5, 2.6, 9], look: [0, 3.2, -6] },
  xiban: { eye: [2.6, 4.4, -1.5], look: [0.9, 2.6, 10.5] },
  // judge views: actors from the front row, crowd faces from the stage apron
  // v25: further back, aim stage-right so trio clears left ws-panel
  kanxi: { eye: [2.15, 3.35, 1.4], look: [2.15, 2.85, 11.6] }, // v42: pull back from stage apron
  guanzhong: { eye: [-3.2, 3.0, 9.4], look: [0.2, 0.8, 4.8] }, // v55: raised stage-side view — crowd, not one back
};


/** v54: 万寿宫旗帜 — 朱红底金边竖排字，侧看也是书法旗而非色块布 */
function paintBannerTex(seed: number, wPx = 256, hPx = 420): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = wPx; c.height = hPx;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, hPx);
  grd.addColorStop(0, "#a8281c");
  grd.addColorStop(0.5, "#8a1c14");
  grd.addColorStop(1, "#5e120e");
  g.fillStyle = grd;
  g.fillRect(0, 0, wPx, hPx);
  g.strokeStyle = "#c9a45a";
  g.lineWidth = 10;
  g.strokeRect(8, 8, wPx - 16, hPx - 16);
  g.strokeStyle = "#e8d09a";
  g.lineWidth = 2;
  g.strokeRect(16, 16, wPx - 32, hPx - 32);
  const words = [["万", "寿"], ["赣", "戏"], ["万", "寿"], ["戏", "台"]][seed % 4];
  g.font = `bold ${Math.floor(hPx * 0.2)}px "Noto Serif SC","Songti SC","SimSun",serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  words.forEach((ch, i) => {
    const y = hPx * (0.34 + i * 0.26);
    g.fillStyle = "rgba(20,8,4,0.4)";
    g.fillText(ch, wPx / 2 + 2, y + 2);
    g.fillStyle = "#f6ecd8";
    g.fillText(ch, wPx / 2, y);
  });
  g.globalAlpha = 0.1;
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = i % 2 ? "#4a100c" : "#c9a45a";
    g.beginPath();
    g.moveTo(30 + (i * 13) % (wPx - 60), 36);
    g.lineTo(30 + (i * 19) % (wPx - 60), hPx - 36);
    g.stroke();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

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
  private lanterns: THREE.Object3D[] = [];
  private smoke: ReturnType<typeof wisps>;
  private haze: ReturnType<typeof particles>;
  private procession = new THREE.Group();
  private audience = new THREE.Group();
  private stageLight = new THREE.SpotLight(0xffd8a0, 0, 30, 0.6, 0.5, 1.2);
  private hdri = "";
  private raf = 0;
  private last = performance.now();
  private disposed = false;
  private act: ActId = "kaichao";
  private slotId: SlotId = "baitian"; // v53r9: persist so update() doesn't re-show daytime lanterns

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = makeRenderer(canvas, 0.9);
    (window as unknown as { __temple: unknown }).__temple = this;
    this.scene.fog = new THREE.Fog(0xa89aa4, 35, 160);
    this.scene.background = new THREE.Color(0x1a1418);
    this.camera.position.set(...POSE.overview.eye);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minPolarAngle = Math.PI * 0.32; // v40: keep mid-high floor
    this.controls.minDistance = 4.0; // v55: 台上望众 designed at 4.7m — 8m clamp pulled it 70% away // v36: keep orbits out of foliage
    this.controls.maxDistance = 55;
    this.controls.target.set(...POSE.overview.look);
    this.flight = new Flight(this.camera, this.controls.target);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize(), shadowSize());
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -28; sc.right = sc.top = 28; sc.near = 1; sc.far = 140;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.hemi);
    this.build();
    this.smoke = wisps(5, new THREE.Vector3(0, 1.6, -3.2), 4.6, 0xe8e0d8);
    this.scene.add(this.smoke.points);
    this.haze = particles(160, new THREE.Box3(new THREE.Vector3(-16, 0.5, -14), new THREE.Vector3(16, 4, 16)), 0xf0e0d0, 2.4, 0.035, "mist");
    this.scene.add(this.haze.points);
    this.post = makePost(this.renderer, this.scene, this.camera, 0.22, 0.8); // v53r3: cut wall circle bloom
    this.resize();
    this.set("kaichao", "chendan", true);
    this.loop();
  }

  private build(): void {
    const S = this.scene;
    const stone = phMat("stone_tiles", [1, 1], { color: 0xd0cabe });
    const paving = phMat("stone_tiles", [14, 14], { color: 0xe0dad0 });
    const redWall = phMat("red_plaster_weathered", [1, 1], { color: 0xc04a3a });
    const lac = phMat("lacquered_cherry_wood", [1, 2], { color: 0x6e4832 }); // v53r10: browner mid 红木 (match weiwu)
    const wood = phMat("dark_wooden_planks", [1, 1], { color: 0x7a4a34 });
    const tile = new THREE.MeshStandardMaterial({ color: 0x2e3a36, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
    const roofTile = qingwaMat([1, 1]); roofTile.side = THREE.DoubleSide; roofTile.color.set(0x9aa8a4); // v29: 筒瓦 texture on roofs (was flat grey)
    const gold = new THREE.MeshStandardMaterial({ color: 0xd6a548, metalness: 0.85, roughness: 0.3 });

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
        const doorM = new THREE.MeshStandardMaterial({ color: 0x2a0d08, roughness: 0.7, emissive: 0x3a1408, emissiveIntensity: 0.22 }); // v53r6: cut stage-door bloom
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
          const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, h, 12), lac); // v41: slender 檐柱
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
        const roof = curvedRoof(w + 3.2 - r * 2.2, d + 3 - r * 1.6, top ? 2.4 : 1.2, roofTile, gold, top);
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
    // v50: matte 守旧 backdrop (ink teal wash) — kills lacquer glare hotspot
    const shoujiuMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a28, roughness: 0.97, metalness: 0, side: THREE.FrontSide,
    });
    const back = wbox(8.4, 4, 0.18, shoujiuMat);
    back.position.set(0, 3.9, 2.6);
    stage.add(back);
    // soft painted centre panel (muted crimson silk, not plastic red)
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x6a2420, roughness: 0.94, metalness: 0 });
    const curtain = wbox(2.8, 2.2, 0.05, panelMat);
    curtain.position.set(0, 3.15, 2.48);
    stage.add(curtain);
    const panelTrim = wbox(2.9, 0.06, 0.06, gold);
    panelTrim.position.set(0, 4.28, 2.46);
    stage.add(panelTrim);
    // soft side 守旧 wings (cloth, slightly transparent)
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x4a1e1a, roughness: 0.96, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.82,
    });
    for (const sx of [-1, 1]) {
      const wing = wbox(1.6, 3.4, 0.03, wingMat);
      wing.position.set(sx * 3.2, 3.6, 2.42);
      wing.rotation.y = sx * 0.12;
      stage.add(wing);
    }
    // 额枋 across front + 柱础 so the stage reads as architecture, not four sticks
    const efang = wbox(8.6, 0.28, 0.32, lac);
    efang.position.set(0, 5.85, -2.55);
    stage.add(efang);
    const efangGold = wbox(8.7, 0.06, 0.34, gold);
    efangGold.position.set(0, 6.02, -2.55);
    stage.add(efangGold);
    for (const x of [-4.1, 4.1]) for (const z of [-2.7, 2.7]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.22, 12), stone);
      base.position.set(x, 1.97, z);
      stage.add(base);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 3.7, 12), lac);
      c.position.set(x, 3.95, z);
      c.castShadow = true;
      stage.add(c);
    }
    const sroof = curvedRoof(11, 8, 2.0, roofTile, gold, true);
    sroof.position.y = 6.55; // v37c: more headroom so high polar never clips 生旦净
    stage.add(sroof);
    // v54: soft hanging banners under 戏台 eaves — calligraphy cloth, not flat crimson slabs
    for (const [bi, bx] of [[0, -2.6], [1, 0], [2, 2.6]] as const) {
      const softBan = new THREE.MeshStandardMaterial({
        map: paintBannerTex(bi + 1), roughness: 0.88, metalness: 0.04, side: THREE.DoubleSide, transparent: true, opacity: 0.92,
      });
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.35), softBan);
      ban.position.set(bx, 5.35, -2.35);
      ban.rotation.z = (bx === 0 ? 0 : bx > 0 ? 0.05 : -0.05);
      ban.castShadow = true;
      stage.add(ban);
    }
    // performers — apron-forward, depth-staggered so side/oblique still reads faces
    const robe = [0xb8202a, 0x1e5aa0, 0xd8a820];
    for (let i = 0; i < 3; i++) {
      const f = makeFigure(robe[i], i + 8, 1.12, "performer");
      // v50: slightly wider apron stagger; 净 still set back of 水袖
      f.position.set(-0.25 + i * 1.7, 1.92, i === 0 ? -0.95 : i === 1 ? 0.05 : -1.45);
      f.rotation.y = Math.PI;
      f.name = "performer";
      stage.add(f);
    }
    // v50: soft warm fill — enough to open the box, no circular glare on 守旧
    const stFill = new THREE.PointLight(0xffd2a0, 0.7, 5.5, 2.4); stFill.position.set(0, 4.2, 0.4); stage.add(stFill); // v53r7: tighter stage fill, less wall bounce
    const stFill2 = new THREE.PointLight(0xffc890, 0.55, 5.5, 2.2); stFill2.position.set(3.0, 3.6, -0.6); stage.add(stFill2);
    const stFill3 = new THREE.PointLight(0xffc890, 0.55, 5.5, 2.2); stFill3.position.set(-3.0, 3.6, -0.6); stage.add(stFill3);
    stage.position.set(0, 0, 11.5);
    S.add(stage);
    this.stageLight.position.set(0, 9, 4);
    this.stageLight.target.position.set(0, 2, 11.5);
    this.stageLight.castShadow = true;
    S.add(this.stageLight, this.stageLight.target);
    // cool rim lights so cloth silhouettes read against the dark stage / courtyard
    const rimA = new THREE.DirectionalLight(0xbcd0ff, 1.0); rimA.position.set(-6, 6, 16); rimA.target.position.set(0, 2, 10); S.add(rimA, rimA.target);
    const rimB = new THREE.DirectionalLight(0xffe2c0, 0.7); rimB.position.set(6, 5, -2); rimB.target.position.set(0, 1, 5); S.add(rimB, rimB.target);
    // v50: stronger face fill so daytime 看戏机位 reads 工笔 faces
    const faceFill = new THREE.PointLight(0xffe6cc, 0.32, 9, 2.4); faceFill.position.set(0, 3.2, 6.5); S.add(faceFill); // v53r7: cut courtyard wall circles

    // 宣德炉 bronze censer on the axis (v23)
    // v24: smaller 宣德炉, closer to the hall so 台上望众 doesn't hide the courtyard
    const ding = xuandeLu();
    ding.scale.setScalar(0.72);
    ding.position.set(0, 0.18, -3.2);
    const pedestal = wbox(1.7, 0.22, 1.7, stone);
    pedestal.position.set(0, 0.11, -3.2);
    S.add(pedestal);
    S.add(ding);

    // v40: sparse hanging lanterns — incense axis clear, no ground clutter
    for (const z of [-2, 6]) {
      for (const i of [-3, 3]) this.addLantern(
        new THREE.Vector3(i * 2.6, 5.1 - Math.cos((i / 3) * 1.2) * 0.4, z));
    }
    // v54: courtyard banners — calligraphy 万寿/赣戏 cloth on poles
    const bannerEdge = new THREE.MeshStandardMaterial({ color: 0xc9a45a, roughness: 0.55, metalness: 0.35 });
    let banSeed = 0;
    for (const x of [-10, 10]) for (const z of [-5, 5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 8), wood);
      pole.position.set(x, 3.5, z);
      pole.castShadow = true;
      S.add(pole);
      const bannerMat = new THREE.MeshStandardMaterial({
        map: paintBannerTex(banSeed++), roughness: 0.82, metalness: 0.05, side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 2.8), bannerMat);
      flag.position.set(x + (x > 0 ? -0.45 : 0.45), 4.7, z);
      flag.rotation.y = (x > 0 ? -0.08 : 0.08);
      flag.rotation.z = (x > 0 ? 0.04 : -0.04);
      flag.castShadow = true;
      S.add(flag);
      const trim = wbox(0.82, 0.08, 0.04, bannerEdge);
      trim.position.set(flag.position.x, 6.12, z);
      S.add(trim);
    }
    // procession: worshippers on the open courtyard axis only (v37: never under 戏台/殿 roofs)
    // v39: fewer pilgrims, slightly larger, looser spacing — readable cluster not slab grid
    const pilgrimColors = [0x8a5a3a, 0x6a4a2a, 0xa07040, 0x5a4830, 0x9a6840];
    for (let i = 0; i < 8; i++) {
      const f = makeFigure(pilgrimColors[i % pilgrimColors.length], i + 7, 1.08, "robed");
      f.position.set((i % 2 ? 1.05 : -1.05) + (i % 4 - 1.5) * 0.08, 0, 5.6 - i * 0.85);
      this.procession.add(f);
    }
    S.add(this.procession);
    // audience facing the stage — keep clear of stage apron / roof drip line
    // v51: seed i*3+2 cycles pose modes 0..7 (sit/lean/clap/…); yaw toward stage center
    const crowdColors = [0xb23a2e, 0x2f5f8a, 0x3f6b52, 0xd0a24a, 0x8a3f2a, 0xe8ddc8, 0x2a2f38, 0x6a4a7a]; // v55: 年画色，压掉灰蓝
    for (let i = 0; i < 28; i++) {
      if (i === 11 || i === 19) continue; // v55: two gaps — break the 4x7 parade grid
      const row = Math.floor(i / 7), col = i % 7;
      const seed = i * 3 + 2; // mode = floor(seed/3)%8 = i%8 — even mix of sit/lean/idle/…
      const sc = (row === 0 ? 1.0 : 0.94) + (i % 5 - 2) * 0.018; // v55: jitter both ways
      const f = makeFigure(crowdColors[i % crowdColors.length], seed, sc, "crowd");
      // v37: start further from stage (was 6.5) so high-angle never clips heads through 戏台 eaves
      // v55: loose arc + bigger jitter — reads as a crowd, not a formation
      const x = -4.8 + col * 1.6 + (row % 2) * 0.5 + Math.sin(i * 7.1) * 0.55;
      const z = 4.6 - row * 1.15 + Math.cos(i * 3.3) * 0.35 - Math.abs(col - 3) * 0.1;
      f.position.set(x, 0.015, z); // v55: feet on ground (was 0.04, contact shadow floated)
      // v52: yaw firmly at stage apron (z=11.5); tiny personal offset only
      f.rotation.y = Math.atan2(-x, 11.5 - z) + (col - 3) * 0.025;
      this.audience.add(f);
    }
    S.add(this.audience);
    // ancient camphor trees behind the hall + pines outside the walls
    [[-22, -30, 1.5], [22, -30, 1.4], [-36, 10, 1.2], [36, 8, 1.3]] /* v35: side camphors outside orbit radius */.forEach(([x, z, k], i) => {
      const t = makeTree(i + 11, k);
      t.position.set(x, 0, z);
      S.add(t);
    });
    [[-24, -28], [24, -30], [-34, -14], [34, -16]].forEach(([x, z], i) => {
      const t = makeTree(i + 31, 1.4, "pine");
      t.position.set(x, 0, z);
      S.add(t);
    });
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
    this.lanterns.push(l);
    if (this.lamps.length < 7 && Math.abs(p.x) < 4) {
      const pl = new THREE.PointLight(0xff7a3a, 1, 12, 2);
      pl.position.copy(p).add(new THREE.Vector3(0, -0.4, 0));
      this.scene.add(pl);
      this.lamps.push(pl);
    }
  }

  set(act: ActId, slot: SlotId, instant = false): void {
    this.slotId = slot; // v53r9
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
    for (const l of this.lamps) l.intensity = c.lamp * 1.2; // v53r4: daytime wall orbs
    for (const m of this.lampMeshes) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = (slot === "yewan" ? 0.35 : 0.02) + c.lamp * 0.55; // v53r8
    for (const l of this.lanterns) l.visible = slot === "yewan" || c.lamp > 0.4; // v53r9: hide daytime hanging lanterns (were wall orbs)
    this.post.bloom.strength = slot === "yewan" ? 0.35 : 0.02; // v53r7: daytime almost no bloom circles
    this.procession.visible = act === "kaichao";
    this.audience.visible = act === "xiban";
    this.smoke.material.opacity = act === "kaichao" ? 0.1 : 0.05; // v53r6: less chalk plume
    const night = slot === "yewan";
    this.haze.material.color.set(night ? 0x2a2a38 : 0xf0e0d0);
    this.smoke.material.color.set(night ? 0x8a7a70 : 0xe8e0d8);
    this.stageLight.intensity = act === "xiban" ? (slot === "yewan" ? 3.2 : 0.72) : 0; // v53r8: daytime stage softer — less wall bounce orbs
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

  /** Named judge camera: "kanxi" (actors close) or "guanzhong" (crowd faces). */
  view(name: "kanxi" | "guanzhong"): void {
    const p = POSE[name];
    this.flight.go(new THREE.Vector3(...p.eye), new THREE.Vector3(...p.look), 1.4);
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
    this.smoke.update(t, this.camera);
    this.haze.update(t);
    if (this.procession.visible)
      this.procession.children.forEach((f, i) => {
        // v37: walk only the open court (z 6.4 → -1.6); never under 戏台 roof
        const span = 8.0;
        f.position.z = 6.4 - ((t * 0.45 + i * 0.55) % span);
        f.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.012; // v52: tiny step, not float
      });
    // v29/v31/v53r9: near-lens cull — but NEVER re-show daytime lanterns (set() already hid them)
    {
      const cp = this.camera.position, st = new THREE.Vector3(0, 3, 11.5).sub(cp).normalize();
      const slotOk = this.slotId === "yewan" || SLOT[this.slotId].lamp > 0.4;
      for (const l of this.lanterns) {
        if (!slotOk) { l.visible = false; continue; }
        const d = l.position.distanceTo(cp);
        const toL = l.position.clone().sub(cp).normalize();
        l.visible = d > 3.2 && !(d < 9 && toL.dot(st) > 0.985);
      }
    }
    setPaperCamera(this.camera);
    this.scene.traverse((o) => {
      const an = o.userData.anim as ((t: number) => void) | undefined;
      if (an && o.visible && o.parent?.visible) an(t);
    });
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

