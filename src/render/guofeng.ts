// 赣风 · 国画风场景件：写意樟/松、墨竹、纸灯笼、宣德炉、水墨雁 — all painted in code on <canvas>.
import * as THREE from "three";

type Ctx = CanvasRenderingContext2D;
const INK = "#1e1812";
function low(): boolean { return /[?&#]lowgfx\b/.test(location.hash + location.search); }
function rng(seed: number): () => number { let s = (Math.abs(seed) * 9301 + 49297) % 233280; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

const cache = new Map<string, THREE.CanvasTexture>();
/** canvas in metre units, y up, origin at bottom centre */
function paint(key: string, wM: number, hM: number, ppm: number, draw: (x: Ctx) => void): THREE.CanvasTexture {
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = Math.ceil(wM * ppm); c.height = Math.ceil(hM * ppm);
  const x = c.getContext("2d")!;
  x.setTransform(ppm, 0, 0, -ppm, (wM / 2) * ppm, hM * ppm);
  x.lineCap = "round"; x.lineJoin = "round";
  draw(x);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  cache.set(key, t); return t;
}
function cardMat(map: THREE.Texture, glow = 0.3): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.95, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow });
}
/** crossed painted cards (国画 billboard volume) — v25: Z-offset variety + soft blob fill + softer alpha edge */
function crossed(map: THREE.Texture, w: number, h: number, n = 5, glow = 0.3, top?: { map: THREE.Texture; y: number; r: number }): THREE.Group {
  const g = new THREE.Group();
  if (top) { // v29: top-facing canopy cards so 俯瞰 reads as a crown, not crossed planes
    const tm = new THREE.MeshStandardMaterial({ map: top.map, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.95, emissive: 0xffffff, emissiveMap: top.map, emissiveIntensity: glow });
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(top.r * 2 * (1 - k * 0.18), top.r * 2 * (1 - k * 0.18)), tm);
      c.rotation.set(-Math.PI / 2, 0, k * 1.1);
      c.position.set((k - 1) * 0.15, top.y - 0.9 + k * 0.7, (k % 2) * 0.12);
      g.add(c);
    }
  }
  // softer cut so steep angles don't read as hard card edges
  const m = new THREE.MeshStandardMaterial({
    map, alphaTest: 0.22, transparent: true, opacity: 0.98, side: THREE.DoubleSide,
    roughness: 0.95, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow, depthWrite: true,
  });
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.28 });
  for (let i = 0; i < n; i++) {
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const p = new THREE.Mesh(geo, m);
    const a = (i / n) * Math.PI + (i % 2 ? 0.08 : -0.05);
    p.rotation.y = a;
    p.rotation.x = (i % 2 ? 0.16 : -0.12); // v26: lean cards so top-down views never see a pure edge
    // varied radial + vertical offset so cards don't stack into one silhouette
    const off = 0.18 + (i % 3) * 0.11 + (i % 2) * 0.06;
    p.position.set(Math.sin(a) * off, (i % 3) * 0.04 - 0.04, Math.cos(a) * off);
    p.scale.set(1 + (i % 2) * 0.04, 1 + (i % 3) * 0.03, 1);
    p.customDepthMaterial = dm;
    g.add(p);
  }
  // soft blob fill card (horizontal-ish) — cheap volume between vertical cards
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.55), m);
  fill.geometry.translate(0, h * 0.58, 0);
  fill.rotation.x = -0.55; fill.rotation.y = 0.35;
  fill.position.set(0.05, 0.05, 0.12);
  fill.customDepthMaterial = dm;
  g.add(fill);
  const fill2 = new THREE.Mesh(fill.geometry, m); // v26: second crossing fill card
  fill2.rotation.set(-0.95, -1.25, 0); fill2.position.set(-0.08, 0.1, -0.06); fill2.scale.set(0.85, 0.85, 1);
  fill2.customDepthMaterial = dm; g.add(fill2);
  // soft outer silhouette sprites (two sizes) — fills gaps from steep angles
  const soft = document.createElement("canvas"); soft.width = soft.height = 64;
  const sx = soft.getContext("2d")!;
  const gr = sx.createRadialGradient(32, 30, 2, 32, 28, 31);
  gr.addColorStop(0, "rgba(36,55,32,0.62)"); gr.addColorStop(0.45, "rgba(28,44,26,0.32)"); gr.addColorStop(1, "rgba(18,28,16,0)");
  sx.fillStyle = gr; sx.fillRect(0, 0, 64, 64);
  const st = new THREE.CanvasTexture(soft); st.colorSpace = THREE.SRGBColorSpace;
  const sm = new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0.72 });
  const sil = new THREE.Sprite(sm); sil.position.y = h * 0.6; sil.scale.set(w * 1.28, h * 0.92, 1); g.add(sil);
  const sil2 = new THREE.Sprite(sm.clone()); sil2.position.set(0.15, h * 0.48, -0.1); sil2.scale.set(w * 0.95, h * 0.7, 1); g.add(sil2);
  return g;
}

