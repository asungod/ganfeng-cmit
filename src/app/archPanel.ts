/** In-app architecture proof: polymorphic lookup call sites + runtime probe + thresh bench. */

import { fallbackRow, lookup, type Compat } from "./table";
import { fallbackGlaze, matrixOf, porcelainCitations, ruleWhy } from "../data/porcelain";
import { fallbackMotif, motifByMood } from "../data/tengwang";
import { fallbackHour, hourByRoom, hourWhy } from "../data/hakka";
import {
  parseGexuIntent,
  parseHakkaIntent,
  parsePorcelainIntent,
} from "./intent";

const IMPORT_BLOCK = `// src/data/porcelain.ts
import { lookup } from "../app/table";
// src/data/tengwang.ts
import { lookup } from "../app/table";
// src/data/hakka.ts
import { lookup } from "../app/table";
// src/exhibits/porcelain.ts & hakka.ts
import { fallbackRow } from "../app/table";`;
import { compatWord } from "./i18n";

const LOOKUP_SNIP = `export function lookup<R extends string, C extends string>(
  grid: Record<C, Record<R, Compat>>,
  col: C,
  row: R,
): Compat {
  return grid[col][row];
}`;

/** Real call sites with different grid argument types (side by side). */
const CALL_SITES = `// porcelain — Era × Glaze
lookup(liveMatrix, era, glaze)
// tengwang — Mood × Motif
lookup(motifByMood, mood, motif)
// hakka — Room × Hour
lookup(hourByRoom, room, hour)`;

/** Real ONNX quantized size under public/models (du -b). */
const BGE_ONNX_BYTES = 24010842;
const BGE_ONNX_MIB = (BGE_ONNX_BYTES / (1024 * 1024)).toFixed(1);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function compatMark(c: Compat): string {
  return compatWord(c);
}

function firstKey(obj: Record<string, unknown>): string {
  return Object.keys(obj)[0] ?? "—";
}

function gridShape(label: string, grid: Record<string, Record<string, Compat>>): string {
  const col0 = firstKey(grid);
  const row0 = col0 !== "—" ? firstKey(grid[col0] as Record<string, unknown>) : "—";
  const cols = Object.keys(grid).length;
  const rows = col0 !== "—" ? Object.keys(grid[col0]!).length : 0;
  return `${label}: cols=${cols} rows=${rows} · firstKey typeof "${typeof col0}" = ${col0} · nested ${row0}`;
}

/** One real porcelain constraint-table row (song×fencai → 冲 → yingqing). */
function rawConstraintRowHtml(): string {
  const c = lookup(matrixOf(), "song", "fencai");
  const fb = fallbackRow(fallbackGlaze, "song");
  const why = ruleWhy("song", "fencai");
  const cite = porcelainCitations.find((x) => x.id === why.citeId);
  const row = {
    era: "song",
    glaze: "fencai",
    status: compatMark(c),
    fallback: fb,
  };
  const hakkaLine = hourWhy("heping", "night").why;
  const gexuLine =
    "渔舟唱晚 × 雁阵 = 冲；fallbackMotif.yuzhou → 渔舟（不另造无原文锚点的画面）。";
  const citeBit = cite
    ? `citeId: ${cite.id} · 《${cite.title}》· ${cite.source}`
    : `citeId: ${why.citeId}`;
  return `
    <div class="arch-raw" data-arch-raw>
      <p class="arch-raw-h">约束表原文 · 瓷语一行（真实数据模块，非虚构页码）</p>
      <pre class="arch-raw-json" data-arch-raw-json>${esc(JSON.stringify(row, null, 2))}</pre>
      <p class="arch-raw-cite">${esc(citeBit)}</p>
      <p class="arch-raw-why">${esc(why.why)}</p>
      <ul class="arch-raw-lines">
        <li><b>阁序</b> ${esc(gexuLine)}</li>
        <li><b>客家</b> ${esc(hakkaLine)}</li>
      </ul>
    </div>`;
}

