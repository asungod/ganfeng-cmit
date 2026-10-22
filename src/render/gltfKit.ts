/**
 * CC0 GLB kit: Quaternius (nature + modular characters) and Kenney Nature Kit.
 * Preload once, then clone. Falls back to null so callers can keep procedural.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const BASE = "./assets3d/models/";
const loader = new GLTFLoader();

function isLow(): boolean {
  if (typeof location === "undefined") return false;
  const q = location.hash + location.search;
  if (/[?&#]hifi\b/.test(q)) return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return /[?&#]lowgfx\b/.test(q) || (navigator.hardwareConcurrency ?? 8) <= 4 || mem <= 4;
}

const TREE_CAMPHOR = ["q_Willow_1.glb", "q_Willow_2.glb", "q_Willow_3.glb"];
const TREE_PINE = [
  "q_PineTree_1.glb", "q_PineTree_2.glb", "q_PineTree_3.glb", "q_PineTree_4.glb", "q_PineTree_5.glb",
  "k_tree_pineDefaultA.glb", "k_tree_pineRoundC.glb", "k_tree_cone_dark.glb",
];
const BAMBOO = ["k_crops_bambooStageB.glb"];
const BUSH = ["q_Bush_1.glb", "q_Bush_2.glb", "k_plant_bushDetailed.glb", "k_plant_bush.glb"];

const PEOPLE_CROWD = [
  "q_men_Farmer.glb", "q_women_Medieval.glb", "q_women_Witch.glb", "q_men_Adventurer.glb", "q_women_Adventurer.glb",
];
const PEOPLE_ROBED = [
  "q_men_Farmer.glb", "q_women_Medieval.glb", "q_women_Witch.glb", "q_women_Adventurer.glb", "q_men_Adventurer.glb",
];
const PEOPLE_PERFORMER = [
  "q_men_King.glb", "q_men_Adventurer.glb", "q_women_Medieval.glb",
];

const cache = new Map<string, THREE.Object3D>();
let ready = false;
let loading: Promise<void> | null = null;

function allFiles(): string[] {
  const low = isLow();
  if (low) {
    return [
      ...TREE_CAMPHOR.slice(0, 4), ...TREE_PINE.slice(0, 3), ...BAMBOO, ...BUSH.slice(0, 2),
      ...PEOPLE_CROWD.slice(0, 4), ...PEOPLE_PERFORMER.slice(0, 2), ...PEOPLE_ROBED.slice(0, 3),
    ];
  }
  return [...new Set([...TREE_CAMPHOR, ...TREE_PINE, ...BAMBOO, ...BUSH, ...PEOPLE_CROWD, ...PEOPLE_ROBED, ...PEOPLE_PERFORMER])];
}

export function gltfReady(): boolean {
  return ready;
}

export function preloadGltfKit(): Promise<void> {
  if (ready) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    const files = allFiles();
    await Promise.all(
      files.map(
        (f) =>
          new Promise<void>((resolve) => {
            loader.load(
              BASE + f,
              (gltf) => {
                const root = gltf.scene;
                root.traverse((o) => {
                  const m = o as THREE.Mesh;
                  if (m.isMesh) {
                    m.castShadow = true;
                    m.receiveShadow = true;
                    if (/Tree|Willow|Pine|Bush/.test(f) && m.geometry) {
                      m.geometry = m.geometry.clone();
                      m.geometry.deleteAttribute("normal");
                      const merged = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry);
                      m.geometry = merged;
                      m.geometry.computeVertexNormals();
                    }
                    if (m.material) {
                      const mats = Array.isArray(m.material) ? m.material : [m.material];
                      for (const mat of mats) {
                        const std = mat as THREE.MeshStandardMaterial;
                        if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
                      }
                    }
                  }
                });
                cache.set(f, root);
                resolve();
              },
              undefined,
              () => resolve(), // missing file → skip
            );
          }),
      ),
    );
    ready = cache.size > 0;
  })();
  return loading;
}

function pick(list: string[], seed: number): { obj: THREE.Object3D; file: string } | null {
  const avail = list.filter((f) => cache.has(f));
  if (!avail.length) return null;
  const f = avail[Math.abs(Math.floor(seed)) % avail.length];
  const src = cache.get(f)!;
  // Skinned characters need SkeletonUtils.clone; trees are fine either way.
  const obj = (f.includes("men_") || f.includes("women_") ? skeletonClone(src) : src.clone(true)) as THREE.Object3D;
  obj.userData.file = f;
  return { obj, file: f };
}

/** Drop T-pose arms to a natural hang (Quaternius modular rig). */
function dropArms(root: THREE.Object3D, raise = 0, seed = 0): void {
  // Quaternius modular rig binds in T-pose. Solved offline: multiply UpperArm by Euler(-1.35, ±1.75, 0)
  // brings hands to the hips. "raise" lifts toward a stage gesture.
  const jitter = ((seed * 37) % 10) / 10 - 0.5;
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const b = o as THREE.Bone;
    const L = b.name.endsWith("L");
    if (b.name === "UpperArmL" || b.name === "UpperArmR") {
      const sgn = L ? 1 : -1;
      const ex = -1.35 + raise * 0.9 + jitter * 0.12;
      const ey = sgn * (1.75 - raise * 0.8 + jitter * 0.1);
      b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(ex, ey, 0)));
    }
    if (b.name === "LowerArmL" || b.name === "LowerArmR") {
      b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (L ? 1 : -1) * (0.25 + raise * 0.6))));
    }
  });
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) m.frustumCulled = false;
  });
  root.updateMatrixWorld(true);
}