/* ---- brush primitives */
function stroke(x: Ctx, pts: [number, number][], w0: number, w1: number, col: string, r: () => number): void {
  // tapered brush stroke with dry-brush streaks
  for (let k = 0; k < pts.length - 1; k++) {
    const t = k / (pts.length - 1), w = w0 + (w1 - w0) * t;
    x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(pts[k][0], pts[k][1]); x.lineTo(pts[k + 1][0], pts[k + 1][1]); x.stroke();
  }
  x.save(); x.globalAlpha = 0.5;
  for (let s = 0; s < 4; s++) {
    const off = (r() - 0.5) * w0 * 0.7; x.strokeStyle = s % 2 ? "#5a4a3a" : "#0c0806"; x.lineWidth = w0 * 0.08;
    x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px + off * (1 - i / pts.length), py) : x.moveTo(px + off, py))); x.stroke();
  }
  x.restore();
}
function branchPath(x0: number, y0: number, ang: number, len: number, r: () => number, n = 6): [number, number][] {
  const pts: [number, number][] = [[x0, y0]]; let a = ang, px = x0, py = y0;
  for (let i = 0; i < n; i++) { a += (r() - 0.5) * 0.6; px += Math.sin(a) * len / n; py += Math.cos(a) * len / n; pts.push([px, py]); }
  return pts;
}

