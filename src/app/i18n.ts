/** UI chrome bilingual toggle. Exhibit body / source excerpts stay Chinese. */
export type Lang = "zh" | "en";

type Dict = Record<string, string>;

const ZH: Dict = {
  "boot.k": "夜展开启",
  "boot.s": "可对话的数字展",
  "chrome.muteOff": "声景关闭",
  "chrome.muteOn": "声景开启",
  "chrome.guideOff": "讲解关闭",
  "chrome.guideOn": "讲解开启",
  "chrome.lang": "EN",
  "chrome.langTitle": "Switch to English",
  "route.hall": "门厅",
  "route.ciyu": "瓷语",
  "route.gexu": "阁序",
  "route.kejia": "客家",
  "route.wanshou": "万寿宫",
  "route.guide": "开源边界",
  "compat.ok": "合",
  "compat.stretch": "勉",
  "compat.conflict": "冲",
  "sys.lockNone": "未入展柜",
  "sys.stateOk": "合规",
  "sys.stateRewrite": "已改锁",
  "sys.retrieve.lex": "词面",
  "sys.retrieve.loading": "载入中",
  "sys.retrieve.idle": "未载入",
  "sys.compute": "程序化复原示意（非文物三维扫描）· CPU/WASM · 无GPU",
  "sys.retrievePrefix": "检索",
  "sys.computePrefix": "算力",
  "sys.statePrefix": "状态",
  "sys.frame": "帧",
  "ask.kicker": "问展 · 本地讲解员",
  "ask.title": "就当前展柜提问",
  "ask.send": "问讲解员",
  "ws.camK": "看戏机位",
  "ws.camKanxi": "近看戏台",
  "ws.camCrowd": "台上望众",
  "ask.blurb": "点下方问句，或自己输入；讲解员只在本展内容包里回答，并钉出处。",
  "ask.blurbTech":
    "本地 BGE-small 嵌入 + 约束表路由：槽位余弦相似度 ≥0.40 写入约束；题库检索最高分 ≥0.55 才作答并钉出处，否则拒答。",
  "ask.judge": "评测工具",
  "ask.statusIdle": "提问后加载本地检索模型 · 先可用词面检索",
  "ask.forceLex": "模拟加载失败",
  "ask.compare": "对比两条路径",
  "ask.hint.hall": "可以写成问句，例如：这是 ChatGPT 套壳吗？",
  "ask.hint.ciyu": "可以写成问句，例如：宋代为什么不能锁粉彩？",
  "ask.hint.gexu": "可以写成问句，例如：彭蠡是哪里？",
  "ask.hint.kejia": "可以写成问句，例如：围屋和土楼是一回事吗？",
  "ask.via.bge": "本答走：本地轻量检索",
  "ask.via.lex": "本答走：词面检索",
  "ask.via.slip": "本答走：题库原问",
  "ask.via.none": "本答走：未收录",
  "ask.diff.same": "差异：同一题",
  "ask.diff.diff": "差异：不同命中",
  "ask.diff.one": "差异：一侧拒绝",
  "ask.refuse":
    "题库未收录这一问。讲解员只在本展内容包里检索，不把句子送去外部大模型，以免无出处的话混进展柜。",
  "ask.empty": "请先点一条问展纸条，或写入与展线有关的词。",
  "cite.verified": "已核",
  "cite.design": "本展说明",
  "cite.pending": "待核",
  "cite.sample": "示例",
  "cite.detail": "出处详情",
  "cite.url": "出处网址",
  "cite.noUrl": "无可公开查证网址",
  "cite.pd": "原文公有领域",
  "cite.accessed": "访问",
  "ev.status": "依据状态",
  "ev.claim": "规则依据",
  "ev.none": "本条没有可公开查证的出处摘录（设计约定或待核）。",
  "ev.verify": "验证 · 同类案例",
  "ev.verifyHint": "点「试一下」用默认约束表现场复现，并对照依据。",
  "ev.try": "试一下",
  "ev.expect": "依据预期",
  "ev.drift": "当前表已被改成",
  "ev.measured": "实测",
  "ev.match": "✓ 与依据一致",
  "ev.mismatch": "✗ 与依据不一致",
  "ev.tag.hit": "命中",
  "ev.tag.edge": "边界",
  "ev.tag.exc": "例外",
  "ev.partial": "（仅经搜索摘要核对，页面未直接打开）",
  "ev.access": "访问",
  "demo.off": "演示细节",
  "demo.on": "演示细节 · 开",
  "ui.matrix": "约束表",
  "ui.howto": "怎么选",
};