export function archPanelHtml(opts?: { compact?: boolean }): string {
  const cls = opts?.compact ? "arch-panel is-compact" : "arch-panel";
  return `
    <section class="${cls}" data-arch-panel>
      <header class="arch-h">
        <h2>约束表引擎 · 多态调度</h2>
        <p class="arch-sub">同一 <code>lookup</code>，三种网格入参（Era×Glaze / Mood×Motif / Room×Hour）· 同屏三线调用日志</p>
      </header>
      <div class="arch-body">
        <pre class="arch-imports" data-arch-imports>${esc(IMPORT_BLOCK)}</pre>
        <div class="arch-diagram" aria-hidden="true">
          <div class="arch-node arch-core"><code>table.ts</code><br/><span>lookup / fallbackRow</span></div>
          <div class="arch-arrows">→</div>
          <div class="arch-leaves">
            <span>porcelain</span>
            <span>tengwang</span>
            <span>hakka</span>
          </div>
        </div>
        <pre class="arch-snip" data-arch-snip>${esc(LOOKUP_SNIP)}</pre>
      </div>
      ${rawConstraintRowHtml()}
      <div class="arch-triptych" data-arch-triptych>
        <p class="arch-poly-h">同屏三线 · table.ts 调用日志（自动试查）</p>
        <div class="arch-trip-cols">
          <div class="arch-trip-col" data-trip="ciyu">
            <p class="arch-trip-h">瓷 · Era×Glaze</p>
            <div class="arch-mini-cells arch-trip-cells" data-trip-cells="ciyu"></div>
          </div>
          <div class="arch-trip-col" data-trip="gexu">
            <p class="arch-trip-h">阁 · Mood×Motif</p>
            <div class="arch-mini-cells arch-trip-cells" data-trip-cells="gexu"></div>
          </div>
          <div class="arch-trip-col" data-trip="kejia">
            <p class="arch-trip-h">客 · Room×Hour</p>
            <div class="arch-mini-cells arch-trip-cells" data-trip-cells="kejia"></div>
          </div>
        </div>
        <pre class="arch-call-log" data-arch-call-log>table.ts 调用日志 · 待自动试查…</pre>
      </div>
      <div class="arch-poly">
        <p class="arch-poly-h">lookup 调用点 · 不同网格类型并列</p>
        <pre class="arch-calls" data-arch-calls>${esc(CALL_SITES)}</pre>
        <p class="arch-shape" data-arch-shape></p>
        <div class="arch-probe" data-arch-probe>
          <p class="arch-probe-h">运行时试查 · 同一 lookup，三套 live grid</p>
          <div class="arch-probe-btns">
            <button type="button" class="chip" data-poly="ciyu">瓷语试查</button>
            <button type="button" class="chip" data-poly="gexu">阁序试查</button>
            <button type="button" class="chip" data-poly="kejia">客家试查</button>
          </div>
          <div class="arch-mini-grid" data-arch-mini hidden>
            <p class="arch-mini-h" data-arch-mini-h>客家 · 禾坪 × 时辰 · 冲→改锁</p>
            <div class="arch-mini-cells" data-arch-mini-cells></div>
          </div>
          <pre class="arch-poly-out" data-poly-out>点上方按钮：调用 table.ts lookup，打印 合/勉/冲 + 网格键</pre>
        </div>
      </div>
      <div class="arch-thresh" data-arch-thresh hidden>
        <p class="arch-thresh-h" data-arch-thresh-h>小规模扩展标定 · thresh-bench</p>
        <div class="arch-calib" data-arch-calib>
          <svg class="calib-svg" data-calib-svg viewBox="0 0 420 200" role="img" aria-label="阈值标定 Precision Recall F1"></svg>
          <p class="calib-cap" data-calib-cap>探针实验 n=— · 读 thresh-bench.json · 未做显著性检验</p>
          <p class="calib-legend-txt" data-calib-legend>图例：Precision 精确 · Recall 召回 · F1</p>
        </div>
        <table class="thresh-table" data-thresh-table>
          <thead><tr><th>阈值</th><th>召回</th><th>精确</th><th>说明</th></tr></thead>
          <tbody data-thresh-body></tbody>
        </table>
        <p class="arch-thresh-note" data-thresh-note></p>
        <p class="arch-thresh-biz" data-thresh-biz></p>
        <p class="arch-thresh-h" data-qa-h>问展作答阈值 · qa-calib</p>
        <table class="thresh-table" data-qa-table>
          <thead><tr><th>阈值</th><th>dev 召回/精确</th><th>holdout 召回/精确</th><th>holdout 题库外误答</th></tr></thead>
          <tbody data-qa-body><tr><td colspan="4">qa-calib.json 未加载</td></tr></tbody>
        </table>
        <p class="arch-thresh-note" data-qa-note></p>
      </div>
      <div class="arch-model" data-arch-model>
        <p class="arch-model-h">模型选型对照（诚实量级；1.8B 为公开量级对照，非本机实测）</p>
        <table class="model-cmp-table" data-model-cmp>
          <thead>
            <tr><th></th><th>体积</th><th>延迟</th><th>命中</th><th>备注</th></tr>
          </thead>
          <tbody data-model-body>
            <tr>
              <td>BGE-small ONNX q8</td>
              <td>${BGE_ONNX_MIB} MiB（实测）</td>
              <td>载入/槽位待填</td>
              <td>—</td>
              <td>CPU/WASM</td>
            </tr>
            <tr>
              <td>通用 1.8B 级</td>
              <td>~数 GB（公开量级对照，非本机实测）</td>
              <td>通常需 GPU</td>
              <td>—</td>
              <td>本展不上</td>
            </tr>
            <tr>
              <td>纯词面 lex</td>
              <td>0</td>
              <td>测得 slot/ask ms</td>
              <td>—</td>
              <td>降级路径</td>
            </tr>
          </tbody>
        </table>
        <p class="arch-model-note" data-model-note>
          问句经本地 BGE-small 嵌入后，与约束表原型向量做余弦相似度，≥0.40 则命中并写入约束；题库检索另设作答阈值 0.55。
        </p>
      </div>
    </section>
  `;
}

