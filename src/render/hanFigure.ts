// 中国风 stylized figures, built entirely in code (no third-party models).
// Art direction: refined "国风动画" figurine — sculpted head (nose bridge, brow ridge, ears),
// curvature-following painted features (sphere-UV texture), cloth with sheen for a soft rim.
import * as THREE from "three";

export type HanRole = "performer" | "crowd" | "robed";

const H_HEAD = 1.56; // head centre height for a 1.7 figure
const R = 0.105;

function rng(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function cloth(color: number, sheen = 0.7): THREE.MeshPhysicalMaterial {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.82, sheen, sheenRoughness: 0.6, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.45) });
}

/* ---------------- head ---------------- */
let headGeo: THREE.BufferGeometry | null = null;
function sculptedHead(): THREE.BufferGeometry {
  if (headGeo) return headGeo;
  const g = new THREE.SphereGeometry(R, 48, 36);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const gauss = (d2: number, s: number) => Math.exp(-d2 / (2 * s * s));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const nx = v.x / R, ny = v.y / R, nz = v.z / R;
    // egg shape: slightly taller, narrower jaw, fuller cranium
    let sx = 0.9, sy = 1.14, sz = 0.98;
    if (ny < -0.1) { const k = 1 - Math.min(1, (-ny - 0.1) / 0.9) * 0.28; sx *= k; sz *= 0.94 + 0.06 * k; }
    let x = v.x * sx, y = v.y * sy, z = v.z * sz;
    if (nz > 0) {
      // nose bridge + tip
      const nose = gauss(nx * nx, 0.09) * gauss((ny + 0.12) ** 2, 0.17) * 0.16 + gauss(nx * nx, 0.12) * gauss((ny + 0.3) ** 2, 0.07) * 0.1;
      // brow ridge
      const brow = gauss((ny - 0.16) ** 2, 0.06) * gauss(nx * nx, 0.38) * 0.05;
      // eye sockets (slight recess)
      const sock = (gauss((nx - 0.33) ** 2 + (ny - 0.03) ** 2, 0.1) + gauss((nx + 0.33) ** 2 + (ny - 0.03) ** 2, 0.1)) * -0.035;
      // cheekbones + lips + chin
      const cheek = (gauss((nx - 0.5) ** 2 + (ny + 0.2) ** 2, 0.16) + gauss((nx + 0.5) ** 2 + (ny + 0.2) ** 2, 0.16)) * 0.03;
      const lip = gauss(nx * nx, 0.14) * gauss((ny + 0.52) ** 2, 0.05) * 0.04;
      const chin = gauss(nx * nx, 0.18) * gauss((ny + 0.78) ** 2, 0.08) * 0.04;
      const d = (nose + brow + sock + cheek + lip + chin) * R * nz;
      z += d * 1.0;
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  headGeo = g;
  return g;
}

/** Face painted in sphere-UV space so features wrap over the sculpted surface. */
const faceCache = new Map<string, THREE.CanvasTexture>();
type FaceKind = "red" | "white" | "black" | "dan" | `c${number}`;
function faceTex(kind: FaceKind, skin: string): THREE.CanvasTexture {
  const key = kind + skin;
  const hit = faceCache.get(key);
  if (hit) return hit;
  const W = 1024, Hh = 512;
  const c = document.createElement("canvas"); c.width = W; c.height = Hh;
  const x = c.getContext("2d")!;
  x.fillStyle = skin; x.fillRect(0, 0, W, Hh);
  // front centre is u=0.25; eye line ≈ v 0.47 (canvas y measured from top of head)
  const cx = W * 0.25, eye = Hh * 0.47;
  const px = (deg: number) => (deg / 360) * W; // horizontal degrees → px
  const E = (ax: number, ay: number, rx: number, ry: number, rot = 0) => { x.beginPath(); x.ellipse(ax, ay, rx, ry, rot, 0, Math.PI * 2); x.fill(); };
  const eyeDX = px(24);
  const drawEyes = (lid: string, iris: string, slant: number, smile = false) => {
    for (const s of [-1, 1]) {
      const ex = cx + s * eyeDX;
      if (smile) {
        x.strokeStyle = lid; x.lineWidth = 7; x.lineCap = "round";
        x.beginPath(); x.arc(ex, eye + 7, 17, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
      } else {
        x.fillStyle = "#f6f0e8"; E(ex, eye, 20, 9, s * slant);
        x.fillStyle = iris; E(ex + s * 1, eye + 0.5, 8.5, 8.5); x.fillStyle = "#fff"; E(ex + s * 1 - 3, eye - 3, 2.2, 2.2);
        x.strokeStyle = lid; x.lineWidth = 5;
        x.beginPath(); x.ellipse(ex, eye, 20, 9, s * slant, Math.PI * 1.0, Math.PI * 2.0); x.stroke();
      }
    }
  };
  const brows = (col: string, w: number, lift: number, len = 26) => {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = "round";
    for (const s of [-1, 1]) {
      const bx = cx + s * eyeDX;
      x.beginPath(); x.moveTo(bx - s * len * 0.9, eye - 16); x.quadraticCurveTo(bx, eye - 25 - lift, bx + s * len, eye - 22 - lift * 1.6); x.stroke();
    }
  };
  const mouth = (col: string, curve: number, open = false) => {
    const my = Hh * 0.655;
    if (open) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, my, 13, 7, 0, 0, Math.PI); x.fill(); return; }
    x.strokeStyle = col; x.lineWidth = 4.5; x.lineCap = "round";
    x.beginPath(); x.moveTo(cx - 15, my); x.quadraticCurveTo(cx, my + curve, cx + 15, my); x.stroke();
    x.fillStyle = col; E(cx, my + 3 + curve * 0.3, 7, 3);
  };
  if (kind === "red" || kind === "white" || kind === "black") {
    // 脸谱 mask: covers the whole front of the face, follows the head
    const base = kind === "red" ? "#b3201c" : kind === "white" ? "#f4efe6" : "#16120f";
    const accent = kind === "black" ? "#f4efe6" : "#16120f";
    x.fillStyle = base; E(cx, Hh * 0.52, px(62), Hh * 0.3);
    // 印堂 forehead mark
    x.fillStyle = kind === "white" ? "#b3201c" : kind === "red" ? "#16120f" : "#b3201c";
    x.beginPath(); x.moveTo(cx - 7, eye - 70); x.lineTo(cx + 7, eye - 70); x.lineTo(cx + 4, eye - 14); x.lineTo(cx - 4, eye - 14); x.fill();
    // upswept eye fields
    x.fillStyle = accent;
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * eyeDX * 1.05, eye - 2, 34, 15, s * -0.4, 0, Math.PI * 2); x.fill(); }
    if (kind === "white") { x.fillStyle = "#3a2a22"; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 10, eye + 40); x.quadraticCurveTo(cx + s * 40, eye + 30, cx + s * 70, eye + 60); x.lineWidth = 3; x.strokeStyle = "#3a2a22"; x.stroke(); } }
    brows("#0a0706", 9, 14, 34);
    drawEyes("#0a0706", "#120c0a", -0.35);
    mouth(kind === "black" ? "#f4efe6" : "#6a0c0c", 8);
    if (kind === "red") { x.strokeStyle = "#16120f"; x.lineWidth = 4; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 20, eye + 34); x.quadraticCurveTo(cx + s * 34, eye + 60, cx + s * 22, eye + 84); x.stroke(); } }
  } else if (kind === "dan") {
    // 旦角 rosy eye-shadow, phoenix eyes
    const g = x.createRadialGradient(cx, eye + 10, 10, cx, eye + 10, 110);
    g.addColorStop(0, "rgba(220,70,90,0.85)"); g.addColorStop(1, "rgba(220,70,90,0)");
    x.fillStyle = g; E(cx, eye + 10, px(50), 90);
    x.fillStyle = "#fbf4ee"; E(cx, eye + 90, px(26), 40);
    brows("#14100c", 5, 16, 30);
    drawEyes("#14100c", "#120c0a", -0.45);
    x.fillStyle = "#c01830"; E(cx, Hh * 0.655, 8, 6);
  } else {
    const n = Number(kind.slice(1));
    x.fillStyle = "rgba(205,110,95,0.22)"; E(cx - eyeDX * 1.3, eye + 40, 26, 14); E(cx + eyeDX * 1.3, eye + 40, 26, 14);
    brows("#2a1c14", 7, n === 2 ? 8 : 2);
    drawEyes("#2a1c14", "#1a120e", -0.12, n === 0 || n === 3);
    mouth("#8a3c30", n === 2 ? 3 : 9, n === 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  faceCache.set(key, t);
  return t;
}

function buildHead(face: FaceKind, skinHex: number, hairStyle: "cap" | "bun" | "queue" | "none", hat: THREE.Object3D | null): THREE.Group {
  const g = new THREE.Group();
  const skinCss = "#" + new THREE.Color(skinHex).getHexString();
  const head = new THREE.Mesh(sculptedHead(), new THREE.MeshPhysicalMaterial({ map: faceTex(face, skinCss), roughness: face === "red" || face === "white" || face === "black" ? 0.42 : 0.62, sheen: 0.25, sheenColor: new THREE.Color(0xffe0d0) }));
  head.castShadow = true;
  g.add(head);
  const skinM = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.26, 12, 10), skinM);
    ear.scale.set(0.45, 1, 0.75);
    ear.position.set(s * R * 0.9, -R * 0.05, -R * 0.05);
    g.add(ear);
  }
  const hairM = new THREE.MeshStandardMaterial({ color: 0x15110f, roughness: 0.45, metalness: 0.05 });
  if (hairStyle !== "none") {
    // hair volume over the cranium, hairline above the brow
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM);
    cap.scale.set(0.94, 1.16, 1.02);
    cap.rotation.x = -0.32;
    cap.position.y = R * 0.06;
    g.add(cap);
    if (hairStyle === "bun") {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(R * 0.42, 16, 12), hairM);
      bun.position.set(0, R * 1.2, -R * 0.35); g.add(bun);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, R * 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x5aa088, roughness: 0.3 }));
      pin.rotation.z = Math.PI / 2.3; pin.position.copy(bun.position); g.add(pin);
    } else if (hairStyle === "queue") {
      let prev = new THREE.Vector3(0, R * 0.3, -R * 0.95);
      for (let i = 0; i < 7; i++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(R * (0.2 - i * 0.015), 8, 6), hairM);
        seg.position.set(0, prev.y - R * 0.38, -R * 1.0 - i * 0.004); seg.scale.y = 1.5; g.add(seg); prev = seg.position;
      }
    }
  }
  if (hat) g.add(hat);
  return g;
}

