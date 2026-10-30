// 赣风 · 彩绘剪纸人物（工笔 / 年画 / 皮影 风格）
// Every figure is painted in code on <canvas> (no external art, no AI imagery) and
// assembled as layered alpha cut-outs with 皮影-style joints: torso, head, upper arm,
// forearm, 水袖, 靠旗, 翎子, 髯口, 帽翅 … each piece moves on its own pivot.
import * as THREE from "three";

type Ctx = CanvasRenderingContext2D;
type P2 = [number, number];
const INK = "#2a1810";
const GOLD = "#d9b04a", GOLD_D = "#9a7224";

let LOW: boolean | null = null;
function low(): boolean {
  if (LOW !== null) return LOW;
  const q = location.hash + location.search;
  if (/[?&#]hifi\b/.test(q)) return (LOW = false);
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return (LOW = /[?&#]lowgfx\b/.test(q) || (navigator.hardwareConcurrency ?? 8) <= 4 || mem <= 4);
}

let CAM: THREE.Camera | null = null;
/** Figures turn gently toward this camera (clamped), like a 皮影 screen facing the audience. */
export function setPaperCamera(c: THREE.Camera): void { CAM = c; }

function rng(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

/* ------------------------------------------------------------------ paint helpers */
function path(x: Ctx, pts: P2[], closed = true): void {
  const n = pts.length;
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  const N = closed ? n : n - 1;
  for (let i = 0; i < N; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    const p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const p3 = closed ? pts[(i + 2) % n] : pts[Math.min(n - 1, i + 2)];
    x.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) x.closePath();
}
/** right half (top→bottom, x≥0) → full symmetric outline */
function sym(half: P2[]): P2[] {
  const l = half.slice().reverse().filter((p) => p[0] > 0.0001).map((p) => [-p[0], p[1]] as P2);
  return [...half, ...l];
}
function shape(x: Ctx, pts: P2[], fill: string | CanvasGradient, lw = 0.006, stroke = INK, closed = true): void {
  path(x, pts, closed); x.fillStyle = fill; x.fill();
  if (lw > 0) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); }
}
function line(x: Ctx, pts: P2[], lw: number, col: string): void { path(x, pts, false); x.lineWidth = lw; x.strokeStyle = col; x.stroke(); }
function ell(x: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string | CanvasGradient | null, lw = 0, stroke = INK, rot = 0): void {
  x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { x.fillStyle = fill; x.fill(); }
  if (lw > 0) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); }
}
function shade(hex: string, k: number): string { const c = new THREE.Color(hex); if (k < 0) c.multiplyScalar(1 + k); else c.lerp(new THREE.Color(0xffffff), k); return "#" + c.getHexString(); }
function hgrad(x: Ctx, x0: number, x1: number, col: string, edge = -0.32): CanvasGradient {
  const g = x.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, edge)); g.addColorStop(0.32, shade(col, 0.06)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, edge)); return g;
}
/** 祥云 cloud scroll */
function cloud(x: Ctx, cx: number, cy: number, r: number, col: string, lw = 0.004): void {
  x.save(); x.strokeStyle = col; x.lineWidth = lw;
  for (const [dx, dy, k] of [[0, 0, 1], [r * 1.3, r * 0.2, 0.75], [-r * 1.2, r * 0.1, 0.7]] as const) {
    x.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.15) { const rr = r * k * (1 - a / (Math.PI * 3.6)); x.lineTo(cx + dx + Math.cos(a) * rr, cy + dy + Math.sin(a) * rr); }
    x.stroke();
  }
  x.beginPath(); x.moveTo(cx - r * 2, cy - r * 0.6); x.quadraticCurveTo(cx, cy - r * 1.2, cx + r * 2.4, cy - r * 0.5); x.stroke();
  x.restore();
}
/** 海水江崖 hem band */
function seaCliff(x: Ctx, x0: number, x1: number, y0: number, y1: number, cols: string[]): void {
  const h = y1 - y0, n = 26, w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { // 立水 slanted stripes
    x.fillStyle = cols[i % cols.length];
    x.beginPath(); x.moveTo(x0 + i * w, y0); x.lineTo(x0 + i * w + w, y0); x.lineTo(x0 + i * w + w + w * 0.6, y0 + h * 0.55); x.lineTo(x0 + i * w + w * 0.6, y0 + h * 0.55); x.fill();
  }
  x.strokeStyle = "#f4efe0"; x.lineWidth = 0.003;
  for (let r = 0; r < 3; r++) { // 平水 waves
    x.beginPath();
    for (let xx = x0; xx < x1; xx += 0.04) x.arc(xx + 0.02, y0 + h * (0.6 + r * 0.12), 0.02, Math.PI, 0, true);
    x.stroke();
  }
  for (const cx of [x0 + (x1 - x0) * 0.2, (x0 + x1) / 2, x0 + (x1 - x0) * 0.8]) { // 江崖 peaks
    const big = Math.abs(cx - (x0 + x1) / 2) < 0.01;
    shape(x, [[cx - 0.05, y0 + h * 0.7], [cx - 0.02, y0 + h * (big ? 1.25 : 1.0)], [cx + 0.005, y0 + h * (big ? 1.05 : 0.9)], [cx + 0.025, y0 + h * (big ? 1.2 : 0.98)], [cx + 0.05, y0 + h * 0.7]], GOLD, 0.003, GOLD_D);
  }
}
function scales(x: Ctx, x0: number, x1: number, y0: number, y1: number, col: string, r = 0.018): void {
  x.strokeStyle = col; x.lineWidth = 0.0035;
  for (let row = 0, y = y1; y > y0; y -= r * 0.9, row++) {
    x.beginPath();
    for (let xx = x0 + (row % 2) * r; xx < x1; xx += r * 2) { x.moveTo(xx + r, y); x.arc(xx, y, r, 0, Math.PI, true); }
    x.stroke();
  }
}
function folds(x: Ctx, xs: number[], yTop: number, yBot: number, col: string): void {
  x.save(); x.globalAlpha = 0.35; x.strokeStyle = col; x.lineWidth = 0.005;
  for (const fx of xs) line(x, [[fx * 0.6, yTop], [fx * 0.85, (yTop + yBot) / 2], [fx, yBot]], 0.005, col);
  x.restore();
}
/** a hand with drawn fingers. dir = 1 normal; kind: open / fist / orchid(兰花指) */
function hand(x: Ctx, cx: number, cy: number, s: number, skin: string, kind: "open" | "fist" | "orchid" = "open", size = 1): void {
  const k = 0.9 * size;
  x.save(); x.translate(cx, cy); x.scale(s * k, k);
  ell(x, 0, 0, 0.026, 0.032, skin, 0.003);
  const fing = (ax: number, ay: number, len: number, ang: number, w = 0.0085) => {
    x.save(); x.translate(ax, ay); x.rotate(ang);
    x.beginPath(); x.roundRect(-w / 2, -len, w, len, w / 2); x.fillStyle = skin; x.fill(); x.lineWidth = 0.0022; x.strokeStyle = INK; x.stroke(); x.restore();
  };
  if (kind === "fist") { for (let i = 0; i < 4; i++) ell(x, -0.015 + i * 0.01, -0.03, 0.007, 0.008, skin, 0.002); fing(0.024, 0.0, 0.03, 0.6); }
  else if (kind === "orchid") { fing(-0.014, -0.02, 0.045, 0.25); fing(-0.003, -0.022, 0.05, 0.05); fing(0.008, -0.025, 0.028, -0.9); fing(0.016, -0.02, 0.04, -0.25); fing(0.022, 0.0, 0.028, 1.1); }
  else { fing(-0.016, -0.02, 0.04, 0.12); fing(-0.005, -0.024, 0.046, 0.02); fing(0.006, -0.024, 0.044, -0.05); fing(0.016, -0.02, 0.036, -0.14); fing(0.024, 0.006, 0.03, 0.9); }
  x.restore();
}