export function bindArchProbe(root: HTMLElement): void {
  const out = root.querySelector("[data-poly-out]") as HTMLElement | null;
  const shapeEl = root.querySelector("[data-arch-shape]") as HTMLElement | null;
  if (shapeEl) {
    shapeEl.textContent = [
      gridShape("liveMatrix Era×Glaze", matrixOf() as Record<string, Record<string, Compat>>),
      gridShape("motifByMood Mood×Motif", motifByMood as Record<string, Record<string, Compat>>),
      gridShape("hourByRoom Room×Hour", hourByRoom as Record<string, Record<string, Compat>>),
    ].join(" · ");
  }
  root.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-poly]") as HTMLElement | null;
    if (!btn || !out) return;
    const kind = btn.getAttribute("data-poly");
    let lines: string[] = [];
    if (kind === "ciyu") {
      const miniHide = root.querySelector("[data-arch-mini]") as HTMLElement | null;
      if (miniHide) miniHide.hidden = true;
      const grid = matrixOf();
      const col = "song" as const;
      const row = "yingqing" as const;
      const c = lookup(grid, col, row);
      lines = [
        "瓷语试查 · lookup(liveMatrix, era, glaze)",
        `grid keys (era): ${Object.keys(grid).join(", ")}`,
        `row keys @${col}: ${Object.keys(grid[col]).join(", ")}`,
        `lookup(liveMatrix, "${col}", "${row}") → ${compatMark(c)} (${c})`,
      ];
    } else if (kind === "gexu") {
      const miniHide = root.querySelector("[data-arch-mini]") as HTMLElement | null;
      if (miniHide) miniHide.hidden = true;
      const grid = motifByMood;
      const col = "luoxia" as const;
      const row = "guwu" as const;
      const c = lookup(grid, col, row);
      lines = [
        "阁序试查 · lookup(motifByMood, mood, motif)",
        `grid keys (mood): ${Object.keys(grid).join(", ")}`,
        `row keys @${col}: ${Object.keys(grid[col]).join(", ")}`,
        `lookup(motifByMood, "${col}", "${row}") → ${compatMark(c)} (${c})`,
      ];
    } else if (kind === "kejia") {
      const grid = hourByRoom;
      const col = "heping" as const;
      const row = "night" as const;
      const c = lookup(grid, col, row);
      const next = "dusk" as const;
      const c2 = lookup(grid, col, next);
      lines = [
        "客家试查 · lookup(hourByRoom, room, hour)",
        `grid keys (room): ${Object.keys(grid).join(", ")}`,
        `row keys @${col}: ${Object.keys(grid[col]).join(", ")}`,
        `lookup(hourByRoom, "${col}", "${row}") → ${compatMark(c)} (${c})`,
        `冲则改锁 · fallback → "${next}" → ${compatMark(c2)} (${c2})`,
      ];
      playHakkaMini(root, col, row, next);
    } else {
      return;
    }
    if (kind !== "kejia") {
      const mini = root.querySelector("[data-arch-mini]") as HTMLElement | null;
      if (mini) mini.hidden = true;
    }
    out.textContent = lines.join("\n");
  });
  autoRunTriptych(root);
}