/** Chinese costume layer over the CC0 body: long robe (褂/袍), sash, role headwear. Hides modern/medieval clothes. */
function addHanCostume(g: THREE.Group, color: number, role: FigureRole, seed: number, h: number): void {
  const robeC = new THREE.Color(color);
  const robe = new THREE.MeshStandardMaterial({ color: robeC, roughness: 0.85, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: role === "performer" ? 0xe8c060 : robeC.clone().multiplyScalar(0.5), roughness: 0.6, metalness: role === "performer" ? 0.3 : 0 });
  const k = h / 1.7;
  const hem = role === "performer" ? 0.36 : 0.3;
  const prof = [
    new THREE.Vector2(hem, 0.05), new THREE.Vector2(hem * 0.95, 0.35), new THREE.Vector2(0.24, 0.8),
    new THREE.Vector2(0.2, 1.05), new THREE.Vector2(0.23, 1.3), new THREE.Vector2(0.2, 1.42), new THREE.Vector2(0.09, 1.47),
  ].map((v) => new THREE.Vector2(v.x * k * 1.14, v.y * k));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), robe);
  body.scale.z = 0.78;
  body.castShadow = true;
  g.add(body);
  // cross collar (交领) + sash
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.205 * k, 0.205 * k, 0.07 * k, 16), trim);
  sash.scale.z = 0.8; sash.position.y = 1.0 * k; g.add(sash);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.05 * k, 0.34 * k, 0.02 * k), trim);
  collar.position.set(0.03 * k, 1.28 * k, 0.17 * k); collar.rotation.z = 0.5; g.add(collar);
  // wide sleeves (袖) over each arm, hanging
  for (const sx of [-1, 1]) {
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * k, 0.12 * k, 0.5 * k, 10, 1, true), robe);
    sl.position.set(sx * 0.27 * k, 1.1 * k, 0.02 * k);
    sl.rotation.z = sx * 0.1; sl.scale.set(1.15, 1, 1.15);
    g.add(sl);
  }
  const hatY = 1.72 * k;
  if (role === "performer") {
    const gold = new THREE.MeshStandardMaterial({ color: 0xd8a830, roughness: 0.35, metalness: 0.6, emissive: 0x3a2400 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * k, 0.13 * k, 0.14 * k, 12), gold);
    crown.position.y = hatY; g.add(crown);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05 * k, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd02020, roughness: 0.5 }));
    ball.position.y = hatY + 0.11 * k; g.add(ball);
    for (const sx of [-1, 1]) { // 雉翎 pheasant plumes
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * k, 0.012 * k, 0.9 * k, 5), new THREE.MeshStandardMaterial({ color: 0xc8b088, roughness: 0.6 }));
      pl.position.set(sx * 0.12 * k, hatY + 0.4 * k, -0.05 * k); pl.rotation.z = -sx * 0.45; g.add(pl);
    }
    // back flags (靠旗) for the martial role
    if (seed % 3 === 0) for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.22 * k, 0.4 * k), new THREE.MeshStandardMaterial({ color: 0xe0c040, side: THREE.DoubleSide, roughness: 0.7 }));
      f.position.set(sx * 0.14 * k, 1.7 * k, -0.22 * k); f.rotation.z = sx * 0.35; g.add(f);
    }
  } else {
    const r = seed % 3;
    if (r === 0) { // 斗笠 conical straw hat
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3 * k, 0.16 * k, 18), new THREE.MeshStandardMaterial({ color: 0xa88a58, roughness: 0.9 }));
      hat.position.y = hatY + 0.02 * k; g.add(hat);
    } else if (r === 1) { // 瓜皮帽 skullcap
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12 * k, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.6 }));
      cap.position.y = hatY - 0.07 * k; g.add(cap);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025 * k, 8, 6), new THREE.MeshStandardMaterial({ color: 0xa02020 }));
      knob.position.y = hatY + 0.05 * k; g.add(knob);
    } else { // 发髻 hair bun with wrap
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11 * k, 12, 10), new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.5 }));
      bun.position.y = hatY - 0.07 * k; bun.scale.y = 0.75; g.add(bun);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05 * k, 8, 6), bun.material);
      knot.position.set(0, hatY + 0.03 * k, -0.04 * k); g.add(knot);
    }
  }
}

