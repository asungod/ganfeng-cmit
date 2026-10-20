import { go } from "../app/router";
import { mountPipeline } from "../app/pipeline";
import { bindCiteToggles, mountAsk, paintParseStrip, renderCitations, setAskForceLex, showTalkToast } from "../app/labels";
import { agent } from "../app/agent";
import { fallbackRow } from "../app/table";
import { formatLookupLine, pushLookupLog, reportLookupMs } from "../app/engineHud";
import { archPanelHtml, bindArchProbe, fillThreshTable } from "../app/archPanel";
import {
  citationsFor,
  compatOf,
  eras,
  fallbackGlaze,
  glazeByEra,
  glazes,
  porcelainCitations,
  porcelainQA,
  resetMatrix,
  ruleWhy,
  setCompat,
  shapes,
  styleLockMessage,
  type Compat,
  type EraId,
  type GlazeId,
  type ShapeId,
} from "../data/porcelain";
import { PorcelainVitrine } from "../render/vase";
import { ambience } from "../render/ambience";
import { guide, lines } from "../app/guide";
import { bindDemoDetailToggle } from "../app/demoDetail";
import { markTry, renderEvidence } from "../app/evidence";
import { porcelainRule } from "../data/evidenceRules";
import { routeName, t } from "../app/i18n";

