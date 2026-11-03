// Content-level English for the EN toggle. Translations are ours (project team), not official museum text.
// Strategy: exact dictionary → pattern templates (with glossary) → sentence-by-sentence fallback.
// Source excerpts / classical lines are NOT replaced: the Chinese original stays and an
// "EN translation (ours)" line is appended next to it (see domTranslate.ts).
import EXACT_RAW from "./en-exact.json";
import SRC_RAW from "./en-src.json";
import { COMPAT_EN, GLOSS } from "./gloss";

const EXACT = EXACT_RAW as Record<string, string>;
export const SRC = SRC_RAW as Record<string, string>;
export const HAN = /[\u4e00-\u9fff]/;

/** glossary / exact for a short term */
export function g(s: string): string {
  const t = s.trim();
  return EXACT[t] ?? GLOSS[t] ?? (t.endsWith("代") && GLOSS[t.slice(0, -1)] ? `${GLOSS[t.slice(0, -1)]} dynasty` : t);
}
const C = (s: string): string => COMPAT_EN[s.trim()] ?? s;
const gl = (s: string): string => s.split(/\s*([·×，、\/]|→)\s*/).map((p) => (/^[·×，、\/]$|^→$/.test(p) ? (p === "，" || p === "、" ? ", " : ` ${p} `) : g(p))).join("").replace(/\s+/g, " ").trim();