/* ---------------- hats ---------------- */
function hatGuapi(): THREE.Group { // 瓜皮帽
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: 0x1a1414, roughness: 0.5 }));
  m.scale.set(0.95, 1.05, 1.05); m.position.y = R * 0.18; g.add(m);
  const k = new THREE.Mesh(new THREE.SphereGeometry(R * 0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0xa01c1c, roughness: 0.4 }));
  k.position.y = R * 1.32; g.add(k);
  return g;
}
function hatDouli(): THREE.Group { // 斗笠 woven straw
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.ConeGeometry(R * 3.0, R * 1.3, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xb8975e, roughness: 0.95, side: THREE.DoubleSide }));
  m.position.y = R * 1.35; g.add(m);
  return g;
}
function hatScholar(): THREE.Group { // 东坡巾-like scholar cap
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R * 1.0, R * 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.7 }));
  m.position.set(0, R * 1.0, -R * 0.05); m.rotation.y = Math.PI / 4; m.scale.set(1, 1, 0.9); g.add(m);
  for (const s of [-1, 1]) {
    const tie = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.35, R * 2.6), new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.8, side: THREE.DoubleSide }));
    tie.position.set(s * R * 0.35, R * -0.1, -R * 1.1); tie.rotation.x = 0.15; g.add(tie);
  }
  return g;
}
function opHelmet(gold: THREE.Material, color: number): THREE.Group { // 盔头 with 绒球 + 翎子
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.08, R * 1.12, R * 0.55, 28, 1, true), gold);
  band.position.y = R * 0.72; g.add(band);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  dome.position.y = R * 0.98; dome.scale.y = 0.7; g.add(dome);
  const pomM = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  for (let i = -2; i <= 2; i++) {
    const pom = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 10, 8), pomM);
    const a = i * 0.32; pom.position.set(Math.sin(a) * R * 1.12, R * (0.98 + (i === 0 ? 0.62 : 0.28)), Math.cos(a) * R * 1.12); g.add(pom);
  }
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(R * 0.16), new THREE.MeshStandardMaterial({ color: 0x3ab0a0, metalness: 0.5, roughness: 0.2 }));
  jewel.position.set(0, R * 0.76, R * 1.14); g.add(jewel);
  // 翎子: two long arching pheasant plumes sweeping back (never in front of the face)
  const plumeM = new THREE.MeshStandardMaterial({ color: 0xcfb58a, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) { const tt = k / 10; pts.push(new THREE.Vector3(s * (R * 0.4 + tt * 0.32), R * 1.3 + Math.sin(tt * Math.PI * 0.8) * 0.55, -R * 0.4 - tt * 0.45)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006, 5), plumeM);
    g.add(tube);
  }
  return g;
}