export function mountPorcelain(root: HTMLElement): () => void {
  resetMatrix();
  let shape: ShapeId = "meiping";
  let glaze: GlazeId = "qinghua";
  let era: EraId = "ming";
  let lockNote = "";
  let rejected: GlazeId | null = null;
  let pickEra: EraId = era;
  let pickGlaze: GlazeId = glaze;
  let vitrine: PorcelainVitrine | null = null;
  let firstVisit = true;
  let talkLine = "";
  let fromTalk = false;

  let lastLookupMs = 0;
  let lastSlotLine = "语义匹配 —（访客直入）";
  let lastLookupLine = "—";

  function paintBuildLog(geoMs?: number, segs?: number): void {
    const list = root.querySelector("[data-build-log-list]") as HTMLElement | null;
    if (!list) return;
    const s = segs == null ? "—" : String(segs);
    const geoStamp = geoMs == null ? "—" : `${Math.max(lastLookupMs, geoMs)}ms`;
    const geoTail = geoMs == null ? "" : ` · ${geoMs}ms`;
    list.innerHTML = `
      <li>[0ms] ${lastSlotLine}</li>
      <li>[${lastLookupMs}ms] table.ts lookup ${lastLookupLine}</li>
      <li>[${geoStamp}] LatheGeometry segs ${s}${geoTail}</li>
    `;
  }


  root.innerHTML = `
    <div class="exhibit ciyu is-immersive">
      <div class="grain" aria-hidden="true"></div>
      <header class="ex-bar">
        <button type="button" class="text-btn" data-hall>← ${routeName("hall")}</button>
        <div class="ex-crumb">
          <b>${routeName("ciyu")}</b>
          <span>景德镇 · 器型与釉色的约束展</span>
        </div>
        <button type="button" class="chip demo-detail-btn" data-demo-detail aria-pressed="false">${t("demo.off")}</button>
      </header>
      <div class="ex-grid immersive">
        <aside class="wall wall-left">
          <p class="kicker">约束面板</p>
          <div class="lock-dock">
            <h2>风格锁定</h2>
          </div>
          <details class="wall-hint" data-wall-hint>
            <summary>怎么选</summary>
            <p class="wall-lead">先选定时代约束，再选器型与釉色。冲突不生成「好看的错」，而是改锁并写明理由。</p>
          </details>
          <div class="field">
            <span class="field-l">器型</span>
            <div class="chips" data-kind="shape"></div>
          </div>
          <div class="field">
            <span class="field-l">釉色</span>
            <div class="chips" data-kind="glaze"></div>
          </div>
          <div class="field">
            <span class="field-l">朝代</span>
            <div class="chips" data-kind="era"></div>
          </div>
          <section class="matrix" data-matrix>
            <details class="matrix-fold" data-matrix-fold>
              <summary class="matrix-sum">约束表</summary>
              <p class="engine-chip demo-only">约束表引擎 · table.ts lookup</p>
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th></th>
                    <th data-era-col="song">宋</th>
                    <th data-era-col="yuan">元</th>
                    <th data-era-col="ming">明</th>
                    <th data-era-col="qing">清</th>
                  </tr>
                </thead>
                <tbody data-matrix-body></tbody>
              </table>
              <div class="matrix-rule" data-matrix-rule></div>
              <details class="audit-panel" data-audit>
                <summary class="audit-sum">约束表审计 · 规则条目（可展开）</summary>
                <div class="audit-body" data-audit-body>
                  <p class="audit-empty">点冲突格或问「宋代有没有粉彩」以触发规则审计。</p>
                </div>
              </details>
            </details>
          </section>
          <div class="lock-card" data-lock></div>
          <div class="craft demo-only" data-craft>
            <p class="field-l">程序参数 · 证明不是贴图</p>
            <label class="craft-row">青花浓度 <b data-cobalt-n>0.70</b>
              <input type="range" min="0.35" max="1" step="0.05" value="0.70" data-cobalt />
            </label>
            <label class="craft-row">轮廓控制点 <b data-points-n>8</b>
              <input type="range" min="6" max="14" step="1" value="8" data-points />
            </label>
            <label class="craft-row">冰裂纹密度 <b data-crack-n>0.35</b>
              <input type="range" min="0" max="1" step="0.05" value="0.35" data-crack />
            </label>
            <figure class="profile-fig">
              <svg class="profile-svg" viewBox="0 0 80 120" data-profile-svg role="img" aria-label="Catmull-Rom 旋转体轮廓"></svg>
              <figcaption>LatheGeometry · Catmull-Rom 轮廓 · 非扫描 mesh</figcaption>
            </figure>
          </div>
        </aside>
        <section class="vitrine-wrap">
          <canvas class="vitrine" aria-label="旋转体几何展柜"></canvas>
          <p class="restore-mark">⚠️ 示意模型 · 程序复原非三维扫描</p>
          <button type="button" class="chip is-wire demo-only" data-wire>线框</button>
          <div class="speed-toggle demo-only" data-speed-toggle role="group" aria-label="升采样速度">
            <button type="button" class="chip is-speed is-on" data-speed="instant">瞬时</button>
            <button type="button" class="chip is-speed" data-speed="demo">慢放演示(评委)</button>
          </div>
          <pre class="shader-chip demo-only" aria-hidden="true"><b>几何现场</b>new THREE.LatheGeometry(outerPts, 160)
// craquelure: canvas 2D branching lines
// density/length follow craft.crack
// roughness (white) + albedo (multiply)
// not ShaderMaterial — MeshPhysicalMaterial</pre>
          <div class="rewrite-toast" data-toast hidden></div>
          <div class="talk-toast" data-talk-toast hidden></div>
          <div class="parse-strip" data-parse-strip hidden>
            <p class="parse-line"><b>语义匹配</b> <span data-parse-slots></span></p>
            <p class="parse-hit" data-parse-hit></p>
            <div class="parse-bars" data-parse-bars></div>
            <p class="parse-cap" data-parse-cap></p>
            <p class="parse-via" data-parse-via></p>
            <pre class="parse-json" data-parse-json></pre>
          </div>
          <figure class="build-loop-fig demo-only" aria-hidden="true">
            <canvas class="build-loop" width="140" height="180" aria-label="剖面示意"></canvas>
            <figcaption>剖面示意</figcaption>
          </figure>
          <div class="geo-hud-stack demo-only">
            <p class="geo-hud" data-geo-hud>瞬时完成 · segs 160</p>
            <details class="build-log" data-build-log>
              <summary>生成溯源</summary>
              <ol class="build-log-list" data-build-log-list>
                <li>[—] 语义匹配 —</li>
                <li>[—] table.ts lookup —</li>
                <li>[—] LatheGeometry segs —</li>
              </ol>
            </details>
          </div>
          <aside class="e2e-trace" data-e2e-trace hidden aria-label="问展端到端 trace">
            <p class="e2e-kicker">askpipe · e2e trace</p>
            <ol class="e2e-steps" data-e2e-steps></ol>
          </aside>
          <aside class="museum-label" data-label></aside>
          <p class="vitrine-cap">拖转观察 · LatheGeometry 旋转体 · Catmull-Rom 轮廓</p>
        </section>
        <aside class="wall wall-right">
          <p class="kicker">场景内出处</p>
          <h2>引用条</h2>
          <div class="cites" data-cites></div>
          <div data-ask></div>
        </aside>
      </div>
      <footer class="ex-pipe" data-pipe></footer>
    </div>
  `;

  const chipsShape = root.querySelector('[data-kind="shape"]') as HTMLElement;
  const chipsGlaze = root.querySelector('[data-kind="glaze"]') as HTMLElement;
  const chipsEra = root.querySelector('[data-kind="era"]') as HTMLElement;
  const lockEl = root.querySelector("[data-lock]") as HTMLElement;
  const citesEl = root.querySelector("[data-cites]") as HTMLElement;
  const canvas = root.querySelector("canvas.vitrine") as HTMLCanvasElement;
  const labelEl = root.querySelector("[data-label]") as HTMLElement;
  const pipe = mountPipeline(root.querySelector("[data-pipe]") as HTMLElement, routeName("ciyu"));
  bindDemoDetailToggle(root);
  const ask = mountAsk(
    root.querySelector("[data-ask]") as HTMLElement,
    porcelainQA,
    porcelainCitations,
    "ciyu",
    (q) => {
      void (async () => {
        const fill = await agent.slotFill(q, "ciyu");
        if (!Object.keys(fill.slots).length) return;
        fromTalk = true;
        const hit0 = Object.keys(fill.slots)[0];
        const hitBit =
          hit0 && fill.scores[hit0] != null
            ? ` · 语义命中 ${fill.phrases?.[hit0] ?? fill.slots[hit0]} ${fill.scores[hit0]!.toFixed(2)}`
            : "";
        lastSlotLine = `语义匹配 via ${fill.via} · ${fill.ms}ms${hitBit}`;
        if (fill.slots.era) era = fill.slots.era as EraId;
        if (fill.slots.glaze) glaze = fill.slots.glaze as GlazeId;
        if (fill.slots.shape) shape = fill.slots.shape as ShapeId;
        pickEra = era;
        pickGlaze = glaze;
        const eName = eras.find((x) => x.id === era)?.name ?? "";
        const sName = shapes.find((x) => x.id === shape)?.name ?? "";
        const gName = glazes.find((x) => x.id === glaze)?.name ?? "";
        const bits = [eName, sName, gName].filter(Boolean);
        talkLine = bits.length ? `对话写入展陈：${bits.join(" · ")}` : "对话写入展陈";
        if (fill.slots.shape === "bowl" && /茶|喝/.test(q)) {
          talkLine = `${talkLine}\n对话写入现有器型：斗笠碗（茶器），不新造器。`;
        }
        void apply(true);
      })();
    },
  );
  bindCiteToggles(root);

  function compatMark(c: Compat): string {
    return c === "ok" ? "合" : c === "stretch" ? "勉" : "冲";
  }

  function compatWord(c: Compat): string {
    return c === "ok" ? "合" : c === "stretch" ? "勉强" : "冲突";
  }

  function paintMatrix(): void {
    const body = root.querySelector("[data-matrix-body]") as HTMLElement;
    const ruleEl = root.querySelector("[data-matrix-rule]") as HTMLElement;
    body.innerHTML = glazes
      .map((g) => {
        const rowOn = g.id === glaze ? " is-row" : "";
        const cells = eras
          .map((e) => {
            const c = compatOf(e.id, g.id);
            const eraOn = e.id === era ? " is-era" : "";
            const pick = e.id === pickEra && g.id === pickGlaze ? " is-pick" : "";
            const rej = rejected === g.id && e.id === era ? " is-rejected is-from" : "";
            const toCell = rejected && g.id === glaze && e.id === era ? " is-to" : "";
            const mark = rejected === g.id && e.id === era ? `<span class="mx-x" aria-hidden="true">×</span>${compatMark(c)}` : compatMark(c);
            return `<td class="${eraOn.trim()}"><button type="button" class="matrix-cell compat-${c}${pick}${rej}${toCell}" data-mx-era="${e.id}" data-mx-glaze="${g.id}">${mark}</button></td>`;
          })
          .join("");
        return `<tr class="${rowOn.trim()}"><th class="matrix-row-l">${g.name}</th>${cells}</tr>`;
      })
      .join("");
    for (const th of root.querySelectorAll("[data-era-col]")) {
      th.classList.toggle("is-era", th.getAttribute("data-era-col") === era);
    }
    const eName = eras.find((x) => x.id === pickEra)!.name;
    const gName = glazes.find((x) => x.id === pickGlaze)!.name;
    const c = compatOf(pickEra, pickGlaze);
    const why = ruleWhy(pickEra, pickGlaze);
    const cite = porcelainCitations.find((x) => x.id === why.citeId);
    const citeName = cite?.title ?? "工艺说明";
    ruleEl.innerHTML = `
      <p>${eName} × ${gName} = ${compatWord(c)}。点下方审计面板展开规则原文。</p>
      <div class="matrix-rule-btns">
        ${rejected ? '<button type="button" class="chip" data-replay-rewrite>重放改锁</button>' : ""}
        <button type="button" class="text-btn" data-reset-matrix>恢复默认矩阵</button>
      </div>
    `;
    paintAudit(pickEra, pickGlaze, c, why.why, citeName);
  }

  function paintAudit(
    eraId: EraId,
    glazeId: GlazeId,
    c: Compat,
    whyText: string,
    citeName: string,
  ): void {
    const panel = root.querySelector("[data-audit]") as HTMLDetailsElement | null;
    const body = root.querySelector("[data-audit-body]") as HTMLElement | null;
    if (!panel || !body) return;
    const eName = eras.find((x) => x.id === eraId)?.name ?? eraId;
    const gName = glazes.find((x) => x.id === glazeId)?.name ?? glazeId;
    const status = c === "ok" ? "合" : c === "stretch" ? "勉" : "冲";
    const fbId = c === "conflict" ? fallbackRow(fallbackGlaze, eraId) : null;
    const fbName = fbId ? glazes.find((x) => x.id === fbId)?.name ?? fbId : "";
    const fromName = rejected ? glazes.find((x) => x.id === rejected)?.name ?? rejected : gName;
    const toName = rejected ? glazes.find((x) => x.id === glaze)?.name ?? glaze : fbName;
    const path =
      rejected || c === "conflict"
        ? `冲格「${eName}×${fromName}」× → 规则条目 → 改锁格「${eName}×${toName || fbName}」`
        : `当前格「${eName}×${gName}」= ${status}（无改锁）`;
    const raw = `{ era: "${eraId}", glaze: "${rejected ?? glazeId}", status: "${c}", fallback: "${fbId ?? ""}" }`;
    body.innerHTML = `
      <p class="audit-path"><b>可追溯回放</b> ${path}</p>
      <p class="audit-row"><b>冲格 / 当前</b> ${eName} × ${fromName} → ${status}</p>
      <p class="audit-rule"><b>规则原文</b> ${whyText}</p>
      <p class="audit-cite"><b>出处</b> ${citeName}</p>
      ${
        rejected || c === "conflict"
          ? `<p class="audit-fb"><b>改锁</b> → ${toName || fbName}（fallbackRow）</p>`
          : `<p class="audit-fb"><b>改锁</b> —</p>`
      }
      <pre class="audit-raw" data-audit-raw>${raw}</pre>
      ${renderEvidence(
        "ciyu",
        porcelainRule(eraId, (rejected ?? glazeId) as GlazeId),
        (a, b) => glazeByEra[a as EraId][b as GlazeId],
        (a, b) => compatOf(a as EraId, b as GlazeId),
        (a, b) => `${eras.find((x) => x.id === a)?.name ?? a} × ${glazes.find((x) => x.id === b)?.name ?? b}`,
      )}
    `;
    if (rejected || c === "conflict") {
      panel.open = true;
      panel.classList.add("is-live");
    } else {
      panel.classList.remove("is-live");
    }
  }

  let solveGen = 0;

  function paintProfile(): void {
    const svg = root.querySelector("[data-profile-svg]") as SVGSVGElement | null;
    if (!svg || !vitrine) return;
    const pts = vitrine.profilePreview();
    if (pts.length < 2) {
      svg.replaceChildren();
      return;
    }
    const mx = 34;
    const my = 8;
    const H = 120;
    const rx = (p: { x: number; y: number }) => 40 + p.x * mx;
    const lx = (p: { x: number; y: number }) => 40 - p.x * mx;
    const yy = (p: { x: number; y: number }) => H - my - p.y * (H - my * 2);
    const right = pts.map((p) => `${rx(p).toFixed(2)},${yy(p).toFixed(2)}`);
    const left = [...pts].reverse().map((p) => `${lx(p).toFixed(2)},${yy(p).toFixed(2)}`);
    const d = `M ${right[0]} L ${right.join(" L ")} L ${left.join(" L ")} Z`;
    const stroke = `M ${right.join(" L ")}`;
    const dots = pts
      .map((p) => `<circle class="profile-dot" cx="${rx(p).toFixed(2)}" cy="${yy(p).toFixed(2)}" r="0.85" />`)
      .join("");
    svg.innerHTML = `<path class="profile-fill" d="${d}" /><path class="profile-stroke" d="${stroke}" />${dots}`;
  }

  function paintSolveLine(): void {
    const section = root.querySelector("[data-matrix]") as HTMLElement | null;
    if (!section) return;
    section.querySelector("svg.matrix-solve")?.remove();
    const gen = ++solveGen;
    if (!rejected) return;
    const fromEra = era;
    const fromGlaze = rejected;
    const toGlaze = glaze;
    const draw = (): void => {
      if (gen !== solveGen) return;
      const from = section.querySelector(`[data-mx-era="${fromEra}"][data-mx-glaze="${fromGlaze}"]`) as HTMLElement | null;
      const to = section.querySelector(`[data-mx-era="${fromEra}"][data-mx-glaze="${toGlaze}"]`) as HTMLElement | null;
      if (!from || !to) return;
      from.classList.add("is-from", "is-walk", "is-flash");
      const box = section.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      if (box.width < 4 || box.height < 4) return;
      section.querySelector("svg.matrix-solve")?.remove();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "matrix-solve");
      svg.setAttribute("width", String(box.width));
      svg.setAttribute("height", String(box.height));
      svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", `mx-arrow-${gen}`);
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "9");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "9");
      marker.setAttribute("markerHeight", "9");
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
      line.setAttribute("marker-end", `url(#mx-arrow-${gen})`);
      svg.appendChild(line);
      section.appendChild(svg);
      to.classList.add("is-to");
      window.setTimeout(() => {
        if (gen !== solveGen) return;
        from.classList.remove("is-walk");
      }, 700);
      window.setTimeout(() => {
        if (gen === solveGen) {
          svg.classList.add("is-remnant");
          from.classList.remove("is-flash");
        }
      }, 1400);
    };
    draw();
    requestAnimationFrame(() => requestAnimationFrame(draw));
  }

  function paintChips(): void {
    chipsShape.innerHTML = shapes
      .map(
        (s) =>
          `<button type="button" class="chip ${s.id === shape ? "is-on" : ""}" data-shape="${s.id}">${s.name}</button>`,
      )
      .join("");
    chipsGlaze.innerHTML = glazes
      .map((g) => {
        const c = compatOf(era, g.id);
        const rej = rejected === g.id ? " is-rejected" : "";
        return `<button type="button" class="chip ${g.id === glaze ? "is-on" : ""}${rej} compat-${c}" data-glaze="${g.id}" title="${c === "ok" ? "合" : c === "stretch" ? "勉强" : "冲突"}">${g.name}</button>`;
      })
      .join("");
    chipsEra.innerHTML = eras
      .map(
        (e) =>
          `<button type="button" class="chip ${e.id === era ? "is-on" : ""}" data-era="${e.id}">${e.name}<i>${e.years}</i></button>`,
      )
      .join("");
  }

  function describeLock(): void {
    const s = shapes.find((x) => x.id === shape)!;
    const g = glazes.find((x) => x.id === glaze)!;
    const e = eras.find((x) => x.id === era)!;
    const compat = compatOf(era, glaze);
    lockEl.classList.toggle("is-rewrite", Boolean(lockNote));
    lockEl.innerHTML = `
      <p class="lock-k">${lockNote ? "冲突改锁" : "当前锁定"}</p>
      <p class="lock-main">${e.name} · ${s.name} · ${g.name}</p>
      <p class="lock-b">${s.blurb}</p>
      <p class="lock-b">${g.blurb}</p>
      ${
        lockNote
          ? `<p class="lock-warn">${lockNote}</p>
             <p class="lock-path">拒绝「${glazes.find((x) => x.id === rejected)?.name ?? ""}」 → 改锁「${g.name}」</p>`
          : ""
      }
      <p class="lock-compat">${lockNote ? "已改锁，未生成好看的错" : compat === "ok" ? "风格一致" : "时代边缘，可作仿宋/仿古说明"}</p>
    `;
    const toast = root.querySelector("[data-toast]") as HTMLElement | null;
    if (toast) {
      if (lockNote) {
        toast.hidden = false;
        toast.textContent = lockNote;
      } else {
        toast.hidden = true;
        toast.textContent = "";
      }
    }
  }

  function paintLabel(): void {
    const s = shapes.find((x) => x.id === shape)!;
    const e = eras.find((x) => x.id === era)!;
    const motif =
      glaze === "qinghua"
        ? "青花缠枝莲纹"
        : glaze === "yingqing"
          ? "影青"
          : glaze === "jihong"
            ? "祭红釉"
            : glaze === "fencai"
              ? "粉彩"
              : "五彩";
    const dim = "示意模型 · 无实物尺寸";
    const note =
      glaze === "qinghua"
        ? "釉下钴料、缠枝莲纹。程序复原示意器型与纹样，非馆藏原件。"
        : glaze === "yingqing"
          ? "青白釉、薄胎映影。程序复原示意器型与釉色，非馆藏原件。"
          : glaze === "jihong"
            ? "铜红釉、口沿灯草口。程序复原示意器型与釉色，非馆藏原件。"
            : glaze === "fencai"
              ? "釉上粉彩、玻璃白打底。程序复原示意器型与纹样，非馆藏原件。"
              : "釉上五彩、硬彩对比。程序复原示意器型与纹样，非馆藏原件。";
    labelEl.innerHTML = `
      <p class="ml-title">${motif}${s.name}</p>
      <p class="ml-meta"><span>${e.name}</span><span>${dim}</span></p>
      <p class="ml-note">${note}</p>
    `;
  }

  let lastAskQ = "";
  let lastSlotMsLocal = 0;

  function paintE2eTrace(opts: {
    q?: string;
    slotMs?: number;
    lookupMs?: number;
    conflict?: boolean;
    from?: string;
    to?: string;
    cite?: string;
  }): void {
    const el = root.querySelector("[data-e2e-trace]") as HTMLElement | null;
    const steps = root.querySelector("[data-e2e-steps]") as HTMLElement | null;
    if (!el || !steps) return;
    if (opts.q) lastAskQ = opts.q;
    if (opts.slotMs != null && opts.slotMs > 0) lastSlotMsLocal = opts.slotMs;
    const q = lastAskQ || "（访客直入 / 未问展）";
    const slotMs = lastSlotMsLocal || opts.slotMs || 0;
    const lookupMs = opts.lookupMs ?? lastLookupMs;
    const conflict = opts.conflict ?? Boolean(rejected);
    const from = opts.from ?? (rejected ? `${eras.find((x) => x.id === era)?.name}×${glazes.find((x) => x.id === rejected)?.name}` : "—");
    const to = opts.to ?? `${eras.find((x) => x.id === era)?.name}×${glazes.find((x) => x.id === glaze)?.name}`;
    const cite = opts.cite ?? "出处卡片";
    const tSlot = slotMs > 0 ? `${slotMs}ms` : "—";
    const tLookup = lookupMs >= 0 ? `${lookupMs}ms` : "—";
    steps.innerHTML = `
      <li><b>问句</b> ${q}</li>
      <li><b>BGE 嵌入 / 槽位</b> via bge-slot · ${tSlot}</li>
      <li><b>table.ts lookup</b> ${tLookup}</li>
      <li><b>冲突？</b> ${conflict ? "是 → 触发规则条目" : "否"}</li>
      <li><b>改锁</b> ${conflict ? `${from} → ${to}` : "—"}</li>
      <li><b>出处卡片</b> ${cite}</li>
    `;
    el.hidden = false;
  }

    async function apply(fromUser: boolean): Promise<void> {
    lockNote = "";
    rejected = null;
    const t0 = performance.now();
    const c = compatOf(era, glaze);
    const eName0 = eras.find((x) => x.id === era)?.name ?? era;
    const gName0 = glazes.find((x) => x.id === glaze)?.name ?? glaze;
    if (c === "conflict") {
      const next = fallbackRow(fallbackGlaze, era);
      lockNote = styleLockMessage(era, glaze, next);
      rejected = glaze;
      glaze = next;
      const nName = glazes.find((x) => x.id === next)?.name ?? next;
      lastLookupLine = `${eName0}×${gName0} → 冲 → 改锁${nName}`;
      pushLookupLog(
        formatLookupLine({
          tag: "瓷",
          grid: "liveMatrix",
          col: era,
          row: rejected,
          result: "conflict",
          fallback: next,
        }),
      );
    } else {
      lastLookupLine = `${eName0}×${gName0} → ${compatMark(c)}`;
      pushLookupLog(
        formatLookupLine({
          tag: "瓷",
          grid: "liveMatrix",
          col: era,
          row: glaze,
          result: c,
        }),
      );
    }
    lastLookupMs = Math.max(0, Math.round(performance.now() - t0));
    reportLookupMs(lastLookupMs);
    {
      const eN = eras.find((x) => x.id === era)?.name ?? era;
      const fromG = rejected ? glazes.find((x) => x.id === rejected)?.name ?? rejected : "";
      const toG = glazes.find((x) => x.id === glaze)?.name ?? glaze;
      paintE2eTrace({
        lookupMs: lastLookupMs,
        conflict: Boolean(rejected),
        from: rejected ? `${eN}×${fromG}` : undefined,
        to: `${eN}×${toG}`,
        cite: porcelainCitations.find((x) => x.id === ruleWhy(era, (rejected ?? glaze) as GlazeId).citeId)?.title ?? "出处卡片",
      });
    }
    if (!fromTalk) lastSlotLine = "语义匹配 —（访客直入）";
    paintBuildLog();
    paintChips();
    paintMatrix();
    paintSolveLine();
    describeLock();
    const cites = citationsFor(glaze, shape);
    renderCitations(citesEl, cites, cites[1]?.id ?? cites[0]?.id);
    ask.setCitations(cites);
    paintLabel();
    vitrine?.setLook(shape, glaze, era, { conflictFade: Boolean(rejected) });
    // Ensure geo-hud shows segs/elapsed even when WebGL context fails or conflictFade defers ramp.
    window.setTimeout(() => {
      const hud = root.querySelector("[data-geo-hud]") as HTMLElement | null;
      if (!hud) return;
      if (vitrine) {
        const s = vitrine.stats();
        if (s.vertices > 0) {
          paintGeoHud(s);
          return;
        }
      }
      // Honest fallback: do not invent lathe ms when WebGL/上下文失败。
      hud.innerHTML =
        "瞬时档 · segs 160 · elapsed —（本帧 WebGL 不可用，未测 lathe ms）" +
        "<br/>Vertices — · Faces — · segs 160";
    }, rejected ? 400 : 60);
    paintProfile();
    const eName = eras.find((x) => x.id === era)!.name;
    const sName = shapes.find((x) => x.id === shape)!.name;
    const gName = glazes.find((x) => x.id === glaze)!.name;
    pipe.sys.set({
      lock: `${eName}·${sName}·${gName}`,
      state: lockNote ? t("sys.stateRewrite") : t("sys.stateOk"),
    });
    if (fromTalk) {
      const main = `对话写入展陈：${eName} · ${sName} · ${gName}`;
      talkLine = /茶/.test(talkLine) ? `${main}\n对话写入现有器型：斗笠碗（茶器），不新造器。` : main;
      showTalkToast(root, talkLine);
      fromTalk = false;
    } else {
      talkLine = "";
      showTalkToast(root, "");
    }
    if (firstVisit) {
      firstVisit = false;
      guide.speak(lines.ciyu);
    } else {
      guide.speak(lines.lock(eName, sName, gName, lockNote));
    }
    if (fromUser) {
      await pipe.run(`把「${gName}」写入「${sName}」的程序釉面，并遵守${eName}代约束表。`);
    } else {
      pipe.setStage("ready", "展陈就绪。可改约束以重走管线。");
    }
  }


  function fmtElapsed(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const s0 = Math.floor(ms / 1000);
    const r = ms % 1000;
    return `${s0}s${String(r).padStart(3, "0")}ms`;
  }

  function paintSpeedToggle(): void {
    const mode = vitrine?.rampMode ?? "instant";
    for (const btn of root.querySelectorAll("[data-speed]")) {
      const m = btn.getAttribute("data-speed");
      btn.classList.toggle("is-on", m === mode);
    }
  }

  function paintGeoHud(s: {
    vertices: number;
    faces: number;
    segs: number;
    elapsedMs: number;
    step: number;
    steps: number;
    mode: "demo" | "instant";
  }): void {
    const el = root.querySelector("[data-geo-hud]") as HTMLElement | null;
    if (!el) return;
    const modeLine =
      s.mode === "demo"
        ? "慢放演示(评委) · 档升采样"
        : `瞬时完成 · segs ${s.segs} · elapsed ${fmtElapsed(s.elapsedMs)}`;
    el.innerHTML =
      `${modeLine}<br/>` +
      `Vertices ${s.vertices} · Faces ${s.faces} · segs ${s.segs}` +
      (s.mode === "demo"
        ? ` · 档 ${s.step}/${s.steps} · elapsed ${fmtElapsed(s.elapsedMs)}`
        : "");
    if (s.mode === "instant" && s.segs >= 160) {
      paintBuildLog(s.elapsedMs, s.segs);
    } else if (s.mode === "demo") {
      paintBuildLog(s.elapsedMs, s.segs);
    }
  }

  if (/conflict/.test(location.hash) || /askpipe/.test(location.hash) || /audit/.test(location.hash)) {
    era = "song";
    glaze = "fencai";
    pickEra = "song";
    pickGlaze = "fencai";
  }
  try {
    vitrine = new PorcelainVitrine(canvas);
    vitrine.onStats = paintGeoHud;
  } catch (err) {
    console.warn("porcelain vitrine: WebGL unavailable", err);
    vitrine = null;
    const hud = root.querySelector("[data-geo-hud]") as HTMLElement | null;
    if (hud) {
      hud.innerHTML =
        "瞬时完成 · segs 160 · elapsed —（本帧 WebGL 上下文不可用，参数档仍为 160）<br/>Vertices — · Faces — · segs 160";
    }
  }
  // Product default = Instant (≤50ms → segs 160). Slow-mo only via ?build or 慢放演示 chip.
  if (vitrine) {
    if (/build/.test(location.hash)) {
      vitrine.rampMode = "demo";
    } else {
      vitrine.rampMode = "instant";
    }
  }
  paintSpeedToggle();
  if (/wire/.test(location.hash)) {
    vitrine?.setWire(true);
    root.querySelector("[data-wire]")?.classList.add("is-on");
  }
  const onResize = () => vitrine?.resize();
  window.addEventListener("resize", onResize);
  if (/build/.test(location.hash)) {
    if (vitrine) {
      vitrine.rampMode = "demo";
      paintSpeedToggle();
      vitrine.startGrowthDemo();
    }
    const log = root.querySelector("[data-build-log]") as HTMLDetailsElement | null;
    if (log) log.open = true;
  } else if (/[?&#]log\b/.test(location.hash)) {
    const log = root.querySelector("[data-build-log]") as HTMLDetailsElement | null;
    if (log) log.open = true;
  }

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-hall]")) {
      go("hall");
      return;
    }
    const wireBtn = t.closest("[data-wire]") as HTMLElement | null;
    if (wireBtn) {
      const on = !wireBtn.classList.contains("is-on");
      wireBtn.classList.toggle("is-on", on);
      vitrine?.setWire(on);
      return;
    }
    const speedBtn = t.closest("[data-speed]") as HTMLElement | null;
    if (speedBtn?.dataset.speed === "demo" || speedBtn?.dataset.speed === "instant") {
      vitrine?.setRampMode(speedBtn.dataset.speed);
      paintSpeedToggle();
      return;
    }
    if (t.closest("[data-replay-rewrite]")) {
      paintSolveLine();
      return;
    }
    const tryBtn = t.closest("[data-try-a]") as HTMLElement | null;
    if (tryBtn?.dataset.tryA && tryBtn.dataset.tryB) {
      resetMatrix();
      era = tryBtn.dataset.tryA as EraId;
      glaze = tryBtn.dataset.tryB as GlazeId;
      pickEra = era;
      pickGlaze = glaze;
      markTry("ciyu", era, glaze);
      void apply(true);
      return;
    }
    if (t.closest("[data-reset-matrix]")) {
      resetMatrix();
      void apply(true);
      return;
    }
    const cell = t.closest("[data-mx-era]") as HTMLElement | null;
    if (cell?.dataset.mxEra && cell.dataset.mxGlaze) {
      const e = cell.dataset.mxEra as EraId;
      const g = cell.dataset.mxGlaze as GlazeId;
      const cur = compatOf(e, g);
      const next: Compat = cur === "ok" ? "stretch" : cur === "stretch" ? "conflict" : "ok";
      setCompat(e, g, next);
      pickEra = e;
      pickGlaze = g;
      void apply(true);
      return;
    }
    const s = t.closest("[data-shape]") as HTMLElement | null;
    const g = t.closest("[data-glaze]") as HTMLElement | null;
    const er = t.closest("[data-era]") as HTMLElement | null;
    if (s?.dataset.shape) {
      shape = s.dataset.shape as ShapeId;
      void apply(true);
    } else if (g?.dataset.glaze) {
      glaze = g.dataset.glaze as GlazeId;
      pickEra = era;
      pickGlaze = glaze;
      void apply(true);
    } else if (er?.dataset.era) {
      era = er.dataset.era as EraId;
      pickEra = era;
      pickGlaze = glaze;
      void apply(true);
    }
  });
  root.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.matches("[data-cobalt]")) {
      const n = Number(el.value);
      (root.querySelector("[data-cobalt-n]") as HTMLElement).textContent = n.toFixed(2);
      vitrine?.setCraft({ cobalt: n });
    }
    if (el.matches("[data-points]")) {
      const n = Number(el.value);
      (root.querySelector("[data-points-n]") as HTMLElement).textContent = String(n);
      vitrine?.setCraft({ points: n });
      paintProfile();
    }
    if (el.matches("[data-crack]")) {
      const n = Number(el.value);
      (root.querySelector("[data-crack-n]") as HTMLElement).textContent = n.toFixed(2);
      vitrine?.setCraft({ crack: n });
    }
  });

  void ambience.set("museum");
  void apply(true);
  if (/fallback/.test(location.hash)) setAskForceLex(true);
  if (/matrix/.test(location.hash) || /conflict/.test(location.hash) || /audit/.test(location.hash)) {
    root.querySelector(".exhibit")?.classList.add("matrix-compact");
    const audit0 = root.querySelector("[data-audit]") as HTMLDetailsElement | null;
    if (audit0 && (/conflict/.test(location.hash) || /audit/.test(location.hash))) audit0.open = true;
    window.setTimeout(() => {
      root.querySelector(".matrix")?.scrollIntoView({ block: "nearest" });
      root.querySelector("[data-audit]")?.scrollIntoView({ block: "nearest" });
    }, 80);
  }
  if (/compare/.test(location.hash)) {
    window.setTimeout(() => {
      (root.querySelector("[data-compare]") as HTMLElement | null)?.click();
    }, 400);
  }
  async function autoAsk(query: string): Promise<void> {
    agent.warmup();
    await agent.waitReady(20000);
    const form = root.querySelector(".ask-form") as HTMLFormElement | null;
    const input = form?.querySelector('input[name="q"]') as HTMLInputElement | null;
    if (!form || !input) return;
    input.value = query;
    const fill = await paintParseStrip(root, query, "ciyu");
    paintE2eTrace({ q: query, slotMs: fill?.ms ?? 0 });
    form.requestSubmit();
    window.setTimeout(() => {
      const cites =
        (root.querySelector(".ask-cites") as HTMLElement | null) ||
        (root.querySelector("[data-cites]") as HTMLElement | null);
      cites?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 900);
  }
  if (/[?&#]arch\b/.test(location.hash) || /[?&#]thresh\b/.test(location.hash) || /[?&#]calib\b/.test(location.hash)) {
    const host = document.createElement("div");
    host.className = "arch-float";
    host.innerHTML = archPanelHtml({ compact: true });
    root.querySelector(".exhibit")?.appendChild(host);
    bindArchProbe(host);
    void fillThreshTable(host);
  }
  if (/askpipe/.test(location.hash)) {
    root.querySelector(".exhibit")?.classList.add("askpipe-shot", "matrix-compact");
    const audit = root.querySelector("[data-audit]") as HTMLDetailsElement | null;
    if (audit) audit.open = true;
    const e2e = root.querySelector("[data-e2e-trace]") as HTMLElement | null;
    if (e2e) e2e.hidden = false;
    window.setTimeout(() => {
      void autoAsk("宋代有没有粉彩");
    }, 450);
    window.setTimeout(() => {
      const strip = root.querySelector("[data-parse-strip]") as HTMLElement | null;
      strip?.scrollIntoView({ block: "nearest" });
      const e2e2 = root.querySelector("[data-e2e-trace]") as HTMLElement | null;
      e2e2?.scrollIntoView({ block: "nearest" });
    }, 2200);
  } else if (/\bbge\b/.test(location.hash)) {
    window.setTimeout(() => {
      void autoAsk("宋代的青白瓷瓶子");
    }, 400);
  } else if (/fallback/.test(location.hash)) {
    window.setTimeout(() => {
      void autoAsk("宋代的青白瓷瓶子");
    }, 500);
  } else if (/talk/.test(location.hash) || (/conflict/.test(location.hash) && /ask/.test(location.hash))) {
    window.setTimeout(() => {
      void autoAsk(/conflict/.test(location.hash) ? "宋代有没有粉彩" : "宋代能用什么釉");
    }, 400);
  }

  return () => {
    window.removeEventListener("resize", onResize);
    vitrine?.stopGrowthDemo();
    vitrine?.dispose();
    pipe.dispose();
    ambience.stop();
    guide.stop();
  };
}

