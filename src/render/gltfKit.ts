/**
 * CC0 GLB kit (Quaternius / Kenney) — retired in v24.
 * Trees, bamboo and figures are now painted in code (guofeng.ts / paperFigure.ts).
 * preloadGltfKit stays as a no-op so exhibit mounts keep working.
 */
import type * as THREE from "three";

export type FigureRole = "robed" | "performer" | "crowd";

export function gltfReady(): boolean {
  return true;
}

export function preloadGltfKit(): Promise<void> {
  return Promise.resolve();
}

export function cloneGltfTree(_seed = 1, _scale = 1, _kind: "camphor" | "pine" = "camphor"): THREE.Group | null {
  return null;
}
export function cloneGltfBamboo(_seed = 1): THREE.Group | null {
  return null;
}
export function cloneGltfBush(_seed = 1, _scale = 1): THREE.Group | null {
  return null;
}
export function cloneGltfFigure(_color: number, _seed = 1, _scale = 1, _role: FigureRole = "robed"): THREE.Group | null {
  return null;
}
