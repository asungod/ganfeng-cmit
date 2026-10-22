// 第 4 条线（扩展演示，按扩展指南新增）：西山万寿宫庙会 · 活动 × 时段 约束。
// 复用 table.ts lookup/fallbackRow 与 evidence.ts 审计面板；不新增渲染引擎、不进问展题库。
import { lookup, fallbackRow } from "../app/table";
import { markTry, renderEvidence } from "../app/evidence";
import { formatLookupLine, pushLookupLog } from "../app/engineHud";
import { compatWord, routeName, t } from "../app/i18n";
import { bindDemoDetailToggle } from "../app/demoDetail";
import { wanshouRule } from "../data/evidenceRules";
import { preloadGltfKit } from "../render/gltfKit";
import { TempleScene } from "../render/temple";
import { acts, actCompat, preferredSlot, slotByAct, slots, type ActId, type SlotId } from "../data/wanshou";

export function mountWanshou(root: HTMLElement): () => void {
  let act: ActId = "kaichao";
  let slot: SlotId = "chendan";
  let note = "";
  const nameA = (a: string) => acts.find((x) => x.id === a)?.name ?? a;
  const nameS = (s: string) => slots.find((x) => x.id === s)?.name ?? s;

  root.innerHTML = `
    <div class="exhibit wanshou is-immersive">
      <header class="ex-bar">
        <button type="button" class="text-btn" data-hall>← ${routeName("hall")}</button>
        <div class="ex-crumb"><b>${routeName("wanshou")}</b><span>西山万寿宫庙会 · 活动与时段的约束（扩展演示线）</span></div>
        <span class="stamp">程序复原示意 · 非测绘</span>
        <button type="button" class="chip demo-detail-btn" data-demo-detail aria-pressed="false">${t("demo.off")}</button>
      </header>
      <div class="immersive ws-stage"><div class="painting-wrap"><canvas class="temple" aria-label="万寿宫庙会三维场景"></canvas></div></div>
      <section class="ws-panel ws-card">
        <details class="wall-hint" data-wall-hint>
          <summary>怎么选</summary>
          <p class="wall-lead">点选活动与时段即可；约束表与规则审计收在下方。</p>
        </details>
        <p class="kicker">活动</p><div class="chips" data-acts></div>
        <p class="kicker">时段</p><div class="chips" data-slots></div>
        <p class="kicker">看戏机位</p><div class="chips"><button type="button" class="chip" data-cam="kanxi">近看戏台</button><button type="button" class="chip" data-cam="guanzhong">台上望众</button></div>
        <p class="ws-pick" data-pick></p>
        <section class="matrix" data-matrix>
          <details class="matrix-fold" data-matrix-fold>
            <summary class="matrix-sum">约束表</summary>
            <p class="engine-chip demo-only">约束表引擎 · table.ts lookup</p>
            <p class="ws-verdict" data-verdict></p>
            <table class="matrix ws-matrix"><thead><tr><th></th>${acts.map((a) => `<th>${a.name}</th>`).join("")}</tr></thead><tbody data-body></tbody></table>
            <details class="audit-panel" data-audit>
              <summary class="audit-sum">约束表审计 · 规则条目（可展开）</summary>
              <div class="audit-body" data-audit-body>
                <p class="audit-empty">冲突格触发后展开规则原文。</p>
              </div>
            </details>
          </details>
        </section>
      </section>
    </div>`;
  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  let scene: TempleScene | null = null;
  const canvasEl = root.querySelector("canvas.temple") as HTMLCanvasElement;
  void (async () => {
    try {
      await preloadGltfKit();
      scene = new TempleScene(canvasEl);
      scene.set(act, slot, true);
    } catch (err) {
      console.warn("wanshou temple: WebGL unavailable", err);
    }
  })();
  const onResize = () => scene?.resize();
  window.addEventListener("resize", onResize);
  bindDemoDetailToggle(root);

  function render(): void {
    const demo = document.body.classList.contains("is-demo-detail");
    $("[data-acts]").innerHTML = acts
      .map((a) => `<button type="button" class="chip ${a.id === act ? "is-on" : ""}" data-act="${a.id}">${a.name}</button>`)
      .join("");
    // Visitor chips: name only (no 合/勉/冲). Demo: title keeps status for judges.
    $("[data-slots]").innerHTML = slots
      .map((s) => {
        const c = actCompat(act, s.id);
        const label = compatWord(c);
        return `<button type="button" class="chip ${s.id === slot ? "is-on" : ""} compat-${c}" data-slot="${s.id}" title="${label}">${s.name}</button>`;
      })
      .join("");
    $("[data-pick]").innerHTML = `<span>当前：</span><span>${nameA(act)}</span> · <span>${nameS(slot)}</span>`;
    $("[data-body]").innerHTML = slots
      .map(
        (s) =>
          `<tr><th>${s.name}</th>${acts
            .map(
              (a) =>
                `<td class="compat-${slotByAct[a.id][s.id]} ${a.id === act && s.id === slot ? "is-cur" : ""}">${compatWord(slotByAct[a.id][s.id])}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    $("[data-verdict]").innerHTML = `<span>${nameA(act)}</span> × <span>${nameS(slot)}</span> → <b>${compatWord(actCompat(act, slot))}</b>${note ? `　<span>${note}</span>` : ""}`;
    $("[data-audit-body]").innerHTML = renderEvidence(
      "wanshou",
      wanshouRule(act, slot),
      (a, b) => actCompat(a as ActId, b as SlotId),
      (a, b) => actCompat(a as ActId, b as SlotId),
      (a, b) => `${nameA(a)} × ${nameS(b)}`,
    );
    scene?.set(act, slot);
    const audit = root.querySelector("[data-audit]") as HTMLDetailsElement | null;
    const fold = root.querySelector("[data-matrix-fold]") as HTMLDetailsElement | null;
    const c = actCompat(act, slot);
    if (audit) {
      if (demo && (c === "conflict" || note)) {
        audit.open = true;
        audit.classList.add("is-live");
        if (fold) fold.open = true;
      } else if (!demo) {
        // Visitors keep audit closed; matrix fold stays as user/demo left it.
        if (!note && c !== "conflict") audit.classList.remove("is-live");
      }
    }
  }

  function choose(a: ActId, s: SlotId): void {
    const c = lookup(slotByAct, a, s);
    note = "";
    act = a;
    slot = s;
    if (c === "conflict") {
      const to = fallbackRow(preferredSlot, a);
      note = `冲突：已改锁为「${nameS(to)}」`; // EN: contentEn rule
      slot = to;
    }
    pushLookupLog(
      formatLookupLine({
        tag: "万",
        grid: "slotByAct",
        col: a,
        row: s,
        result: c,
        fallback: c === "conflict" ? slot : undefined,
      }),
    );
    render();
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-hall]")) {
      location.hash = "#/";
      return;
    }
    const tryBtn = t.closest("[data-try-a]") as HTMLElement | null;
    if (tryBtn?.dataset.tryA && tryBtn.dataset.tryB) {
      markTry("wanshou", tryBtn.dataset.tryA, tryBtn.dataset.tryB);
      act = tryBtn.dataset.tryA as ActId;
      slot = tryBtn.dataset.tryB as SlotId;
      note = "";
      render();
      return;
    }
    const cam = t.closest("[data-cam]") as HTMLElement | null;
    if (cam) {
      if (act !== "xiban") choose("xiban" as ActId, slot);
      const name = cam.dataset.cam as "kanxi" | "guanzhong";
      window.setTimeout(() => scene?.view(name), act === "xiban" ? 0 : 2100);
      return;
    }
    const a = t.closest("[data-act]") as HTMLElement | null;
    if (a) return choose(a.dataset.act as ActId, slot);
    const s = t.closest("[data-slot]") as HTMLElement | null;
    if (s) return choose(act, s.dataset.slot as SlotId);
  };
  root.addEventListener("click", onClick);
  render();
  return () => {
    root.removeEventListener("click", onClick);
    window.removeEventListener("resize", onResize);
    scene?.dispose();
  };
}