/* ---- trees */
export function paintedTree(seed = 1, scale = 1, kind: "camphor" | "pine" = "camphor"): THREE.Group {
  const r = rng(seed * 131 + 7);
  const W = kind === "pine" ? 6 : 7.5, H = kind === "pine" ? 9 : 8;
  const ppm = low() ? 40 : 80;
  const tex = paint(`tree-${kind}-${seed % 4}`, W, H, ppm, (x) => {
    const tips: [number, number][] = [];
    if (kind === "camphor") {
      stroke(x, [[0, 0], [-0.1, 1.2], [0.05, 2.4], [0.0, 3.2]], 0.55, 0.3, "#2a2018", r);
      for (let b = 0; b < 7; b++) {
        const a = -1.1 + (b / 6) * 2.2 + (r() - 0.5) * 0.3;
        const p = branchPath((r() - 0.5) * 0.2, 2.2 + r() * 1.2, a, 1.6 + r() * 1.6, r);
        stroke(x, p, 0.18, 0.04, "#2a2018", r); tips.push(...p.slice(2));
      }
      // 点叶: layered blue-green dabs (石绿 / 花青), dark ink accents
      const cols = ["#2f4a3e", "#3a5c48", "#4a6e52", "#2a4838", "#5a7a58", "#3e5a62"]; // v54: 石绿/花青
      for (let i = 0; i < (low() ? 900 : 2200); i++) {
        const [tx, ty] = tips[Math.floor(r() * tips.length)];
        const rr = 0.25 + r() * 0.9, a = r() * Math.PI * 2;
        const px = tx + Math.cos(a) * rr, py = ty + Math.sin(a) * rr * 0.6 + 0.2;
        if (Math.abs(px) > W / 2 - 0.1 || py > H - 0.1) continue;
        x.fillStyle = cols[Math.floor(r() * cols.length)]; x.globalAlpha = 0.85;
        x.beginPath(); x.ellipse(px, py, 0.07 + r() * 0.06, 0.04 + r() * 0.03, r() * 3, 0, Math.PI * 2); x.fill();
      }
      x.globalAlpha = 1; x.fillStyle = "#1a2418";
      for (let i = 0; i < (low() ? 180 : 420); i++) { const [tx, ty] = tips[Math.floor(r() * tips.length)]; x.beginPath(); x.arc(tx + (r() - 0.5) * 1.8, ty + (r() - 0.3) * 1.15, 0.035 + r() * 0.03, 0, 7); x.fill(); }
      // second leaf layer: larger, softer dabs for canopy thickness
      x.globalAlpha = 0.55;
      for (let i = 0; i < (low() ? 200 : 500); i++) { const [tx, ty] = tips[Math.floor(r() * tips.length)]; const a = r() * Math.PI * 2, rr = 0.4 + r() * 1.1; x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); x.ellipse(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr * 0.55 + 0.35, 0.11 + r() * 0.08, 0.06 + r() * 0.04, r() * 2, 0, 7); x.fill(); }
      // v25: soft silhouette fill + edge dither (breaks hard card rim at steep angles)
      x.globalAlpha = 0.28;
      for (let i = 0; i < (low() ? 80 : 180); i++) {
        const [tx, ty] = tips[Math.floor(r() * tips.length)];
        const a = r() * Math.PI * 2, rr = 0.9 + r() * 1.6;
        x.fillStyle = cols[Math.floor(r() * cols.length)];
        x.beginPath(); x.ellipse(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr * 0.5 + 0.2, 0.18 + r() * 0.14, 0.1 + r() * 0.08, r() * 2, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
    } else {
      // 松: crooked scaly trunk, flat needle clouds
      const trunk = branchPath(0, 0, 0.05, 7.2, r, 9);
      stroke(x, trunk, 0.5, 0.12, "#3a2a1e", r);
      x.strokeStyle = "#140e0a"; x.lineWidth = 0.025;
      trunk.forEach(([px, py], i) => { if (i % 1 === 0 && py < 6.5) { x.beginPath(); x.ellipse(px, py + 0.2, 0.12, 0.07, 0.3, 0, Math.PI * 2); x.stroke(); } });
      for (let b = 0; b < 6; b++) {
        const base = trunk[2 + b], side = b % 2 ? 1 : -1;
        const p = branchPath(base[0], base[1], side * (1.2 + r() * 0.3), 1.2 + r() * 1.2, r, 4);
        stroke(x, p, 0.14, 0.04, "#3a2a1e", r);
        const [ex, ey] = p[p.length - 1];
        for (let c = 0; c < 5; c++) { // needle fan cluster
          const cx = ex + (r() - 0.5) * 1.0, cy = ey + 0.15 + r() * 0.3;
          for (let k = 0; k < 34; k++) { const a = -Math.PI * 0.95 + (k / 33) * Math.PI * 0.9 + Math.PI; const l = 0.35 + r() * 0.2;
            x.strokeStyle = k % 3 ? "#203424" : "#2e4a34"; x.lineWidth = 0.025; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * l * 1.3, cy + Math.sin(a) * l * 0.5 + 0.2); x.stroke(); }
        }
      }
      // v29: soft 石绿 needle masses behind the fans so pines read alive (were thin, brown-dominant)
      x.globalAlpha = 0.6;
      for (let b = 0; b < 6; b++) {
        const base = trunk[2 + b], side = b % 2 ? 1 : -1;
        for (let k = 0; k < 40; k++) { x.fillStyle = ["#2e4a34", "#3e5e42", "#4a6a48"][k % 3]; x.beginPath(); x.ellipse(base[0] + side * (0.6 + r() * 1.4), base[1] + 0.3 + r() * 0.5, 0.25 + r() * 0.2, 0.1 + r() * 0.08, 0, 0, 7); x.fill(); }
      }
      x.globalAlpha = 1;
      const [tx, ty] = trunk[trunk.length - 1];
      for (let c = 0; c < 3; c++) for (let k = 0; k < 30; k++) { const a = (k / 29) * Math.PI; x.strokeStyle = "#1e3222"; x.lineWidth = 0.025; x.beginPath(); x.moveTo(tx + (c - 1) * 0.5, ty - 0.3); x.lineTo(tx + (c - 1) * 0.5 + Math.cos(a) * 0.55, ty - 0.3 + Math.sin(a) * 0.3); x.stroke(); }
    }
  });
  const R = kind === "pine" ? 2.4 : 3.0;
  const topTex = paint(`treetop-${kind}-${seed % 4}`, R * 2, R * 2, low() ? 30 : 60, (x) => {
    const cols = kind === "pine" ? ["#1e3222", "#2e4a34", "#3e5e42"] : ["#2f4a3e", "#3a5c48", "#4a6e52", "#2a4838", "#5a7a58", "#3e5a62"];
    for (let i = 0; i < (low() ? 500 : 1400); i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (R - 0.3);
      x.fillStyle = cols[Math.floor(r() * cols.length)]; x.globalAlpha = 0.8;
      x.beginPath(); x.ellipse(Math.cos(a) * rr, R + Math.sin(a) * rr, 0.12 + r() * 0.12, 0.07 + r() * 0.06, r() * 3, 0, 7); x.fill();
    }
    x.globalAlpha = 1;
  });
  const g = crossed(tex, W, H, low() ? 5 : 6, 0.26, { map: topTex, y: kind === "pine" ? 6.6 : 5.0, r: R });
  g.scale.setScalar(scale);
  g.rotation.y = r() * Math.PI;
  return g;
}

