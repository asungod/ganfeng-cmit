import type { ImageId, MoodId } from "../data/tengwang";

export class DuskPainting {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private disposed = false;
  private t0 = performance.now();
  mood: MoodId = "luoxia";
  focus: ImageId | null = "luoxia";
  private birdX = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.resize();
    this.loop();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 960;
    const h = this.canvas.clientHeight || 540;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.draw(performance.now() - this.t0);
  };

  private draw(ms: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth || 960;
    const h = this.canvas.clientHeight || 540;
    const t = ms / 1000;
    const horizon = h * 0.58;
    const pal = palette(this.mood, this.focus);

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, pal.zenith);
    sky.addColorStop(0.45, pal.mid);
    sky.addColorStop(0.78, pal.glow);
    sky.addColorStop(1, pal.rim);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // v52: horizontal 落霞 band — no circular sun orb
    const sx = w * 0.32;
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const band = ctx.createLinearGradient(0, horizon - h * (0.22 - i * 0.03), 0, horizon + 2);
      band.addColorStop(0, "rgba(0,0,0,0)");
      band.addColorStop(0.35, pal.sunSoft);
      band.addColorStop(0.75, pal.sun);
      band.addColorStop(1, pal.rim);
      ctx.globalAlpha = 0.22 + i * 0.06;
      ctx.fillStyle = band;
      ctx.fillRect(w * 0.02, horizon - h * (0.2 - i * 0.025), w * 0.72, h * (0.22 - i * 0.02));
    }
    // v52: flatter gold ribbon (no radial core that reads as a sun disc)
    ctx.globalAlpha = 0.5;
    const eg = ctx.createLinearGradient(0, horizon - h * 0.08, 0, horizon + 4);
    eg.addColorStop(0, "rgba(0,0,0,0)");
    eg.addColorStop(0.4, pal.sunSoft);
    eg.addColorStop(0.75, pal.sun);
    eg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = eg;
    ctx.fillRect(w * 0.04, horizon - h * 0.09, w * 0.7, h * 0.12);
    ctx.restore();

    // distant hills
    ctx.fillStyle = pal.hillFar;
    hill(ctx, w, horizon, 0.18, 32, 1.1);
    ctx.fillStyle = pal.hillNear;
    hill(ctx, w, horizon, 0.28, 18, 2.4);

    // water
    const water = ctx.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, pal.waterTop);
    water.addColorStop(1, pal.waterBot);
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, w, h - horizon);

    // reflection shimmer
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 28; i++) {
      const y = horizon + 8 + i * ((h - horizon) / 28);
      const wob = Math.sin(t * 1.4 + i * 0.45) * 18;
      ctx.fillStyle = i % 2 === 0 ? pal.glow : pal.sun;
      ctx.fillRect(sx - 90 + wob, y, 180 - i * 3, 2);
    }
    ctx.restore();

    // 寒潭 darker pocket
    if (this.focus === "hantan" || this.mood === "sanyan") {
      ctx.fillStyle = "rgba(18, 40, 48, 0.35)";
      ctx.beginPath();
      ctx.ellipse(w * 0.16, h * 0.72, w * 0.12, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // fishing boats
    boat(ctx, w * 0.22, h * 0.74, 0.9, pal.boat);
    boat(ctx, w * 0.3, h * 0.78, 0.7, pal.boat);
    if (this.mood === "yuzhou" || this.focus === "yuzhou") {
      boat(ctx, w * 0.18, h * 0.8, 1.05, pal.boat);
    }

    // 孤鹜
    this.birdX = (this.birdX + 0.25) % (w + 80);
    const birdY = horizon - 40 + Math.sin(t * 1.2) * 10;
    duck(ctx, this.birdX - 40, birdY, pal.bird, this.focus === "guwu");

    // 雁阵
    if (this.mood === "yanzhen" || this.focus === "yanzhen") {
      geese(ctx, w * 0.7, h * 0.16, pal.bird);
    }

    // pavilion
    pavilion(ctx, w * 0.78, horizon - 10, h * 0.42, pal, this.focus === "feige");

    // mist
    ctx.fillStyle = pal.mist;
    ctx.fillRect(0, horizon - 12, w, 28);

    // vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(8,6,4,0.62)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}

type Pal = {
  zenith: string;
  mid: string;
  glow: string;
  rim: string;
  sun: string;
  sunSoft: string;
  hillFar: string;
  hillNear: string;
  waterTop: string;
  waterBot: string;
  boat: string;
  bird: string;
  mist: string;
  wood: string;
  dan: string;
};

function palette(mood: MoodId, focus: ImageId | null): Pal {
  const dusk: Pal = {
    zenith: "#1a1d38",
    mid: "#a24a3a",
    glow: "#e89b55",
    rim: "#f2d7a2",
    sun: "rgba(255,220,150,0.95)",
    sunSoft: "rgba(232,110,60,0.45)",
    hillFar: "#4a2c3a",
    hillNear: "#2a1a22",
    waterTop: "#c98962",
    waterBot: "#1c242c",
    boat: "#1a120e",
    bird: "#1a120e",
    mist: "rgba(242,215,162,0.18)",
    wood: "#2b1812",
    dan: "#8c2d24",
  };
  if (mood === "sanyan") {
    return {
      ...dusk,
      zenith: "#2a3348",
      mid: "#6d5a72",
      glow: "#c9a07a",
      rim: "#d8c4a8",
      hillFar: "#3d4450",
      waterTop: "#8aa0a8",
      waterBot: "#1c2a30",
      mist: "rgba(200,220,220,0.22)",
    };
  }
  if (mood === "yuzhou") {
    return {
      ...dusk,
      zenith: "#1c2438",
      mid: "#7a4a48",
      glow: "#d4895a",
      waterTop: "#3a4a55",
      waterBot: "#101820",
    };
  }
  if (mood === "yanzhen") {
    return {
      ...dusk,
      zenith: "#14182a",
      mid: "#5a3a48",
      glow: "#b86a55",
      rim: "#d8b08a",
      waterTop: "#6a5a58",
      waterBot: "#121418",
    };
  }
  if (focus === "changtian") {
    return { ...dusk, zenith: "#2a3a58", mid: "#7a8aaa", glow: "#c5d2dc", rim: "#dce6ea", waterTop: "#c5d2dc" };
  }
  return dusk;
}

function hill(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizon: number,
  amp: number,
  n: number,
  seed: number,
): void {
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const y = horizon - Math.sin(i * seed) * 40 * amp - Math.sin(i * 0.7 + seed) * 24 * amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, horizon + 20);
  ctx.lineTo(0, horizon + 20);
  ctx.closePath();
  ctx.fill();
}

function boat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.quadraticCurveTo(0, 10, 28, 0);
  ctx.quadraticCurveTo(0, 4, -28, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(8, -22);
  ctx.lineTo(12, 0);
  ctx.fill();
  ctx.restore();
}

function duck(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, hot: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = hot ? "#3a1a12" : color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -2);
  ctx.quadraticCurveTo(18, -10, 26, -4);
  ctx.quadraticCurveTo(16, -2, 8, 0);
  ctx.fill();
  if (hot) {
    ctx.strokeStyle = "rgba(232,155,85,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function geese(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const side = i < 5 ? -1 : 1;
    const k = i < 5 ? i : i - 4;
    const gx = x + side * k * 16;
    const gy = y + k * 9;
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy);
    ctx.lineTo(gx, gy - 3);
    ctx.lineTo(gx + 6, gy);
    ctx.stroke();
  }
  ctx.restore();
}