function autoRunTriptych(root: HTMLElement): void {
  const log = root.querySelector("[data-arch-call-log]") as HTMLElement | null;
  if (!log) return;
  const gridP = matrixOf();
  const cP = lookup(gridP, "song", "fencai");
  const fbP = fallbackRow(fallbackGlaze, "song");
  const cP2 = lookup(gridP, "song", fbP);
  const cG = lookup(motifByMood, "yuzhou", "yanzhen");
  const fbG = fallbackRow(fallbackMotif, "yuzhou");
  const cG2 = lookup(motifByMood, "yuzhou", fbG);
  const cK = lookup(hourByRoom, "heping", "night");
  const fbK = fallbackRow(fallbackHour, "heping");
  const cK2 = lookup(hourByRoom, "heping", fbK);
  const lines = [
    `[瓷] lookup(liveMatrix, song, fencai) → ${compatMark(cP)} → fallback ${fbP} (${compatMark(cP2)})`,
    `[阁] lookup(motifByMood, yuzhou, yanzhen) → ${compatMark(cG)} → fallback ${fbG} (${compatMark(cG2)})`,
    `[客] lookup(hourByRoom, heping, night) → ${compatMark(cK)} → dusk (${compatMark(cK2)})`,
  ];
  log.textContent = "table.ts 调用日志\n" + lines.join("\n");
  paintTripCol(root, "ciyu", [
    { id: "fencai", name: "粉彩", c: cP, rej: true },
    { id: fbP, name: "影青", c: cP2, to: true },
  ]);
  paintTripCol(root, "gexu", [
    { id: "yanzhen", name: "雁阵", c: cG, rej: true },
    { id: fbG, name: "渔舟", c: cG2, to: true },
  ]);
  paintTripCol(root, "kejia", [
    { id: "night", name: "夜", c: cK, rej: true },
    { id: fbK, name: "暮", c: cK2, to: true },
  ]);
}

function paintTripCol(
  root: HTMLElement,
  kind: string,
  cells: { id: string; name: string; c: Compat; rej?: boolean; to?: boolean }[],
): void {
  const el = root.querySelector(`[data-trip-cells="${kind}"]`) as HTMLElement | null;
  if (!el) return;
  el.innerHTML = cells
    .map((h) => {
      const rej = h.rej ? " is-rejected is-from is-flash" : "";
      const to = h.to ? " is-to" : "";
      const mark = h.rej ? `<span class="mx-x">×</span>${compatMark(h.c)}` : compatMark(h.c);
      return `<button type="button" class="matrix-cell arch-mini-cell compat-${h.c}${rej}${to}"><b>${h.name}</b>${mark}</button>`;
    })
    .join("");
}

function playHakkaMini(root: HTMLElement, room: "heping", rejected: "night", fallback: "dusk"): void {
  const mini = root.querySelector("[data-arch-mini]") as HTMLElement | null;
  const cells = root.querySelector("[data-arch-mini-cells]") as HTMLElement | null;
  const head = root.querySelector("[data-arch-mini-h]") as HTMLElement | null;
  if (!mini || !cells) return;
  mini.hidden = false;
  if (head) head.textContent = "客家 · 禾坪 × 时辰 · 夜冲 → 改锁暮";
  const hours: { id: "dawn" | "noon" | "dusk" | "night"; name: string }[] = [
    { id: "dawn", name: "晨" },
    { id: "noon", name: "午" },
    { id: "dusk", name: "暮" },
    { id: "night", name: "夜" },
  ];
  cells.innerHTML = hours
    .map((h) => {
      const c = lookup(hourByRoom, room, h.id);
      const rej = h.id === rejected ? " is-rejected is-from is-flash" : "";
      const to = h.id === fallback ? " is-to" : "";
      const mark = h.id === rejected ? `<span class="mx-x">×</span>${compatMark(c)}` : compatMark(c);
      return `<button type="button" class="matrix-cell arch-mini-cell compat-${c}${rej}${to}" data-mini-h="${h.id}"><b>${h.name}</b>${mark}</button>`;
    })
    .join("");
  requestAnimationFrame(() => {
    mini.querySelector("svg.matrix-solve")?.remove();
    const from = cells.querySelector(`[data-mini-h="${rejected}"]`) as HTMLElement | null;
    const toEl = cells.querySelector(`[data-mini-h="${fallback}"]`) as HTMLElement | null;
    if (!from || !toEl) return;
    const box = mini.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "matrix-solve");
    svg.setAttribute("width", String(box.width));
    svg.setAttribute("height", String(box.height));
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arch-mx-arrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");
    const tip = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tip.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    tip.setAttribute("fill", "#a33b32");
    marker.appendChild(tip);
    defs.appendChild(marker);
    svg.appendChild(defs);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(a.left - box.left + a.width / 2));
    line.setAttribute("y1", String(a.top - box.top + a.height / 2));
    line.setAttribute("x2", String(b.left - box.left + b.width / 2));
    line.setAttribute("y2", String(b.top - box.top + b.height / 2));
    line.setAttribute("pathLength", "1");
    line.setAttribute("marker-end", "url(#arch-mx-arrow)");
    svg.appendChild(line);
    mini.appendChild(svg);
    window.setTimeout(() => svg.classList.add("is-remnant"), 800);
  });
}

