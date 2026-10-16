// 第 4 条线（扩展演示，按扩展指南新增）：西山万寿宫庙会 · 活动 × 时段 约束。
// 复用 table.ts lookup/fallbackRow 与 evidence.ts 审计面板；不新增渲染引擎、不进问展题库。
import { lookup, fallbackRow } from "../app/table";
import { markTry, renderEvidence } from "../app/evidence";
import { formatLookupLine, pushLookupLog } from "../app/engineHud";
import { compatWord, routeName } from "../app/i18n";
import { wanshouRule } from "../data/evidenceRules";
import { acts, actCompat, preferredSlot, slotByAct, slots, type ActId, type SlotId } from "../data/wanshou";

export function mountWanshou(root: HTMLElement): () => void {
  let act: ActId = "kaichao";
  let slot: SlotId = "chendan";
  let note = "";
  const nameA = (a: string) => acts.find((x) => x.id === a)?.name ?? a;
  const nameS = (s: string) => slots.find((x) => x.id === s)?.name ?? s;

  root.innerHTML = `
    <div class="exhibit wanshou">
      <header class="ex-bar">
        <button type="button" class="text-btn" data-hall>← ${routeName("hall")}</button>
        <div class="ex-crumb"><b>${routeName("wanshou")}</b><span>西山万寿宫庙会 · 活动与时段的约束（扩展演示线）</span></div>
        <span class="stamp">模板演示 · 无三维场景</span>
      </header>
      <section class="ws-panel">
        <p class="kicker">活动</p><div class="chips" data-acts></div>
        <p class="kicker">时段</p><div class="chips" data-slots></div>
        <p class="ws-verdict" data-verdict></p>
        <table class="matrix ws-matrix"><thead><tr><th></th>${acts.map((a) => `<th>${a.name}</th>`).join("")}</tr></thead><tbody data-body></tbody></table>
        <details class="audit-panel" data-audit open><summary>约束表审计 · 规则条目（可展开）</summary><div class="audit-body" data-audit-body></div></details>
      </section>
    </div>`;
  const $ = (s: string) => root.querySelector(s) as HTMLElement;

  function render(): void {
    $("[data-acts]").innerHTML = acts.map((a) => `<button type="button" class="chip ${a.id === act ? "is-on" : ""}" data-act="${a.id}">${a.name}</button>`).join("");
    $("[data-slots]").innerHTML = slots.map((s) => `<button type="button" class="chip ${s.id === slot ? "is-on" : ""} compat-${actCompat(act, s.id)}" data-slot="${s.id}">${s.name}<i>${compatWord(actCompat(act, s.id))}</i></button>`).join("");
    $("[data-body]").innerHTML = slots.map((s) => `<tr><th>${s.name}</th>${acts.map((a) => `<td class="compat-${slotByAct[a.id][s.id]} ${a.id === act && s.id === slot ? "is-cur" : ""}">${compatWord(slotByAct[a.id][s.id])}</td>`).join("")}</tr>`).join("");
    $("[data-verdict]").innerHTML = `<span>${nameA(act)}</span> × <span>${nameS(slot)}</span> → <b>${compatWord(actCompat(act, slot))}</b>${note ? `　<span>${note}</span>` : ""}`;
    $("[data-audit-body]").innerHTML = renderEvidence("wanshou", wanshouRule(act, slot), (a, b) => actCompat(a as ActId, b as SlotId), (a, b) => actCompat(a as ActId, b as SlotId), (a, b) => `${nameA(a)} × ${nameS(b)}`);
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
    pushLookupLog(formatLookupLine({ tag: "万", grid: "slotByAct", col: a, row: s, result: c, fallback: c === "conflict" ? slot : undefined }));
    render();
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-hall]")) { location.hash = "#/"; return; }
    const tryBtn = t.closest("[data-try-a]") as HTMLElement | null;
    if (tryBtn?.dataset.tryA && tryBtn.dataset.tryB) {
      markTry("wanshou", tryBtn.dataset.tryA, tryBtn.dataset.tryB);
      act = tryBtn.dataset.tryA as ActId;
      slot = tryBtn.dataset.tryB as SlotId;
      note = "";
      render();
      return;
    }
    const a = t.closest("[data-act]") as HTMLElement | null;
    if (a) return choose(a.dataset.act as ActId, slot);
    const s = t.closest("[data-slot]") as HTMLElement | null;
    if (s) return choose(act, s.dataset.slot as SlotId);
  };
  root.addEventListener("click", onClick);
  render();
  return () => root.removeEventListener("click", onClick);
}
