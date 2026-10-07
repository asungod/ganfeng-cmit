import type { QAItem, Route } from "../data/types";
import { allDocs, citationsOf, type Doc } from "./corpus";
import { ask, type AskResult } from "./ask";
import {
  parseGexuIntent,
  parseHakkaIntent,
  parsePorcelainIntent,
} from "./intent";

export type AgentStatus = "idle" | "loading" | "ready" | "fallback";

type Extractor = {
  (text: string, opts: { pooling: "mean"; normalize: boolean }): Promise<{ data: Float32Array | number[] }>;
};

const QUERY_PREFIX = "为这个句子生成表示以用于检索：";

function grams(text: string): Map<string, number> {
  const s = text.toLowerCase().replace(/\s+/g, "");
  const m = new Map<string, number>();
  const bump = (g: string) => m.set(g, (m.get(g) ?? 0) + 1);
  for (const ch of s) {
    if (ch) bump(ch);
  }
  for (let i = 0; i < s.length - 1; i++) bump(s.slice(i, i + 2));
  return m;
}

const GENERIC_KEYWORDS = new Set(["为什么", "谁", "哪里", "什么时候", "用", "名字", "真的", "用途", "区别", "约束", "难得"]);

/** 题库作答阈值（余弦，含主题词加权）。标定见 docs/calib/：n=101（题库内 61 / 题库外 40）。0.55 在 dev 47 问上选定（dev 召回 100%、题库外 0 误答）；holdout 54 问检验：召回 88.2%、精确 78.9%，同主题难例 4/10 误答。均为自拟问句，非独立评测。 */
export const DOC_SCORE_THRESH = 0.55;

function lexScore(query: string, item: QAItem): number {
  const q = query.trim();
  if (!q) return 0;
  let s = 0;
  for (const k of item.keywords) {
    if (!k || !q.includes(k)) continue;
    // 泛化词（为什么 / 谁 / 哪里…）单独出现不足以命中，避免「特朗普是谁」落到滕王条目
    s += GENERIC_KEYWORDS.has(k) ? 0.6 : k.length > 1 ? 2.4 : 1.4;
  }
  const qg = grams(q);
  const dg = grams(`${item.question}${item.answer}${item.keywords.join("")}`);
  let overlap = 0;
  let qn = 0;
  for (const [g, c] of qg) {
    qn += c;
    const d = dg.get(g);
    if (d) overlap += Math.min(c, d) * (g.length > 1 ? 1.4 : 0.45);
  }
  s += overlap / Math.max(4, qn);
  return s;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
  return s;
}

export type SlotFillResult = {
  via: "bge-slot" | "lex-slot";
  slots: Record<string, string>;
  scores: Record<string, number>;
  /** Winning prototype phrase per filled slot (for trace). */
  phrases?: Record<string, string>;
  /** Second-best cosine per slot when via bge-slot (for margin viz). */
  seconds?: Record<string, number>;
  ms: number;
};

/** Prototype-space cosine gate (r16 n=58 F1-best). Not generic STS 0.7+. */
export const PROTO_SCORE_THRESH = 0.4;
/** If best−second < margin, leave slot empty (weak tie → may fall lex). */
export const PROTO_SCORE_MARGIN = 0.04;

type Proto = { slot: string; id: string; phrase: string };