/* ------------------------------------------------------------------ parts */
type Draw = (x: Ctx, back: boolean) => void;
interface Part { g: THREE.Group; geo: THREE.PlaneGeometry; base: Float32Array }
const texCache = new Map<string, THREE.CanvasTexture>();
function paintTex(key: string, b: [number, number, number, number], ppm: number, draw: (x: Ctx) => void): THREE.CanvasTexture {
  const hit = texCache.get(key); if (hit) return hit;
  const c = document.createElement("canvas");
  const [x0, y0, x1, y1] = b;
  c.width = Math.max(8, Math.ceil((x1 - x0) * ppm)); c.height = Math.max(8, Math.ceil((y1 - y0) * ppm));
  const x = c.getContext("2d")!;
  x.setTransform(ppm, 0, 0, -ppm, -x0 * ppm, y1 * ppm);
  x.lineJoin = "round"; x.lineCap = "round";
  draw(x);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
function paperMat(map: THREE.Texture, side: THREE.Side): THREE.MeshStandardMaterial {
  // v40: higher alphaTest cuts soft fringe; slight emissive keep 年画 glow
  return new THREE.MeshStandardMaterial({ map, alphaTest: 0.58, side, roughness: 0.92, metalness: 0, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.28,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
}
const rimCache = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
function rimMat(m: THREE.MeshStandardMaterial): THREE.MeshBasicMaterial {
  const map = m.map!; let r = rimCache.get(map);
  if (!r) { r = new THREE.MeshBasicMaterial({ map, color: 0x1a100c, alphaTest: 0.72, side: THREE.DoubleSide }); rimCache.set(map, r); }
  return r;
}
let shadowTex: THREE.Texture | null = null;
/** soft painted contact shadow under the feet */
export function contactShadow(w = 0.75, d = 0.42): THREE.Mesh {
  if (!shadowTex) {
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, "rgba(20,12,8,0.62)"); g.addColorStop(0.55, "rgba(20,12,8,0.3)"); g.addColorStop(1, "rgba(20,12,8,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); shadowTex = new THREE.CanvasTexture(c); shadowTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006; m.renderOrder = 1; // v52: hug ground
  return m;
}
/** Cardboard thickness — side/close read an edge; high elev must NOT show pale slab tops. */
const BOARD = 0.145; // v50: thicker cardboard — side/oblique reads edge, not flat paper
function part(key: string, b: [number, number, number, number], ppm: number, draw: Draw, opts: { back?: boolean; seg?: [number, number]; z?: number } = {}): Part {
  const [x0, y0, x1, y1] = b;
  const seg = opts.seg ?? [1, 1];
  const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0, seg[0], seg[1]);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
  const g = new THREE.Group();
  const z0 = opts.z ?? 0;
  const front = paperTexMesh(key + ":f", b, ppm, (x) => draw(x, false), geo, opts.back === false ? THREE.DoubleSide : THREE.FrontSide);
  front.position.z = z0 + BOARD / 2;
  g.add(front);
  if (opts.back !== false) {
    const back = paperTexMesh(key + ":b", b, ppm, (x) => draw(x, true), geo, THREE.BackSide);
    back.position.z = z0 - BOARD / 2;
    g.add(back);
  }
  const rim = rimMat(front.material as THREE.MeshStandardMaterial);
  // v40: thickness fill ONLY — no oversized outline (was harsh black alpha fringe)
  const layers = 3; // v50: denser rim sandwich so side silhouette holds
  for (let i = 0; i < layers; i++) {
    const m = new THREE.Mesh(geo, rim);
    m.position.z = z0 - BOARD / 2 + (i + 0.5) * (BOARD / layers);
    m.scale.set(1.0, 1.0, 1);
    m.renderOrder = -1;
    m.userData.paperEdge = true;
    g.add(m);
  }
  // v40b: no solid bbox end-grain caps — they read as black bars/frames at mid-high.
  // Cardboard thickness = silhouette-matched rim sandwich only (alphaTest).
  return { g, geo, base: Float32Array.from(geo.attributes.position.array as Float32Array) };
}
function paperTexMesh(key: string, b: [number, number, number, number], ppm: number, draw: (x: Ctx) => void, geo: THREE.BufferGeometry, side: THREE.Side): THREE.Mesh {
  const map = paintTex(key, b, ppm, draw);
  const m = new THREE.Mesh(geo, paperMat(map, side));
  m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.58, side: THREE.DoubleSide });
  return m;
}
/** flowing cloth: displace vertices by distance from pivot */
function flow(p: Part, fn: (x: number, y: number) => [number, number]): void {
  const a = p.geo.attributes.position as THREE.BufferAttribute, b = p.base;
  for (let i = 0; i < a.count; i++) { const [dx, dz] = fn(b[i * 3], b[i * 3 + 1]); a.setXYZ(i, b[i * 3] + dx, b[i * 3 + 1], b[i * 3 + 2] + dz); }
  a.needsUpdate = true;
}

/* ------------------------------------------------------------------ faces */
type Face = "jing" | "dan" | "laosheng" | "villager" | "woman" | "elder" | "child";
function faceBase(x: Ctx, skin: string, cy: number, rx = 0.08, ry = 0.102): void {
  ell(x, -rx * 0.98, cy - 0.005, 0.016, 0.026, skin, 0.003); ell(x, rx * 0.98, cy - 0.005, 0.016, 0.026, skin, 0.003); // ears
  x.beginPath(); x.rect(-0.03, cy - ry - 0.05, 0.06, 0.06); x.fillStyle = shade(skin, -0.12); x.fill(); // neck
  path(x, [[0, cy + ry], [rx * 0.78, cy + ry * 0.72], [rx, cy + ry * 0.1], [rx * 0.82, cy - ry * 0.5], [rx * 0.42, cy - ry * 0.92], [0, cy - ry], [-rx * 0.42, cy - ry * 0.92], [-rx * 0.82, cy - ry * 0.5], [-rx, cy + ry * 0.1], [-rx * 0.78, cy + ry * 0.72]]);
  x.fillStyle = skin; x.fill(); x.lineWidth = 0.003; x.strokeStyle = INK; x.stroke();
}
function opEyes(x: Ctx, cy: number, tilt: number, brow: string, browW: number, browTilt: number, phoenix = false): void {
  for (const s of [-1, 1]) {
    x.save(); x.translate(s * 0.033, cy); x.scale(s, 1);
    // 丹凤眼 / almond — longer outer tip, crisp ink rim
    const tip = phoenix ? 0.034 : 0.03;
    path(x, [[-0.018, 0.0], [0, 0.008 + tilt * 0.25], [0.018, 0.007 + tilt], [tip, 0.014 + tilt * 1.6], [0.02, -0.003], [0.004, -0.007], [-0.014, -0.004]]);
    x.fillStyle = "#fbf7f0"; x.fill(); x.lineWidth = 0.0034; x.strokeStyle = INK; x.stroke();
    // iris + pupil + dual catchlight (神采)
    ell(x, 0.003, 0.001, 0.0072, 0.0074, "#1a1008");
    ell(x, 0.003, 0.001, 0.004, 0.0042, "#080402");
    ell(x, 0.0052, 0.003, 0.0022, 0.0022, "#ffffff");
    ell(x, 0.001, -0.0012, 0.0011, 0.0011, "rgba(255,255,255,0.75)");
    // upper lid crease + outer flick
    line(x, [[-0.018, 0.002], [0.006, 0.01], [tip, 0.015 + tilt * 1.6], [tip + 0.012, 0.022 + tilt * 2.1]], 0.0036, INK);
    // 柳叶眉 willow / 剑眉 sword brow
    if (phoenix) {
      path(x, [[-0.02, 0.02], [0.002, 0.028 + browTilt * 0.3], [0.028, 0.038 + browTilt], [0.042, 0.044 + browTilt * 1.2], [0.03, 0.036 + browTilt * 0.7], [0.004, 0.024 - browW], [-0.018, 0.017]]);
    } else {
      path(x, [[-0.022, 0.022], [0.0, 0.031 + browTilt * 0.4], [0.03, 0.042 + browTilt], [0.042, 0.05 + browTilt * 1.3], [0.026, 0.036 + browTilt * 0.8], [0, 0.022 + browTilt * 0.3 - browW], [-0.02, 0.017 - browW * 0.5]]);
    }
    x.fillStyle = brow; x.fill();
    x.restore();
  }
}
function folkEye(x: Ctx, sx: number, ey: number, open: number, soft: boolean): void {
  // open always has sclera + iris + catchlight; soft = child larger iris (v44b: bolder for mid-distance)
  const rx = (soft ? 0.013 : 0.011) * open, ry = (soft ? 0.0085 : 0.007) * open;
  ell(x, sx, ey, rx, ry, "#fbf7f0", 0.003);
  const ir = soft ? 0.0062 : 0.0052;
  ell(x, sx + (sx > 0 ? 0.0008 : -0.0008), ey + 0.0004, ir * open, ir * 1.05 * open, "#1a1008");
  ell(x, sx + (sx > 0 ? 0.0008 : -0.0008), ey + 0.0004, ir * 0.55 * open, ir * 0.58 * open, "#080402");
  ell(x, sx + (sx > 0 ? 0.0026 : -0.0026), ey + 0.0022, 0.002 * open, 0.002 * open, "#ffffff");
}
function paintFace(x: Ctx, kind: Face, skin: string, cy: number, seed: number): void {
  const r = rng(seed * 7 + 3);
  if (kind === "jing") {
    // 花脸: 红整脸 base with black 揉/勾 swirls, white 眼窝, red 印堂
    faceBase(x, "#e0402e", cy, 0.086, 0.108);
    x.save(); path(x, [[0, cy + 0.108], [0.067, cy + 0.078], [0.086, cy + 0.01], [0.07, cy - 0.054], [0.036, cy - 0.099], [0, cy - 0.108], [-0.036, cy - 0.099], [-0.07, cy - 0.054], [-0.086, cy + 0.01], [-0.067, cy + 0.078]]); x.clip();
    for (const s of [-1, 1]) {
      x.save(); x.scale(s, 1);
      shape(x, [[0.014, cy + 0.058], [0.05, cy + 0.08], [0.082, cy + 0.06], [0.078, cy + 0.0], [0.058, cy - 0.016], [0.03, cy - 0.006], [0.016, cy + 0.022]], "#151012", 0.006, "#fbf4e6");
      shape(x, [[0.018, cy + 0.032], [0.045, cy + 0.05], [0.074, cy + 0.032], [0.062, cy + 0.004], [0.028, cy + 0.004]], "#fbf6ee", 0);
      line(x, [[0.04, cy - 0.035], [0.07, cy - 0.04], [0.08, cy - 0.07]], 0.008, "#151012"); // cheek swirl
      line(x, [[0.07, cy + 0.07], [0.04, cy + 0.1]], 0.006, "#151012");
      x.restore();
    }
    shape(x, [[-0.007, cy + 0.11], [0.007, cy + 0.11], [0.012, cy + 0.05], [0, cy + 0.035], [-0.012, cy + 0.05]], "#f4efe6", 0); // 印堂 white with red core
    shape(x, [[-0.003, cy + 0.1], [0.003, cy + 0.1], [0.005, cy + 0.055], [-0.005, cy + 0.055]], "#e0202a", 0);
    shape(x, [[-0.013, cy - 0.005], [0.013, cy - 0.005], [0.018, cy - 0.025], [0, cy - 0.032], [-0.018, cy - 0.025]], "#151012", 0); // nose
    shape(x, [[-0.03, cy - 0.052], [0, cy - 0.045], [0.03, cy - 0.052], [0.022, cy - 0.075], [0, cy - 0.082], [-0.022, cy - 0.075]], "#151012", 0.005, "#fbf4e6"); // mouth patch
    shape(x, [[-0.012, cy - 0.06], [0.012, cy - 0.06], [0, cy - 0.068]], "#e0202a", 0);
    x.restore();
    for (const s of [-1, 1]) {
      x.save(); x.translate(s * 0.045, cy + 0.015); x.scale(s, 1);
      ell(x, 0, 0, 0.014, 0.008, "#fbf6ee", 0.003);
      ell(x, 0.001, 0, 0.0055, 0.0055, "#100806");
      ell(x, 0.0035, 0.002, 0.002, 0.002, "#ffffff");
      x.restore();
    }
    return;
  }
  if (kind === "dan" || kind === "laosheng") {
    faceBase(x, kind === "dan" ? "#f7e7dd" : "#efd2b8", cy);
    // 胭脂 rouge around the eyes
    const g = x.createRadialGradient(0, cy + 0.005, 0.005, 0, cy + 0.005, 0.085);
    g.addColorStop(0, kind === "dan" ? "rgba(232,96,120,0.85)" : "rgba(220,110,90,0.55)"); g.addColorStop(0.7, kind === "dan" ? "rgba(236,120,140,0.45)" : "rgba(220,120,100,0.2)"); g.addColorStop(1, "rgba(240,140,150,0)");
    x.save(); x.scale(1, 1.2); x.fillStyle = g; x.beginPath(); x.ellipse(0, (cy + 0.0) / 1.2, 0.075, 0.06, 0, 0, Math.PI * 2); x.fill(); x.restore();
    x.fillStyle = kind === "dan" ? "rgba(255,250,245,0.9)" : "rgba(255,240,220,0.5)";
    x.beginPath(); x.ellipse(0, cy - 0.005, 0.009, 0.03, 0, 0, Math.PI * 2); x.fill(); // highlighted nose bridge
    if (kind === "dan") {
      opEyes(x, cy + 0.012, 0.011, INK, 0.0015, 0.01, true); // 柳叶眉 + 丹凤眼
    } else {
      opEyes(x, cy + 0.012, 0.007, INK, 0.008, 0.018, false); // 剑眉 神采
    }
    line(x, [[-0.006, cy - 0.032], [0, cy - 0.036], [0.006, cy - 0.032]], 0.0025, shade("#a05040", 0));
    if (kind === "dan") { // small cherry lips, slight 含蓄 smile
      shape(x, [[-0.014, cy - 0.058], [-0.004, cy - 0.053], [0, cy - 0.055], [0.004, cy - 0.053], [0.014, cy - 0.058], [0.004, cy - 0.066], [0, cy - 0.068], [-0.004, cy - 0.066]], "#c8102e", 0.0015);
      ell(x, 0, cy - 0.058, 0.004, 0.002, "#f07080", 0);
    } else {
      line(x, [[-0.018, cy - 0.058], [0, cy - 0.062], [0.018, cy - 0.058]], 0.0045, "#8a2a20");
      // subtle philtrum shadow for 老生
      line(x, [[0, cy - 0.038], [0, cy - 0.052]], 0.002, shade("#a05040", -0.2));
    }
    return;
  }
  // villagers — 年画 folk faces (v44: clearer eyes, 含蓄 smile, readable age)
  const sk = skin;
  const child = kind === "child", elder = kind === "elder", woman = kind === "woman";
  const fw = (child ? 0.072 : 0.068) + r() * 0.014, fh = (child ? 0.09 : 0.086) + r() * 0.014;
  faceBase(x, sk, cy, fw, fh);
  // soft cheeks (stronger on child / woman)
  const blushR = child ? 0.032 : woman ? 0.028 : 0.024;
  const blush = x.createRadialGradient(0, 0, 0, 0, 0, blushR);
  blush.addColorStop(0, child || woman ? "rgba(230,110,100,0.65)" : "rgba(220,90,80,0.5)");
  blush.addColorStop(1, "rgba(220,90,80,0)");
  for (const s of [-1, 1]) { x.save(); x.translate(s * (child ? 0.038 : 0.042), cy - (child ? 0.022 : 0.03)); x.fillStyle = blush; x.beginPath(); x.arc(0, 0, blushR, 0, Math.PI * 2); x.fill(); x.restore(); }
  const smile = r() < 0.55; // 含蓄 — open eyes + slight mouth curve, not closed-eye cartoon grin
  const ey = cy + 0.004 + r() * 0.012, es = 0.028 + r() * 0.008, open = child ? 1.15 : 0.9 + r() * 0.25;
  for (const s of [-1, 1]) {
    folkEye(x, s * es, ey, open, child);
    if (smile) line(x, [[s * (es + 0.006), ey - 0.008], [s * es, ey - 0.011], [s * (es - 0.008), ey - 0.007]], 0.0022, shade(sk, -0.35)); // under-eye crescent
    const bt = (r() - 0.5) * 0.008;
    const bw = elder ? 0.0065 : child ? 0.0035 : woman ? 0.004 : 0.005;
    const bc = elder ? "#e8e4da" : INK;
    if (woman || child) {
      // soft 柳叶 brow
      path(x, [[s * 0.014, ey + 0.02], [s * 0.028, ey + 0.028 + bt], [s * 0.048, ey + 0.026 + bt * 0.5], [s * 0.03, ey + 0.022], [s * 0.016, ey + 0.016]]);
      x.fillStyle = bc; x.fill();
    } else {
      line(x, [[s * 0.014, ey + 0.02], [s * 0.03, ey + 0.03 + bt], [s * 0.052, ey + 0.027]], bw, bc);
    }
  }
  // nose
  line(x, [[-0.004, cy - 0.02], [0.004, cy - 0.028], [0.01, cy - 0.02]], 0.003, shade(sk, -0.4));
  if (elder) {
    for (const s of [-1, 1]) {
      line(x, [[s * 0.02, cy - 0.028], [s * 0.034, cy - 0.052]], 0.0028, shade(sk, -0.35)); // 法令纹
      line(x, [[s * 0.018, ey + 0.012], [s * 0.03, ey + 0.002]], 0.002, shade(sk, -0.28)); // brow-corner crease
      line(x, [[s * 0.01, cy - 0.012], [s * 0.022, cy - 0.02]], 0.0018, shade(sk, -0.25)); // 鼻翼纹
    }
    // forehead wrinkles
    for (const dy of [0.055, 0.068, 0.08]) line(x, [[-0.03, cy + dy], [0.03, cy + dy]], 0.0018, shade(sk, -0.22));
  } else if (r() < 0.28) for (const s of [-1, 1]) line(x, [[s * 0.022, cy - 0.03], [s * 0.032, cy - 0.05]], 0.0025, shade(sk, -0.3));
  if (r() < 0.22) ell(x, (r() - 0.5) * 0.08, cy - 0.01 - r() * 0.03, 0.004, 0.004, shade(sk, -0.5)); // 痣
  // mouth: 含蓄 smile curve or calm line
  if (child || smile || r() < 0.45) {
    const my = cy - (child ? 0.046 : 0.05);
    shape(x, [[-0.015, my], [0, my + 0.005], [0.015, my], [0, my - 0.01]], child ? "#c84840" : "#b23a30", 0.002);
  } else line(x, [[-0.016, cy - 0.05], [0, cy - (smile ? 0.056 : 0.053)], [0.016, cy - 0.05]], 0.004, "#7a3020");
  if (elder) { // white beard + moustache
    shape(x, [[-0.045, cy - 0.055], [0, cy - 0.065], [0.045, cy - 0.055], [0.03, cy - 0.13], [0, cy - 0.17], [-0.03, cy - 0.13]], "#efebe2", 0.0025, "#9a9488");
    line(x, [[-0.04, cy - 0.04], [-0.01, cy - 0.035], [0.01, cy - 0.035], [0.04, cy - 0.04]], 0.006, "#efebe2");
  } else if (kind === "villager" && r() < 0.35) line(x, [[-0.03, cy - 0.042], [-0.008, cy - 0.036], [0.008, cy - 0.036], [0.03, cy - 0.042]], 0.004, INK);
}

/* ------------------------------------------------------------------ actors */
export type ActorRole = "jing" | "dan" | "laosheng";
interface Rig { root: THREE.Group; turn: THREE.Group; body: THREE.Group; head: THREE.Group; arms: { s: number; up: THREE.Group; lo: THREE.Group }[]; extra: Record<string, Part>; }

function armPart(key: string, s: number, ppm: number, upLen: number, loLen: number, drawUp: Draw, drawLo: Draw, wUp: number, wLo: number): { up: THREE.Group; lo: THREE.Group } {
  const up = part(key + "u" + s, [-wUp, -upLen - 0.04, wUp, 0.06], ppm, drawUp);
  const lo = part(key + "l" + s, [-wLo, -loLen, wLo, 0.05], ppm, drawLo);
  up.g.position.z = 0.03; lo.g.position.set(0, -upLen, 0.004);
  up.g.add(lo.g);
  return { up: up.g, lo: lo.g };
}

function actorRig(role: ActorRole, _color: number): Rig {
  const P = low() ? 230 : 460;
  const root = new THREE.Group(), turn = new THREE.Group(), body = new THREE.Group();
  root.add(turn); turn.add(body); root.add(contactShadow());
  const extra: Record<string, Part> = {};
  const skin = role === "dan" ? "#f7e7dd" : "#efd2b8";
  const robeCol = role === "jing" ? "#2f6a40" : role === "dan" ? "#9cc6cf" : "#9e1b22";
  const sY = 1.42; // shoulder height
  // ---------- torso / robe
  const robeHalf: P2[] = role === "dan"
    ? [[0.05, 1.47], [0.16, 1.43], [0.2, 1.33], [0.19, 1.0], [0.21, 0.6], [0.27, 0.12], [0.12, 0.1], [0, 0.1]]
    : [[0.06, 1.48], [0.2, 1.44], [0.24, 1.32], [0.235, 1.0], [0.28, 0.55], [0.34, 0.13], [0.17, 0.11], [0, 0.12]];
  const robe = part("robe-" + role, [-0.46, -0.01, 0.46, 1.54], P, (x, back) => {
    // boots 厚底靴 / 彩鞋
    for (const s of [-1, 1]) {
      if (role === "dan") { shape(x, [[s * 0.05, 0.0], [s * 0.12, 0.0], [s * 0.13, 0.04], [s * 0.06, 0.06]], "#d0506a", 0.003); }
      else { x.fillStyle = "#f2eee4"; x.fillRect(s * 0.085 - 0.055, 0, 0.11, 0.06); x.strokeStyle = INK; x.lineWidth = 0.003; x.strokeRect(s * 0.085 - 0.055, 0, 0.11, 0.06); x.fillStyle = "#14100e"; x.fillRect(s * 0.085 - 0.05, 0.06, 0.1, 0.08); }
    }
    const pts = sym(robeHalf);
    shape(x, pts, hgrad(x, -0.34, 0.34, robeCol), 0);
    x.save(); path(x, pts); x.clip();
    if (role === "jing") {
      // 靠: fish-scale armour on chest, 护心镜, 靠肚 tiger plate, two 靠腿 flaps
      scales(x, -0.26, 0.26, 1.02, 1.42, GOLD, 0.02);
      if (!back) {
        ell(x, 0, 1.25, 0.06, 0.06, "#cfd6d8", 0.005, GOLD_D); ell(x, 0, 1.25, 0.035, 0.035, null, 0.003, "#8a9496");
        shape(x, [[-0.2, 1.0], [0.2, 1.0], [0.22, 0.86], [0.12, 0.74], [-0.12, 0.74], [-0.22, 0.86]], "#b0302a", 0.005, GOLD);
        cloud(x, -0.06, 0.88, 0.022, GOLD); cloud(x, 0.07, 0.86, 0.022, GOLD);
        for (const s of [-1, 1]) {
          const fl: P2[] = [[s * 0.02, 0.76], [s * 0.2, 0.76], [s * 0.25, 0.24], [s * 0.15, 0.18], [s * 0.02, 0.22]];
          shape(x, fl, shade(robeCol, 0.08), 0.005, GOLD);
          x.save(); path(x, fl); x.clip(); scales(x, s > 0 ? 0 : -0.26, s > 0 ? 0.26 : 0, 0.3, 0.74, GOLD, 0.02); x.restore();
          for (let k = 0; k < 9; k++) line(x, [[s * (0.03 + k * 0.025), 0.22 - (k % 2) * 0.01], [s * (0.03 + k * 0.025), 0.15]], 0.006, k % 2 ? "#d84030" : "#f0c040"); // fringe
        }
      }
      seaCliff(x, -0.36, 0.36, 0.1, 0.2, ["#2f5aa8", "#e8e2d0", "#3a8a5a", "#c8a030"]);
    } else if (role === "dan") {
      // 青衣褶子: plain 湖蓝, embroidered 折枝花 border + white 护领
      if (!back) {
        x.strokeStyle = "#f2f6f6"; x.lineWidth = 0.022; line(x, [[-0.05, 1.47], [0.06, 1.25], [0.12, 0.98], [0.14, 0.1]], 0.026, "#e8f0f0");
        line(x, [[-0.05, 1.47], [0.06, 1.25], [0.12, 0.98], [0.14, 0.1]], 0.004, "#5a8a96");
        for (let k = 0; k < 7; k++) { const yy = 0.25 + k * 0.17; const xx = 0.16 + (k % 2) * 0.03;
          for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; ell(x, xx + Math.cos(a) * 0.011, yy + Math.sin(a) * 0.011, 0.008, 0.008, "#e8a0b8", 0.0015, "#b05070"); }
          ell(x, xx, yy, 0.005, 0.005, "#f0d060"); line(x, [[xx - 0.01, yy - 0.012], [xx - 0.04, yy - 0.05]], 0.003, "#5a8a50");
        }
      }
      folds(x, [-0.12, -0.05, 0.03, 0.09, 0.18], 0.95, 0.12, "#3a6a76");
      // 腰包/飘带
      x.fillStyle = "#f0e8f0"; x.fillRect(-0.2, 0.88, 0.4, 0.05);
      if (!back) { line(x, [[0.02, 0.9], [0.03, 0.6], [0.05, 0.35]], 0.016, "#e090a8"); line(x, [[-0.02, 0.9], [-0.04, 0.62], [-0.03, 0.4]], 0.016, "#e090a8"); }
    } else {
      // 蟒袍 with 团龙, 祥云, 海水江崖
      for (let k = 0; k < 14; k++) cloud(x, -0.25 + ((k * 0.37) % 0.5), 0.45 + ((k * 0.61) % 0.9), 0.014, shade(GOLD, -0.1), 0.0035);
      if (!back) {
        ell(x, 0, 1.18, 0.11, 0.11, shade(robeCol, -0.15), 0.006, GOLD);
        // stylised 团龙: coiled body + head
        x.strokeStyle = GOLD; x.lineWidth = 0.012; x.beginPath();
        for (let a = 0; a < Math.PI * 3.4; a += 0.1) { const rr = 0.085 - a * 0.007; x.lineTo(Math.cos(a) * rr, 1.18 + Math.sin(a) * rr); } x.stroke();
        x.lineWidth = 0.003; x.strokeStyle = GOLD_D; for (let a = 0.3; a < Math.PI * 3.2; a += 0.35) { const rr = 0.085 - a * 0.007; ell(x, Math.cos(a) * rr, 1.18 + Math.sin(a) * rr, 0.003, 0.003, GOLD_D); }
        ell(x, 0.0, 1.2, 0.022, 0.017, GOLD, 0.003, GOLD_D); ell(x, 0.012, 1.205, 0.004, 0.004, "#c02020");
      }
      seaCliff(x, -0.36, 0.36, 0.11, 0.3, ["#2a5aa0", "#e8e2d0", "#3a8a5a", "#c89030", "#b02a40"]);
      folds(x, [-0.18, -0.08, 0.08, 0.18], 0.95, 0.32, shade(robeCol, -0.5));
    }
    x.restore();
    path(x, pts); x.lineWidth = 0.006; x.strokeStyle = INK; x.stroke();
    if (role !== "dan" && !back) {
      // 团领 round collar + white 护领
      shape(x, [[-0.075, 1.47], [-0.06, 1.4], [0, 1.37], [0.06, 1.4], [0.075, 1.47], [0, 1.44]], "#f2eee4", 0.003);
      line(x, [[-0.09, 1.48], [-0.07, 1.38], [0, 1.34], [0.07, 1.38], [0.09, 1.48]], 0.01, role === "jing" ? GOLD : shade(robeCol, -0.4));
    }
    if (role !== "dan") {
      // 玉带 jade belt hooped wide of the body
      shape(x, [[-0.33, 0.97], [0, 0.94], [0.33, 0.97], [0.33, 0.92], [0, 0.89], [-0.33, 0.92]], "#d9b04a", 0.004, GOLD_D);
      if (!back) for (let k = -3; k <= 3; k++) { x.fillStyle = "#7ac0a0"; x.fillRect(k * 0.085 - 0.018, 0.905 + Math.abs(k) * 0.004, 0.036, 0.05 - 0.012); x.strokeStyle = GOLD_D; x.lineWidth = 0.002; x.strokeRect(k * 0.085 - 0.018, 0.905 + Math.abs(k) * 0.004, 0.036, 0.038); }
    }
  });
  body.add(robe.g);

  // ---------- back pieces
  if (role === "jing") { // 靠旗 four flags
    const flagCol = robeCol;
    for (let k = 0; k < 4; k++) {
      const s = k < 2 ? -1 : 1, hi = k % 2;
      const f = part("flag", [-0.02, 0, 0.36, 0.98], P * 0.7, (x) => {
        x.fillStyle = GOLD; x.fillRect(-0.008, 0, 0.016, 0.96); ell(x, 0, 0.96, 0.02, 0.02, "#e03028", 0.003);
        const tri: P2[] = [[0.01, 0.93], [0.3, 0.9], [0.01, 0.44]];
        x.beginPath(); x.moveTo(0.01, 0.94); x.lineTo(0.33, 0.92);
        for (let t = 0; t <= 1; t += 0.05) { const px = 0.33 - t * 0.32, py = 0.92 - t * 0.48; const fl = Math.sin(t * Math.PI * 10) * 0.018; x.lineTo(px + 0.02 + fl, py - 0.01 - fl * 0.5); }
        x.lineTo(0.01, 0.44); x.closePath(); x.fillStyle = "#e05a20"; x.fill(); x.strokeStyle = INK; x.lineWidth = 0.004; x.stroke(); // flame border
        shape(x, tri, flagCol, 0.004, GOLD);
        x.save(); path(x, tri); x.clip(); cloud(x, 0.08, 0.82, 0.02, GOLD); cloud(x, 0.06, 0.65, 0.016, GOLD); scales(x, 0, 0.3, 0.44, 0.93, shade(GOLD, -0.2), 0.016); x.restore();
      }, { back: false, seg: [6, 10] });
      f.g.position.set(s * 0.05, 1.18, -0.09);
      f.g.rotation.z = -s * (0.45 + hi * 0.4);
      f.g.scale.x = s;
      extra["flag" + k] = f; body.add(f.g);
    }
  }
  if (role === "dan") { // 线尾子 long back hair
    const hair = part("danhair", [-0.12, -0.75, 0.12, 0.05], P * 0.6, (x) => {
      shape(x, [[-0.07, 0.04], [0.07, 0.04], [0.09, -0.3], [0.06, -0.72], [0.0, -0.74], [-0.06, -0.72], [-0.09, -0.3]], "#0e0b0c", 0.004, "#3a3036");
      x.strokeStyle = "rgba(120,110,130,0.5)"; x.lineWidth = 0.003; for (let k = -3; k <= 3; k++) line(x, [[k * 0.015, 0.0], [k * 0.02, -0.4], [k * 0.017, -0.7]], 0.003, "rgba(120,110,130,0.5)");
    }, { back: false, seg: [2, 8] });
    hair.g.position.set(0, 1.62, -0.04); extra.hair = hair; body.add(hair.g);
  }

  // ---------- head
  const head = new THREE.Group(); head.position.set(0, 1.46, 0.012); body.add(head);
  const cy = 0.13;
  const hp = part("head-" + role, [-0.32, -0.08, 0.32, 0.5], P * 1.25, (x, back) => {
    if (back) {
      if (role === "dan") { ell(x, 0, cy + 0.01, 0.085, 0.105, "#0e0b0c"); }
      else ell(x, 0, cy, 0.084, 0.1, role === "jing" ? "#c8302a" : "#efd2b8", 0.003);
    } else paintFace(x, role, skin, cy, 3);
    if (role === "jing") { // 帅盔: gold dome, red 绒球, side flaps
      shape(x, [[-0.1, cy + 0.07], [-0.095, cy + 0.17], [-0.05, cy + 0.24], [0, cy + 0.26], [0.05, cy + 0.24], [0.095, cy + 0.17], [0.1, cy + 0.07], [0, cy + 0.085]], GOLD, 0.005);
      x.save(); path(x, [[-0.1, cy + 0.07], [-0.095, cy + 0.17], [0, cy + 0.26], [0.095, cy + 0.17], [0.1, cy + 0.07]]); x.clip(); scales(x, -0.1, 0.1, cy + 0.08, cy + 0.26, GOLD_D, 0.012); x.restore();
      line(x, [[-0.1, cy + 0.08], [0, cy + 0.095], [0.1, cy + 0.08]], 0.012, "#c02a20");
      for (const s of [-1, 1]) { shape(x, [[s * 0.1, cy + 0.08], [s * 0.15, cy + 0.06], [s * 0.15, cy - 0.06], [s * 0.1, cy - 0.04]], GOLD, 0.004); ell(x, s * 0.125, cy + 0.0, 0.016, 0.016, "#e8e8ee", 0.002); }
      for (const [px, py, rr] of [[0, cy + 0.29, 0.03], [-0.06, cy + 0.25, 0.022], [0.06, cy + 0.25, 0.022], [-0.11, cy + 0.17, 0.02], [0.11, cy + 0.17, 0.02], [0, cy + 0.12, 0.022]] as const) {
        const g = x.createRadialGradient(px - rr * 0.3, py + rr * 0.3, rr * 0.1, px, py, rr); g.addColorStop(0, "#ff7a6a"); g.addColorStop(1, "#b0141a"); ell(x, px, py, rr, rr, g, 0.0025);
      }
      ell(x, 0, cy + 0.33, 0.012, 0.03, GOLD, 0.003); // 顶 spike
      if (!back) { // 扎髯 short red beard below face? keep mouth patch visible: none
      }
    } else if (role === "dan") { // 大头 + 点翠头面 + 贴片
      shape(x, [[-0.085, cy + 0.05], [-0.07, cy + 0.12], [0, cy + 0.15], [0.07, cy + 0.12], [0.085, cy + 0.05], [0.05, cy + 0.075], [0, cy + 0.08], [-0.05, cy + 0.075]], "#0e0b0c", 0.003);
      if (!back) {
        for (let k = -4; k <= 4; k++) { x.beginPath(); x.arc(k * 0.016, cy + 0.07 - Math.abs(k) * 0.004, 0.009, Math.PI * 1.05, Math.PI * 2.0); x.fillStyle = "#0e0b0c"; x.fill(); } // 小弯
        for (const s of [-1, 1]) shape(x, [[s * 0.075, cy + 0.06], [s * 0.088, cy - 0.02], [s * 0.072, cy - 0.08], [s * 0.064, cy - 0.02], [s * 0.066, cy + 0.04]], "#0e0b0c", 0); // 大柳
      }
      for (let k = -3; k <= 3; k++) { ell(x, k * 0.026, cy + 0.13 - Math.abs(k) * 0.008, 0.009, 0.009, "#f4f4f8", 0.002, "#8890a0"); } // 泡子 pearls
      for (const [px, py, rr] of [[0, cy + 0.17, 0.028], [-0.08, cy + 0.13, 0.022], [0.08, cy + 0.13, 0.022], [-0.11, cy + 0.06, 0.016], [0.11, cy + 0.06, 0.016]] as const) { // 点翠 flowers
        for (let p = 0; p < 6; p++) { const a = (p / 6) * Math.PI * 2; ell(x, px + Math.cos(a) * rr * 0.6, py + Math.sin(a) * rr * 0.6, rr * 0.45, rr * 0.45, "#2a7ab0", 0.0015, "#163a60"); }
        ell(x, px, py, rr * 0.35, rr * 0.35, "#f0d8e0", 0.0015);
      }
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) ell(x, s * (0.1 + k * 0.004), cy + 0.02 - k * 0.028, 0.006, 0.006, "#f4f4f8", 0.0015, "#8890a0"); // 流苏
    } else { // 纱帽 black gauze hat
      shape(x, [[-0.09, cy + 0.07], [-0.085, cy + 0.15], [-0.05, cy + 0.17], [-0.045, cy + 0.22], [0, cy + 0.245], [0.045, cy + 0.22], [0.05, cy + 0.17], [0.085, cy + 0.15], [0.09, cy + 0.07], [0, cy + 0.085]], "#18161a", 0.004, "#4a4650");
      line(x, [[-0.09, cy + 0.08], [0, cy + 0.095], [0.09, cy + 0.08]], 0.008, GOLD);
      ell(x, 0, cy + 0.13, 0.016, 0.016, "#7ac0a0", 0.003, GOLD);
    }
  });
  head.add(hp.g);
  if (role === "jing") for (const s of [-1, 1]) { // 翎子 pheasant plumes
    const l = part("lingzi", [-0.03, -0.02, 0.6, 1.25], P * 0.55, (x) => {
      x.strokeStyle = "#6a4a2a"; x.lineWidth = 0.012; path(x, [[0, 0], [0.08, 0.4], [0.25, 0.85], [0.52, 1.18]], false); x.stroke();
      for (let t = 0.05; t < 0.98; t += 0.035) { const px = 0.52 * t * t + 0.08 * t, py = 1.18 * t; const bandC = Math.floor(t * 14) % 2 ? "#e8d8b0" : "#5a3a1e"; line(x, [[px - 0.012, py - 0.006], [px + 0.012, py + 0.006]], 0.016, bandC); }
    }, { back: false, seg: [1, 10] });
    l.g.position.set(s * 0.05, cy + 0.27, -0.01); l.g.scale.x = s; extra["ling" + s] = l; head.add(l.g);
  }
  if (role === "laosheng") {
    const beard = part("rankou", [-0.09, -0.48, 0.09, 0.02], P * 0.8, (x) => { // 三绺髯
      x.fillStyle = "#151214";
      for (const [ox, len, w] of [[0, 0.46, 0.03], [-0.045, 0.36, 0.024], [0.045, 0.36, 0.024]] as const) { x.beginPath(); x.moveTo(ox - w, 0); x.quadraticCurveTo(ox - w * 1.2, -len * 0.5, ox, -len); x.quadraticCurveTo(ox + w * 1.2, -len * 0.5, ox + w, 0); x.fill(); }
      x.strokeStyle = "rgba(140,130,140,0.6)"; x.lineWidth = 0.0025; for (let k = -6; k <= 6; k++) line(x, [[k * 0.006, -0.01], [k * 0.005, -0.25], [k * 0.002, -0.42]], 0.0025, "rgba(140,130,140,0.5)");
      line(x, [[-0.06, 0.0], [0.06, 0.0]], 0.006, "#151214");
    }, { back: false, seg: [1, 6] });
    beard.g.position.set(0, cy - 0.045, 0.012); extra.beard = beard; head.add(beard.g);
    for (const s of [-1, 1]) { // 帽翅
      const w = part("chi", [-0.01, -0.06, 0.24, 0.06], P * 0.7, (x) => { x.fillStyle = "#18161a"; x.fillRect(0, -0.004, 0.08, 0.008); ell(x, 0.16, 0, 0.075, 0.045, "#1c1a20", 0.004, GOLD); ell(x, 0.16, 0, 0.05, 0.028, null, 0.002, "#5a5660"); }, { back: false });
      w.g.position.set(s * 0.05, cy + 0.19, -0.005); w.g.scale.x = s; extra["chi" + s] = w; head.add(w.g);
    }
  }

  // ---------- arms
  const arms: Rig["arms"] = [];
  for (const s of [-1, 1]) {
    const upLen = 0.3, loLen = role === "jing" ? 0.34 : 0.42;
    const a = armPart("arm-" + role, s, P, upLen, loLen,
      (x) => {
        if (role === "jing") { // 靠 shoulder plate with 兽面
          shape(x, [[-0.06, 0.05], [0.07, 0.05], [0.075, -0.2], [0.05, -0.34], [-0.05, -0.34], [-0.07, -0.2]], robeCol, 0.005);
          x.save(); path(x, [[-0.06, 0.05], [0.07, 0.05], [0.075, -0.2], [0.05, -0.34], [-0.05, -0.34], [-0.07, -0.2]]); x.clip(); scales(x, -0.08, 0.08, -0.34, 0.05, GOLD, 0.016); x.restore();
          shape(x, [[-0.09, 0.05], [0.09, 0.05], [0.1, -0.06], [0, -0.1], [-0.1, -0.06]], GOLD, 0.005, GOLD_D);
          ell(x, -0.03, -0.02, 0.012, 0.012, "#b0141a"); ell(x, 0.03, -0.02, 0.012, 0.012, "#b0141a");
        } else {
          const c = robeCol; shape(x, [[-0.065, 0.05], [0.065, 0.05], [0.075, -0.32], [-0.075, -0.32]], hgrad(x, -0.075, 0.075, c), 0.005);
          if (role === "laosheng") { cloud(x, 0, -0.12, 0.014, shade(GOLD, -0.1), 0.0035); }
        }
      },
      (x) => {
        if (role === "jing") { // 箭袖 + 马蹄袖 + fist
          shape(x, [[-0.055, 0.04], [0.055, 0.04], [0.05, -0.26], [-0.05, -0.26]], hgrad(x, -0.055, 0.055, "#b0302a"), 0.005);
          shape(x, [[-0.06, -0.24], [0.065, -0.24], [0.07, -0.29], [-0.05, -0.3]], "#2a3a6a", 0.004, GOLD);
          hand(x, 0, -0.32, s, skin === "#f7e7dd" ? skin : "#e8c4a0", "fist", 1.1);
        } else { // wide hanging sleeve
          const c = robeCol, flare = role === "dan" ? 0.15 : 0.17;
          const sl: P2[] = [[-0.07, 0.04], [0.07, 0.04], [0.09 + flare * 0.5, -0.22], [0.1 + flare * 0.6, -0.36], [-0.06, -0.38], [-0.075, -0.2]];
          shape(x, sl, hgrad(x, -0.08, 0.2, c), 0.005);
          x.save(); path(x, sl); x.clip(); folds(x, [0.02, 0.07, 0.12], 0.0, -0.38, shade(c, -0.5)); if (role === "laosheng") seaCliff(x, -0.1, 0.25, -0.38, -0.3, ["#2a5aa0", "#e8e2d0", "#3a8a5a", "#c89030"]); x.restore();
          if (role === "laosheng") hand(x, 0.02, -0.41, s, skin, "open", 1.0);
        }
      }, 0.12, role === "jing" ? 0.1 : 0.3);
    a.up.position.set(s * 0.19, sY, 0.06);
    a.up.scale.x = s;
    body.add(a.up);
    arms.push({ s, up: a.up, lo: a.lo });
    if (role !== "jing") { // 水袖 silk
      const len = role === "dan" ? 0.7 : 0.38;
      const w = part("shuixiu-" + role, [-0.09, -len, 0.12, 0.02], P * 0.6, (x) => {
        const sh: P2[] = [[-0.06, 0.0], [0.1, 0.0], [0.11, -len * 0.5], [0.09, -len], [-0.07, -len], [-0.065, -len * 0.5]];
        const g = x.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, "#fbfbf6"); g.addColorStop(1, "#eef0ee");
        shape(x, sh, g, 0.003, "#9aa0a0");
        x.save(); x.globalAlpha = 0.25; for (let k = 0; k < 5; k++) line(x, [[-0.04 + k * 0.03, -0.01], [-0.045 + k * 0.032, -len * 0.5], [-0.05 + k * 0.034, -len + 0.01]], 0.004, "#a0a8a8"); x.restore();
      }, { back: false, seg: [2, 14] });
      w.g.position.set(0.02, role === "dan" ? -0.36 : -0.4, 0.018);
      a.lo.add(w.g); extra["xiu" + s] = w;
    }
  }
  return { root, turn, body, head, arms, extra };
}