/** Soft fan of nearly-parallel cards — no X-cross (门楼 approach must not read as 竹子交叉). */
function fanCards(map: THREE.Texture, w: number, h: number, n = 2, glow = 0.26): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({
    map, alphaTest: 0.22, transparent: true, opacity: 0.98, side: THREE.DoubleSide,
    roughness: 0.95, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow, depthWrite: true,
  });
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.28 });
  const count = Math.max(1, Math.min(n, 3));
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const p = new THREE.Mesh(geo, m);
    // Small yaw fan (~±10°) + tiny depth offset — volume without crossed stalks
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    p.rotation.y = t * 0.18;
    p.rotation.x = t * 0.04;
    p.position.set(t * 0.06, 0, t * 0.12);
    p.scale.set(1 - Math.abs(t) * 0.04, 1 - Math.abs(t) * 0.02, 1);
    p.customDepthMaterial = dm;
    g.add(p);
  }
  // Soft outer silhouette (not a crossing fill card)
  const soft = document.createElement("canvas"); soft.width = soft.height = 64;
  const sx = soft.getContext("2d")!;
  const gr = sx.createRadialGradient(32, 30, 2, 32, 28, 31);
  gr.addColorStop(0, "rgba(36,55,32,0.55)"); gr.addColorStop(0.5, "rgba(28,44,26,0.28)"); gr.addColorStop(1, "rgba(18,28,16,0)");
  sx.fillStyle = gr; sx.fillRect(0, 0, 64, 64);
  const st = new THREE.CanvasTexture(soft); st.colorSpace = THREE.SRGBColorSpace;
  const sm = new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0.65 });
  const sil = new THREE.Sprite(sm); sil.position.y = h * 0.55; sil.scale.set(w * 1.1, h * 0.85, 1); g.add(sil);
  return g;
}