function pavilion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  pal: Pal,
  hot: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = h / 220;
  ctx.scale(s, s);
  // terrace
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(-90, 0, 180, 18);
  ctx.fillRect(-110, 14, 220, 10);
  // body
  ctx.fillStyle = pal.wood;
  ctx.fillRect(-48, -92, 96, 92);
  ctx.fillStyle = pal.dan;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(-42, -86, 12, 70);
  ctx.fillRect(30, -86, 12, 70);
  ctx.globalAlpha = 1;
  // floors
  roof(ctx, 0, -92, 130, pal);
  roof(ctx, 0, -148, 100, pal);
  roof(ctx, 0, -198, 70, pal);
  if (hot) {
    ctx.strokeStyle = "rgba(198,161,91,0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-70, -210, 140, 230);
  }
  ctx.restore();
}

function roof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, pal: Pal): void {
  ctx.fillStyle = pal.dan;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.7, y - 8, x - w * 0.62, y - 22);
  ctx.lineTo(x, y - 36);
  ctx.lineTo(x + w * 0.62, y - 22);
  ctx.quadraticCurveTo(x + w * 0.7, y - 8, x + w / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#120c0a";
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 8, y);
  ctx.lineTo(x, y - 28);
  ctx.lineTo(x + w / 2 - 8, y);
  ctx.closePath();
  ctx.fill();
}
