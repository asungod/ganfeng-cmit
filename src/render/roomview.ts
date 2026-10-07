import type { HourId, RoomId } from "../data/hakka";

type Pal = { sky: string; wall: string; wood: string; floor: string; lamp: string; dark: string };

export class RoomView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private disposed = false;
  private t0 = performance.now();
  room: RoomId = "menlou";
  hour: HourId = "dusk";

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
    const w = this.canvas.clientWidth || 720;
    const h = this.canvas.clientHeight || 480;
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
    this.draw((performance.now() - this.t0) / 1000);
  };

  private draw(t: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth || 720;
    const h = this.canvas.clientHeight || 480;
    const pal = hourPal(this.hour);
    ctx.fillStyle = pal.sky;
    ctx.fillRect(0, 0, w, h);
    roomScene(ctx, w, h, this.room, pal, t);
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, w * 0.18, w * 0.5, h * 0.5, w * 0.78);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, this.hour === "night" ? "rgba(0,0,0,0.62)" : "rgba(8,6,4,0.38)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = grain(ctx, "film", "#808080");
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

function hourPal(hour: HourId): Pal {
  if (hour === "dawn") return { sky: "#8aa0a8", wall: "#6a5a4a", wood: "#3a2a1e", floor: "#5a4a38", lamp: "#f0d8a8", dark: "#2a2420" };
  if (hour === "noon") return { sky: "#c9d6dc", wall: "#8a7860", wood: "#4a3424", floor: "#7a684c", lamp: "#fff6dc", dark: "#3a3228" };
  if (hour === "night") return { sky: "#12141c", wall: "#2a221c", wood: "#1a120e", floor: "#1c1612", lamp: "#e8b060", dark: "#080604" };
  return { sky: "#c47a48", wall: "#5a4030", wood: "#2b1812", floor: "#3a2a1e", lamp: "#ffc078", dark: "#1a100c" };
}

function roomScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  room: RoomId,
  pal: Pal,
  t: number,
): void {
  const fl = h * 0.72;
  // perspective box
  ctx.fillStyle = pal.floor;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.22, fl);
  ctx.lineTo(w * 0.78, fl);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = shade(pal.floor, 0.72);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (let i = 1; i < 8; i++) {
    const k = i / 8;
    ctx.beginPath();
    ctx.moveTo(w * k, h);
    ctx.lineTo(w * (0.22 + 0.56 * k), fl);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 地面：透视方砖缝 + 颗粒
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.22, fl);
  ctx.lineTo(w * 0.78, fl);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = grain(ctx, "floor", pal.floor);
  ctx.fillRect(0, fl, w, h - fl);
  ctx.strokeStyle = shade(pal.floor, 0.6);
  ctx.globalAlpha = 0.4;
  for (let i = 1; i < 9; i++) {
    const k = Math.pow(i / 9, 1.8);
    const y = fl + (h - fl) * k;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const fg = ctx.createLinearGradient(0, fl, 0, h);
  fg.addColorStop(0, "rgba(255,214,160,0.10)");
  fg.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = fg;
  ctx.fillRect(0, fl, w, h - fl);
  ctx.restore();

  // 两侧夯土墙：分层夯筑线朝灭点收拢
  for (const side of [0, 1]) {
    const ex = side === 0 ? 0 : w;
    const ix = side === 0 ? w * 0.22 : w * 0.78;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ex, 0);
    ctx.lineTo(ix, h * 0.16);
    ctx.lineTo(ix, fl);
    ctx.lineTo(ex, h);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = grain(ctx, "earth", pal.wall);
    ctx.fillRect(Math.min(ex, ix), 0, Math.abs(ix - ex), h);
    ctx.strokeStyle = shade(pal.wall, 0.78);
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 14; i++) {
      const f = i / 14;
      ctx.globalAlpha = 0.28 + (i % 3) * 0.08;
      ctx.beginPath();
      ctx.moveTo(ex, f * h);
      ctx.lineTo(ix, h * 0.16 + f * (fl - h * 0.16));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const lg = ctx.createLinearGradient(ex, 0, ix, 0);
    lg.addColorStop(0, "rgba(0,0,0,0.42)");
    lg.addColorStop(1, "rgba(0,0,0,0.04)");
    ctx.fillStyle = lg;
    ctx.fillRect(Math.min(ex, ix), 0, Math.abs(ix - ex), h);
    ctx.restore();
  }

  // 正面墙
  ctx.fillStyle = grain(ctx, "earth", shade(pal.wall, 1.08));
  ctx.fillRect(w * 0.22, h * 0.16, w * 0.56, fl - h * 0.16);
  const bg = ctx.createLinearGradient(0, h * 0.16, 0, fl);
  bg.addColorStop(0, "rgba(0,0,0,0.30)");
  bg.addColorStop(0.5, "rgba(0,0,0,0.04)");
  bg.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = bg;
  ctx.fillRect(w * 0.22, h * 0.16, w * 0.56, fl - h * 0.16);

  // 顶：室内为椽子屋顶；禾坪、天井露天
  const open = room === "heping" || room === "tianjing";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w * 0.78, h * 0.16);
  ctx.lineTo(w * 0.22, h * 0.16);
  ctx.closePath();
  if (open) {
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.16);
    sg.addColorStop(0, shade(pal.sky, 0.82));
    sg.addColorStop(1, pal.sky);
    ctx.fillStyle = sg;
    ctx.fill();
  } else {
    ctx.fillStyle = shade(pal.wood, 0.75);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = shade(pal.wood, 1.5);
    ctx.lineWidth = 3;
    for (let i = 0; i <= 16; i++) {
      const k = i / 16;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(w * k, 0);
      ctx.lineTo(w * (0.22 + 0.56 * k), h * 0.16);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // 墙角与墙脚的暗部（环境光遮蔽）
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.22, fl);
  ctx.lineTo(w * 0.78, fl);
  ctx.lineTo(w, h);
  ctx.moveTo(w * 0.22, h * 0.16);
  ctx.lineTo(w * 0.22, fl);
  ctx.moveTo(w * 0.78, h * 0.16);
  ctx.lineTo(w * 0.78, fl);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = pal.wood;
  ctx.lineWidth = 6;
  ctx.strokeRect(w * 0.22, h * 0.16, w * 0.56, fl - h * 0.16);

  if (room === "menlou") gate(ctx, w, h, fl, pal, t);
  else if (room === "heping") yard(ctx, w, h, fl, pal, t);
  else if (room === "tianjing") well(ctx, w, h, fl, pal, t);
  else if (room === "zutang") hall(ctx, w, h, fl, pal, t);
  else if (room === "jiaolou") tower(ctx, w, h, fl, pal, t);
  else if (room === "xiangdao") lane(ctx, w, h, fl, pal, t);
  else chamber(ctx, w, h, fl, pal, room === "zhengwu");

  const names: Record<RoomId, string> = {
    menlou: "门楼",
    heping: "禾坪",
    tianjing: "天井",
    zutang: "祖堂",
    zhengwu: "正屋",
    hengwu: "横屋",
    jiaolou: "角楼",
    xiangdao: "巷道",
  };
  ctx.fillStyle = pal.lamp;
  ctx.globalAlpha = 0.9;
  ctx.font = "600 22px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText(names[room], w * 0.5, h * 0.13);
  ctx.globalAlpha = 1;
}