/** Tint non-skin materials toward a costume color (opera / crowd variety). */
function tintClothes(root: THREE.Object3D, color: number, strength = 0.7): void {
  const target = new THREE.Color(color);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (let i = 0; i < mats.length; i++) {
      const mat = (mats[i] as THREE.MeshStandardMaterial).clone();
      mats[i] = mat;
      const name = `${mat.name} ${m.name}`.toLowerCase();
      if (/skin|face|hand|head|hair|eye|brow|lip|teeth|beard/.test(name)) continue;
      // skip very dark (hair/shoes) and very light (eyeballs)
      const c = mat.color;
      if (!c) continue;
      const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
      if (lum < 0.08 || lum > 0.92) continue;
      c.lerp(target, strength);
      mat.needsUpdate = true;
    }
    m.material = Array.isArray(m.material) ? mats : mats[0];
  });
}

function normalizeHeight(root: THREE.Object3D, targetH: number): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y < 1e-3) return;
  const s = targetH / size.y;
  root.scale.multiplyScalar(s);
  // plant on ground
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
}

export function cloneGltfTree(seed = 1, scale = 1, kind: "camphor" | "pine" = "camphor"): THREE.Group | null {
  if (!ready) return null;
  const list = kind === "pine" ? TREE_PINE : TREE_CAMPHOR;
  const picked = pick(list, seed * 17 + (kind === "pine" ? 3 : 0));
  if (!picked) return null;
  const { obj, file } = picked;
  const g = new THREE.Group();
  g.add(obj);
  const kenney = file.startsWith("k_");
  normalizeHeight(obj, (kenney ? 7.5 : 8.5) * scale * (0.85 + (Math.abs(seed) % 7) * 0.04));
  g.rotation.y = (seed * 0.7) % (Math.PI * 2);
  return g;
}

export function cloneGltfBamboo(_seed = 1): THREE.Group | null {
  // Kenney bamboo reads as glowing bars under bloom — keep procedural bamboo.
  return null;
}

export function cloneGltfBush(seed = 1, scale = 1): THREE.Group | null {
  if (!ready) return null;
  const picked = pick(BUSH, seed);
  if (!picked) return null;
  const g = new THREE.Group();
  g.add(picked.obj);
  normalizeHeight(picked.obj, 1.2 * scale);
  return g;
}