const EN: Dict = {
  "ask.send": "Ask",
  "ws.camK": "Opera-view camera",
  "ws.camKanxi": "Opera stage close-up",
  "ws.camCrowd": "Audience seen from the stage",
  "boot.k": "Opening",
  "boot.s": "A Conversational Digital Exhibition",
  "chrome.muteOff": "Soundscape off",
  "chrome.muteOn": "Soundscape on",
  "chrome.guideOff": "Guide off",
  "chrome.guideOn": "Guide on",
  "chrome.lang": "中文",
  "chrome.langTitle": "Switch to Chinese",
  "route.hall": "Lobby",
  "route.ciyu": "Porcelain Whispers",
  "route.gexu": "Tengwang Preface",
  "route.kejia": "Hakka Weiwu",
  "route.wanshou": "Wanshou Palace · demo",
  "route.guide": "Honesty statement",
  "compat.ok": "Compatible",
  "compat.stretch": "Borderline",
  "compat.conflict": "Conflict",
  "sys.lockNone": "No exhibit locked",
  "sys.stateOk": "OK",
  "sys.stateRewrite": "Re-locked",
  "sys.retrieve.lex": "lexical",
  "sys.retrieve.loading": "loading",
  "sys.retrieve.idle": "idle",
  "sys.compute": "Procedural schematic · not a 3D scan · CPU/WASM · no GPU",
  "sys.retrievePrefix": "retrieve",
  "sys.computePrefix": "compute",
  "sys.statePrefix": "state",
  "sys.frame": "frame",
  "ask.kicker": "Ask the guide · on-device",
  "ask.title": "Ask about this exhibit",
  "ask.blurb": "Pick a suggested question or type your own. Answers stay inside this exhibit pack and always cite a source.",
  "ask.blurbTech":
    "On-device BGE-small + constraint routing: slot cosine ≥0.40 writes a constraint; bank score ≥0.55 returns a sourced answer; otherwise the guide refuses.",
  "ask.judge": "Judge tools",
  "ask.statusIdle": "On-device retriever loads on first ask · lexical search ready immediately",
  "ask.forceLex": "Simulate load failure",
  "ask.compare": "Compare two paths",
  "ask.hint.hall": "Try: Is this a ChatGPT wrapper?",
  "ask.hint.ciyu": "Try: Why can't a Song vase use famille rose?",
  "ask.hint.gexu": "Try: Where is Pengli?",
  "ask.hint.kejia": "Try: Are weiwu (walled houses) and tulou the same?",
  "ask.via.bge": "Path: on-device retrieval",
  "ask.via.lex": "Path: lexical search",
  "ask.via.slip": "Path: exact question-bank match",
  "ask.via.none": "Path: not in bank",
  "ask.diff.same": "Diff: same hit",
  "ask.diff.diff": "Diff: different hits",
  "ask.diff.one": "Diff: one side refused",
  "ask.refuse":
    "Not in the exhibit bank. The on-device guide searches local content only and never sends your sentence to an external large language model.",
  "ask.empty": "Pick a question slip, or type words related to this route.",
  "cite.verified": "Verified",
  "cite.design": "Design note",
  "cite.pending": "Pending",
  "cite.sample": "Sample",
  "cite.detail": "Source detail",
  "cite.url": "Source URL",
  "cite.noUrl": "No public URL",
  "cite.pd": "Public-domain text",
  "cite.accessed": "accessed",
  "ev.status": "Source status",
  "ev.claim": "Rule basis",
  "ev.none": "No publicly checkable excerpt (design note or pending).",
  "ev.verify": "Verify · similar cases",
  "ev.verifyHint": "Click Try it to replay with the default constraint table and compare against the basis.",
  "ev.try": "Try it",
  "ev.expect": "Expected",
  "ev.drift": "Table now reads",
  "ev.measured": "Measured",
  "ev.match": "✓ matches basis",
  "ev.mismatch": "✗ differs from basis",
  "ev.tag.hit": "Hit",
  "ev.tag.edge": "Boundary",
  "ev.tag.exc": "Exception",
  "ev.partial": "(checked via search snippet only; page not opened)",
  "ev.access": "accessed",
  "demo.off": "Demo details",
  "demo.on": "Demo details · on",
  "ui.matrix": "Constraint table",
  "ui.howto": "How to choose",
};

const urlLang = /[?&#]lang=(en|zh)\b/.exec(location.search + location.hash)?.[1] as Lang | undefined;
if (urlLang) localStorage.setItem("gf-lang", urlLang);
let lang: Lang = urlLang || (localStorage.getItem("gf-lang") as Lang) || "zh";
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return lang;
}

export function t(key: string): string {
  const table = lang === "en" ? EN : ZH;
  return table[key] ?? ZH[key] ?? key;
}

export function compatWord(c: "ok" | "stretch" | "conflict"): string {
  return t(`compat.${c}`);
}

export function routeName(id: string): string {
  return t(`route.${id}` in ZH ? `route.${id}` : "route.hall");
}

const TITLE_ZH = "赣风 · 可对话的数字展";
const TITLE_EN = "Ganfeng · A Conversational Digital Exhibition";
function applyTitle(): void {
  document.title = lang === "en" ? TITLE_EN : TITLE_ZH;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  localStorage.setItem("gf-lang", next);
  document.documentElement.lang = next === "en" ? "en" : "zh-CN";
  applyTitle();
  listeners.forEach((fn) => fn());
}

export function toggleLang(): Lang {
  setLang(lang === "zh" ? "en" : "zh");
  return lang;
}

export function onLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function tagLabel(tag: string): string {
  if (tag === "命中" || tag === "Hit") return t("ev.tag.hit");
  if (tag === "边界" || tag === "Boundary") return t("ev.tag.edge");
  if (tag === "例外" || tag === "Exception") return t("ev.tag.exc");
  return tag;
}

applyTitle();