function faceCam(rig: { root: THREE.Group; turn: THREE.Group }, maxYaw: number): void {
  if (!CAM) return;
  const camW = CAM.getWorldPosition(new THREE.Vector3());
  const v = rig.root.worldToLocal(camW.clone());
  let yaw = Math.atan2(v.x, v.z);
  if (Math.abs(yaw) > Math.PI * 0.75) yaw = yaw - Math.sign(yaw) * Math.PI;
  yaw = Math.max(-maxYaw, Math.min(maxYaw, yaw)); // v51: clamp — crowd keeps stage facing, slight peek to cam
  let d = yaw - rig.turn.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  rig.turn.rotation.y += d * 0.22; // v50: snappier face-cam so oblique 看戏 still shows faces
  const rootW = rig.root.getWorldPosition(new THREE.Vector3());
  const dx = camW.x - rootW.x, dy = camW.y - rootW.y, dz = camW.z - rootW.z;
  const elev = Math.atan2(dy, Math.hypot(dx, dz)); // 0 horizon … ~1.4 nadir
  // v39b: NEVER tip flat (elev*0.92→1.15 laid figures on the ground = beige slabs).
  // Hide board tops only near nadir (birdseye); mid-high/side keep dark cardboard edge.
  // Soft lean ≤0.34 so 工笔 faces stay readable without tipping flat.
  const hi = elev > 0.55; // v50b: keep cardboard edge on mid/oblique; hide only near nadir
  if ((rig as { _edgeHide?: boolean })._edgeHide !== hi) {
    (rig as { _edgeHide?: boolean })._edgeHide = hi;
    rig.root.traverse((o) => { if (o.userData?.paperEdge) o.visible = !hi; });
  }
  // soft lean only — hard cap so birdseye/nadir stays upright billboards
  // v52: watching crowd — no elev lean (feet stay planted); others soft lean
  const watching = !!(rig.root.userData && rig.root.userData.watching);
  const lean = watching ? 0 : Math.min(0.2, Math.max(0, (elev - 0.22) * 0.32));
  rig.turn.rotation.x += (lean - (watching ? 0 : rig.turn.rotation.x)) * (watching ? 0.35 : 0.22);
}