function gate(ctx: CanvasRenderingContext2D, w: number, h: number, fl: number, pal: Pal, t: number): void {
  const x = w * 0.36;
  const gw = w * 0.28;
  const dusk = ctx.createLinearGradient(x, h * 0.22, x, fl);
  dusk.addColorStop(0, pal.sky);
  dusk.addColorStop(1, shade(pal.sky, 0.55));
  ctx.fillStyle = dusk;
  ctx.fillRect(x, h * 0.22, gw, fl - h * 0.22);
  ctx.fillStyle = pal.wood;
  ctx.fillRect(x - 22, h * 0.18, 22, fl - h * 0.18);
  ctx.fillRect(x + gw, h * 0.18, 22, fl - h * 0.18);
  ctx.fillRect(x - 36, h * 0.15, gw + 72, 28);
  ctx.fillStyle = "#8c2d24";
  ctx.fillRect(x + gw * 0.18, h * 0.155, gw * 0.64, 22);
  ctx.fillStyle = pal.lamp;
  ctx.font = "600 13px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText("围  屋", x + gw / 2, h * 0.175);
  ctx.globalAlpha = 0.4 + Math.sin(t) * 0.08;
  ctx.fillRect(x + 12, h * 0.3, gw - 24, 8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = shade(pal.floor, 0.65);
  ctx.fillRect(w * 0.28, fl - 10, w * 0.44, 18);
  ctx.fillStyle = pal.wood;
  ctx.fillRect(x - 8, fl - 42, 10, 36);
  ctx.fillRect(x + gw - 2, fl - 42, 10, 36);
}

function yard(ctx: CanvasRenderingContext2D, w: number, h: number, fl: number, pal: Pal, _t: number): void {
  ctx.fillStyle = pal.sky;
  ctx.fillRect(w * 0.22, h * 0.16, w * 0.56, h * 0.26);
  ctx.fillStyle = shade(pal.floor, 1.12);
  for (let i = 0; i < 12; i++) {
    ctx.globalAlpha = 0.22;
    ctx.fillRect(w * 0.26 + (i % 4) * w * 0.12, fl - 28 - Math.floor(i / 4) * 16, w * 0.1, 10);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.wood;
  ctx.fillRect(w * 0.28, h * 0.44, w * 0.44, 6);
  ctx.fillRect(w * 0.3, h * 0.44, 5, fl - h * 0.44);
  ctx.fillRect(w * 0.68, h * 0.44, 5, fl - h * 0.44);
  ctx.fillStyle = shade(pal.lamp, 0.7);
  ctx.fillRect(w * 0.34, h * 0.5, w * 0.08, 22);
  ctx.fillRect(w * 0.46, h * 0.5, w * 0.08, 22);
  ctx.fillRect(w * 0.58, h * 0.5, w * 0.08, 22);
  ctx.fillStyle = pal.lamp;
  ctx.font = "12px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText("凉晒", w * 0.5, fl - 14);
}

function well(ctx: CanvasRenderingContext2D, w: number, h: number, fl: number, pal: Pal, t: number): void {
  ctx.fillStyle = pal.sky;
  ctx.fillRect(w * 0.32, h * 0.18, w * 0.36, h * 0.26);
  ctx.strokeStyle = pal.wood;
  ctx.lineWidth = 6;
  ctx.strokeRect(w * 0.32, h * 0.18, w * 0.36, h * 0.26);
  ctx.fillStyle = "rgba(180,210,220,0.16)";
  ctx.fillRect(w * 0.32, h * 0.18, w * 0.36, h * 0.26);
  ctx.fillStyle = shade(pal.floor, 0.8);
  ctx.beginPath();
  ctx.ellipse(w * 0.5, fl - 8, w * 0.14, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(pal.wall, 0.7);
  ctx.beginPath();
  ctx.ellipse(w * 0.5, fl - 8, w * 0.1, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(40,80,90,0.55)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, fl - 8, w * 0.07, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = pal.wood;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, fl - 22);
  ctx.lineTo(w * 0.58, fl - 22);
  ctx.stroke();
  ctx.globalAlpha = 0.35 + Math.sin(t) * 0.08;
  ctx.strokeStyle = pal.lamp;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.2);
  ctx.lineTo(w * 0.5, fl - 16);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.lamp;
  ctx.font = "12px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText("天井采光", w * 0.5, h * 0.34);
}

function hall(ctx: CanvasRenderingContext2D, w: number, h: number, fl: number, pal: Pal, t: number): void {
  ctx.fillStyle = shade(pal.wall, 0.62);
  ctx.fillRect(w * 0.22, h * 0.16, w * 0.56, fl - h * 0.16);
  ctx.strokeStyle = pal.wood;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.22);
  ctx.lineTo(w * 0.78, h * 0.22);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (const x of [0.34, 0.5, 0.66]) {
    ctx.beginPath();
    ctx.moveTo(w * x, h * 0.16);
    ctx.lineTo(w * x, fl);
    ctx.stroke();
  }
  ctx.fillStyle = "#6b1c18";
  ctx.fillRect(w * 0.3, h * 0.22, w * 0.4, h * 0.38);
  ctx.strokeStyle = "#c6a15b";
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.32, h * 0.24, w * 0.36, h * 0.34);
  const tabs = [
    { x: 0.36, label: "昭" },
    { x: 0.47, label: "堂" },
    { x: 0.58, label: "穆" },
  ];
  for (const tab of tabs) {
    ctx.fillStyle = "#c6a15b";
    ctx.fillRect(w * tab.x, h * 0.3, w * 0.08, h * 0.2);
    ctx.fillStyle = "#6b1c18";
    ctx.font = "600 16px 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    ctx.fillText(tab.label, w * tab.x + w * 0.04, h * 0.42);
  }
  ctx.fillStyle = pal.wood;
  ctx.fillRect(w * 0.28, fl - 36, w * 0.44, 16);
  ctx.fillStyle = shade(pal.lamp, 0.85);
  ctx.fillRect(w * 0.38, fl - 48, w * 0.24, 12);
  ctx.fillStyle = pal.lamp;
  ctx.globalAlpha = 0.55 + Math.sin(t * 2) * 0.12;
  ctx.beginPath();
  ctx.arc(w * 0.44, fl - 56, 4, 0, Math.PI * 2);
  ctx.arc(w * 0.5, fl - 60, 5, 0, Math.PI * 2);
  ctx.arc(w * 0.56, fl - 56, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.2 + Math.sin(t * 1.4) * 0.06;
  ctx.fillStyle = pal.lamp;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, fl - 78, 10, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#8c2d24";
  ctx.fillRect(w * 0.24, h * 0.26, 10, h * 0.28);
  ctx.fillRect(w * 0.74 - 10, h * 0.26, 10, h * 0.28);
  ctx.fillStyle = pal.lamp;
  ctx.font = "11px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  // 竖排：逐字直立排列（不旋转）
  [..."慎终追远"].forEach((ch, i) => ctx.fillText(ch, w * 0.24 + 5, h * 0.31 + i * 14));
  ctx.fillStyle = "#c6a15b";
  ctx.fillRect(w * 0.32, fl - 8, w * 0.36, 6);
}

function tower(ctx: CanvasRenderingContext2D, w: number, h: number, fl: number, pal: Pal, t: number): void {
  ctx.fillStyle = shade(pal.wall, 0.55);
  ctx.fillRect(w * 0.22, h * 0.16, w * 0.56, fl - h * 0.16);
  ctx.fillStyle = pal.wood;
  ctx.fillRect(w * 0.22, h * 0.38, w * 0.56, 8);
  const ports: [number, number][] = [
    [0.3, 0.24],
    [0.5, 0.24],
    [0.7, 0.24],
    [0.3, 0.48],
    [0.5, 0.48],
    [0.7, 0.48],
  ];
  for (const [x, y] of ports) {
    ctx.fillStyle = pal.dark;
    ctx.fillRect(w * x - 14, h * y, 12, 28);
    ctx.fillStyle = pal.sky;
    ctx.globalAlpha = 0.7 + Math.sin(t + x) * 0.1;
    ctx.fillRect(w * x - 11, h * y + 4, 6, 18);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = pal.wood;
  ctx.fillRect(w * 0.62, h * 0.42, 10, fl - h * 0.42);
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(w * 0.62, h * 0.46 + i * 14, 22, 4);
  }
  ctx.fillStyle = pal.lamp;
  ctx.font = "12px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText("炮眼 · 瞭望", w * 0.5, h * 0.2);
}

function lane(ctx: CanvasRenderingContext2D, w: number, h: number, fl: number, pal: Pal, _t: number): void {
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, h * 0.16);
  ctx.lineTo(w * 0.6, h * 0.16);
  ctx.lineTo(w * 0.74, fl);
  ctx.lineTo(w * 0.26, fl);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.floor;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, fl);
  ctx.lineTo(w * 0.47, h * 0.2);
  ctx.lineTo(w * 0.53, h * 0.2);
  ctx.lineTo(w * 0.6, fl);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.wood;
  ctx.fillRect(w * 0.3, h * 0.32, 18, fl - h * 0.36);
  ctx.fillRect(w * 0.7 - 18, h * 0.32, 18, fl - h * 0.36);
  ctx.fillStyle = shade(pal.lamp, 0.5);
  ctx.fillRect(w * 0.305, h * 0.36, 10, 28);
  ctx.fillRect(w * 0.7 - 13, h * 0.5, 10, 28);
  ctx.strokeStyle = pal.wood;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.22);
  ctx.lineTo(w * 0.58, h * 0.22);
  ctx.stroke();
}