/** 墨竹 clump — painted culms do not cross; 3D cards use fanCards (not crossed X). */
export function paintedBamboo(seed = 1, n = 9): THREE.Group {
  const r = rng(seed * 17 + 3);
  const W = 3.2, H = 7.5, ppm = low() ? 50 : 100;
  // v39 cache key: non-crossing stalk layout
  const tex = paint(`bamboo-v39-${seed % 3}`, W, H, ppm, (x) => {
    const cnt = Math.min(n, 7);
    for (let i = 0; i < cnt; i++) {
      // Even spacing + gentle same-side lean so culms never cross in the ink painting
      const t = cnt === 1 ? 0 : (i / (cnt - 1)) * 2 - 1;
      const bx = t * 1.05 + (r() - 0.5) * 0.08;
      const lean = t * 0.06 + (r() - 0.5) * 0.03; // outward fan, not opposing crosses
      const h = 5.2 + r() * 1.8;
      const col = i % 3 ? "#4a6a3a" : "#2e4628";
      for (let y = 0; y < h; y += 0.55) { // culm segments with 竹节 knots
        const x0 = bx + lean * y, x1 = bx + lean * (y + 0.5);
        x.strokeStyle = col; x.lineWidth = 0.07 - y * 0.005; x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y + 0.5); x.stroke();
        x.strokeStyle = INK; x.lineWidth = 0.02; x.beginPath(); x.moveTo(x1 - 0.05, y + 0.52); x.lineTo(x1 + 0.05, y + 0.53); x.stroke();
        if (y > 2.2 && r() < 0.55) { // leaf groups (个/介 字叶)
          const s = t >= 0 ? 1 : -1; // leaves open outward with the fan
          for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
            const a = s * (0.6 + r() * 1.2) - Math.PI / 2 + Math.PI, L = 0.45 + r() * 0.3;
            const ex = x1 + Math.sin(a) * L, ey = y + 0.5 - Math.cos(a) * L * 0.6;
            x.fillStyle = k % 2 ? "#2a4224" : "#3c5a32";
            x.beginPath(); x.moveTo(x1, y + 0.5); x.quadraticCurveTo((x1 + ex) / 2 + 0.05, (y + 0.5 + ey) / 2 + 0.06, ex, ey); x.quadraticCurveTo((x1 + ex) / 2 - 0.05, (y + 0.5 + ey) / 2 - 0.04, x1, y + 0.5); x.fill();
          }
        }
      }
    }
  });
  const g = fanCards(tex, W, H, low() ? 2 : 2, 0.26);
  g.rotation.y = (seed % 5) * 0.12; // slight variety without spinning into an X
  return g;
}

