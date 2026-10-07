import { guide, lines } from "./guide";
import type { Citation, QAItem, Route } from "../data/types";
import { ask, type AskResult } from "./ask";
import { agent, statusLabel, type SlotFillResult, PROTO_SCORE_THRESH } from "./agent";
import { reportSlotMs } from "./engineHud";
import { intentJson, slotLabel, slotValueLabel } from "./intent";

function citeStamp(c: Citation): string {
  if (c.status === "verified") return '<span class="cite-stamp is-verified">已核</span>';
  if (c.status === "design") return '<span class="cite-stamp is-design">本展说明</span>';
  if (c.status === "pending") return '<span class="cite-stamp is-pending">待核</span>';
  return '<span class="cite-stamp">示例</span>';
}

export function citationCard(c: Citation, open = false): string {
  const urlLine = c.url
    ? `<p class="cite-page">出处网址：<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.url)}</a> · 访问 2026-10-08</p>`
    : '<p class="cite-page">无可公开查证网址</p>';
  return `
    <article class="cite ${open ? "is-open" : ""}" data-cite="${c.id}">
      <button type="button" class="cite-chip" data-toggle-cite="${c.id}">
        ${citeStamp(c)}
        <span class="cite-title">${esc(c.title)}</span>
        <span class="cite-src">${esc(c.source)}</span>
      </button>
      <div class="cite-body">
        <p class="cite-detail-k">出处详情</p>
        <p class="cite-excerpt">${esc(c.excerpt)}</p>
        <p class="cite-src-line">${esc(c.source)}</p>
        <p class="cite-note">${esc(c.note)}</p>
        ${urlLine}
        ${c.publicDomain ? '<p class="cite-pd">原文公有领域</p>' : ""}
      </div>
    </article>
  `;
}

export function renderCitations(el: HTMLElement, items: Citation[], openId?: string): void {
  el.innerHTML = items.map((c) => citationCard(c, c.id === openId)).join("");
}

export function bindCiteToggles(root: HTMLElement): void {
  root.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("[data-toggle-cite]") as HTMLElement | null;
    if (!t) return;
    const id = t.getAttribute("data-toggle-cite");
    const card = root.querySelector(`[data-cite="${id}"]`);
    card?.classList.toggle("is-open");
    if (card?.classList.contains("is-open")) {
      const title = card.querySelector(".cite-title")?.textContent ?? "";
      const body = card.querySelector(".cite-body .cite-excerpt")?.textContent ?? "";
      guide.speak(lines.cite(title, body));
    }
  });
}

function viaLabel(res: AskResult): string {
  if (res.via === "bge") return "本答走：本地轻量检索";
  if (res.via === "lex") return "本答走：词面检索";
  if (res.via === "slip") return "本答走：题库原问";
  return "本答走：未收录";
}

const COMPARE_Q = "前朝器皿为什么不能上后世软彩？";

export function setAskForceLex(on: boolean): void {
  agent.setForceLex(on);
  for (const el of document.querySelectorAll("[data-force-lex]")) {
    el.classList.toggle("is-on", on);
  }
  for (const el of document.querySelectorAll("[data-fallback-chip]")) {
    const chip = el as HTMLElement;
    chip.hidden = !on;
    chip.classList.toggle("is-on", on);
  }
}

function hitLine(res: AskResult | null, empty: string): string {
  if (!res) return empty;
  const title = res.hitTitle ?? res.question;
  const score = res.score == null ? "—" : res.score.toFixed(2);
  return `${title} · ${score}`;
}

function diffLine(bge: AskResult | null, lex: AskResult | null): string {
  if (bge && lex && (bge.hitTitle ?? bge.question) === (lex.hitTitle ?? lex.question)) return "差异：同一题";
  if (bge && lex) return "差异：不同命中";
  return "差异：一侧拒绝";
}

function hintFor(line?: Route): string {
  if (line === "gexu") return "可以写成问句，例如：彭蠡是哪里？";
  if (line === "kejia") return "可以写成问句，例如：围屋和土楼是一回事吗？";
  if (line === "hall") return "可以写成问句，例如：这是 ChatGPT 套壳吗？";
  return "可以写成问句，例如：宋代为什么不能锁粉彩？";
}

export function showTalkToast(root: HTMLElement, text: string): void {
  const el = root.querySelector("[data-talk-toast]") as HTMLElement | null;
  if (!el) return;
  el.hidden = !text;
  el.textContent = text;
}