/* ---------------- costume textures ---------------- */
const robeTexCache = new Map<string, THREE.CanvasTexture>();
function mangpaoTex(base: number): THREE.CanvasTexture { // 蟒袍 with 海水江崖 hem and cloud roundels
  const key = String(base);
  const hit = robeTexCache.get(key); if (hit) return hit;
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#" + new THREE.Color(base).getHexString(); x.fillRect(0, 0, 512, 512);
  // lathe v runs bottom(0)→top(1); canvas y=512 is hem
  const cols = ["#1f4f8a", "#e8c860", "#f4efe2", "#2f7a6a", "#e8c860"];
  for (let i = 0; i < 10; i++) {
    x.strokeStyle = cols[i % cols.length]; x.lineWidth = 7;
    x.beginPath();
    for (let u = 0; u <= 512; u += 8) x.lineTo(u, 505 - i * 8 - Math.abs(((u / 32) % 2) - 1) * 14);
    x.stroke();
  }
  x.fillStyle = "#e8c860"; x.strokeStyle = "#e8c860"; x.lineWidth = 3;
  x.lineWidth = 4; x.lineCap = "round";
  for (let k = 0; k < 8; k++) { // 如意 cloud scrolls (祥云) on the body
    const ux = 32 + k * 64, uy = 210 + (k % 2) * 80;
    x.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.15) { const rr = 3 + a * 3.2; x.lineTo(ux + Math.cos(a) * rr, uy + Math.sin(a) * rr * 0.7); }
    x.stroke();
    x.beginPath(); x.moveTo(ux + 30, uy + 6); x.bezierCurveTo(ux + 44, uy - 14, ux + 60, uy + 10, ux + 50, uy + 22); x.stroke();
  }
  x.fillStyle = "#e8c860"; x.fillRect(0, 72, 512, 7); // collar band
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  robeTexCache.set(key, t); return t;
}