const SLOT_PROTOS: Proto[] = [
  { slot: "era", id: "song", phrase: "宋代景德镇青白瓷" },
  { slot: "era", id: "song", phrase: "宋代" },
  { slot: "era", id: "yuan", phrase: "元代青花" },
  { slot: "era", id: "ming", phrase: "明代官窑" },
  { slot: "era", id: "qing", phrase: "清代粉彩" },
  { slot: "glaze", id: "yingqing", phrase: "影青青白釉" },
  { slot: "glaze", id: "yingqing", phrase: "青白瓷" },
  { slot: "glaze", id: "qinghua", phrase: "青花钴料" },
  { slot: "glaze", id: "jihong", phrase: "祭红铜红" },
  { slot: "glaze", id: "fencai", phrase: "粉彩釉上彩" },
  { slot: "glaze", id: "wucai", phrase: "五彩硬彩" },
  { slot: "shape", id: "meiping", phrase: "梅瓶" },
  { slot: "shape", id: "meiping", phrase: "瓶子" },
  { slot: "shape", id: "yuhuchun", phrase: "玉壶春瓶" },
  { slot: "shape", id: "bowl", phrase: "斗笠碗" },
  { slot: "shape", id: "dish", phrase: "折沿盘" },
  { slot: "shape", id: "gu", phrase: "花觚" },
  { slot: "mood", id: "luoxia", phrase: "落霞孤鹜" },
  { slot: "mood", id: "yuzhou", phrase: "渔舟唱晚" },
  { slot: "mood", id: "yanzhen", phrase: "雁阵惊寒" },
  { slot: "mood", id: "sanyan", phrase: "九月三秋" },
  { slot: "focus", id: "luoxia", phrase: "落霞" },
  { slot: "focus", id: "guwu", phrase: "孤鹜" },
  { slot: "focus", id: "qiushui", phrase: "秋水" },
  { slot: "focus", id: "changtian", phrase: "长天" },
  { slot: "focus", id: "yuzhou", phrase: "渔舟" },
  { slot: "focus", id: "yanzhen", phrase: "雁阵" },
  { slot: "focus", id: "feige", phrase: "飞阁" },
  { slot: "focus", id: "hantan", phrase: "寒潭" },
  { slot: "room", id: "zutang", phrase: "祖堂" },
  { slot: "room", id: "menlou", phrase: "门楼" },
  { slot: "room", id: "jiaolou", phrase: "角楼" },
  { slot: "room", id: "heping", phrase: "禾坪" },
  { slot: "room", id: "tianjing", phrase: "天井" },
  { slot: "room", id: "xiangdao", phrase: "巷道" },
  { slot: "hour", id: "dawn", phrase: "晨" },
  { slot: "hour", id: "noon", phrase: "午" },
  { slot: "hour", id: "dusk", phrase: "暮" },
  { slot: "hour", id: "night", phrase: "夜" },
];

const LINE_SLOTS: Record<string, string[]> = {
  ciyu: ["era", "glaze", "shape"],
  gexu: ["mood", "focus"],
  kejia: ["room", "hour"],
};

function finish(doc: Doc, question: string, via: AskResult["via"], score: number, current?: Route): AskResult {
  let answer = doc.item.answer;
  if (current && doc.line !== "guide" && doc.line !== current) {
    answer = `这问落在「${doc.lineName}」线上。${answer}`;
  }
  return {
    ok: true,
    question,
    answer,
    citations: citationsOf(doc.item.citationIds),
    via,
    score,
    line: doc.line,
    hitTitle: doc.item.question,
  };
}

class ExhibitAgent {
  status: AgentStatus = "idle";
  forceLex = false;
  /** Measured BGE load() wall time in ms; 0 until first successful/failed load finishes. */
  loadMs = 0;
  private booting = false;
  private extractor: Extractor | null = null;
  private vectors: Float32Array[] | null = null;
  private qVectors: Float32Array[] | null = null;
  /** 最近一次向量检索的最高分（阈值判定前），仅供 ?calib 校准与答辩图表读取。 */
  lastRawBest = 0;
  /** 与 lastRawBest 对应的题库原问（同样只供标定读取）。 */
  lastRawDoc = "";
  private protoVectors: Float32Array[] | null = null;
  private lastQ = "";
  private listeners = new Set<(s: AgentStatus) => void>();

  get hasVector(): boolean {
    return Boolean(this.extractor && this.vectors);
  }

  setForceLex(on: boolean): void {
    this.forceLex = on;
    if (on) this.set("fallback");
    else if (this.extractor && this.vectors) this.set("ready");
  }