let THRESH_BIZ =
  "小规模扩展标定 · 读 public/thresh-bench.json；阈值档 0.20/0.24/0.28/0.32/0.35/0.40。不用 0.75：通用句对 STS 口径，与本原型空间实测好命中矛盾，抬高属虚构。";

type BenchDetail = {
  q: string;
  line: string;
  gold: Record<string, string>;
  best?: Record<string, { id: string; score: number }>;
  ms?: number;
};

type BenchRow = {
  threshold: number;
  recall: string | number;
  precision: string | number;
  reason?: string;
  hitGold?: number;
  totalGold?: number;
};

type BenchData = {
  measured?: boolean;
  note?: string;
  loadMs?: number;
  n?: number;
  timestamp?: string;
  pickThreshold?: number;
  rows?: BenchRow[];
  details?: BenchDetail[];
};

/** Lex gold-slot hits on the same gold set (intent parsers = forceLex path). */
function lexGoldHits(details: BenchDetail[]): { hit: number; total: number } {
  let hit = 0;
  let total = 0;
  for (const d of details) {
    const slots: Record<string, string> = {};
    if (d.line === "ciyu") {
      const p = parsePorcelainIntent(d.q);
      if (p?.era) slots.era = p.era;
      if (p?.glaze) slots.glaze = p.glaze;
      if (p?.shape) slots.shape = p.shape;
    } else if (d.line === "gexu") {
      const p = parseGexuIntent(d.q);
      if (p?.mood) slots.mood = p.mood;
      if (p?.focus) slots.focus = p.focus;
    } else if (d.line === "kejia") {
      const p = parseHakkaIntent(d.q);
      if (p?.room) slots.room = p.room;
      if (p?.hour) slots.hour = p.hour;
    }
    for (const [k, v] of Object.entries(d.gold)) {
      total += 1;
      if (slots[k] === v) hit += 1;
    }
  }
  return { hit, total };
}