/* ---------------- body ---------------- */
type Arm = { shoulder: THREE.Group; elbow: THREE.Group; sleeve?: THREE.Mesh };

function makeArm(side: 1 | -1, sleeveM: THREE.Material, skinM: THREE.Material, wide: number, waterSleeve: THREE.Material | null): Arm {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.19, 1.37, 0);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06 + wide * 0.3, 0.3, 14, 1, true), sleeveM);
  upper.position.y = -0.15; upper.castShadow = true; shoulder.add(upper);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 10), sleeveM); cap.scale.set(1, 0.8, 1); shoulder.add(cap);
  const elbow = new THREE.Group(); elbow.position.y = -0.29; shoulder.add(elbow);
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.06 + wide * 0.3, 0.075 + wide, 0.27, 16, 1, true), sleeveM);
  fore.position.y = -0.135; fore.castShadow = true; elbow.add(fore);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), skinM);
  hand.scale.set(0.8, 1.15, 0.55); hand.position.y = -0.29; elbow.add(hand);
  let sleeve: THREE.Mesh | undefined;
  if (waterSleeve) { // 水袖: long white silk falling from the cuff
    const geo = new THREE.CylinderGeometry(0.05, 0.085, 0.5, 16, 6, true);
    geo.translate(0, -0.25, 0);
    sleeve = new THREE.Mesh(geo, waterSleeve);
    sleeve.scale.z = 0.45;
    sleeve.position.y = -0.27; elbow.add(sleeve);
    sleeve.userData.orig = (geo.attributes.position.array as Float32Array).slice();
  }
  return { shoulder, elbow, sleeve };
}

