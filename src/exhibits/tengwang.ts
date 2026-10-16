import { go } from "../app/router";
import { mountPipeline } from "../app/pipeline";
import { bindCiteToggles, mountAsk, renderCitations, showTalkToast } from "../app/labels";
import { parseGexuIntent } from "../app/intent";
import { fallbackRow } from "../app/table";
import { formatLookupLine, pushLookupLog, reportLookupMs } from "../app/engineHud";
import {
  citationForMotif,
  fallbackMotif,
  matrixMotifs,
  moods,
  motifLockMessage,
  motifMoodCompat,
  motifs,
  poemLines,
  tengwangCitations,
  tengwangQA,
  type Compat,
  type ImageId,
  type MoodId,
} from "../data/tengwang";
import { PavilionScene } from "../render/pavilion";
import { ambience } from "../render/ambience";
import { guide, lines } from "../app/guide";
import { markTry, renderEvidence } from "../app/evidence";
import { tengwangRule } from "../data/evidenceRules";
import { routeName, t } from "../app/i18n";

export function mountTengwang(root: HTMLElement): () => void {
  let mood: MoodId = "luoxia";
  let focus: ImageId = "luoxia";
  let painting: PavilionScene | null = null;
  let firstVisit = true;
  let lastPts: Record<string, { x: number; y: number }> | null = null;
  let fromTalk = false;
  let lockNote = "";
  let rejected: ImageId | null = null;
  let pickMood: MoodId = mood;
  let pickFocus: ImageId = focus;
  let solveGen = 0;

  root.innerHTML = `
    <div class="exhibit gexu">
      <div class="grain" aria-hidden="true"></div>
      <header class="ex-bar">
        <button type="button" class="text-btn" data-hall>← ${routeName("hall")}</button>
        <div class="ex-crumb">
          <b>${routeName("gexu")}</b>
          <span>滕王阁 · 诗文意象钉在画面上</span>
        </div>
        <span class="stamp">原文公有领域 · 导览为示例</span>
      </header>
      <div class="gexu-stage">
        <div class="painting-wrap">
          <canvas class="dusk" aria-label="滕王阁程序夜景"></canvas>
          <div class="rewrite-toast" data-toast hidden></div>
          <div class="talk-toast" data-talk-toast hidden></div>
          <div class="hotspots" data-spots></div>
          <p class="vitrine-cap">拖转江面 · 点意象钉回原句 · 示意阁，非测绘</p>
        </div>
        <aside class="poem-rail">
          <p class="kicker">王勃 · 滕王阁序</p>
          <ol class="poem" data-poem></ol>
          <div class="field lock-dock">
            <span class="field-l">意象锁定</span>
            <div class="chips" data-moods></div>
          </div>
          <section class="matrix" data-matrix>
            <p class="kicker">约束表 · 查找</p>
            <p class="engine-chip">约束表引擎 · table.ts lookup</p>
            <table class="matrix-table">
              <thead>
                <tr>
                  <th></th>
                  <th data-mood-col="sanyan">九月三秋</th>
                  <th data-mood-col="luoxia">落霞孤鹜</th>
                  <th data-mood-col="yuzhou">渔舟唱晚</th>
                  <th data-mood-col="yanzhen">雁阵惊寒</th>
                </tr>
              </thead>
              <tbody data-matrix-body></tbody>
            </table>
            <div class="matrix-rule" data-matrix-rule></div>
            <details class="audit-panel" data-audit>
              <summary class="audit-sum">约束表审计 · 规则条目（可展开）</summary>
              <div class="audit-body" data-audit-body>
                <p class="audit-empty">冲突格触发后展开规则原文。</p>
              </div>
            </details>
          </section>
          <div class="verse-card" data-verse></div>
          <div class="cite-layer">
            <p class="kicker">引用链 · 钉自王勃原文</p>
            <div class="cites" data-cites></div>
          </div>
        </aside>
      </div>
      <div class="gexu-ask" data-ask></div>
      <footer class="ex-pipe" data-pipe></footer>
    </div>
  `;

  const spots = root.querySelector("[data-spots]") as HTMLElement;
  const poemEl = root.querySelector("[data-poem]") as HTMLOListElement;
  const moodEl = root.querySelector("[data-moods]") as HTMLElement;
  const verseEl = root.querySelector("[data-verse]") as HTMLElement;
  const citesEl = root.querySelector("[data-cites]") as HTMLElement;
  const canvas = root.querySelector("canvas.dusk") as HTMLCanvasElement;
  const pipe = mountPipeline(root.querySelector("[data-pipe]") as HTMLElement, routeName("gexu"));
  mountAsk(
    root.querySelector("[data-ask]") as HTMLElement,
    tengwangQA,
    tengwangCitations,
    "gexu",
    (q) => {
      const intent = parseGexuIntent(q);
      if (!intent) return;
      fromTalk = true;
      if (intent.mood) mood = intent.mood;
      if (intent.focus) focus = intent.focus;
      pickMood = mood;
      pickFocus = focus;
      void apply(intent.mood ? "mood" : "focus");
    },
  );
  bindCiteToggles(root);

  poemEl.innerHTML = poemLines.map((line) => `<li>${line}</li>`).join("");

  function paintMoods(): void {
    moodEl.innerHTML = moods
      .map(
        (m) =>
          `<button type="button" class="chip ${m.id === mood ? "is-on" : ""}" data-mood="${m.id}">${m.name}</button>`,
      )
      .join("");
  }

  function compatMark(c: Compat): string {
    return c === "ok" ? "合" : c === "stretch" ? "勉" : "冲";
  }

  function compatWord(c: Compat): string {
    return c === "ok" ? "合" : c === "stretch" ? "勉强" : "冲突";
  }

  function paintMatrix(): void {
    const body = root.querySelector("[data-matrix-body]") as HTMLElement;
    const ruleEl = root.querySelector("[data-matrix-rule]") as HTMLElement | null;
    body.innerHTML = matrixMotifs
      .map((id) => {
        const motif = motifs.find((m) => m.id === id)!;
        const rowOn = id === focus ? " is-row" : "";
        const cells = moods
          .map((m) => {
            const c = motifMoodCompat(id, m.id);
            const colOn = m.id === mood ? " is-col" : "";
            const pick = m.id === pickMood && id === pickFocus ? " is-pick" : "";
            const rej = rejected === id && m.id === mood ? " is-rejected is-from" : "";
            const toCell = rejected && id === focus && m.id === mood ? " is-to" : "";
            const mark =
              rejected === id && m.id === mood
                ? `<span class="mx-x" aria-hidden="true">×</span>${compatMark(c)}`
                : compatMark(c);
            return `<td class="${colOn.trim()}"><button type="button" class="matrix-cell compat-${c}${pick}${rej}${toCell}" data-mx-mood="${m.id}" data-mx-focus="${id}">${mark}</button></td>`;
          })
          .join("");
        return `<tr class="${rowOn.trim()}"><th class="matrix-row-l">${motif.name}</th>${cells}</tr>`;
      })
      .join("");
    for (const th of root.querySelectorAll("[data-mood-col]")) {
      th.classList.toggle("is-col", th.getAttribute("data-mood-col") === mood);
    }
    if (ruleEl) {
      const mName = moods.find((x) => x.id === pickMood)!.name;
      const fName = motifs.find((x) => x.id === pickFocus)!.name;
      const c = motifMoodCompat(pickFocus, pickMood);
      ruleEl.innerHTML = `<p>${mName} × ${fName} = ${compatWord(c)}。点下方审计面板展开规则原文。</p>
        <div class="matrix-rule-btns">${rejected ? '<button type="button" class="chip" data-replay-rewrite>重放改锁</button>' : ""}</div>`;
      const panel = root.querySelector("[data-audit]") as HTMLDetailsElement | null;
      const auditBody = root.querySelector("[data-audit-body]") as HTMLElement | null;
      if (panel && auditBody) {
        const toName = rejected
          ? motifs.find((x) => x.id === focus)?.name ?? focus
          : fName;
        const fromName = rejected
          ? motifs.find((x) => x.id === rejected)?.name ?? rejected
          : fName;
        const status = compatWord(c);
        const why =
          c === "conflict"
            ? `「${mName}」情境与意象「${fromName}」冲：改锁为「${toName}」，不另造无原文锚点的画面。`
            : `该意象与情境判定为${status}。`;
        auditBody.innerHTML = `
          <p class="audit-path"><b>可追溯回放</b> ${
            rejected || c === "conflict"
              ? `冲格「${mName}×${fromName}」× → 规则条目 → 改锁格「${mName}×${toName}」`
              : `当前格「${mName}×${fName}」= ${status}`
          }</p>
          <p class="audit-rule"><b>规则原文</b> ${why}</p>
          <pre class="audit-raw">{ mood: "${pickMood}", motif: "${rejected ?? pickFocus}", status: "${c}", fallback: "${rejected ? focus : ""}" }</pre>
          ${renderEvidence(
            "gexu",
            tengwangRule(pickMood, (rejected ?? pickFocus) as ImageId),
            (a, b) => motifMoodCompat(b as ImageId, a as MoodId),
            (a, b) => motifMoodCompat(b as ImageId, a as MoodId),
            (a, b) => `${moods.find((x) => x.id === a)?.name ?? a} × ${motifs.find((x) => x.id === b)?.name ?? b}`,
          )}
        `;
        if (rejected || c === "conflict") {
          panel.open = true;
          panel.classList.add("is-live");
        } else {
          panel.classList.remove("is-live");
        }
      }
    }
  }

  function paintSolveLine(): void {
    const section = root.querySelector("[data-matrix]") as HTMLElement | null;
    if (!section) return;
    section.querySelector("svg.matrix-solve")?.remove();
    const gen = ++solveGen;
    if (!rejected) return;
    const fromMood = mood;
    const fromFocus = rejected;
    const toFocus = focus;
    const draw = (): void => {
      if (gen !== solveGen) return;
      const from = section.querySelector(
        `[data-mx-mood="${fromMood}"][data-mx-focus="${fromFocus}"]`,
      ) as HTMLElement | null;
      const to = section.querySelector(
        `[data-mx-mood="${fromMood}"][data-mx-focus="${toFocus}"]`,
      ) as HTMLElement | null;
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
      marker.setAttribute("id", `gx-arrow-${gen}`);
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
      line.setAttribute("marker-end", `url(#gx-arrow-${gen})`);
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

  function spotPos(id: string, fallbackX: number, fallbackY: number): { x: number; y: number } {
    const p = lastPts?.[id as keyof typeof lastPts];
    if (!p) return { x: fallbackX, y: fallbackY };
    return { x: Math.min(92, Math.max(8, p.x)), y: Math.min(88, Math.max(10, p.y)) };
  }

  function paintSpots(): void {
    spots.innerHTML = motifs
      .map((m) => {
        const p = spotPos(m.id, m.x, m.y);
        return `<button type="button" class="hot ${m.id === focus ? "is-on" : ""}" data-hot="${m.id}" style="left:${p.x}%;top:${p.y}%"><span>${m.name}</span></button>`;
      })
      .join("");
  }

  function highlightPoem(): void {
    const motif = motifs.find((m) => m.id === focus)!;
    const keys: Record<string, string> = {
      luoxia: "落霞",
      guwu: "孤鹜",
      qiushui: "秋水",
      changtian: "长天",
      yuzhou: "渔舟",
      yanzhen: "雁阵",
      feige: "飞阁",
      hantan: "寒潭",
    };
    const key = keys[motif.id];
    for (const li of poemEl.querySelectorAll("li")) {
      const text = li.textContent ?? "";
      li.classList.toggle("is-on", Boolean(key && text.includes(key)));
    }
  }

  async function apply(kind: "mood" | "focus"): Promise<void> {
    lockNote = "";
    rejected = null;
    const t0 = performance.now();
    const c0 = motifMoodCompat(focus, mood);
    if (c0 === "conflict") {
      const next = fallbackRow(fallbackMotif, mood);
      lockNote = motifLockMessage(mood, focus, next);
      rejected = focus;
      focus = next;
      pushLookupLog(
        formatLookupLine({
          tag: "阁",
          grid: "motifByMood",
          col: mood,
          row: rejected,
          result: "conflict",
          fallback: next,
        }),
      );
    } else {
      pushLookupLog(
        formatLookupLine({
          tag: "阁",
          grid: "motifByMood",
          col: mood,
          row: focus,
          result: c0,
        }),
      );
    }
    reportLookupMs(Math.max(0, Math.round(performance.now() - t0)));
    const motif = motifs.find((m) => m.id === focus)!;
    const m = moods.find((x) => x.id === mood)!;
    paintMoods();
    paintMatrix();
    paintSolveLine();
    paintSpots();
    highlightPoem();
    verseEl.innerHTML = `
      <p class="lock-k">${lockNote ? "冲突改锁" : "当前锁定"}</p>
      <p class="verse">${motif.couplet}</p>
      <p class="lock-main">${m.name} · ${motif.name}</p>
      <p class="lock-b">${motif.scene}</p>
      <p class="lock-b">${m.blurb}</p>
      ${lockNote ? `<p class="lock-warn">${lockNote}</p>` : ""}
    `;
    const toast = root.querySelector("[data-toast]") as HTMLElement | null;
    if (toast) {
      toast.hidden = !lockNote;
      toast.textContent = lockNote;
    }
    renderCitations(citesEl, citationForMotif(focus), "xu-public");
    if (painting) {
      painting.mood = mood;
      painting.focus = focus;
      painting.applyMood();
    }
    pipe.sys.set({
      lock: `${m.name}·${motif.name}`,
      state: lockNote ? t("sys.stateRewrite") : t("sys.stateOk"),
    });
    if (fromTalk) {
      showTalkToast(root, `对话写入展陈：${m.name} · ${motif.name}`);
      fromTalk = false;
    } else {
      showTalkToast(root, "");
    }
    if (firstVisit) {
      firstVisit = false;
      guide.speak(lines.gexu);
    } else {
      guide.speak(lines.verse(motif.name, motif.couplet));
    }
    if (kind === "mood") {
      await pipe.run(`把画面节令锁为「${m.name}」：${m.line}`);
    } else {
      await pipe.run(`将焦点钉在「${motif.name}」，并绑定原句。`);
    }
  }

  try {
    painting = new PavilionScene(canvas);
    painting.onProject = (pts) => {
      lastPts = pts;
      for (const btn of spots.querySelectorAll<HTMLElement>("[data-hot]")) {
        const id = btn.dataset.hot;
        if (!id || !pts[id as keyof typeof pts]) continue;
        const p = spotPos(id, 50, 50);
        btn.style.left = `${p.x}%`;
        btn.style.top = `${p.y}%`;
      }
    };
  } catch (err) {
    console.warn("tengwang pavilion: WebGL unavailable", err);
    painting = null;
  }
  const onResize = () => painting?.resize();
  window.addEventListener("resize", onResize);

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-hall]")) {
      go("hall");
      return;
    }
    if (t.closest("[data-replay-rewrite]")) {
      paintSolveLine();
      return;
    }
    const tryBtn = t.closest("[data-try-a]") as HTMLElement | null;
    if (tryBtn?.dataset.tryA && tryBtn.dataset.tryB) {
      mood = tryBtn.dataset.tryA as MoodId;
      focus = tryBtn.dataset.tryB as ImageId;
      pickMood = mood;
      pickFocus = focus;
      markTry("gexu", mood, focus);
      void apply("focus");
      return;
    }
    const cell = t.closest("[data-mx-mood]") as HTMLElement | null;
    if (cell?.dataset.mxMood && cell.dataset.mxFocus) {
      mood = cell.dataset.mxMood as MoodId;
      focus = cell.dataset.mxFocus as ImageId;
      pickMood = mood;
      pickFocus = focus;
      void apply("focus");
      return;
    }
    const md = t.closest("[data-mood]") as HTMLElement | null;
    const hot = t.closest("[data-hot]") as HTMLElement | null;
    if (md?.dataset.mood) {
      mood = md.dataset.mood as MoodId;
      if (mood === "luoxia") focus = "luoxia";
      if (mood === "yuzhou") focus = "yuzhou";
      if (mood === "yanzhen") focus = "yanzhen";
      if (mood === "sanyan") focus = "hantan";
      pickMood = mood;
      pickFocus = focus;
      void apply("mood");
    } else if (hot?.dataset.hot) {
      focus = hot.dataset.hot as ImageId;
      pickMood = mood;
      pickFocus = focus;
      void apply("focus");
    }
  });

  void ambience.set("river");
  if (/conflict/.test(location.hash)) {
    // Demo: 渔舟情境 × 雁阵意象 → 冲 → 改锁渔舟
    mood = "yuzhou";
    focus = "yanzhen";
    pickMood = "yuzhou";
    pickFocus = "yanzhen";
  }
  void apply("focus");
  if (/conflict/.test(location.hash) || /matrix/.test(location.hash)) {
    root.querySelector(".exhibit")?.classList.add("matrix-compact");
    window.setTimeout(() => {
      root.querySelector("[data-matrix],.matrix")?.scrollIntoView({ block: "nearest" });
    }, 160);
  }

  return () => {
    window.removeEventListener("resize", onResize);
    painting?.dispose();
    pipe.dispose();
    ambience.stop();
    guide.stop();
  };
}