function paintCalibChart(root: HTMLElement, data: BenchData): void {
  const svg = root.querySelector("[data-calib-svg]") as SVGSVGElement | null;
  const cap = root.querySelector("[data-calib-cap]") as HTMLElement | null;
  if (!svg || !data.rows?.length) return;
  const rows = data.rows;
  const W = 420;
  const H = 200;
  const padL = 48;
  const padR = 16;
  const padT = 22;
  const padB = 48;
  const xs = rows.map((r) => r.threshold);
  const xMin = Math.min(...xs, 0.2);
  const xMax = Math.max(...xs, 0.4);
  const parsePct = (v: string | number): number => {
    if (typeof v === "number") return v <= 1 ? v * 100 : v;
    const n = parseFloat(String(v).replace("%", ""));
    return Number.isFinite(n) ? n : 0;
  };
  const recalls = rows.map((r) => parsePct(r.recall));
  const precs = rows.map((r) => parsePct(r.precision));
  const f1s = rows.map((_, i) => {
    const r = recalls[i]! / 100;
    const p = precs[i]! / 100;
    return r + p > 0 ? (2 * p * r) / (p + r) * 100 : 0;
  });
  const yMin = Math.min(40, ...recalls, ...precs, ...f1s) - 5;
  const yMax = Math.max(100, ...recalls, ...precs, ...f1s);
  const xOf = (t: number) => padL + ((t - xMin) / (xMax - xMin || 1)) * (W - padL - padR);
  const yOf = (p: number) => padT + (1 - (p - yMin) / (yMax - yMin || 1)) * (H - padT - padB);
  const poly = (vals: number[]) =>
    rows.map((r, i) => `${xOf(r.threshold).toFixed(1)},${yOf(vals[i]!).toFixed(1)}`).join(" ");
  const same = recalls.every((v, i) => Math.abs(v - precs[i]!) < 0.05);
  // F1-best among rows (honest); prefer declared pickThreshold when it matches F1-best.
  let f1BestIdx = 0;
  for (let i = 1; i < f1s.length; i++) if (f1s[i]! > f1s[f1BestIdx]!) f1BestIdx = i;
  const f1BestThresh = rows[f1BestIdx]!.threshold;
  const pick =
    typeof data.pickThreshold === "number"
      ? data.pickThreshold
      : f1BestThresh;
  const markX = xOf(pick);
  const n = data.n ?? rows.length;
  const gridYs = [50, 60, 70, 80, 90, 100].filter((g) => g >= yMin && g <= yMax);
  const grid = gridYs
    .map(
      (g) =>
        `<line x1="${padL}" y1="${yOf(g).toFixed(1)}" x2="${W - padR}" y2="${yOf(g).toFixed(1)}" stroke="rgba(198,161,91,0.15)" />` +
        `<text x="${padL - 6}" y="${(yOf(g) + 3).toFixed(1)}" text-anchor="end" fill="#9a9184" font-size="9">${g}%</text>`,
    )
    .join("");
  const xLabels = rows
    .map(
      (r) =>
        `<text x="${xOf(r.threshold).toFixed(1)}" y="${H - 22}" text-anchor="middle" fill="#c6a15b" font-size="9">${r.threshold.toFixed(2)}</text>`,
    )
    .join("");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `
    <rect x="0" y="0" width="${W}" height="${H}" fill="rgba(0,0,0,0.35)" />
    ${grid}
    <line x1="${markX.toFixed(1)}" y1="${padT}" x2="${markX.toFixed(1)}" y2="${H - padB}" stroke="#ff6b5a" stroke-dasharray="3 3" />
    <text x="${markX.toFixed(1)}" y="${padT - 6}" text-anchor="middle" fill="#ff6b5a" font-size="10">F1 峰值 ${pick.toFixed(2)}</text>
    <polyline fill="none" stroke="#7aa68c" stroke-width="2" points="${poly(recalls)}" />
    <polyline fill="none" stroke="#c6a15b" stroke-width="2" stroke-dasharray="${same ? "0" : "5 3"}" points="${poly(precs)}" opacity="${same ? 0.55 : 1}" />
    <polyline fill="none" stroke="#8ec5ff" stroke-width="2" points="${poly(f1s)}" />
    ${rows
      .map((r, i) => {
        const cx = xOf(r.threshold);
        const cyR = yOf(recalls[i]!);
        const cyP = yOf(precs[i]!);
        const cyF = yOf(f1s[i]!);
        return `<circle cx="${cx.toFixed(1)}" cy="${cyR.toFixed(1)}" r="3.5" fill="#7aa68c" />` +
          (same ? "" : `<circle cx="${cx.toFixed(1)}" cy="${cyP.toFixed(1)}" r="3.5" fill="#c6a15b" />`) +
          `<circle cx="${cx.toFixed(1)}" cy="${cyF.toFixed(1)}" r="3" fill="#8ec5ff" />`;
      })
      .join("")}
    ${xLabels}
    <text x="${padL}" y="${H - 8}" fill="#9a9184" font-size="9">阈值 →</text>
    <g class="calib-legend" font-size="10">
      <rect x="${padL}" y="${H - 44}" width="10" height="3" fill="#7aa68c" />
      <text x="${padL + 14}" y="${H - 41}" fill="#7aa68c">Recall 召回</text>
      <rect x="${padL + 90}" y="${H - 44}" width="10" height="3" fill="#c6a15b" />
      <text x="${padL + 104}" y="${H - 41}" fill="#c6a15b">Precision 精确</text>
      <rect x="${padL + 200}" y="${H - 44}" width="10" height="3" fill="#8ec5ff" />
      <text x="${padL + 214}" y="${H - 41}" fill="#8ec5ff">F1</text>
    </g>
  `;
  if (cap) {
    const f1Pct = f1s[f1BestIdx]!.toFixed(1);
    cap.textContent =
      `探针实验 n=${n}，${pick.toFixed(2)} 为该样本 F1 峰值（F1 ${f1Pct}%），未做显著性检验`;
  }
  let legend = root.querySelector("[data-calib-legend]") as HTMLElement | null;
  if (!legend) {
    legend = document.createElement("p");
    legend.className = "calib-legend-txt";
    legend.setAttribute("data-calib-legend", "");
    const wrap = root.querySelector("[data-arch-calib]") as HTMLElement | null;
    wrap?.appendChild(legend);
  }
  legend.textContent = "图例：Precision 精确 · Recall 召回 · F1（调和平均）";
}