export function mountAsk(
  parent: HTMLElement,
  pack: QAItem[],
  citations: Citation[],
  line?: Route,
  onIntent?: (q: string) => void,
): { setCitations: (c: Citation[]) => void } {
  const box = document.createElement("section");
  box.className = "ask";
  box.innerHTML = `
    <header class="ask-h">
      <span class="kicker">问展 · 本地讲解员</span>
      <h3>就当前展柜提问</h3>
      <p>本地 BGE-small 嵌入 + 约束表路由：槽位余弦相似度 ≥0.40 写入约束；题库检索最高分 ≥0.55 才作答并钉出处，否则拒答。</p>
      <p class="ask-status" data-agent-status>提问后加载本地检索模型 · 先可用词面检索</p>
      <div class="engine-status" data-engine-status>
        <span class="bge-chip" data-bge-chip>BGE · idle</span>
        <span class="fallback-chip" data-fallback-chip hidden>[Fallback: lex-slot 激活]</span>
      </div>
      <p class="ask-trace" data-ask-trace hidden></p>
      <div class="ask-tools">
        <button type="button" class="text-btn" data-force-lex>模拟加载失败</button>
        <button type="button" class="text-btn" data-compare>对比两条路径</button>
      </div>
    </header>
    <div class="ask-slips"></div>
    <form class="ask-form">
      <label class="sr">问讲解员</label>
      <input type="text" name="q" maxlength="80" placeholder="${esc(hintFor(line))}" />
      <button type="submit">问讲解员</button>
    </form>
    <p class="intent-cap">余弦相似度 · 阈值 0.40 · 本地 BGE</p>
    <pre class="intent-json" data-intent-json>未解析到展陈参数</pre>
    <div class="ask-out" hidden></div>
    <div class="ask-compare" data-compare-out hidden></div>
  `;
  parent.appendChild(box);
  const slips = box.querySelector(".ask-slips") as HTMLElement;
  const out = box.querySelector(".ask-out") as HTMLElement;
  const form = box.querySelector("form") as HTMLFormElement;
  const statusEl = box.querySelector("[data-agent-status]") as HTMLElement;
  const bgeChip = box.querySelector("[data-bge-chip]") as HTMLElement;
  let cites = citations;
  const fbChip = box.querySelector("[data-fallback-chip]") as HTMLElement | null;
  function paintFallbackChip(on: boolean): void {
    if (!fbChip) return;
    fbChip.hidden = !on;
    fbChip.classList.toggle("is-on", on);
  }
  agent.onStatus((s) => {
    statusEl.textContent = statusLabel(s);
    statusEl.dataset.state = s;
    bgeChip.textContent = `Engine: BGE · ${s === "idle" ? "idle" : s}`;
    bgeChip.dataset.state = s;
    paintFallbackChip(agent.forceLex || s === "fallback");
  });
  paintFallbackChip(agent.forceLex);
  if (agent.forceLex) {
    const b = box.querySelector("[data-force-lex]") as HTMLElement | null;
    b?.classList.add("is-on");
  }

  function paintSlips(): void {
    slips.innerHTML = pack
      .slice(0, line === "hall" ? 2 : 4)
      .map(
        (item) =>
          `<button type="button" class="slip" data-q="${esc(item.question)}">${esc(item.question)}</button>`,
      )
      .join("");
  }
  paintSlips();

  let intentTimer = 0;
  let intentGen = 0;

  function paintIntent(q: string): void {
    const pre = box.querySelector("[data-intent-json]") as HTMLElement;
    const parsed = intentJson(q, line);
    if (parsed && "via" in parsed) {
      const o = parsed as Record<string, string>;
      if (o.via === "keyword") o.via = "lex-slot";
    }
    pre.textContent = parsed ? JSON.stringify(parsed, null, 2) : "未解析到展陈参数";
    const root = (parent.closest(".exhibit") as HTMLElement | null) ?? parent;
    window.clearTimeout(intentTimer);
    const gen = ++intentGen;
    intentTimer = window.setTimeout(() => {
      void paintParseStrip(root, q, line).then((fill) => {
        if (gen !== intentGen || !fill) return;
        const json = {
          via: fill.via,
          ...fill.slots,
        };
        pre.textContent = Object.keys(fill.slots).length
          ? JSON.stringify(json, null, 2)
          : "未解析到展陈参数";
        const sysSlot = document.querySelector("[data-sys-slot]") as HTMLElement | null;
        if (sysSlot) {
          sysSlot.hidden = false;
          const load = agent.loadMs > 0 ? ` · BGE载入 ${agent.loadMs}ms` : "";
          sysSlot.textContent = `语义匹配 ${fill.ms}ms · 本地${load}`;
        }
        const sysCap = document.querySelector("[data-sys-slot-cap]") as HTMLElement | null;
        if (sysCap) {
          sysCap.hidden = false;
          sysCap.textContent = "对照：外送 API 常见数百毫秒";
        }
      });
    }, 200);
  }

  function show(res: AskResult): void {
    const trace = box.querySelector("[data-ask-trace]") as HTMLElement | null;
    if (trace) {
      const via = res.via ?? "none";
      const score = res.score == null ? "—" : res.score.toFixed(2);
      trace.hidden = false;
      const load = agent.loadMs > 0 ? ` · BGE载入 ${agent.loadMs}ms` : "";
      trace.textContent = `e2e · 问句→检索 via ${via}${load} · score ${score} · 钉 ${res.citations.length} 条出处`;
    }
    out.hidden = false;
    const cite0 = res.citations[0];
    const citeBar = cite0
      ? `<div class="ask-cite-bar cite-component" data-ask-cite-bar>
           <span class="cite-mark" aria-hidden="true" title="出处">引</span>
           <div class="cite-component-body">
             <p class="cite-component-k">出处卡片</p>
             <p class="cite-component-t">${esc(cite0.title)}</p>
             <p class="cite-component-s">${esc(cite0.source)}</p>
           </div>
         </div>`
      : "";
    const pins = res.citations
      .map(
        (c) =>
          `<button type="button" class="ask-pin" data-toggle-cite="${esc(c.id)}">钉自《${esc(c.title)}》</button>`,
      )
      .join("");
    out.innerHTML = `
      ${citeBar}
      <p class="ask-via">${esc(viaLabel(res))}</p>
      <p class="ask-q">${esc(res.question)}</p>
      <p class="ask-a">${esc(res.answer)}</p>
      ${pins ? `<p class="ask-pins">${pins}</p>` : ""}
      <div class="ask-cites">${res.citations.map((c) => citationCard(c, true)).join("")}</div>
    `;
    const stage = (parent.closest(".exhibit") as HTMLElement | null)?.querySelector(".vitrine-wrap") as HTMLElement | null;
    if (stage && cite0) {
      let float = stage.querySelector("[data-cite-bar]") as HTMLElement | null;
      if (!float) {
        float = document.createElement("div");
        float.className = "frame-cite-bar cite-component";
        float.setAttribute("data-cite-bar", "");
        stage.appendChild(float);
      }
      float.hidden = false;
      float.classList.add("cite-component");
      float.innerHTML = `<span class="cite-mark" aria-hidden="true" title="出处">引</span><div class="cite-component-body"><p class="cite-component-k">出处卡片</p><p class="cite-component-t">${esc(cite0.title)}</p></div>`;
    }
    if (res.citations.length) {
      const citeLayer =
        (parent.closest(".exhibit") as HTMLElement | null)?.querySelector(".cite-layer, [data-cites], .ask-cites") as
          | HTMLElement
          | null;
      const askCites = out.querySelector(".ask-cites") as HTMLElement | null;
      (askCites ?? citeLayer)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    guide.speak(res.answer);
  }

  function showCompare(pair: { bge: AskResult | null; lex: AskResult | null }, q: string): void {
    const panel = box.querySelector("[data-compare-out]") as HTMLElement;
    panel.hidden = false;
    const leftEmpty = agent.hasVector ? "未命中" : "未载入";
    const leftHead = agent.hasVector ? "BGE-small 量化" : "BGE-small 量化 · 未载入";
    const pins = [...(pair.bge?.citations ?? []), ...(pair.lex?.citations ?? [])]
      .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
      .map(
        (c) =>
          `<button type="button" class="ask-pin" data-toggle-cite="${esc(c.id)}">钉自《${esc(c.title)}》</button>`,
      )
      .join("");
    panel.innerHTML = `
      <p class="ask-compare-q">${esc(q)}</p>
      <div class="ask-col">
        <h4>${esc(leftHead)}</h4>
        <p>${esc(hitLine(pair.bge, leftEmpty))}</p>
      </div>
      <div class="ask-col">
        <h4>词面检索</h4>
        <p>${esc(hitLine(pair.lex, "未命中"))}</p>
      </div>
      <p class="ask-diff">${esc(diffLine(pair.bge, pair.lex))}</p>
      ${pins ? `<p class="ask-pins">${pins}</p>` : ""}
    `;
    panel.scrollIntoView({ block: "nearest" });
    const stage = document.querySelector(".vitrine-wrap");
    if (stage) {
      let float = stage.querySelector("[data-compare-float]") as HTMLElement | null;
      if (!float) {
        float = document.createElement("div");
        float.className = "compare-float";
        float.setAttribute("data-compare-float", "");
        stage.appendChild(float);
      }
      float.innerHTML = panel.innerHTML;
    }
  }

  box.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-force-lex]")) {
      setAskForceLex(!agent.forceLex);
      return;
    }
    if (t.closest("[data-compare]")) {
      const q = String(new FormData(form).get("q") || "").trim() || COMPARE_Q;
      void agent.compare(q, line).then((pair) => showCompare(pair, q));
      return;
    }
    const b = t.closest("button.slip") as HTMLButtonElement | null;
    if (!b) return;
    const q = b.dataset.q || "";
    paintIntent(q);
    onIntent?.(q);
    show(ask(pack, cites, q));
  });
  form.addEventListener("input", () => {
    const q = String(new FormData(form).get("q") || "");
    paintIntent(q);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = String(new FormData(form).get("q") || "");
    paintIntent(q);
    onIntent?.(q);
    const btn = form.querySelector("button") as HTMLButtonElement;
    btn.disabled = true;
    void agent.ask(q, pack, line).then(show).finally(() => {
      btn.disabled = false;
    });
  });

  return {
    setCitations(c) {
      cites = c;
    },
  };
}

