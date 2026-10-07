import type { Compat } from "./table";
import { sourceById } from "../data/sources";

/** 审计面板「展示 → 验证」：依据摘录（仅已核出处）+ 命中/边界/例外案例 + 试一下。 */

export type EvTag = "命中" | "边界" | "例外";

export type EvCase = {
  /** 列 id（瓷：朝代；阁：情境；客：房间） */
  a: string;
  /** 行 id（瓷：釉色；阁：意象；客：时辰） */
  b: string;
  tag: EvTag;
  label: string;
  note: string;
};

export type EvRule = {
  /** verified=依据已逐字核对；design=设计约定（非史料）；pending=待核 */
  status: "verified" | "design" | "pending";
  statusText: string;
  claim: string;
  sourceIds: string[];
  cases: EvCase[];
};

const WORD: Record<Compat, string> = { ok: "合", stretch: "勉", conflict: "冲" };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let lastTry: { line: string; a: string; b: string } | null = null;

export function markTry(line: string, a: string, b: string): void {
  lastTry = { line, a, b };
}

export function clearTry(): void {
  lastTry = null;
}

/**
 * @param expectFn 默认约束表（出厂规则）
 * @param actualFn 当前运行时约束表（瓷语可被访客改格；阁序/客家与默认相同）
 */
export function renderEvidence(
  line: string,
  rule: EvRule,
  expectFn: (a: string, b: string) => Compat,
  actualFn: (a: string, b: string) => Compat,
  nameOf: (a: string, b: string) => string,
): string {
  const srcs = rule.sourceIds
    .map((id) => sourceById(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map(
      (s) => `<li class="ev-src-i">
        <q>${esc(s.excerpt)}</q>
        <span class="ev-src-by">—— ${esc(s.publisher)}《${esc(s.title)}》${s.date !== "—" ? ` · ${esc(s.date)}` : ""}
        · <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a> · 访问 ${esc(s.accessed)}
        ${s.status === "partial" ? '<em class="ev-partial">（仅经搜索摘要核对，页面未直接打开）</em>' : ""}</span>
      </li>`,
    )
    .join("");
  const cases = rule.cases
    .map((c) => {
      const exp = expectFn(c.a, c.b);
      const act = actualFn(c.a, c.b);
      const drift = exp !== act ? `<em class="ev-drift">当前表已被改成「${WORD[act]}」</em>` : "";
      const tried = lastTry && lastTry.line === line && lastTry.a === c.a && lastTry.b === c.b;
      const verdict = tried
        ? `<span class="ev-verdict ${exp === act ? "is-pass" : "is-fail"}">实测 ${WORD[act]} ${exp === act ? "✓ 与依据一致" : "✗ 与依据不一致"}</span>`
        : "";
      const tagCls = c.tag === "命中" ? "tag-hit" : c.tag === "边界" ? "tag-edge" : "tag-exc";
      return `<li class="ev-case">
        <span class="ev-tag ${tagCls}">${c.tag}</span>
        <b>${esc(nameOf(c.a, c.b))}</b> → 依据预期「${WORD[exp]}」${drift}
        <button type="button" class="chip ev-try" data-try-a="${esc(c.a)}" data-try-b="${esc(c.b)}">试一下</button>
        ${verdict}
        <small class="ev-note">${esc(c.label)}${c.note ? `：${esc(c.note)}` : ""}</small>
      </li>`;
    })
    .join("");
  const stCls = rule.status === "verified" ? "is-verified" : rule.status === "design" ? "is-design" : "is-pending";
  return `<section class="ev" data-evidence>
    <p class="ev-status ${stCls}"><b>依据状态</b> ${esc(rule.statusText)}</p>
    <p class="ev-claim"><b>规则依据</b> ${esc(rule.claim)}</p>
    ${srcs ? `<ul class="ev-src">${srcs}</ul>` : '<p class="ev-none">本条没有可公开查证的出处摘录（设计约定或待核）。</p>'}
    <p class="ev-k"><b>验证 · 同类案例</b> 点「试一下」用默认约束表现场复现，并对照依据。</p>
    <ol class="ev-cases">${cases}</ol>
  </section>`;
}