  onStatus(fn: (s: AgentStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private set(s: AgentStatus): void {
    this.status = s;
    for (const fn of this.listeners) fn(s);
  }

  warmup(): void {
    if (this.booting) return;
    if (this.extractor && this.vectors) {
      if (!this.forceLex && this.status !== "ready") this.set("ready");
      return;
    }
    if (this.status === "ready") return;
    // allow retry after soft fallback (not when user forced lex)
    if (this.status === "fallback" && this.forceLex) return;
    void this.load();
  }

  private async load(): Promise<void> {
    this.booting = true;
    const tLoad = performance.now();
    if (!this.forceLex) this.set("loading");
    try {
      const mod = await import("@huggingface/transformers");
      const env = mod.env;
      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      env.useBrowserCache = true;
      env.localModelPath = "/models/";
      const wasm = env.backends.onnx?.wasm;
      if (wasm) {
        wasm.wasmPaths = "/ort/";
        // single-thread avoids asyncify worker path that Vite mishandles as SPA HTML
        wasm.numThreads = 1;
        wasm.proxy = false;
      }

      const pipe = (await mod.pipeline(
        "feature-extraction",
        "Xenova/bge-small-zh-v1.5",
        { dtype: "q8" },
      )) as unknown as Extractor;
      this.extractor = pipe;
      this.vectors = [];
      this.qVectors = [];
      for (const doc of allDocs) {
        const text = `${doc.item.question}。${doc.item.answer}。${doc.item.keywords.join(" ")}`;
        const out = await pipe(text, { pooling: "mean", normalize: true });
        this.vectors.push(Float32Array.from(out.data));
        // 只用问题本身再编码一次：改写问更接近原问题，避免被答案里提到的其他釉色带偏
        const outQ = await pipe(doc.item.question, { pooling: "mean", normalize: true });
        this.qVectors.push(Float32Array.from(outQ.data));
      }
      this.protoVectors = [];
      for (const p of SLOT_PROTOS) {
        const out = await pipe(p.phrase, { pooling: "mean", normalize: true });
        this.protoVectors.push(Float32Array.from(out.data));
      }
      this.loadMs = Math.round(performance.now() - tLoad);
      this.set(this.forceLex ? "fallback" : "ready");
    } catch (err) {
      console.warn("exhibit agent: BGE unavailable, lexical fallback", err);
      this.extractor = null;
      this.vectors = null;
      this.qVectors = null;
      this.protoVectors = null;
      this.loadMs = Math.round(performance.now() - tLoad);
      this.set("fallback");
    } finally {
      this.booting = false;
    }
  }

  async ask(query: string, pack: QAItem[], current?: Route): Promise<AskResult> {
    const q0 = query.trim();
    if (!q0) {
      return {
        ok: false,
        question: q0,
        answer: "请先点一条问展纸条，或写入与展线有关的词。",
        citations: [],
        via: "none",
      };
    }

    const exact = ask(pack, citationsOf(pack.flatMap((p) => p.citationIds)), q0);
    if (exact.ok && pack.some((p) => p.question === q0)) {
      this.lastQ = q0;
      return { ...exact, via: "slip" };
    }

    const follow = this.expandFollowUp(q0);
    const q = follow || q0;

    if (!this.forceLex && this.status === "idle") this.warmup();
    if (!this.forceLex && (this.status === "loading" || this.booting)) {
      await this.waitReady(20000);
    }

    if (!this.forceLex && this.status === "ready" && this.extractor && this.vectors) {
      const hit = await this.byVector(q, current);
      if (hit) {
        this.lastQ = q0;
        return hit;
      }
    }

    const lex = this.byLex(q, current);
    if (lex) {
      this.lastQ = q0;
      return lex;
    }

    this.lastQ = q0;
    return {
      ok: false,
      question: q0,
      answer:
        "题库未收录这一问。讲解员只在本展内容包里检索，不把句子送去外部大模型，以免无出处的话混进展柜。",
      citations: [],
      via: "none",
    };
  }

  async compare(query: string, current?: Route): Promise<{ bge: AskResult | null; lex: AskResult | null }> {
    const q = query.trim();
    this.warmup();
    if (this.status === "loading" || this.booting) await this.waitReady(20000);
    const lex = q ? this.byLex(q, current) : null;
    let bge: AskResult | null = null;
    if (this.extractor && this.vectors && q) {
      bge = await this.byVector(q, current);
    }
    return { bge, lex };
  }

  private expandFollowUp(q: string): string | null {
    if (!this.lastQ) return null;
    if (q.length > 14) return null;
    // 问句自带展品主题词（影青、祭红、围屋…）时不是追问，不拼接上一问
    const hasSubject = allDocs.some((d) =>
      d.item.keywords.some((k) => k.length > 1 && !GENERIC_KEYWORDS.has(k) && q.includes(k)),
    );
    if (hasSubject) return null;
    if (/那|还有|为什么|呢$|这个|它|她|他/.test(q)) return `${this.lastQ} ${q}`;
    return null;
  }

  async waitReady(ms: number): Promise<AgentStatus> {
    if (this.status === "idle" && !this.forceLex) this.warmup();
    const t0 = Date.now();
    while (
      (this.booting || this.status === "loading" || this.status === "idle") &&
      Date.now() - t0 < ms
    ) {
      await new Promise((r) => setTimeout(r, 120));
    }
    return this.status;
  }

  /** Raw per-slot argmax cosine (no threshold). For thresh-bench measurement. */
  async slotScores(
    q: string,
    line?: Route,
  ): Promise<{ via: "bge" | "lex"; best: Record<string, { id: string; score: number }>; ms: number }> {
    const t0 = performance.now();
    const q0 = q.trim();
    const want =
      line && LINE_SLOTS[line] ? LINE_SLOTS[line]! : ["era", "glaze", "shape", "mood", "focus", "room", "hour"];
    if (!this.forceLex && this.status === "idle") this.warmup();
    if (!this.forceLex && (this.status === "loading" || this.booting || this.status === "idle")) {
      await this.waitReady(20000);
    }
    if (!this.forceLex && this.extractor && this.protoVectors && q0) {
      const out = await this.extractor(`${QUERY_PREFIX}${q0}`, { pooling: "mean", normalize: true });
      const qv = Float32Array.from(out.data);
      const best: Record<string, { id: string; score: number }> = {};
      for (const slot of want) {
        let bestId = "";
        let bestS = -1;
        for (let i = 0; i < SLOT_PROTOS.length; i++) {
          const p = SLOT_PROTOS[i]!;
          if (p.slot !== slot) continue;
          const s = cosine(qv, this.protoVectors[i]!);
          if (s > bestS) {
            bestS = s;
            bestId = p.id;
          }
        }
        if (bestId) best[slot] = { id: bestId, score: bestS };
      }
      return { via: "bge", best, ms: Math.round(performance.now() - t0) };
    }
    const lex = this.lexSlotFill(q0, line);
    const best: Record<string, { id: string; score: number }> = {};
    for (const [k, v] of Object.entries(lex.slots)) best[k] = { id: v, score: lex.scores[k] ?? 1 };
    return { via: "lex", best, ms: Math.round(performance.now() - t0) };
  }

  async slotFill(q: string, line?: Route): Promise<SlotFillResult> {
    const t0 = performance.now();
    const q0 = q.trim();
    const want = line && LINE_SLOTS[line] ? LINE_SLOTS[line]! : ["era", "glaze", "shape", "mood", "focus", "room", "hour"];

    if (!this.forceLex && this.status === "idle") this.warmup();
    if (!this.forceLex && (this.status === "loading" || this.booting || this.status === "idle")) {
      await this.waitReady(20000);
    }

    if (!this.forceLex && this.extractor && this.protoVectors && q0) {
      const out = await this.extractor(`${QUERY_PREFIX}${q0}`, { pooling: "mean", normalize: true });
      const qv = Float32Array.from(out.data);
      const slots: Record<string, string> = {};
      const scores: Record<string, number> = {};
      const phrases: Record<string, string> = {};
      const seconds: Record<string, number> = {};
      let anyHit = false;
      for (const slot of want) {
        let bestId = "";
        let bestPhrase = "";
        let best = -1;
        let second = -1;
        for (let i = 0; i < SLOT_PROTOS.length; i++) {
          const p = SLOT_PROTOS[i]!;
          if (p.slot !== slot) continue;
          const s = cosine(qv, this.protoVectors[i]!);
          if (s > best) {
            second = best;
            best = s;
            bestId = p.id;
            bestPhrase = p.phrase;
          } else if (s > second) {
            second = s;
          }
        }
        if (bestId) seconds[slot] = Math.max(0, second);
        // Margin gate: weak ties left empty so lex may fill on full miss.
        if (bestId && best >= PROTO_SCORE_THRESH && best - second >= PROTO_SCORE_MARGIN) {
          slots[slot] = bestId;
          scores[slot] = best;
          phrases[slot] = bestPhrase;
          anyHit = true;
        }
      }
      if (anyHit) {
        // Fill empty wanted slots from lex so 「宋代有没有粉彩」 keeps era when only glaze clears thresh.
        const lex = this.lexSlotFill(q0, line);
        for (const slot of want) {
          if (!slots[slot] && lex.slots[slot]) {
            slots[slot] = lex.slots[slot]!;
            scores[slot] = lex.scores[slot] ?? 1;
            phrases[slot] = phrases[slot] ?? lex.slots[slot]!;
          }
        }
        return {
          via: "bge-slot",
          slots,
          scores,
          phrases,
          seconds,
          ms: Math.round(performance.now() - t0),
        };
      }
    }

    return { ...this.lexSlotFill(q0, line), ms: Math.round(performance.now() - t0) };
  }

  private lexSlotFill(q: string, line?: Route): Omit<SlotFillResult, "ms"> {
    const slots: Record<string, string> = {};
    const scores: Record<string, number> = {};
    const bump = (k: string, v: string) => {
      slots[k] = v;
      scores[k] = 1;
    };
    if (!line || line === "ciyu") {
      const p = parsePorcelainIntent(q);
      if (p?.era) bump("era", p.era);
      if (p?.glaze) bump("glaze", p.glaze);
      if (p?.shape) bump("shape", p.shape);
    }
    if (!line || line === "gexu") {
      const p = parseGexuIntent(q);
      if (p?.mood) bump("mood", p.mood);
      if (p?.focus) bump("focus", p.focus);
    }
    if (!line || line === "kejia") {
      const p = parseHakkaIntent(q);
      if (p?.room) bump("room", p.room);
      if (p?.hour) bump("hour", p.hour);
    }
    if (line === "ciyu") {
      const keep = ["era", "glaze", "shape"];
      for (const k of Object.keys(slots)) if (!keep.includes(k)) delete slots[k], delete scores[k];
    } else if (line === "gexu") {
      const keep = ["mood", "focus"];
      for (const k of Object.keys(slots)) if (!keep.includes(k)) delete slots[k], delete scores[k];
    } else if (line === "kejia") {
      const keep = ["room", "hour"];
      for (const k of Object.keys(slots)) if (!keep.includes(k)) delete slots[k], delete scores[k];
    }
    return { via: "lex-slot", slots, scores };
  }

  private async byVector(q: string, current?: Route): Promise<AskResult | null> {
    if (!this.extractor || !this.vectors) return null;
    const out = await this.extractor(`${QUERY_PREFIX}${q}`, { pooling: "mean", normalize: true });
    const qv = Float32Array.from(out.data);
    let bestI = -1;
    let best = 0;
    for (let i = 0; i < allDocs.length; i++) {
      let s = Math.max(cosine(qv, this.vectors[i]), this.qVectors?.[i] ? cosine(qv, this.qVectors[i]) : 0);
      if (current && allDocs[i].line === current) s += 0.04;
      // 词面主题词加权：问句含该条的主题词（滕王、影青…）时每个 +0.04，最多 +0.08
      const hits = allDocs[i].item.keywords.filter((k) => k.length > 1 && !GENERIC_KEYWORDS.has(k) && q.includes(k)).length;
      s += 0.04 * Math.min(2, hits);
      if (s > best) {
        best = s;
        bestI = i;
      }
    }
    this.lastRawBest = best;
    this.lastRawDoc = bestI >= 0 ? allDocs[bestI].item.question : "";
    if (bestI < 0 || best < DOC_SCORE_THRESH) return null;
    return finish(allDocs[bestI], q, "bge", best, current);
  }

  private byLex(q: string, current?: Route): AskResult | null {
    let best: Doc | null = null;
    let score = 0;
    for (const doc of allDocs) {
      let s = lexScore(q, doc.item);
      if (current && doc.line === current) s += 0.35;
      if (s > score) {
        score = s;
        best = doc;
      }
    }
    if (!best || score < 2.1) return null;
    return finish(best, q, "lex", score, current);
  }
}

export const agent = new ExhibitAgent();
if (typeof window !== "undefined") {
  (window as unknown as { __gfAgent?: ExhibitAgent }).__gfAgent = agent;
}

export function statusLabel(s: AgentStatus): string {
  if (s === "loading") return "正在用 CPU/WASM 载入 BGE-small 量化版";
  if (s === "ready") return "本地轻量检索 · BGE-small 量化版 · CPU/WASM";
  if (s === "fallback") return "词面检索（已模拟加载失败 / 或 WASM 不可用）";
  return "提问后加载；无 GPU，失败则词面检索";
}