function chamber(ctx: CanvasRenderingContext2D, w: number, h: number, fl: number, pal: Pal, formal: boolean): void {
  ctx.fillStyle = pal.wood;
  ctx.fillRect(w * 0.26, fl - 48, w * 0.22, 28);
  ctx.fillRect(w * 0.52, fl - 40, w * 0.2, 20);
  ctx.fillStyle = shade(pal.wood, 1.2);
  ctx.fillRect(w * 0.28, fl - 58, w * 0.18, 12);
  ctx.fillStyle = pal.lamp;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.26, formal ? 18 : 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.wood;
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.34, h * 0.3, w * 0.12, h * 0.16);
  ctx.strokeRect(w * 0.54, h * 0.3, w * 0.12, h * 0.16);
  if (formal) {
    ctx.fillStyle = "#c6a15b";
    ctx.fillRect(w * 0.46, h * 0.32, w * 0.08, h * 0.16);
    ctx.fillStyle = "#6b1c18";
    ctx.font = "14px 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    ctx.fillText("堂", w * 0.5, h * 0.42);
  } else {
    ctx.fillStyle = pal.lamp;
    ctx.font = "12px 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    ctx.fillText("厢房", w * 0.5, h * 0.4);
  }
}

// 程序生成的材质颗粒（夯土 / 地面 / 胶片噪点），按颜色缓存，避免平涂的“插画感”
const grainCache = new Map<string, CanvasPattern>();
function grain(ctx: CanvasRenderingContext2D, kind: "earth" | "floor" | "film", color: string): CanvasPattern | string {
  const key = kind + color;
  const hit = grainCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return color;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d");
  if (!g) return color;
  g.fillStyle = color;
  g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  let seed = kind === "earth" ? 7 : kind === "floor" ? 13 : 29;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const amp = kind === "film" ? 120 : kind === "earth" ? 26 : 22;
  for (let y = 0; y < S; y++) {
    const band = kind === "earth" ? Math.sin((y / S) * Math.PI * 2 * 8) * 3 : 0;
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const n = (rnd() - 0.5) * amp + band;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.9));
    }
  }
  g.putImageData(img, 0, 0);
  if (kind !== "film") {
    // 斑驳：少量大块明暗与细裂
    g.filter = "blur(10px)";
    for (let k = 0; k < 10; k++) {
      g.fillStyle = rnd() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,240,220,0.035)";
      g.beginPath();
      g.ellipse(rnd() * S, rnd() * S, 10 + rnd() * 40, 6 + rnd() * 18, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.filter = "none";
    g.strokeStyle = "rgba(0,0,0,0.18)";
    g.lineWidth = 0.8;
    for (let k = 0; k < 5; k++) {
      let x = rnd() * S;
      let y = rnd() * S;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 6; j++) {
        x += (rnd() - 0.5) * 18;
        y += rnd() * 12;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  const pat = ctx.createPattern(c, "repeat");
  if (!pat) return color;
  grainCache.set(key, pat);
  return pat;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${g},${b})`;
}