const sm = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

/** keep 水袖 hanging toward the ground: cancel the arm's rotation inside the forearm frame, lagged */
function hang(a: { s: number; up: THREE.Group; lo: THREE.Group }, p: Part, up: number, lo: number, swing: number): void {
  const target = -(up + lo) * 0.92 + swing;
  p.g.rotation.z += (target - p.g.rotation.z) * 0.18;
  void a;
}

export function makeOperaActor(color: number, seed: number, scale: number): THREE.Group {
  const role: ActorRole = (["jing", "laosheng", "dan"] as const)[seed % 3];
  const rig = actorRig(role, color);
  const { root, body, head, arms, extra } = rig;
  root.scale.setScalar(scale);
  const [A, B] = arms; // A = screen-left (s=-1), B = screen-right
  const set = (a: typeof A, up: number, lo: number) => { a.up.rotation.z = a.s * up; a.lo.rotation.z = lo; };
  const anim = (t: number) => {
    faceCam(rig, 0.5);
    if (role === "jing") { // 起霸 → 亮相 → 云手, 6 s
      const c = (t % 6) / 6;
      const raise = sm(0.05, 0.25, c) * (1 - sm(0.8, 0.98, c));
      const yun = Math.sin(sm(0.5, 0.8, c) * Math.PI * 2);
      set(A, raise * 1.5 + yun * 0.35, raise * 0.9 - yun * 0.3);
      set(B, raise * 1.1 - yun * 0.2, raise * 1.6);
      const tremble = c > 0.28 && c < 0.48 ? Math.sin(t * 40) * 0.04 : 0;
      head.rotation.z = tremble + raise * 0.06;
      body.rotation.z = Math.sin(c * Math.PI * 2) * 0.04;
      body.position.y = -sm(0.25, 0.3, c) * (1 - sm(0.45, 0.5, c)) * 0.04; // 亮相 stamp
      for (let k = 0; k < 4; k++) { const f = extra["flag" + k]; f.g.rotation.x = Math.sin(t * 2 + k) * 0.05; flow(f, (x, y) => [0, Math.sin(t * 4 - y * 5 + k) * 0.02 * x * 4]); }
      for (const s of [-1, 1]) { const l = extra["ling" + s]; l.g.rotation.z = Math.sin(t * 1.6 + s) * 0.08 - head.rotation.z * 2; flow(l, (_x, y) => [Math.sin(t * 2.5 - y * 3) * 0.025 * y, 0]); }
    } else if (role === "dan") { // 甩袖 · 圆场, 8 s
      const c = (t % 8) / 8;
      const throwUp = sm(0.15, 0.3, c) * (1 - sm(0.45, 0.6, c));
      set(B, 0.2 + throwUp * 1.1, 0.2 + throwUp * 0.6);
      set(A, -0.45 - Math.sin(t * 0.8) * 0.08, -1.2); // hand held at the chest
      body.position.x = Math.sin(c * Math.PI * 2) * 0.06;
      body.rotation.z = Math.sin(c * Math.PI * 2 + 0.5) * 0.035;
      head.rotation.z = 0.08 + Math.sin(t * 0.9) * 0.05;
      const fl = Math.sin(sm(0.28, 0.5, c) * Math.PI);
      hang(B, extra.xiu1, 0.2 + throwUp * 1.1, 0.2 + throwUp * 0.6, fl * 1.1 + Math.sin(t * 1.7) * 0.08);
      hang(A, extra["xiu-1"], -0.45, -1.2, Math.sin(t * 1.3) * 0.06);
      flow(extra["xiu1"], (_x, y) => [Math.sin(t * 3 + y * 6) * 0.03 * -y * (0.4 + fl), Math.cos(t * 2.4 + y * 5) * 0.03 * -y]);
      flow(extra["xiu-1"], (_x, y) => [Math.sin(t * 2 + y * 5) * 0.02 * -y, 0]);
      extra.hair.g.rotation.z = -body.rotation.z * 1.5;
      flow(extra.hair, (_x, y) => [Math.sin(t * 1.5 + y * 3) * 0.02 * -y, 0]);
    } else { // 老生 · 捋髯 / 踱方步 / 帽翅功, 7 s
      const c = (t % 7) / 7;
      const stroke = sm(0.1, 0.25, c) * (1 - sm(0.6, 0.75, c));
      const slide = Math.sin(Math.max(0, c - 0.25) * 18) * 0.12 * stroke;
      set(B, -(0.55 * stroke), -(1.9 * stroke) + slide + 0.1);
      set(A, 0.35 + Math.sin(t * 0.7) * 0.05, 0.35);
      head.position.y = 1.46 + Math.sin(c * Math.PI * 6) * 0.006 * (1 - stroke);
      head.rotation.z = Math.sin(t * 0.6) * 0.04;
      body.rotation.z = Math.sin(c * Math.PI * 4) * 0.02;
      const wing = c > 0.78 && c < 0.96 ? Math.sin(t * 22) * 0.35 : Math.sin(t * 2) * 0.04;
      extra["chi-1"].g.rotation.z = wing; extra.chi1.g.rotation.z = -wing;
      extra.beard.g.rotation.z = -head.rotation.z * 0.8 + Math.sin(t * 1.3) * 0.03;
      flow(extra.beard, (_x, y) => [Math.sin(t * 1.7 + y * 6) * 0.015 * -y, 0]);
      hang(B, extra.xiu1, -(0.55 * stroke), -(1.9 * stroke) + slide + 0.1, Math.sin(t * 1.4) * 0.05);
      hang(A, extra["xiu-1"], 0.35 + Math.sin(t * 0.7) * 0.05, 0.35, Math.sin(t * 1.1) * 0.05);
      flow(extra["xiu-1"], (_x, y) => [Math.sin(t * 2 + y * 6) * 0.02 * -y, 0]);
      flow(extra.xiu1, (_x, y) => [Math.sin(t * 2.3 + y * 6) * 0.02 * -y, 0]);
    }
  };
  anim(0);
  root.userData.anim = anim;
  return root;
}