/* ---- paper lantern */
let lanternTex: THREE.CanvasTexture | null = null;
function lanternMap(): THREE.CanvasTexture {
  if (lanternTex) return lanternTex;
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#9a1a12"); g.addColorStop(0.5, "#e8401e"); g.addColorStop(1, "#9a1a12");
  x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(255,220,180,${Math.random() * 0.06})`; x.fillRect(Math.random() * 256, Math.random() * 128, 3, 1); } // paper fibre
  x.strokeStyle = "rgba(70,10,6,0.75)"; x.lineWidth = 2;
  for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(i * 16 + 8, 0); x.lineTo(i * 16 + 8, 128); x.stroke(); } // bamboo ribs
  x.fillStyle = "#c9a04a"; x.fillRect(0, 0, 256, 7); x.fillRect(0, 121, 256, 7);
  lanternTex = new THREE.CanvasTexture(c); lanternTex.colorSpace = THREE.SRGBColorSpace; lanternTex.wrapS = THREE.RepeatWrapping;
  return lanternTex;
}
let tasselTex: THREE.CanvasTexture | null = null;
let glowTex: THREE.CanvasTexture | null = null;
export function paperLantern(): THREE.Group {
  const g = new THREE.Group();
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; prof.push(new THREE.Vector2(0.07 + Math.cos(a) * 0.16, Math.sin(a) * 0.24)); }
  const map = lanternMap();
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 1.2, roughness: 0.85, side: THREE.DoubleSide }));
  g.add(body);
  const capM = new THREE.MeshStandardMaterial({ color: 0x2a1610, roughness: 0.6 });
  for (const y of [0.25, -0.25]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 16), capM); cap.position.y = y; g.add(cap); }
  if (!tasselTex) {
    const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d")!;
    x.fillStyle = "#c9a04a"; x.fillRect(26, 0, 12, 14); x.beginPath(); x.arc(32, 22, 9, 0, 7); x.fill();
    for (let i = 0; i < 26; i++) { x.strokeStyle = i % 4 ? "#c8201a" : "#e8584a"; x.lineWidth = 1.6; x.beginPath(); x.moveTo(26 + i * 0.5, 28); x.lineTo(14 + i * 1.4, 124 - (i % 3) * 3); x.stroke(); }
    tasselTex = new THREE.CanvasTexture(c); tasselTex.colorSpace = THREE.SRGBColorSpace;
  }
  const tm = new THREE.MeshStandardMaterial({ map: tasselTex, alphaTest: 0.3, side: THREE.DoubleSide, emissive: 0x401008, roughness: 0.9 });
  for (let k = 0; k < 2; k++) { const geo = new THREE.PlaneGeometry(0.12, 0.3); geo.translate(0, -0.15, 0); const t = new THREE.Mesh(geo, tm); t.position.y = -0.27; t.rotation.y = k * Math.PI / 2; g.add(t); }
  if (!glowTex) {
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d")!;
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,150,80,0.32)"); gr.addColorStop(1, "rgba(255,120,60,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(0.85); g.add(halo);
  return g;
}

/* ---- 宣德炉 bronze censer */
export function xuandeLu(): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d")!;
  const bg = x.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, "#5a3a22"); bg.addColorStop(0.5, "#7a5230"); bg.addColorStop(1, "#3a2616");
  x.fillStyle = bg; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${60 + Math.random() * 40},${110 + Math.random() * 40},${90 + Math.random() * 30},${Math.random() * 0.18})`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 256, Math.random() * 4, 0, 7); x.fill(); } // 铜绿 patina
  // 回纹 band on the neck
  x.strokeStyle = "#c8a060"; x.lineWidth = 3;
  for (let i = 0; i < 512; i += 32) { x.beginPath(); x.moveTo(i + 2, 54); x.lineTo(i + 2, 30); x.lineTo(i + 28, 30); x.lineTo(i + 28, 50); x.lineTo(i + 10, 50); x.lineTo(i + 10, 38); x.lineTo(i + 20, 38); x.stroke(); }
  x.strokeRect(-2, 24, 516, 36);
  // 云雷纹 / 饕餮 hint on belly
  x.lineWidth = 2.5; x.strokeStyle = "rgba(210,170,100,0.7)";
  for (let i = 0; i < 4; i++) { const cx = 64 + i * 128, cy = 150; x.beginPath(); for (let a = 0; a < 12; a += 0.2) x.lineTo(cx - 30 + Math.cos(a) * (2 + a * 1.8), cy + Math.sin(a) * (2 + a * 1.8)); x.stroke(); x.beginPath(); for (let a = 0; a < 12; a += 0.2) x.lineTo(cx + 30 - Math.cos(a) * (2 + a * 1.8), cy + Math.sin(a) * (2 + a * 1.8)); x.stroke(); x.beginPath(); x.arc(cx - 12, cy - 30, 6, 0, 7); x.arc(cx + 12, cy - 30, 6, 0, 7); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  const bronze = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.75, roughness: 0.42, color: 0xffffff });
  const plain = new THREE.MeshStandardMaterial({ color: 0x4a3220, metalness: 0.75, roughness: 0.45 });
  // lathe: wide rim lip, short neck, low bulging belly (宣德炉 shape)
  const P = [[0.0, 0.0], [0.72, 0.0], [0.95, 0.12], [1.05, 0.38], [0.98, 0.62], [0.8, 0.78], [0.78, 0.98], [0.98, 1.06], [1.0, 1.12], [0.85, 1.12], [0.74, 1.05]].map(([a, b]) => new THREE.Vector2(a, b));
  const body = new THREE.Mesh(new THREE.LatheGeometry(P, 40), bronze); body.position.y = 0.55; g.add(body);
  for (const s of [-1, 1]) { // 朝天耳 upright loop ears
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 10, 20, Math.PI * 1.2), plain);
    ear.position.set(s * 0.82, 1.7, 0); ear.rotation.set(0, Math.PI / 2, -Math.PI * 0.1); g.add(ear);
  }
  for (let i = 0; i < 3; i++) { // 乳足
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), plain); leg.scale.y = 1.6;
    leg.position.set(Math.cos(a) * 0.55, 0.32, Math.sin(a) * 0.55); g.add(leg);
  }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.76, 32), new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 1 }));
  ash.rotation.x = -Math.PI / 2; ash.position.y = 1.58; g.add(ash);
  const stickM = new THREE.MeshStandardMaterial({ color: 0x9a3a20, roughness: 0.8 });
  const tipM = new THREE.MeshBasicMaterial({ color: 0xff7a30 });
  const r = rng(5);
  for (let i = 0; i < 26; i++) { // incense sticks with glowing tips
    const a = r() * Math.PI * 2, rr = r() * 0.5, h = 0.5 + r() * 0.35;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 4), stickM);
    st.position.set(Math.cos(a) * rr, 1.58 + h / 2, Math.sin(a) * rr); st.rotation.set((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25); g.add(st);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), tipM); tip.position.set(0, h / 2, 0); st.add(tip);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/* ---- 水墨雁 ink-wash goose (side body card + flapping wing cards) */
