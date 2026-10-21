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

const TREE_CAMPHOR = [
  "q_CommonTree_1.glb", "q_CommonTree_2.glb", "q_CommonTree_3.glb", "q_CommonTree_4.glb", "q_CommonTree_5.glb",
  "q_Willow_1.glb", "q_Willow_2.glb", "q_Willow_3.glb",
  "k_tree_detailed_dark.glb", "k_tree_oak_dark.glb", "k_tree_default_dark.glb",
];
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
function dropArms(root: THREE.Object3D, raise = 0): void {
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const b = o as THREE.Bone;
    // Quaternius modular bind is T-pose; set absolute hang (not +=)
    if (b.name === "UpperArmL") { b.rotation.x = 1.45 - raise; b.rotation.z = 0.35; }
    if (b.name === "UpperArmR") { b.rotation.x = 1.45 - raise; b.rotation.z = -0.35; }
    if (b.name === "LowerArmL" || b.name === "LowerArmR") b.rotation.x = 0.35;
    if (b.name === "ShoulderL") b.rotation.z = 0.25;
    if (b.name === "ShoulderR") b.rotation.z = -0.25;
  });
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) {
      m.frustumCulled = false;
      m.skeleton.bones.forEach((b) => b.updateMatrixWorld(true));
      m.computeBoundingSphere();
    }
  });
  root.updateMatrixWorld(true);
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

export function cloneGltfBamboo(seed = 1): THREE.Group | null {
  if (!ready) return null;
  const g = new THREE.Group();
  const n = isLow() ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const picked = pick(BAMBOO, seed + i * 3);
    if (!picked) continue;
    const obj = picked.obj;
    normalizeHeight(obj, 6 + ((seed + i) % 5) * 0.4);
    obj.position.set(((i * 37 + seed) % 10) * 0.18 - 0.7, 0, ((i * 19 + seed) % 10) * 0.18 - 0.7);
    obj.rotation.y = i * 0.7;
    g.add(obj);
  }
  return g.children.length ? g : null;
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

export type FigureRole = "robed" | "performer" | "crowd";

export function cloneGltfFigure(color: number, seed = 1, scale = 1, role: FigureRole = "robed"): THREE.Group | null {
  if (!ready) return null;
  const list = role === "performer" ? PEOPLE_PERFORMER : role === "crowd" ? PEOPLE_CROWD : PEOPLE_ROBED;
  const picked = pick(list, seed * 13 + role.length);
  if (!picked) return null;
  const obj = picked.obj;
  const g = new THREE.Group();
  g.add(obj);
  dropArms(obj, role === "performer" ? 0.55 : 0);
  tintClothes(obj, color, role === "performer" ? 0.75 : role === "crowd" ? 0.55 : 0.65);
  normalizeHeight(obj, 1.7 * scale * (role === "performer" ? 1.08 : 1));
  if (role !== "performer") g.rotation.y = ((seed * 0.31) % 1 - 0.5) * 0.5;
  return g;
}