type Rule = [RegExp, (...m: string[]) => string];
const RULES: Rule[] = [
  [/^瞬时档 · segs (\d+) · elapsed —（本帧 WebGL 不可用，未测 lathe ms）(.*)$/, (_, n, rest) => `Instant profile · segs ${n} · elapsed — (WebGL unavailable this frame; lathe ms not measured)${rest}`],
  [/^\[0ms\] table\.ts lookup (.+?)×(.+?) → (合|勉|冲)(?: → 改锁(.+))?$/, (_, a, b, c, d) => `[0ms] table.ts lookup ${g(a)} × ${g(b)} → ${C(c)}${d ? ` → resolved to ${g(d)}` : ""}`],
  [/^\[0ms\] 语义匹配 (.*)$/, (_, r) => `[0ms] semantic match ${r.replace("访客直入", "direct visit").replace(/语义命中/g, "hit")}`],
  [/^语义匹配 (.+)$/, (_, r) => `Semantic match ${r.replace("本地", "on-device").replace("BGE载入", "BGE load")}`],
  [/^语义命中 (.+)$/, (_, a) => `Semantic hit ${g(a)}`],
  [/^余弦相似度 ≥(.+?) 命中（探针实验 n=(\d+)，见 thresh-bench\.json；未做显著性检验）。弱并列 best−second<(.+?) 留空可降 lex。$/, (_, th, n, gap) => `Hit when cosine ≥${th} (probe n=${n}, see thresh-bench.json; no significance test). Near ties (best − second < ${gap}) stay blank and may fall back to lexical.`],
  [/^声景：(.+)$/, (_, a) => `Soundscape: ${splitTr(a)}`],
  [/^约束校验：把画面节令锁为「(.+?)」：(.+)$/, (_, m, l) => `Constraint check: scene season locked to "${g(m)}": ${SRC[l.trim()] ?? l}`],
  [/^约束校验：将焦点钉在「(.+?)」，并绑定原句。$/, (_, m) => `Constraint check: focus pinned to "${g(m)}" and bound to the original line.`],
  [/^约束校验：时辰锁为「(.+?)」，重写声景：(.+)$/, (_, h, r) => `Constraint check: hour locked to "${g(h)}"; soundscape rewritten: ${splitTr(r)}`],
  [/^约束校验：脚步从上一处走到「(.+?)」，词条钉在房间上。$/, (_, r) => `Constraint check: walked from the previous spot to "${g(r)}"; the entry is pinned to the room.`],
  [/^实测 (合|勉|冲) ✓ 与依据一致$/, (_, c) => `Measured ${C(c)} ✓ matches basis`],
  [/^召回 (\S+) · 精确 (\S+)$/, (_, a, b) => `Recall ${a} · Precision ${b}`],
  [/^\[([^·]+)·([^·]+)\]$/, (_, a, b) => `[${g(a)} · ${g(b)}]`],
  [/^(.+?) × (.+?) = (合|勉|冲)；(.+)$/, (_, a, b, c, r) => `${g(a)} × ${g(b)} = ${C(c)}; ${r.replace(/ → (.+?)（不另造无原文锚点的画面）。$/, (_m: string, x: string) => ` → ${g(x)} (no scene without an anchor in the text).`)}`],
  [/^(.+?) × (.+?) = (合|勉强|冲突|勉|冲)。点下方审计面板展开规则原文。$/, (_, a, b, c) => `${g(a)} × ${g(b)} = ${C(c)}. Open the audit panel below for the rule text.`],
  [/^当前格「(.+?)×(.+?)」= (合|勉强|勉|冲)(（无改锁）)?$/, (_, a, b, c, n) => `Current cell "${g(a)} × ${g(b)}" = ${C(c)}${n ? " (no resolution)" : ""}`],
  [/^冲格「(.+?)×(.+?)」× → 规则条目 → 改锁格「(.+?)×(.+?)」$/, (_, a, b, c, d) => `Conflict cell "${g(a)} × ${g(b)}" × → rule entry → resolved cell "${g(c)} × ${g(d)}"`],
  [/^(.+?) ?× ?(.+?) → (合|勉|冲)$/, (_, a, b, c) => `${g(a)} × ${g(b)} → ${C(c)}`],
  [/^(.+?)×(.+?) → (.+?)×(.+?)$/, (_, a, b, c, d) => `${g(a)} × ${g(b)} → ${g(c)} × ${g(d)}`],
  [/^→ 依据预期「(合|勉|冲)」$/, (_, c) => `→ expected per basis: "${C(c)}"`],
  [/^→ (.+?)（fallbackRow）$/, (_, a) => `→ ${g(a)} (fallbackRow)`],
  [/^(.+?) × (.+?)：(.+)$/, (_, a, b, n) => `${g(a)} × ${g(b)}: ${tr(n) ?? n}`],
  [/^(.+?) × (.+?)$/, (_, a, b) => `${g(a)} × ${g(b)}`],
  [/^(\S+?)×(\S+?)(合|勉|冲)(?:（(.+)）)?$/, (_, a, b, c, n) => `${g(a)} × ${g(b)} ${C(c)}${n ? ` (${tr(n) ?? n})` : ""}`],
  [/^当前锁定：(.+?)，(.+?)，(.+?)。请看展签与引用条。$/, (_, a, b, c) => `Now locked: ${g(a)}, ${g(b)}, ${g(c)}. See the label and citation strip.`],
  [/^约束校验：把「(.+?)」写入「(.+?)」的程序釉面，并遵守(.)代约束表。$/, (_, a, b, e) => `Constraint check: apply ${g(a)} to the procedural glaze of the ${g(b)}, following the ${g(e)} constraint table.`],
  [/^(.)代与「(.+?)」在本内容包中判定为风格冲突。已改锁为「(.+?)」，以免把后代彩料写进前朝约束。$/, (_, e, a, b) => `${g(e)} and "${g(a)}" are a style Conflict in this content pack. Resolved to "${g(b)}", so a later pigment is not written into an earlier era.`],
  [/^(.+?)与「(.+?)」在本内容包中判定为冲突。(.+?)已改锁为「(.+?)」，不另造一座建筑。$/, (_, a, h, why, b) => `${g(a)} and "${g(h)}" are a Conflict in this content pack. ${tr(why) ?? why} Resolved to "${g(b)}", without inventing another building.`],
  [/^「(.+?)」情境与意象「(.+?)」冲：改锁为「(.+?)」，不另造无原文锚点的画面。$/, (_, m, a, b) => `The mood "${g(m)}" conflicts with the motif "${g(a)}": resolved to "${g(b)}", without inventing a scene that has no anchor in the text.`],
  [/^风格改锁。(.+?) 当前展出：(.+?)，(.+?)，(.+?)。$/, (_, s, a, b, c) => `Style resolved. ${tr(s) ?? s} Now showing: ${g(a)}, ${g(b)}, ${g(c)}.`],
  [/^拒绝「(.+?)」 → 改锁「(.+?)」$/, (_, a, b) => `Rejected "${g(a)}" → resolved to "${g(b)}"`],
  [/^对话写入展陈：(.+)$/, (_, a) => `Question wrote to exhibit: ${gl(a)}`],
  [/^\[(时代|釉色|器型|情境|意象|时辰|房间):(.+?)\]$/, (_, k, v) => `[${g(k)}: ${g(v)}]`],
  [/^(时代|釉色|器型|情境|意象|时辰|房间)·(.+)$/, (_, k, v) => `${g(k)} · ${g(v)}`],
  [/^\[(检索|算力|状态):(.+?)\]$/, (_, k, v) => `[${{ 检索: "retrieve", 算力: "compute", 状态: "state" }[k]}: ${tr(v) ?? g(v)}]`],
  [/^词面命中 (.+)$/, (_, a) => `Lexical hit ${gl(a)}`],
  [/^「([^」]+)」([^「」]+)$/, (m, q, rest) => (SRC[q] || SRC["「" + q + "」"]) ? `「${q}」 [EN translation, ours] ${SRC[q] || SRC["「" + q + "」"]} ${splitTr(rest)}` : m],
  [/^钉自《(.+)》$/, (_, a) => `Pinned from "${g(a.replace(/^《|》$/g, "")) }"`],
  [/^帧 (.+?) · heap (.+)$/, (_, a, b) => `frame ${a} · heap ${b}`],
  [/^BGE-small ONNX q8 · 22\.9 MiB · 阈值 槽位 0\.40 · 作答 0\.55(.*)$/, (_, r) => `BGE-small ONNX q8 · 22.9 MiB · threshold slot 0.40 · answer 0.55${r}`],
  [/^e2e · 问句→检索 via (\S+) · (.*?)score (\S+) · 钉 (\d+) 条出处$/, (_, v, mid, s, n) => `e2e · question → retrieval via ${v} · ${mid.replace("BGE载入", "BGE load")}score ${s} · ${n} source(s) pinned`],
  [/^\[(.+?)·(.+?)·(.+?)\]$/, (_, a, b, c) => `[${g(a)} · ${g(b)} · ${g(c)}]`],
  [/^\[(.+?)\]$/, (_, a) => `[${g(a)}]`],
  [/^(.+?) · (.+?) · (.+?)$/, (_, a, b, c) => `${g(a)} · ${g(b)} · ${g(c)}`],
  [/^(.+?) · (.+?)$/, (_, a, b) => `${g(a)} · ${g(b)}`],
  [/^(.*?)【(.+?)】(.*?) · 平面为示意，术语见出处$/, (_, pre, cur, post) => `${gl(pre.replace(/ → $/, "")) ? gl(pre.replace(/ → $/, "")) + " → " : ""}【${g(cur)}】${post ? " → " + gl(post.replace(/^ → /, "")) : ""} · schematic plan; terms are sourced`],
  [/^—— (.+)《(.+?)》([^《》]*)$/, (_, p, t, rest) => `— ${g(p.trim().replace(/ ·$/, ""))}, "${g(t)}"${rest.replace(/·\s*$/, "").replace("（第一批）", " (first batch)").replace(/ · 唐\s*$/, " · Tang")} ·`],
  [/^· 访问 (.+)$/, (_, d) => `· accessed ${d}`],
];