const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _e = new THREE.Euler();
export type HanAnim = (t: number) => void;

export function makeHanFigure(color: number, seed: number, scale: number, role: HanRole): THREE.Group {
  const r = rng(Math.floor(seed * 31 + 7));
  const root = new THREE.Group();
  const body = new THREE.Group(); // swaying part
  root.add(body);
  const skinHex = [0xe8c4a4, 0xdcb08c, 0xeccbb0, 0xcf9f7a][seed % 4];
  const skinM = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.62 });
  const performer = role === "performer";
  const kind = performer ? (["red", "white", "black", "dan"] as const)[seed % 4] : (`c${seed % 4}` as FaceKind);
  const shortJacket = role === "crowd" && seed % 3 === 1;

  // shoes
  const shoeM = new THREE.MeshStandardMaterial({ color: performer ? 0x111111 : 0x2a2018, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, performer ? 0.12 : 0.06, 0.2), shoeM);
    shoe.position.set(s * 0.09, performer ? 0.06 : 0.03, 0.03); root.add(shoe);
    if (performer) { const sole = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.04, 0.205), new THREE.MeshStandardMaterial({ color: 0xf0ece0 })); sole.position.set(s * 0.09, 0.02, 0.03); root.add(sole); }
  }

  let robeM: THREE.Material;
  if (performer) {
    const m = cloth(color, 0.9); m.map = mangpaoTex(color); m.color.set(0xffffff); robeM = m;
  } else robeM = cloth(color);
  const trimHex = new THREE.Color(color).multiplyScalar(0.55).getHex();
  const trimM = cloth(trimHex, 0.4);

  if (shortJacket) {
    // 短褂 + 裤
    const pantM = cloth(0x2a2a30, 0.3);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.78, 12), pantM); leg.position.set(s * 0.085, 0.43, 0); body.add(leg); }
    const prof = [[0.2, 0.78], [0.2, 0.86], [0.18, 1.05], [0.2, 1.25], [0.2, 1.36], [0.09, 1.44], [0.05, 1.47]].map(([a, b]) => new THREE.Vector2(a, b));
    const j = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), robeM); j.scale.z = 0.72; j.castShadow = true; body.add(j);
    for (let k = 0; k < 4; k++) { const knot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), trimM); knot.position.set(0.02, 0.95 + k * 0.1, 0.145); body.add(knot); } // 盘扣
  } else {
    const hem = performer ? 0.33 : 0.27;
    const prof = [[hem, 0.03], [hem * 0.93, 0.3], [0.2, 0.75], [0.17, 0.98], [0.19, 1.2], [0.2, 1.36], [0.09, 1.44], [0.05, 1.47]].map(([a, b]) => new THREE.Vector2(a, b));
    const robe = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), robeM); robe.scale.z = 0.74; robe.castShadow = true; body.add(robe);
    if (!performer) { // 长衫 side seam + collar
      const coll = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 18), trimM); coll.rotation.x = Math.PI / 2; coll.position.y = 1.45; body.add(coll);
    }
  }
  // cross collar (交领) for all
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.15, 0.008), performer ? new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.6 }) : trimM);
  col.visible = performer || shortJacket;
  col.position.set(0.03, 1.36, 0.14); col.rotation.z = 0.55; body.add(col);
  if (performer) { // 玉带 jade belt, worn loose and tilted
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.018, 8, 36), new THREE.MeshStandardMaterial({ color: 0xd8b84a, metalness: 0.6, roughness: 0.3 }));
    belt.rotation.x = Math.PI / 2 + 0.06; belt.scale.y = 0.8; belt.position.set(0, 0.98, 0.02); body.add(belt);
    for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.3; const jade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.012), new THREE.MeshStandardMaterial({ color: 0x7ac0a0, roughness: 0.25 })); jade.position.set(Math.sin(a) * 0.205, 0.98 - Math.cos(a) * 0.012, Math.cos(a) * 0.165); jade.rotation.y = a; body.add(jade); }
  }
  if (performer) {
    const yc = document.createElement("canvas"); yc.width = 512; yc.height = 64;
    const yx = yc.getContext("2d")!;
    yx.fillStyle = "#e8c860"; yx.fillRect(0, 0, 512, 64);
    yx.fillStyle = "#" + new THREE.Color(color).clone().multiplyScalar(0.6).getHexString();
    for (let k = 0; k < 16; k++) { yx.beginPath(); yx.arc(16 + k * 32, 40, 12, 0, Math.PI * 2); yx.fill(); }
    const yt = new THREE.CanvasTexture(yc); yt.colorSpace = THREE.SRGBColorSpace;
    const prof2 = [[0.255, 1.3], [0.22, 1.37], [0.15, 1.42], [0.07, 1.45]].map(([a, b]) => new THREE.Vector2(a, b));
    const yun = new THREE.Mesh(new THREE.LatheGeometry(prof2, 36), new THREE.MeshStandardMaterial({ map: yt, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
    yun.scale.z = 0.8; body.add(yun);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.12, 12), skinM); neck.position.y = 1.47; body.add(neck);

  // head
  const hairStyle = performer ? "cap" : (["queue", "bun", "cap", "queue"] as const)[seed % 4];
  let hat: THREE.Object3D | null = null;
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8aa3c, metalness: 0.75, roughness: 0.3 });
  if (performer) hat = kind === "dan" ? null : opHelmet(gold, color === 0xd8a820 ? 0xb8202a : 0xd02a2a);
  else { const h = seed % 5; hat = h === 0 ? hatDouli() : h === 1 ? hatGuapi() : h === 3 ? hatScholar() : null; }
  const headG = buildHead(kind, skinHex, kind === "dan" ? "bun" : hairStyle, hat);
  headG.position.y = H_HEAD + 0.015;
  headG.scale.setScalar(1.14);
  body.add(headG);

  // arms
  const wide = performer ? 0.03 : shortJacket ? 0 : 0.02;
  const waterM = performer ? new THREE.MeshPhysicalMaterial({ color: 0xf6f3ec, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }) : null;
  const L = makeArm(1, performer ? cloth(color, 0.9) : robeM, skinM, wide, waterM);
  const Rr = makeArm(-1, performer ? cloth(color, 0.9) : robeM, skinM, wide, waterM);
  body.add(L.shoulder, Rr.shoulder);

  // 靠旗: four flags on the back, splayed wide and behind the head so the face stays clear
  if (performer && kind !== "dan") {
    const flagM = new THREE.MeshStandardMaterial({ map: flagTex(color), side: THREE.DoubleSide, roughness: 0.7 });
    for (let k = 0; k < 4; k++) {
      const s = k < 2 ? -1 : 1, hi = k % 2;
      const pole = new THREE.Group();
      pole.position.set(s * 0.06, 1.3, -0.17);
      pole.rotation.z = s * (0.55 + hi * 0.38);
      pole.rotation.x = -0.18;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.78, 5), gold); stick.position.y = 0.39; pole.add(stick);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.5), flagM); flag.position.set(s * 0.1, 0.48, 0); pole.add(flag);
      body.add(pole);
    }
  }

  root.scale.setScalar(scale * (performer ? 1.0 : 0.93 + r() * 0.1));

  // ---- animation ----
  const ph = r() * 6.28;
  const base = { lz: 0.12 + r() * 0.08, rz: -(0.12 + r() * 0.08), lx: -0.15 - r() * 0.2, rx: -0.15 - r() * 0.2, le: -0.35 - r() * 0.5, re: -0.35 - r() * 0.5 };
  const crowdMode = seed % 6; // 0 clap, 1 hands clasped (拱手), 2 fan, others idle
  if (role === "crowd" && crowdMode === 2) {
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16, 0, Math.PI * 0.75), new THREE.MeshStandardMaterial({ color: 0xf0e6d0, side: THREE.DoubleSide, roughness: 0.8 }));
    fan.position.set(0, -0.3, 0.02); fan.rotation.set(-1.2, 0, 0.9); Rr.elbow.add(fan);
  }
  const anim: HanAnim = (t) => {
    const tt = t + ph;
    if (performer) {
      // 6 s 程式 loop: 起霸 raise → 亮相 hold → 抖袖 flick → settle
      const cyc = (tt % 6) / 6;
      const ease = (a: number, b: number) => { const k = Math.min(1, Math.max(0, (cyc - a) / (b - a))); return k * k * (3 - 2 * k); };
      const up = ease(0.05, 0.3) * (1 - ease(0.72, 0.95));
      const flick = Math.sin(Math.min(1, Math.max(0, (cyc - 0.5) / 0.2)) * Math.PI);
      Rr.shoulder.rotation.set(-0.3 - up * 1.9, 0, -0.35 - up * 0.6);
      Rr.elbow.rotation.set(-0.5 - up * 0.7, 0, 0);
      L.shoulder.rotation.set(-0.7 - up * 0.3, 0, 0.55 + up * 0.25);
      L.elbow.rotation.set(-1.1 + flick * 0.5, 0, 0);
      body.rotation.y = Math.sin(cyc * Math.PI * 2) * 0.25;
      body.rotation.z = up * 0.04;
      headG.rotation.set(-0.05 + up * 0.08, -Math.sin(cyc * Math.PI * 2) * 0.2 + up * 0.25, 0);
      root.updateMatrixWorld(true);
      for (const a of [L, Rr]) {
        const s = a.sleeve; if (!s) continue;
        // hang the silk toward the ground (gravity), with a little swing and a flick on the left
        a.elbow.getWorldQuaternion(_q1); root.getWorldQuaternion(_q2);
        s.quaternion.copy(_q1.invert().multiply(_q2));
        _e.set(Math.sin(tt * 2.2) * 0.15 + (a === L ? -flick * 0.9 : 0), 0, Math.sin(tt * 1.7 + 1) * 0.1);
        s.quaternion.multiply(_q3.setFromEuler(_e));
      }
    } else {
      const br = Math.sin(tt * 1.3) * 0.012;
      body.position.y = br * 0.3;
      body.rotation.z = Math.sin(tt * 0.5) * 0.02;
      headG.rotation.set(Math.sin(tt * 0.4) * 0.05 - 0.04, Math.sin(tt * 0.23) * 0.25, Math.sin(tt * 0.31) * 0.04);
      if (role === "crowd" && crowdMode === 0) { // clapping in bursts
        const burst = Math.max(0, Math.sin(tt * 0.35)) > 0.75 ? Math.abs(Math.sin(tt * 9)) : 0;
        L.shoulder.rotation.set(-0.75, -0.25, 0.25 - burst * 0.12); Rr.shoulder.rotation.set(-0.75, 0.25, -0.25 + burst * 0.12);
        L.elbow.rotation.set(-1.0, 0, 0); Rr.elbow.rotation.set(-1.0, 0, 0);
      } else if (role === "crowd" && crowdMode === 1) { // 拱手 hands clasped at chest
        L.shoulder.rotation.set(-0.55, -0.3, 0.3); Rr.shoulder.rotation.set(-0.55, 0.3, -0.3);
        L.elbow.rotation.set(-1.45 + br * 4, 0, 0); Rr.elbow.rotation.set(-1.45 + br * 4, 0, 0);
      } else if (role === "crowd" && crowdMode === 2) { // fanning
        L.shoulder.rotation.set(base.lx, 0, base.lz); L.elbow.rotation.set(base.le, 0, 0);
        Rr.shoulder.rotation.set(-0.9, 0.2, -0.3); Rr.elbow.rotation.set(-1.3 + Math.sin(tt * 4) * 0.25, 0, 0);
      } else {
        L.shoulder.rotation.set(base.lx + br * 2, 0, base.lz); Rr.shoulder.rotation.set(base.rx + br * 2, 0, base.rz);
        L.elbow.rotation.set(base.le, 0, 0); Rr.elbow.rotation.set(base.re, 0, 0);
      }
    }
  };
  anim(0);
  root.userData.anim = anim;
  root.userData.han = true;
  return root;
}

const flagCache = new Map<number, THREE.CanvasTexture>();
function flagTex(color: number): THREE.CanvasTexture {
  const hit = flagCache.get(color); if (hit) return hit;
  const c = document.createElement("canvas"); c.width = 128; c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#" + new THREE.Color(color).getHexString(); x.fillRect(0, 0, 128, 256);
  x.strokeStyle = "#e8c860"; x.lineWidth = 8; x.strokeRect(6, 6, 116, 244);
  x.fillStyle = "#e8c860"; x.beginPath(); x.arc(64, 128, 26, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#" + new THREE.Color(color).getHexString(); x.beginPath(); x.arc(64, 128, 14, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; flagCache.set(color, t); return t;
}