export async function paintParseStrip(
  root: HTMLElement,
  q: string,
  line?: Route,
): Promise<SlotFillResult | null> {
  const el = root.querySelector("[data-parse-strip]") as HTMLElement | null;
  if (!el) return null;
  const slotsEl = el.querySelector("[data-parse-slots]") as HTMLElement | null;
  const viaEl = el.querySelector("[data-parse-via]") as HTMLElement | null;
  const jsonEl = el.querySelector("[data-parse-json]") as HTMLElement | null;
  const barsEl = el.querySelector("[data-parse-bars]") as HTMLElement | null;
  const capEl = el.querySelector("[data-parse-cap]") as HTMLElement | null;
  const hitEl = el.querySelector("[data-parse-hit]") as HTMLElement | null;
  if (!q.trim()) {
    el.hidden = true;
    if (slotsEl) slotsEl.innerHTML = "";
    if (viaEl) viaEl.textContent = "";
    if (jsonEl) jsonEl.textContent = "";
    if (barsEl) barsEl.innerHTML = "";
    if (hitEl) hitEl.textContent = "";
    return null;
  }
  const fill = await agent.slotFill(q, line);
  el.hidden = false;
  const keys = Object.keys(fill.slots);
  if (slotsEl) {
    if (!keys.length) {
      slotsEl.textContent = "未命中";
    } else {
      slotsEl.innerHTML = keys
        .map((k) => {
          const score = fill.scores[k];
          const sc = score == null ? "" : `<i>${score.toFixed(2)}</i>`;
          const lab = slotLabel(k);
          const val = slotValueLabel(fill.slots[k]!);
          return `<span class="slot-chip" data-slot="${esc(k)}">[${esc(lab)}:${esc(val)}]${sc}</span>`;
        })
        .join("");
    }
  }
  // Score bars vs PROTO_SCORE_THRESH (all scored slots + empties with seconds if any)
  const scoreKeys = Array.from(
    new Set([...Object.keys(fill.scores), ...Object.keys(fill.seconds ?? {})]),
  );
  reportSlotMs(fill.ms);
  if (barsEl) {
    if (!scoreKeys.length && !keys.length) {
      barsEl.innerHTML = "";
    } else {
      const show = scoreKeys.length ? scoreKeys : keys;
      const mark = PROTO_SCORE_THRESH * 100;
      const legend = `<div class="score-legend"><span class="score-legend-lab">阈值 ${PROTO_SCORE_THRESH.toFixed(2)}</span><span class="score-legend-track" aria-hidden="true"><i class="score-thresh" style="left:${mark}%"></i></span></div>`;
      barsEl.innerHTML =
        legend +
        show
          .map((k) => {
            const score = fill.scores[k] ?? 0;
            const filled = Boolean(fill.slots[k]);
            const pct = Math.max(0, Math.min(100, (score / 1) * 100));
            const lab = slotLabel(k);
            const val = fill.slots[k] ? slotValueLabel(fill.slots[k]!) : "—";
            const cls = filled ? "is-hit" : "is-miss";
            return `<div class="score-row ${cls}" data-score-slot="${esc(k)}">
            <span class="score-lab">${esc(lab)}·${esc(val)}</span>
            <span class="score-track" aria-hidden="true">
              <i class="score-fill" style="width:${pct.toFixed(1)}%"></i>
              <i class="score-thresh" style="left:${mark}%" title="阈值 ${PROTO_SCORE_THRESH}"></i>
              <span class="score-thresh-tag" style="left:${mark}%">0.40</span>
            </span>
            <span class="score-num">${score ? score.toFixed(2) : "—"}</span>
          </div>`;
          })
          .join("");
    }
  }
  if (capEl) {
    capEl.textContent =
      `余弦相似度 ≥${PROTO_SCORE_THRESH} 命中（探针实验 n=58，见 thresh-bench.json；未做显著性检验）。弱并列 best−second<0.04 留空可降 lex。`;
  }
  if (hitEl) {
    if (fill.via === "bge-slot" && keys.length) {
      const parts = keys.map((k) => {
        const phrase = fill.phrases?.[k] ?? slotValueLabel(fill.slots[k]!);
        const sc = fill.scores[k];
        return `语义命中 ${phrase}${sc == null ? "" : ` ${sc.toFixed(2)}`}`;
      });
      hitEl.textContent = parts.join(" · ");
    } else if (fill.via === "lex-slot" && keys.length) {
      hitEl.textContent = `词面命中 ${keys.map((k) => slotValueLabel(fill.slots[k]!)).join(" · ")}`;
    } else {
      hitEl.textContent = "";
    }
  }
  if (viaEl) {
    const load = agent.loadMs > 0 ? ` · BGE载入 ${agent.loadMs}ms` : "";
    viaEl.textContent = `via ${fill.via} · 语义匹配 ${fill.ms}ms${fill.via === "bge-slot" ? load : ""}`;
    viaEl.classList.toggle("is-fallback", fill.via === "lex-slot");
  }
  let fb = el.querySelector("[data-parse-fallback]") as HTMLElement | null;
  if (fill.via === "lex-slot") {
    if (!fb) {
      fb = document.createElement("span");
      fb.className = "fallback-chip is-on";
      fb.setAttribute("data-parse-fallback", "");
      fb.textContent = "[Fallback: lex-slot 激活]";
      el.appendChild(fb);
    }
    fb.hidden = false;
  } else if (fb) {
    fb.hidden = true;
  }
  for (const chip of document.querySelectorAll("[data-fallback-chip]")) {
    const c = chip as HTMLElement;
    if (fill.via === "lex-slot" || agent.forceLex) {
      c.hidden = false;
      c.classList.add("is-on");
    }
  }
  // Soft size compare chip (honest local ONNX vs labeled 1.8B class)
  let cmp = el.querySelector("[data-parse-cmp]") as HTMLElement | null;
  if (!cmp) {
    cmp = document.createElement("p");
    cmp.className = "parse-cmp";
    cmp.setAttribute("data-parse-cmp", "");
    el.appendChild(cmp);
  }
  cmp.textContent =
    "量级对照：本机 BGE ONNX q8 22.9MiB（实测）· 通用 1.8B 级 ~数 GB、通常需 GPU（公开量级对照，非本机实测）";
  if (jsonEl) {
    jsonEl.textContent = Object.keys(fill.slots).length
      ? JSON.stringify({ via: fill.via, ...fill.slots })
      : "未解析到展陈参数";
  }
  // Soft Top5: also stamp ask-trace if present
  const trace = root.querySelector("[data-ask-trace]") as HTMLElement | null;
  if (trace && fill.via === "bge-slot" && keys.length) {
    const k0 = keys[0]!;
    const phrase = fill.phrases?.[k0] ?? slotValueLabel(fill.slots[k0]!);
    const sc = fill.scores[k0];
    trace.hidden = false;
    const prev = trace.textContent || "";
    const hit = `语义命中 ${phrase}${sc == null ? "" : ` ${sc.toFixed(2)}`}`;
    if (!prev.includes("语义命中")) {
      trace.textContent = prev ? `${prev} · ${hit}` : hit;
    }
  }
  return fill;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