export function inkGoose(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const bodyT = paint("goose-body", 1.0, 0.5, 256, (x) => {
    x.translate(0, 0.22);
    const gr = x.createLinearGradient(-0.4, 0, 0.45, 0); gr.addColorStop(0, "rgba(30,24,18,0.55)"); gr.addColorStop(0.5, "rgba(20,16,12,0.95)"); gr.addColorStop(1, "rgba(10,8,6,1)");
    x.fillStyle = gr;
    x.beginPath(); x.moveTo(-0.42, 0.02); x.quadraticCurveTo(-0.2, 0.1, 0.05, 0.06); x.quadraticCurveTo(0.22, 0.05, 0.36, 0.09); x.quadraticCurveTo(0.44, 0.11, 0.48, 0.08); x.quadraticCurveTo(0.42, 0.05, 0.36, 0.05); x.quadraticCurveTo(0.2, -0.02, 0.05, -0.06); x.quadraticCurveTo(-0.2, -0.07, -0.42, 0.02); x.fill();
    x.strokeStyle = "#c08040"; x.lineWidth = 0.012; x.beginPath(); x.moveTo(0.47, 0.085); x.lineTo(0.5, 0.078); x.stroke();
  });
  const bm = cardMat(bodyT, 0.1); bm.transparent = true; bm.alphaTest = 0.05; bm.depthWrite = false;
  const body = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), bm); g.add(body);
  const wingT = paint("goose-wing", 0.7, 0.9, 200, (x) => {
    // wing seen from above, root at y=0 — wet ink feather strokes fading out
    for (let i = 0; i < 9; i++) {
      x.strokeStyle = `rgba(16,12,8,${0.9 - i * 0.06})`; x.lineWidth = 0.07 - i * 0.004;
      x.beginPath(); x.moveTo(-0.15 + i * 0.03, 0.02); x.quadraticCurveTo(-0.05 + i * 0.03, 0.4, -0.25 + i * 0.06, 0.82 - i * 0.04); x.stroke();
    }
  });
  const wm = cardMat(wingT, 0.1); wm.transparent = true; wm.alphaTest = 0.05; wm.depthWrite = false;
  for (const s of [1, -1]) {
    const pivot = new THREE.Group(); pivot.name = s > 0 ? "wingL" : "wingR";
    const geo = new THREE.PlaneGeometry(0.7, 0.9); geo.translate(0, 0.45, 0); geo.rotateX(-Math.PI / 2 * s);
    pivot.add(new THREE.Mesh(geo, wm)); pivot.position.set(0.02, 0.04, 0); pivot.userData.s = s; g.add(pivot);
  }
  g.userData.ink = true;
  g.scale.setScalar(scale);
  return g;
}

/* ---- 小青瓦 grey roof tile material */
export function qingwaMat(rep: [number, number] = [3, 2]): THREE.MeshStandardMaterial {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d")!;
  x.fillStyle = "#3a3c40"; x.fillRect(0, 0, 256, 256);
  for (let col = 0; col < 8; col++) for (let row = 0; row < 8; row++) {
    const g = x.createLinearGradient(col * 32, 0, col * 32 + 32, 0);
    const v = 82 + Math.random() * 18; g.addColorStop(0, `rgb(${v - 30},${v - 28},${v - 24})`); g.addColorStop(0.5, `rgb(${v},${v + 2},${v + 6})`); g.addColorStop(1, `rgb(${v - 30},${v - 28},${v - 24})`);
    x.fillStyle = g; x.beginPath(); x.ellipse(col * 32 + 16, row * 32 + 20, 15, 18, 0, Math.PI, 0); x.lineTo(col * 32 + 31, row * 32 + 34); x.lineTo(col * 32 + 1, row * 32 + 34); x.fill();
    x.strokeStyle = "rgba(20,20,24,0.6)"; x.lineWidth = 1.5; x.beginPath(); x.ellipse(col * 32 + 16, row * 32 + 20, 15, 18, 0, Math.PI, 0); x.stroke();
  }
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? "30,40,30" : "200,200,200"},0.08)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0 });
}