/** sentence fallback: greedily match the longest run of consecutive sentences */
function splitTr(s: string): string {
  const parts = s.split(/(?<=[。；])\s*/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length; ) {
    let done = false;
    for (let j = parts.length; j > i; j--) {
      const cand = parts.slice(i, j).join("");
      const r = tr(cand, false) ?? (j === i + 1 ? tr(cand.replace(/[。；]$/, ""), false) : null);
      if (r) { out.push(r); i = j; done = true; break; }
    }
    if (!done) { out.push(parts[i]!); i++; }
  }
  return out.join(" ");
}
const cache = new Map<string, string | null>();
/** Translate one visible string; null if nothing applies. */
export function tr(s: string, allowSplit = true): string | null {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t || !HAN.test(t)) return null;
  const key = (allowSplit ? "1" : "0") + t;
  if (cache.has(key)) return cache.get(key)!;
  let out: string | null = EXACT[t] ?? GLOSS[t] ?? SRC[t] ?? null;
  if (out == null) {
    cache.set(key, null); // recursion guard
    for (const [re, fn] of RULES) {
      const m = t.match(re);
      if (m) {
        const r = fn(...m);
        if (r !== t) { out = r; break; }
      }
    }
    if (out == null && allowSplit && /[。；]./.test(t)) {
      const r = splitTr(t);
      if (r !== t) out = r;
    }
  }
  cache.set(key, out);
  return out;
}
