/** Persistent Engine HUD + live table.ts lookup strip (main-screen proof, not #/?arch). */

import type { Compat } from "./table";
import { compatWord } from "./i18n";

const MAX_LINES = 5;
const BGE_MIB = "22.9";
const THRESH = "槽位 0.40 · 作答 0.55";

export type LookupTag = "瓷" | "阁" | "客" | "万";

const lines: string[] = [];
let dock: HTMLElement | null = null;
let logEl: HTMLElement | null = null;
let hudEl: HTMLElement | null = null;
let metricsEl: HTMLElement | null = null;
let techEl: HTMLElement | null = null;

/** Last measured slot-fill / lookup wall times (ms); 0 = not yet measured. */
let lastSlotMs = 0;
let lastLookupMs = 0;

let rafId = 0;
let lastFrameT = 0;
let frameMs = 0;
let lastHudPaint = 0;

function compatMark(c: Compat): string {
  return compatWord(c);
}

export function formatLookupLine(opts: {
  tag: LookupTag;
  grid: string;
  col: string;
  row: string;
  result: Compat;
  fallback?: string;
}): string {
  const base = `[${opts.tag}] lookup(${opts.grid}, ${opts.col}, ${opts.row}) → ${compatMark(opts.result)}`;
  if (opts.fallback && opts.result === "conflict") {
    return `${base} → fallback ${opts.fallback}`;
  }
  return base;
}

/** Demo lines used on route enter so switching 瓷↔阁↔客 proves the same logger. */
export function demoLookupLine(route: "ciyu" | "gexu" | "kejia" | "wanshou" | "hall"): string | null {
  if (route === "ciyu") {
    return formatLookupLine({
      tag: "瓷",
      grid: "liveMatrix",
      col: "song",
      row: "fencai",
      result: "conflict",
      fallback: "yingqing",
    });
  }
  if (route === "gexu") {
    return formatLookupLine({
      tag: "阁",
      grid: "motifByMood",
      col: "yuzhou",
      row: "yanzhen",
      result: "conflict",
      fallback: "yuzhou",
    });
  }
  if (route === "kejia") {
    return formatLookupLine({
      tag: "客",
      grid: "hourByRoom",
      col: "heping",
      row: "night",
      result: "conflict",
      fallback: "dusk",
    });
  }
  return null;
}

function paintLog(): void {
  if (!logEl) return;
  if (!lines.length) {
    logEl.innerHTML = `<p class="lookup-log-empty">lookup 日志 · 切线或点约束格即写入</p>`;
    return;
  }
  logEl.innerHTML = lines.map((l) => `<p class="lookup-log-line">${esc(l)}</p>`).join("");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function heapMb(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  if (!mem || typeof mem.usedJSHeapSize !== "number" || mem.usedJSHeapSize <= 0) return null;
  return Math.round(mem.usedJSHeapSize / 1048576);
}

function paintTech(): void {
  if (!techEl) return;
  const bits: string[] = [
    `BGE-small ONNX q8 · ${BGE_MIB} MiB`,
    `阈值 ${THRESH}`,
  ];
  if (lastSlotMs > 0) bits.push(`slot ${lastSlotMs}ms`);
  if (lastLookupMs > 0) bits.push(`lookup ${lastLookupMs}ms`);
  if (frameMs > 0 && frameMs < 500) {
    const fps = Math.round(1000 / Math.max(frameMs, 1));
    bits.push(`FPS ${fps}`);
  }
  const heap = heapMb();
  if (heap != null) bits.push(`Memory ${heap}MB`);
  techEl.textContent = bits.join(" · ");
}

function paintHud(): void {
  if (!hudEl) return;
  // r19: demote BGE — main line is local · table.ts; BGE behind 「技术明细」
  hudEl.textContent = "Engine: local · table.ts";
  paintTech();
  if (!metricsEl) return;
  // Keep metrics row for quick ms glance when measured; still secondary.
  const bits: string[] = [];
  if (lastSlotMs > 0) bits.push(`slot ${lastSlotMs}ms`);
  if (lastLookupMs > 0) bits.push(`lookup ${lastLookupMs}ms`);
  if (!bits.length) {
    metricsEl.hidden = true;
    metricsEl.textContent = "";
    return;
  }
  metricsEl.hidden = false;
  metricsEl.textContent = bits.join(" · ");
}

function tickFrame(now: number): void {
  if (lastFrameT > 0) frameMs = now - lastFrameT;
  lastFrameT = now;
  if (now - lastHudPaint >= 500) {
    lastHudPaint = now;
    paintHud();
  }
  rafId = requestAnimationFrame(tickFrame);
}

export function reportSlotMs(ms: number): void {
  if (ms > 0) lastSlotMs = Math.round(ms);
  paintHud();
}

export function reportLookupMs(ms: number): void {
  if (ms >= 0) lastLookupMs = Math.round(ms);
  paintHud();
}

export function pushLookupLog(line: string): void {
  if (!line.trim()) return;
  lines.push(line.trim());
  while (lines.length > MAX_LINES) lines.shift();
  paintLog();
}

export function mountEngineHud(): void {
  if (document.querySelector("[data-engine-hud-dock]")) {
    dock = document.querySelector("[data-engine-hud-dock]") as HTMLElement;
    hudEl = dock.querySelector("[data-engine-hud]") as HTMLElement;
    metricsEl = dock.querySelector("[data-engine-metrics]") as HTMLElement;
    techEl = dock.querySelector("[data-engine-tech-body]") as HTMLElement;
    logEl = dock.querySelector("[data-lookup-log]") as HTMLElement;
    paintHud();
    return;
  }
  dock = document.createElement("aside");
  dock.className = "engine-hud-dock";
  dock.setAttribute("data-engine-hud-dock", "");
  dock.innerHTML = `
    <div class="engine-hud" data-engine-hud title="本地确定性路由 · table.ts">
      Engine: local · table.ts
    </div>
    <div class="engine-metrics" data-engine-metrics hidden></div>
    <details class="engine-tech" data-engine-tech>
      <summary>技术明细</summary>
      <p class="engine-tech-body" data-engine-tech-body>BGE-small ONNX q8 · ${BGE_MIB} MiB · 阈值 ${THRESH}</p>
    </details>
    <div class="lookup-log" data-lookup-log aria-label="table.ts lookup 日志"></div>
  `;
  document.body.appendChild(dock);
  hudEl = dock.querySelector("[data-engine-hud]") as HTMLElement;
  metricsEl = dock.querySelector("[data-engine-metrics]") as HTMLElement;
  techEl = dock.querySelector("[data-engine-tech-body]") as HTMLElement;
  logEl = dock.querySelector("[data-lookup-log]") as HTMLElement;
  paintLog();
  paintHud();
  if (!rafId) {
    lastFrameT = performance.now();
    rafId = requestAnimationFrame(tickFrame);
  }
}

export function engineHudText(): string {
  return hudEl?.textContent?.trim() ?? "Engine: local · table.ts";
}