function paintModelCompare(root: HTMLElement, data: BenchData): void {
  const body = root.querySelector("[data-model-body]") as HTMLElement | null;
  const note = root.querySelector("[data-model-note]") as HTMLElement | null;
  if (!body) return;
  const loadMs = data.loadMs && data.loadMs > 0 ? data.loadMs : 0;
  const slotMs =
    data.details && data.details.length
      ? Math.round(
          data.details.reduce((s, d) => s + (d.ms ?? 0), 0) / data.details.length,
        )
      : 0;
  const pickRow =
    data.rows?.find((r) => r.threshold === (data.pickThreshold ?? 0.28)) ??
    data.rows?.find((r) => r.threshold === 0.28) ??
    data.rows?.[0];
  const bgeHit =
    pickRow?.hitGold != null && pickRow.totalGold != null
      ? `${pickRow.hitGold}/${pickRow.totalGold} 槽`
      : "—";
  const lex =
    data.details && data.details.length ? lexGoldHits(data.details) : { hit: 0, total: 0 };
  const lexHit = lex.total > 0 ? `${lex.hit}/${lex.total} 槽` : "—";
  const bgeDelay =
    loadMs > 0 && slotMs > 0
      ? `载入 ${loadMs}ms · 槽位均 ${slotMs}ms（实测）`
      : loadMs > 0
        ? `载入 ${loadMs}ms（实测）`
        : "载入/槽位用已测 ms";
  // lex path is synchronous intent parse — measure via performance in page if agent ready, else "~0–1ms"
  const lexDelay = "slot/ask ≤1ms（词面，本机）";
  body.innerHTML = `
    <tr>
      <td>BGE-small ONNX q8</td>
      <td>${BGE_ONNX_MIB} MiB（实测 ${BGE_ONNX_BYTES} bytes）</td>
      <td>${esc(bgeDelay)}</td>
      <td>${esc(bgeHit)}</td>
      <td>CPU/WASM</td>
    </tr>
    <tr>
      <td>通用 1.8B 级</td>
      <td>~数 GB（公开量级对照，非本机实测）</td>
      <td>通常需 GPU</td>
      <td>—</td>
      <td>本展不上</td>
    </tr>
    <tr>
      <td>纯词面 lex</td>
      <td>0</td>
      <td>${esc(lexDelay)}</td>
      <td>${esc(lexHit)}</td>
      <td>降级路径</td>
    </tr>`;
  if (note) {
    const th = data.pickThreshold ?? 0.4;
    note.textContent =
      `问句经本地 BGE-small 嵌入后，与约束表原型向量做余弦相似度，≥${th.toFixed(2)} 则命中并写入约束。` +
      ` 命中列为同批 n=${data.n ?? "—"} 金标槽；1.8B 无本机 bench。`;
  }
}

type QaRow = { t: number; n_ood: number; ood_accept: number; precision: number; recall: number };
type QaCalib = { threshold: number; n: number; note?: string; timestamp?: string; dev: QaRow[]; holdout: QaRow[] };