/* ------------------------------------------------------------------ villagers */
type VType = "gown" | "jacket" | "farmer" | "woman" | "elder" | "child";
const SKINS = ["#efcfae", "#e4bc96", "#f2d6ba", "#d8a982"];
const CLOTH = ["#3f5f86", "#5a6e78", "#7a4a38", "#4a6a56", "#8a6a42", "#6a5a7a", "#9a3a32", "#46505a", "#7a7f5a"];
const WOMAN = ["#c85a6a", "#d88a50", "#5a8aa0", "#8a5a8a", "#6a9a7a", "#b84a3a"];

export function makeVillager(color: number, seed: number, scale: number, watching = false): THREE.Group {
  const r = rng(seed * 13 + 5);
  const types: VType[] = ["gown", "jacket", "farmer", "woman", "elder", "woman", "child", "jacket", "gown", "woman"];
  const type = types[seed % types.length];
  const P = low() ? 150 : 300;
  const skin = SKINS[seed % 4];
  const main = type === "woman" ? WOMAN[seed % WOMAN.length] : type === "farmer" ? ["#6a7a8a", "#3a4a5a", "#8a7a60"][seed % 3] : "#" + new THREE.Color(color).getHexString();
  const sec = type === "woman" ? ["#2a3a5a", "#3a4a3a", "#5a2a3a", "#2a2a30"][seed % 4] : CLOTH[(seed * 5) % CLOTH.length];
  const trim = type === "woman" ? ["#f0d070", "#e8e0d0", "#2a3a6a"][seed % 3] : "#2a2420";
  const hatKind = type === "farmer" ? "douli" : type === "elder" ? (r() < 0.5 ? "cap" : "none") : type === "gown" || type === "jacket" ? (r() < 0.55 ? "cap" : r() < 0.5 ? "felt" : "none") : "none";
  const root = new THREE.Group(), turn = new THREE.Group(), body = new THREE.Group();
  root.add(turn); turn.add(body); root.add(contactShadow());
  const key = `v${seed}`;
  const sY = 1.33;
  const robe = part(key + "b", [-0.36, -0.01, 0.36, 1.44], P, (x, back) => {
    // shoes
    for (const s of [-1, 1]) shape(x, [[s * 0.03, 0], [s * 0.12, 0], [s * 0.12, 0.04], [s * 0.04, 0.05]], type === "farmer" ? "#c8a868" : "#1c1814", 0.003);
    const legs = type === "farmer" || type === "child" || (type === "woman" && seed % 3 === 0);
    if (legs) for (const s of [-1, 1]) { shape(x, [[s * 0.02, 0.62], [s * 0.13, 0.62], [s * 0.115, 0.05], [s * 0.04, 0.05]], hgrad(x, s * 0.02, s * 0.13, sec), 0.004); if (type === "farmer") line(x, [[s * 0.03, 0.2], [s * 0.12, 0.2]], 0.006, "#e8e0d0"); }
    const long: P2[] = [[0.05, 1.4], [0.16, 1.36], [0.19, 1.25], [0.18, 0.9], [0.21, 0.4], [0.24, 0.06], [0.1, 0.05], [0, 0.05]];
    const shortJ: P2[] = [[0.05, 1.4], [0.16, 1.36], [0.19, 1.25], [0.185, 0.9], [0.2, 0.62], [0.1, 0.6], [0, 0.6]];
    const skirt: P2[] = [[0.15, 0.75], [0.2, 0.4], [0.23, 0.06], [0, 0.05]];
    if (type === "woman" && !legs) { // pleated 马面裙
      const sk = sym(skirt); shape(x, sk, hgrad(x, -0.23, 0.23, sec), 0.005);
      x.save(); path(x, sk); x.clip(); for (let k = -6; k <= 6; k++) line(x, [[k * 0.02, 0.75], [k * 0.034, 0.05]], 0.003, shade(sec, -0.4)); if (!back) { x.fillStyle = trim; x.fillRect(-0.06, 0.05, 0.12, 0.7); cloud(x, 0, 0.2, 0.014, shade(trim, -0.3)); } x.fillStyle = shade(trim, -0.1); x.fillRect(-0.25, 0.05, 0.5, 0.035); x.restore();
    }
    const top = sym(type === "gown" || type === "elder" ? long : type === "woman" ? [[0.05, 1.4], [0.16, 1.36], [0.19, 1.25], [0.19, 0.9], [0.23, 0.68], [0.1, 0.64], [0, 0.65]] : shortJ);
    shape(x, top, hgrad(x, -0.22, 0.22, main), 0);
    x.save(); path(x, top); x.clip();
    folds(x, [-0.12, -0.04, 0.06, 0.13], 1.0, 0.1, shade(main, -0.5));
    folds(x, [-0.1, -0.02, 0.08, 0.15], 0.95, 0.12, shade(main, 0.35));
    if (type === "gown" || type === "elder" || type === "woman") { // 暗花 团花 woven pattern
      x.save(); x.globalAlpha = 0.18;
      for (let row = 0; row < 9; row++) for (let k = -2; k <= 2; k++) { const px = k * 0.09 + (row % 2) * 0.045, py = 0.2 + row * 0.13; ell(x, px, py, 0.025, 0.025, null, 0.004, shade(main, 0.6)); cloud(x, px, py, 0.008, shade(main, 0.6), 0.003); }
      x.restore();
    }
    { const sh = x.createLinearGradient(-0.22, 0, 0.22, 0); sh.addColorStop(0, "rgba(0,0,0,0.25)"); sh.addColorStop(0.4, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.3)"); x.fillStyle = sh; x.fillRect(-0.3, 0, 0.6, 1.45); }
    if (!back) {
      if (type === "woman") { // 大襟 curved front edge with contrasting 镶滚 trim
        line(x, [[-0.04, 1.4], [0.04, 1.33], [0.12, 1.26], [0.15, 1.0], [0.17, 0.66]], 0.018, trim);
        line(x, [[-0.22, 0.67], [0, 0.65], [0.22, 0.67]], 0.02, trim);
        if (seed % 2) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ell(x, -0.08 + Math.cos(a) * 0.012, 1.0 + Math.sin(a) * 0.012, 0.009, 0.009, shade(trim, 0.2), 0.0015); }
      } else { // 大襟 + 盘扣
        line(x, [[-0.04, 1.4], [0.06, 1.32], [0.12, 1.26], [0.13, 0.8]], 0.004, shade(main, -0.55));
        for (let k = 0; k < 4; k++) { ell(x, 0.12, 1.22 - k * 0.09, 0.008, 0.005, trim, 0.0015); line(x, [[0.105, 1.22 - k * 0.09], [0.135, 1.22 - k * 0.09]], 0.003, trim); }
      }
    }
    if (type === "jacket" || (type === "elder" && seed % 2 === 0)) { // 马褂 over the gown
      const mg = sym([[0.06, 1.41], [0.18, 1.37], [0.205, 1.25], [0.2, 0.95], [0.21, 0.82], [0, 0.8]]);
      shape(x, mg, hgrad(x, -0.21, 0.21, sec), 0.005);
      if (!back) { line(x, [[0, 1.41], [0, 0.8]], 0.004, INK); for (let k = 0; k < 5; k++) { ell(x, 0, 1.35 - k * 0.1, 0.008, 0.006, GOLD, 0.0015); } x.save(); path(x, mg); x.clip(); x.globalAlpha = 0.25; for (let k = 0; k < 5; k++) ell(x, -0.1 + (k % 2) * 0.2, 1.25 - k * 0.09, 0.03, 0.03, null, 0.003, shade(sec, 0.5)); x.restore(); }
    }
    if (type === "farmer") { x.fillStyle = "#e8e0d0"; x.fillRect(-0.2, 0.78, 0.4, 0.04); }
    x.restore();
    if (back) { // v29: back detail — centre seam, collar band, shoulder yoke, sash knot, worn patch
      x.save(); path(x, top); x.clip();
      line(x, [[0, 1.4], [0, type === "gown" || type === "elder" ? 0.08 : 0.62]], 0.004, shade(main, -0.55));
      line(x, [[-0.06, 1.38], [0, 1.35], [0.06, 1.38]], 0.012, shade(main, -0.35));
      line(x, [[-0.18, 1.2], [-0.06, 1.24], [0.06, 1.24], [0.18, 1.2]], 0.004, shade(main, -0.45));
      if (type !== "woman") { x.fillStyle = shade(sec, -0.2); x.fillRect(-0.2, 0.82, 0.4, 0.045); line(x, [[0.05, 0.84], [0.08, 0.7], [0.06, 0.6]], 0.012, shade(sec, -0.2)); }
      if (seed % 3 === 0) { x.fillStyle = shade(main, 0.18); x.fillRect(-0.12, 0.95, 0.08, 0.1); x.strokeStyle = shade(main, -0.5); x.lineWidth = 0.002; x.strokeRect(-0.12, 0.95, 0.08, 0.1); }
      x.restore();
    }
    path(x, top); x.lineWidth = 0.006; x.strokeStyle = INK; x.stroke();
    if (!back && type !== "woman") shape(x, [[-0.05, 1.41], [0, 1.36], [0.05, 1.41]], "#f0ebe0", 0.003);
  });
  body.add(robe.g);

  const head = new THREE.Group(); head.position.set(0, 1.4, 0.01); body.add(head);
  const cy = 0.11;
  const faceK: Face = type === "woman" ? "woman" : type === "elder" ? "elder" : type === "child" ? "child" : "villager";
  const hairC = type === "elder" ? "#cfcac0" : "#141012";
  const hp = part(key + "h", [-0.24, -0.5, 0.24, 0.34], P * 1.3, (x, back) => {
    if (type === "farmer" && back) { shape(x, [[-0.025, cy - 0.02], [0.025, cy - 0.02], [0.012, cy - 0.45], [-0.012, cy - 0.45]], "#141012", 0); }
    if (back) ell(x, 0, cy, 0.076, 0.094, hairC, 0.003);
    else paintFace(x, faceK, skin, cy, seed);
    if (!back && type !== "woman" && type !== "child") { // shaved front + hairline
      x.save(); x.globalAlpha = 0.25; ell(x, 0, cy + 0.065, 0.06, 0.03, "#6a7a80"); x.restore();
    }
    if ((type === "gown" || type === "jacket" || type === "elder") && back) { // 辫子 queue down the back
      x.fillStyle = hairC; for (let k = 0; k < 14; k++) ell(x, (k % 2 ? 0.007 : -0.007), cy - 0.06 - k * 0.026, 0.014, 0.016, hairC, 0.0015, "#3a3438"); line(x, [[0, cy - 0.42], [0, cy - 0.47]], 0.008, "#a02a20");
    }
    if (type === "woman") { // 发髻 + 簪 + 花
      shape(x, [[-0.08, cy + 0.02], [-0.07, cy + 0.08], [0, cy + 0.105], [0.07, cy + 0.08], [0.08, cy + 0.02], [0.05, cy + 0.06], [0, cy + 0.07], [-0.05, cy + 0.06]], "#141012", 0.003);
      ell(x, 0, cy + 0.14, 0.055, 0.04, "#141012", 0.003);
      line(x, [[-0.09, cy + 0.13], [0.09, cy + 0.16]], 0.006, GOLD); ell(x, 0.09, cy + 0.16, 0.008, 0.008, "#e04050");
      const fc = ["#e84a5a", "#f0a040", "#e070a0"][seed % 3];
      for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; ell(x, -0.06 + Math.cos(a) * 0.012, cy + 0.11 + Math.sin(a) * 0.012, 0.01, 0.01, fc, 0.0015); } ell(x, -0.06, cy + 0.11, 0.005, 0.005, "#f8e060");
    } else if (type === "child") { // 双丫髻 with red ties
      shape(x, [[-0.075, cy + 0.02], [-0.06, cy + 0.08], [0, cy + 0.095], [0.06, cy + 0.08], [0.075, cy + 0.02], [0, cy + 0.06]], "#141012", 0.003);
      for (const s of [-1, 1]) { ell(x, s * 0.06, cy + 0.11, 0.03, 0.03, "#141012", 0.003); line(x, [[s * 0.045, cy + 0.085], [s * 0.075, cy + 0.085]], 0.008, "#d83030"); }
    }
    if (hatKind === "cap") { // 瓜皮帽 with red knot
      shape(x, [[-0.08, cy + 0.045], [-0.075, cy + 0.09], [-0.04, cy + 0.115], [0, cy + 0.122], [0.04, cy + 0.115], [0.075, cy + 0.09], [0.08, cy + 0.045], [0, cy + 0.055]], "#1c1a1e", 0.003, "#4a4650");
      for (const k of [-0.04, 0, 0.04]) line(x, [[k * 1.8, cy + 0.05], [k, cy + 0.118]], 0.0025, "#4a4650");
      ell(x, 0, cy + 0.13, 0.011, 0.01, "#c02a20", 0.002);
      line(x, [[-0.08, cy + 0.05], [0, cy + 0.06], [0.08, cy + 0.05]], 0.008, "#2a2830");
    } else if (hatKind === "felt") { // 毡帽
      shape(x, [[-0.085, cy + 0.045], [-0.08, cy + 0.11], [0, cy + 0.135], [0.08, cy + 0.11], [0.085, cy + 0.045], [0, cy + 0.06]], "#6a5a48", 0.003);
      line(x, [[-0.095, cy + 0.05], [0, cy + 0.065], [0.095, cy + 0.05]], 0.016, "#4a3e32");
    } else if (hatKind === "douli") { // 斗笠 woven bamboo hat
      shape(x, [[-0.22, cy + 0.04], [0, cy + 0.2], [0.22, cy + 0.04], [0, cy + 0.06]], "#c8a060", 0.004, "#6a4a20");
      for (let k = -5; k <= 5; k++) line(x, [[k * 0.04, cy + 0.045 + (1 - Math.abs(k) / 5.5) * 0.015], [0, cy + 0.2]], 0.002, "#8a6a30");
      for (const f of [0.35, 0.65]) line(x, [[-0.22 * (1 - f), cy + 0.04 + f * 0.16], [0, cy + 0.05 + f * 0.15], [0.22 * (1 - f), cy + 0.04 + f * 0.16]], 0.002, "#8a6a30");
    } else if (type !== "woman" && type !== "child") {
      shape(x, [[-0.078, cy + 0.03], [-0.07, cy + 0.08], [0, cy + 0.098], [0.07, cy + 0.08], [0.078, cy + 0.03], [0, cy + 0.07]], hairC, 0.003);
    }
  });
  head.add(hp.g);

  const arms: Rig["arms"] = [];
  // v51b: watching crowd — denser sit/lean/clap/point (not all identical idle/拱手)
  const raw = Math.floor(seed / 3) % 8;
  const mode = watching ? [6, 7, 6, 6, 7, 6, 6, 7][raw] : raw; // v53r4: sit majority + lean variety
  // v25: cloth-like 拱手/clap sleeves — wide hanging folds, not tube-to-tube
  const thickArm = mode === 1 || mode === 3;
  for (const s of [-1, 1]) {
    const a = armPart(key + "a", s, P, 0.26, mode === 2 && s === 1 ? 0.55 : 0.34,
      (x) => {
        const c = type === "jacket" ? sec : main;
        if (thickArm) {
          // wide upper sleeve with soft shoulder gather
          const pts: P2[] = [[-0.1, 0.06], [0.1, 0.07], [0.12, -0.08], [0.11, -0.22], [0.04, -0.3], [-0.04, -0.3], [-0.11, -0.22], [-0.1, -0.08]];
          shape(x, pts, hgrad(x, -0.11, 0.12, c), 0.012);
          x.save(); path(x, pts); x.clip();
          folds(x, [-0.06, -0.02, 0.03, 0.07], 0.05, -0.28, shade(c, -0.72));
          folds(x, [-0.04, 0.02, 0.06], 0.02, -0.26, shade(c, 0.5));
          const vg = x.createLinearGradient(-0.12, 0, 0.12, 0);
          vg.addColorStop(0, "rgba(0,0,0,0.2)"); vg.addColorStop(0.5, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.22)");
          x.fillStyle = vg; x.fillRect(-0.13, -0.32, 0.26, 0.4);
          x.restore();
        } else {
          const w = 0.055;
          const pts: P2[] = [[-w, 0.05], [w, 0.06], [w + 0.012, -0.12], [w + 0.008, -0.28], [-w - 0.002, -0.28], [-w - 0.006, -0.12]];
          shape(x, pts, hgrad(x, -w - 0.01, w + 0.01, c), 0.009);
          line(x, [[0.01, -0.04], [0.025, -0.16], [0.015, -0.26]], 0.0035, shade(c, -0.45));
          line(x, [[-0.02, -0.06], [-0.03, -0.2]], 0.003, shade(c, 0.3));
        }
      },
      (x) => {
        const c = type === "jacket" ? main : main;
        if (thickArm) {
          // hanging cuff: wider cloth bell with vertical fold lines (not a tube end)
          const sl: P2[] = [[-0.1, 0.05], [0.1, 0.05], [0.13, -0.06], [0.14, -0.2], [0.1, -0.32], [0.02, -0.36], [-0.02, -0.36], [-0.1, -0.32], [-0.14, -0.2], [-0.13, -0.06]];
          shape(x, sl, hgrad(x, -0.14, 0.14, c), 0.013);
          x.save(); path(x, sl); x.clip();
          folds(x, [-0.08, -0.03, 0.03, 0.08], 0.04, -0.34, shade(c, -0.75));
          folds(x, [-0.05, 0.0, 0.05], 0.02, -0.32, shade(c, 0.5));
          // soft crease shadows near cuff hem
          line(x, [[-0.09, -0.28], [-0.04, -0.34], [0.04, -0.34], [0.09, -0.28]], 0.006, shade(c, -0.4));
          const vg = x.createLinearGradient(-0.14, 0, 0.14, 0);
          vg.addColorStop(0, "rgba(0,0,0,0.4)"); vg.addColorStop(0.45, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.42)");
          x.fillStyle = vg; x.fillRect(-0.15, -0.38, 0.3, 0.44);
          x.restore();
          if (type === "woman") line(x, [[-0.1, -0.33], [0.1, -0.33]], 0.016, trim);
          hand(x, 0, -0.34, s, skin, "open", 0.9);
        } else {
          const flare = 0.015;
          const sl: P2[] = [[-0.06 - flare, 0.04], [0.06 + flare, 0.04], [0.075 + flare, -0.1], [0.08 + flare, -0.24], [0.04, -0.28], [-0.03, -0.28], [-0.075 - flare, -0.24], [-0.065 - flare, -0.1]];
          shape(x, sl, hgrad(x, -0.08, 0.09, c), 0.009);
          x.save(); path(x, sl); x.clip(); x.globalAlpha = 0.8;
          line(x, [[-0.035, -0.02], [-0.025, -0.12], [-0.04, -0.24]], 0.004, shade(c, -0.5));
          line(x, [[0.03, -0.05], [0.045, -0.2]], 0.004, shade(c, 0.35));
          const vg = x.createLinearGradient(-0.08, 0, 0.09, 0);
          vg.addColorStop(0, "rgba(0,0,0,0.22)"); vg.addColorStop(0.45, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.25)");
          x.fillStyle = vg; x.fillRect(-0.1, -0.3, 0.22, 0.34);
          x.restore();
          if (type === "woman") line(x, [[-0.07, -0.26], [0.08, -0.26]], 0.018, trim);
          if (type === "farmer") hand(x, 0, -0.3, s, skin, "open", 1.0);
          else hand(x, 0, -0.3, s, skin, mode === 4 && s === 1 ? "fist" : "open", 0.95);
        }
        if (mode === 2 && s === 1) { // 团扇 — larger, readable 梅
          x.fillStyle = "#8a5a2a"; x.fillRect(-0.006, -0.34, 0.012, 0.1);
          ell(x, 0, -0.48, 0.13, 0.14, "#f4ecd8", 0.005, "#8a5a2a");
          // woven rim
          x.strokeStyle = "#6a4020"; x.lineWidth = 0.008; x.beginPath(); x.ellipse(0, -0.48, 0.125, 0.135, 0, 0, 7); x.stroke();
          line(x, [[-0.06, -0.54], [0.0, -0.48], [0.05, -0.4]], 0.005, "#4a3020");
          for (const [px, py] of [[-0.04, -0.52], [0.02, -0.46], [0.05, -0.42], [-0.05, -0.55], [0.0, -0.5], [0.04, -0.54]] as const)
            for (let p = 0; p < 5; p++) { const an = (p / 5) * Math.PI * 2; ell(x, px + Math.cos(an) * 0.01, py + Math.sin(an) * 0.01, 0.008, 0.008, "#d84a5a"); }
          ell(x, 0.0, -0.5, 0.006, 0.006, "#f0d060");
        }
      }, thickArm ? 0.15 : 0.1, mode === 2 ? 0.16 : (thickArm ? 0.16 : 0.1));
    a.up.position.set(s * 0.16, sY, 0.03); a.up.scale.x = s;
    body.add(a.up); arms.push({ s, up: a.up, lo: a.lo });
  }
  const kid = type === "child";
  root.scale.setScalar(scale * (kid ? 0.68 : type === "woman" ? 0.93 : 0.96 + r() * 0.08));
  if (watching) root.userData.watching = true;
  const rig = { root, turn };
  const ph = r() * 20, sp = 0.8 + r() * 0.4;
  const [A, B] = arms;
  const v1 = (r() - 0.5) * 0.12;
  // fs = forearm foreshortening (皮影 trick: a forearm pointing at the viewer is drawn shorter)
  const set = (a: typeof A, up: number, lo: number, fs = 1) => { a.up.rotation.z = a.s * up; a.lo.rotation.z = lo; a.lo.scale.y += (fs - a.lo.scale.y) * 0.2; };
  const anim = (t0: number) => {
    // v51: villagers peek toward cam (≤0.38) so stage-facing crowd still readable mid/overview
    faceCam(rig, watching ? 0.22 : 0.38); // v52: less cam peek — keep stage facing
    const t = t0 * sp + ph;
    head.position.x = Math.sin(t * 0.23) * 0.006;
    if (mode !== 6) body.scale.y += (1 - body.scale.y) * 0.25;
    if (mode === 1) { // clapping in bursts
      body.position.y = Math.sin(t * 1.3) * 0.004;
      const burst = Math.sin(t * 0.35) > 0.5 ? Math.abs(Math.sin(t * 8)) : 0.5;
      set(A, -0.28 + v1, -1.75 - burst * 0.2 + Math.sin(t * 1.1) * 0.04, 0.5); set(B, -0.28 - v1, -1.75 - burst * 0.2 + Math.sin(t * 1.3) * 0.04, 0.5);
      head.position.y = 1.4 + burst * 0.008;
      head.rotation.z = Math.sin(t * 0.37) * 0.05;
    } else if (mode === 2) { // fanning
      body.position.y = Math.sin(t * 1.3) * 0.004;
      set(A, 0.08, -0.3); set(B, -0.15 + Math.sin(t * 5) * 0.05, -2.45 + Math.sin(t * 5) * 0.22, 0.62);
      head.rotation.z = Math.sin(t * 0.37) * 0.05;
    } else if (mode === 3) { // 拱手 with a small bow
      body.position.y = Math.sin(t * 1.3) * 0.004;
      const bw = Math.sin(t * 0.5); set(A, -0.28 + v1 + bw * 0.03, -1.8 + bw * 0.08, 0.48); set(B, -0.3 - v1 + bw * 0.03, -1.78 + bw * 0.08, 0.48);
      const bow = Math.max(0, Math.sin(t * 0.5)) ** 4; head.position.y = 1.4 - bow * 0.02; body.rotation.z = 0;
      head.rotation.z = Math.sin(t * 0.37) * 0.05;
    } else if (mode === 4) { // pointing at the stage, then lowering
      body.position.y = Math.sin(t * 1.3) * 0.004;
      const k = sm(0.2, 0.4, (t % 9) / 9) * (1 - sm(0.7, 0.9, (t % 9) / 9));
      set(A, 0.1, -0.15); set(B, 0.2 + k * 1.9, k * 0.3);
      head.rotation.z = 0.04 + Math.sin(t * 0.5) * 0.04; // chin slightly toward stage
    } else if (mode === 5) { // turning to chat with a neighbour
      body.position.y = Math.sin(t * 1.3) * 0.004;
      set(A, 0.08, -0.4); set(B, 0.08, -0.4);
      head.rotation.z = Math.sin(t * 0.6) * 0.14;
    } else if (mode === 6) { // v52 sit-watch — plant on stool, stronger squat
      body.position.y = -0.28 + Math.sin(t * 1.1) * 0.003; // v53r4: sit without burying legs (was bust-on-base)
      body.scale.y += (0.9 - body.scale.y) * 0.25; // hips on low stool
      set(A, -0.7 + Math.sin(t * 0.7) * 0.03, -1.65, 0.48);
      set(B, -0.62 + Math.sin(t * 0.9) * 0.03, -1.58, 0.48);
      head.position.y = 1.4;
      head.rotation.z = 0.07 + Math.sin(t * 0.45) * 0.05;
    } else if (mode === 7) { // v51 lean-watch — forward lean, arms soft toward stage
      body.position.y = Math.sin(t * 1.3) * 0.004;
      set(A, -0.22 + Math.sin(t * 0.8) * 0.04, -0.95, 0.65);
      set(B, -0.08 + Math.sin(t * 0.7) * 0.03, -0.55, 0.8);
      head.position.y = 1.4;
      head.rotation.z = 0.08 + Math.sin(t * 0.5) * 0.04;
      // v52: slight chin tip only — no body lean that lifts feet
      head.rotation.z = 0.1 + Math.sin(t * 0.5) * 0.04;
    } else { // idle watch — soft sway, slight asymmetric head tip toward stage
      body.position.y = Math.sin(t * 1.3) * 0.004;
      set(A, 0.05 + Math.sin(t) * 0.025, -0.18 + Math.sin(t * 0.6) * 0.04);
      set(B, 0.04 + Math.sin(t * 0.9) * 0.02, -0.15);
      head.rotation.z = (seed % 3 - 1) * 0.04 + Math.sin(t * 0.37) * 0.05;
    }
  };
  anim(0);
  root.userData.anim = anim;
  return root;
}