/** v19: painted face decal (opera 脸谱 or plain friendly Chinese features), drawn on a canvas. */
const faceTexCache = new Map<string, THREE.CanvasTexture>();
function faceTexture(role: FigureRole, seed: number): THREE.CanvasTexture {
  const kind = role === "performer" ? ["red", "white", "black"][seed % 3] : `c${seed % 4}`;
  const hit = faceTexCache.get(kind);
  if (hit) return hit;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const E = (cx: number, cy: number, rx: number, ry: number, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); x.fill(); };
  if (role === "performer") {
    // base paint
    const base = kind === "red" ? "#b81e1e" : kind === "white" ? "#f2ece4" : "#1a1614";
    x.fillStyle = base; E(128, 136, 104, 120);
    // forehead / central stripe
    x.fillStyle = kind === "black" ? "#f2ece4" : kind === "red" ? "#1a1614" : "#c02828";
    x.beginPath(); x.moveTo(118, 20); x.lineTo(138, 20); x.lineTo(132, 92); x.lineTo(124, 92); x.fill();
    // eye sockets painted white/black, upswept
    x.fillStyle = kind === "black" ? "#f2ece4" : "#141010";
    E(84, 112, 34, 15, -0.35); E(172, 112, 34, 15, 0.35);
    // bold upswept eyebrows
    x.strokeStyle = "#0c0808"; x.lineWidth = 11; x.lineCap = "round";
    x.beginPath(); x.moveTo(52, 104); x.quadraticCurveTo(80, 70, 116, 88); x.stroke();
    x.beginPath(); x.moveTo(204, 104); x.quadraticCurveTo(176, 70, 140, 88); x.stroke();
    // eyes
    x.fillStyle = "#fff"; E(88, 114, 15, 7, -0.3); E(168, 114, 15, 7, 0.3);
    x.fillStyle = "#120c0a"; E(90, 114, 6, 6); E(166, 114, 6, 6);
    // nose shade + mouth: firm, slight determined smile
    x.fillStyle = kind === "white" ? "#d8c8c0" : "rgba(0,0,0,0.35)"; E(128, 160, 12, 8);
    x.strokeStyle = kind === "black" ? "#f2ece4" : "#7a0e0e"; x.lineWidth = 6;
    x.beginPath(); x.moveTo(104, 196); x.quadraticCurveTo(128, 210, 152, 196); x.stroke();
    if (kind !== "black") { x.fillStyle = "#d83030"; E(128, 200, 10, 5); }
  } else {
    const n = seed % 4;
    const skin = ["#e2b894", "#d6a882", "#e8c4a2", "#c99a74"][n];
    x.fillStyle = skin; E(128, 136, 100, 118);
    // soft cheeks
    x.fillStyle = "rgba(210,110,100,0.25)"; E(74, 160, 20, 12); E(182, 160, 20, 12);
    // eyebrows
    x.strokeStyle = "#2a1c14"; x.lineWidth = 6; x.lineCap = "round";
    const raise = n === 2 ? -6 : 0;
    x.beginPath(); x.moveTo(66, 98 + raise); x.quadraticCurveTo(88, 88 + raise, 110, 96); x.stroke();
    x.beginPath(); x.moveTo(190, 98 + raise); x.quadraticCurveTo(168, 88 + raise, 146, 96); x.stroke();
    // almond eyes (smiling eyes are arcs)
    x.fillStyle = "#1a120e";
    if (n === 0 || n === 3) {
      x.lineWidth = 5; x.strokeStyle = "#1a120e";
      x.beginPath(); x.arc(88, 122, 12, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
      x.beginPath(); x.arc(168, 122, 12, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    } else { E(88, 118, 11, 5); E(168, 118, 11, 5); }
    // nose
    x.strokeStyle = "rgba(120,70,50,0.5)"; x.lineWidth = 4;
    x.beginPath(); x.moveTo(122, 160); x.quadraticCurveTo(128, 166, 134, 160); x.stroke();
    // mouth: smile / open smile / calm watch
    x.strokeStyle = "#8a3a30"; x.lineWidth = 5;
    if (n === 1) { x.fillStyle = "#7a2a24"; x.beginPath(); x.arc(128, 192, 16, 0, Math.PI); x.fill(); }
    else { const k = n === 2 ? 4 : 12; x.beginPath(); x.moveTo(106, 192); x.quadraticCurveTo(128, 192 + k, 150, 192); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  faceTexCache.set(kind, t);
  return t;
}

function addFace(g: THREE.Group, obj: THREE.Object3D, role: FigureRole, seed: number): void {
  g.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const headMeshes: THREE.Mesh[] = [];
  obj.traverse((o) => {
    let p: THREE.Object3D | null = o, isHead = false;
    while (p) { if (/head/i.test(p.name)) { isHead = true; break; } p = p.parent; }
    if ((o as THREE.Mesh).isMesh && isHead) headMeshes.push(o as THREE.Mesh);
  });
  for (const m of headMeshes) {
    const mt = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    const hide = !/skin/i.test(mt.name); // hats, hair, beards, eyes: replaced by costume + decal
    const sm = m as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh) sm.computeBoundingBox(); else m.geometry.computeBoundingBox();
    const b = (sm.isSkinnedMesh ? sm.boundingBox! : m.geometry.boundingBox!).clone().applyMatrix4(m.matrixWorld);
    box.union(b);
    if (hide) m.visible = false;
  }
  if (box.isEmpty()) return;
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  box.applyMatrix4(inv);
  const c = box.getCenter(new THREE.Vector3());
  const sz = box.getSize(new THREE.Vector3());
  const r = Math.min(sz.x, sz.z) * 0.5 * 1.04;
  const fh = sz.y * 0.62;
  const geo = new THREE.CylinderGeometry(r * 1.02, r * 1.02, fh, 20, 1, true, -Math.PI * 0.32, Math.PI * 0.64);
  const mat = new THREE.MeshStandardMaterial({ map: faceTexture(role, seed), transparent: true, alphaTest: 0.05, roughness: role === "performer" ? 0.45 : 0.8, side: THREE.FrontSide });
  // alpha: transparent outside the painted oval
  const face = new THREE.Mesh(geo, mat);
  face.position.set(c.x, box.min.y + sz.y * 0.42, c.z);
  face.name = "faceDecal";
  g.add(face);
  // hide the original western eyes/brows so they don't show beside the decal
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mt of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[])
      if (/^(eye|eyebrows)$/i.test(mt.name)) { mt.transparent = true; mt.opacity = 0; mt.depthWrite = false; }
  });
}