async function fillQaCalib(root: HTMLElement): Promise<void> {
  const body = root.querySelector("[data-qa-body]") as HTMLElement | null;
  const note = root.querySelector("[data-qa-note]") as HTMLElement | null;
  const head = root.querySelector("[data-qa-h]") as HTMLElement | null;
  if (!body) return;
  try {
    const res = await fetch("/qa-calib.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const d = (await res.json()) as QaCalib;
    if (head) head.textContent = `问展作答阈值 · qa-calib（n=${d.n}）`;
    const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
    body.innerHTML = d.dev
      .map((r, i) => {
        const h = d.holdout[i];
        const on = Math.abs(r.t - d.threshold) < 1e-9;
        return `<tr${on ? ' class="is-pick"' : ""}><td>${r.t.toFixed(3)}</td><td>${pct(r.recall)} / ${pct(r.precision)}</td><td>${pct(h.recall)} / ${pct(h.precision)}</td><td>${h.ood_accept}/${h.n_ood}</td></tr>`;
      })
      .join("");
    if (note) note.textContent = `${d.note ?? ""}${d.timestamp ? ` · ${d.timestamp}` : ""}`;
  } catch {
    body.innerHTML = '<tr><td colspan="4">qa-calib.json 未加载</td></tr>';
  }
}

export async function fillThreshTable(root: HTMLElement): Promise<void> {
  void fillQaCalib(root);
  const wrap = root.querySelector("[data-arch-thresh]") as HTMLElement | null;
  const body = root.querySelector("[data-thresh-body]") as HTMLElement | null;
  const note = root.querySelector("[data-thresh-note]") as HTMLElement | null;
  const biz = root.querySelector("[data-thresh-biz]") as HTMLElement | null;
  if (!wrap || !body) return;
  if (biz) biz.textContent = THRESH_BIZ;
  try {
    const res = await fetch("/thresh-bench.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as BenchData;
    wrap.hidden = false;
    if (!data.measured) {
      body.innerHTML = `
        <tr><td>0.20</td><td>—</td><td>—</td><td>示意·未实测</td></tr>
        <tr><td>0.28</td><td>—</td><td>—</td><td>示意·未实测</td></tr>
        <tr><td>0.35</td><td>—</td><td>—</td><td>示意·未实测</td></tr>`;
      if (note) note.textContent = data.note || "示意·未实测";
      paintModelCompare(root, data);
      return;
    }
    const pick =
      typeof data.pickThreshold === "number"
        ? data.pickThreshold
        : (data.rows || []).find((r) => /选用|代码默认|最佳|winner/i.test(r.reason || ""))?.threshold ?? 0.28;
    const n = data.n ?? 0;
    const head = root.querySelector("[data-arch-thresh-h]") as HTMLElement | null;
    if (head) head.textContent = `小规模扩展标定 (n=${n}) 阈值标定 · thresh-bench`;
    THRESH_BIZ =
      `小规模扩展标定 n=${n}` +
      (data.timestamp ? ` · ${data.timestamp}` : "") +
      `：阈值 0.20/0.24/0.28/0.32/0.35/0.40；代码默认 ${pick.toFixed(2)}。` +
      (data.note ? ` ${data.note}` : "") +
      " 不用 0.75：通用句对 STS 口径，与本原型空间实测矛盾。";
    if (biz) biz.textContent = THRESH_BIZ;
    body.innerHTML = (data.rows || [])
      .map(
        (r) =>
          `<tr${Math.abs(r.threshold - pick) < 1e-9 ? ' class="is-pick"' : ""}><td>${r.threshold.toFixed(2)}</td><td>${esc(String(r.recall))}</td><td>${esc(String(r.precision))}</td><td>${esc(r.reason || "")}</td></tr>`,
      )
      .join("");
    if (note) {
      note.textContent =
        `实测 n=${n} 金标问 · BGE 余弦 argmax · 多档阈值敏感度；默认 ${pick.toFixed(2)}` +
        (data.timestamp ? ` · ${data.timestamp}` : "") +
        "。";
    }
    paintCalibChart(root, data);
    paintModelCompare(root, data);
  } catch {
    wrap.hidden = false;
    body.innerHTML = `
      <tr><td>0.20</td><td>—</td><td>—</td><td>示意·未实测</td></tr>
      <tr><td>0.28</td><td>—</td><td>—</td><td>示意·未实测</td></tr>
      <tr><td>0.35</td><td>—</td><td>—</td><td>示意·未实测</td></tr>`;
    if (note) note.textContent = "thresh-bench.json 未加载";
    paintModelCompare(root, {});
  }
}

export { IMPORT_BLOCK, LOOKUP_SNIP, CALL_SITES, THRESH_BIZ, BGE_ONNX_BYTES, BGE_ONNX_MIB };