export type FigureRole = "robed" | "performer" | "crowd";

export function cloneGltfFigure(color: number, seed = 1, scale = 1, role: FigureRole = "robed"): THREE.Group | null {
  if (!ready) return null;
  const list = role === "performer" ? PEOPLE_PERFORMER : role === "crowd" ? PEOPLE_CROWD : PEOPLE_ROBED;
  const picked = pick(list, seed * 13 + role.length);
  if (!picked) return null;
  const obj = picked.obj;
  const g = new THREE.Group();
  g.add(obj);
  const raise = role === "performer" ? 0.12 + (seed % 2) * 0.08 : (seed % 5 === 0 ? 0.12 : 0);
  dropArms(obj, raise, seed);
  tintClothes(obj, color, 0.8);
  const H = 1.7 * scale * (role === "performer" ? 1.08 : 0.94 + (seed % 7) * 0.025);
  normalizeHeight(obj, H);
  addHanCostume(g, color, role, Math.abs(Math.floor(seed)), H);
  addFace(g, obj, role, Math.abs(Math.floor(seed)));
  // v18: hide original hair (headwear replaces it) to stop hair poking through crowns/hats
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (/hair|hat|helmet|crown|hood/i.test(m.name)) m.visible = false;
    for (const mt of mats) if (/hair|hat|helmet|hood/i.test(mt.name)) { mt.transparent = true; mt.opacity = 0; mt.depthWrite = false; }
  });
  g.userData.sway = { phase: (seed * 1.37) % 6.28, amp: role === "performer" ? 0.25 : 0.05 + (seed % 4) * 0.02 };
  if (role !== "performer") g.rotation.y = ((seed * 0.31) % 1 - 0.5) * 0.7;
  return g;
}
