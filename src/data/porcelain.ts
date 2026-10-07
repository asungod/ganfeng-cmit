import type { Citation, QAItem } from "./types";
import { lookup, type Compat } from "../app/table";
export type { Compat };

export type ShapeId = "meiping" | "yuhuchun" | "bowl" | "dish" | "gu";
export type GlazeId = "qinghua" | "yingqing" | "jihong" | "fencai" | "wucai";
export type EraId = "song" | "yuan" | "ming" | "qing";
export type Shape = {
  id: ShapeId;
  name: string;
  period: string;
  blurb: string;
};

export type Glaze = {
  id: GlazeId;
  name: string;
  born: string;
  blurb: string;
};

export type Era = {
  id: EraId;
  name: string;
  years: string;
  blurb: string;
};

export const shapes: Shape[] = [
  {
    id: "meiping",
    name: "梅瓶",
    period: "宋代开始流行",
    blurb: "小口、短颈、丰肩，肩下渐收敛。原为盛酒用具，明清渐变为陈设瓷（故宫博物院「梅瓶」词条）。",
  },
  {
    id: "yuhuchun",
    name: "玉壶春瓶",
    period: "隋代已现 · 宋代多窑烧制",
    blurb: "撇口、细颈、硕腹、圈足，以「玉壶先春」得名。宋至元代用作酒器，明清渐为陈设瓷（故宫博物院「玉壶春瓶」词条）。",
  },
  {
    id: "bowl",
    name: "斗笠碗",
    period: "北宋已有 · 景德镇青白釉有出土例",
    blurb: "敞口、斜腹、小圈足，侧看如斗笠。故宫藏北宋定窑笠式碗；常州市武进区博物馆藏北宋景德镇窑青白釉斗笠碗（1984 年宋墓出土）。本展用它承载刻花与影青。",
  },
  {
    id: "dish",
    name: "折沿盘",
    period: "元代景德镇已有",
    blurb: "盘口外折成沿，盘心是纹样的舞台。故宫藏元代景德镇窑青花「满池娇」纹花口盘即「十六瓣菱花口，折沿」。「便于捧持」是本展描写，非出处原文。",
  },
  {
    id: "gu",
    name: "花觚",
    period: "元明清仿青铜觚",
    blurb: "喇叭口、细颈。觚原是古代青铜饮酒器；元、明、清时仿青铜觚的瓷质花瓶较流行，称「花觚」（故宫博物院「觚」词条）。",
  },
];

export const glazes: Glaze[] = [
  {
    id: "qinghua",
    name: "青花",
    born: "元代景德镇成熟",
    blurb: "釉下彩：以含氧化钴的钴土矿在胎上描绘，施透明釉，高温还原焰一次烧成。元代景德镇已能烧制成熟青花，明清成为主流（故宫博物院「青花」词条）。",
  },
  {
    id: "yingqing",
    name: "影青",
    born: "北宋初中期 · 景德镇湖田窑独创",
    blurb: "即青白瓷。釉色介于青、白之间，光照见影，晚清以后又称「影青」（故宫博物院藏青白釉双鱼碗说明）。",
  },
  {
    id: "jihong",
    name: "祭红",
    born: "元代始烧铜红 · 明永乐宣德纯正",
    blurb: "高温铜红釉。景德镇元代开始烧造，初创呈色偏暗；永乐、宣德烧出纯正鲜红，因用于祭日坛亦称祭红。口沿一圈白色叫「灯草口」，是釉层高温垂流变薄露出胎色（故宫博物院「红釉」词条、鲜红釉盘说明）。",
  },
  {
    id: "fencai",
    name: "粉彩",
    born: "清康熙晚期创烧 · 雍正乾隆成熟",
    blurb: "釉上彩，与五彩相对亦称软彩。先用含砷的「玻璃白」打底，再渲染出浓淡层次（故宫博物院「粉彩」词条）。",
  },
  {
    id: "wucai",
    name: "五彩",
    born: "明宣德已有 · 嘉万青花五彩 · 康熙为主流",
    blurb: "在宋元釉上加彩基础上发展而来；嘉靖、万历官窑多青花五彩，康熙朝釉上五彩成为主流，雍正以后让位于粉彩。又称「硬彩」「古彩」（故宫博物院「五彩」词条）。",
  },
];

export const eras: Era[] = [
  {
    id: "song",
    name: "宋",
    years: "960–1279",
    blurb: "景德镇湖田窑北宋初中期独创青白瓷（影青），宋元以景德镇为中心形成青白瓷体系。",
  },
  {
    id: "yuan",
    name: "元",
    years: "1271–1368",
    blurb: "景德镇已能烧制成熟青花；同时创烧釉里红、开始烧高温铜红釉（初创呈色偏暗）。",
  },
  {
    id: "ming",
    name: "明",
    years: "1368–1644",
    blurb: "永乐、宣德铜红釉纯正（祭红）；宣德已有五彩，嘉靖、万历官窑多青花五彩；青花为主流。",
  },
  {
    id: "qing",
    name: "清",
    years: "1644–1911",
    blurb: "康熙晚期创烧粉彩，雍正、乾隆成熟；康熙仿永宣铜红并创豇豆红、郎窑红。仿哪一朝，就锁哪一朝的语法。",
  },
];

/**
 * 朝代 × 釉色 的风格一致性。依据见 src/data/sources.ts（故宫博物院词条）。
 * 2026-10-08 校订：元 × 祭红 由「冲」改「勉」——故宫「鲜红釉」词条：景德镇元代已开始烧高温铜红釉，只是初创偏暗。
 */
export const glazeByEra: Record<EraId, Record<GlazeId, Compat>> = {
  song: {
    yingqing: "ok",
    qinghua: "stretch",
    jihong: "conflict",
    fencai: "conflict",
    wucai: "conflict",
  },
  yuan: {
    qinghua: "ok",
    yingqing: "ok",
    jihong: "stretch",
    fencai: "conflict",
    wucai: "conflict",
  },
  ming: {
    qinghua: "ok",
    jihong: "ok",
    wucai: "ok",
    yingqing: "stretch",
    fencai: "conflict",
  },
  qing: {
    qinghua: "ok",
    fencai: "ok",
    wucai: "ok",
    jihong: "ok",
    yingqing: "stretch",
  },
};

export const fallbackGlaze: Record<EraId, GlazeId> = {
  song: "yingqing",
  yuan: "qinghua",
  ming: "qinghua",
  qing: "fencai",
};

export const porcelainCitations: Citation[] = [
  {
    id: "tiangong",
    title: "陶埏",
    source: "宋应星《天工开物·陶埏第七》（明，公有领域，维基文库）",
    excerpt: "「后世方土效灵，人工表异，陶成雅器，有素肌玉骨之象焉。掩映几筵，文明可掬。」",
    note: "原文摘录。另：景德镇手工制瓷技艺 2006 年列入第一批国家级非遗（项目编号Ⅷ-7）。",
    publicDomain: true,
    status: "verified",
    sourceId: "tiangong",
    url: "https://zh.wikisource.org/zh-hans/天工開物/陶埏第七",
  },
  {
    id: "taolu-qinghua",
    title: "青花",
    source: "故宫博物院 · 词条「青花」",
    excerpt:
      "「其原料为含氧化钴的钴土矿，以蓝青色料在瓷胎上描绘纹饰，然后施透明釉，在高温还原焰中一次烧成。元代景德镇已能烧制成熟的青花瓷器。」",
    note: "原文摘录。另见中国非遗网：到元代发明瓷石加高岭土「二元配方法」及青花釉下彩绘技术。",
    status: "verified",
    sourceId: "dpm-qinghua",
    url: "https://www.dpm.org.cn/lemmas/239391.html",
  },
  {
    id: "taolu-yingqing",
    title: "青白瓷 / 影青",
    source: "故宫博物院 · 景德镇窑青白釉双鱼碗说明",
    excerpt:
      "「青白瓷……是景德镇湖田窑在北宋初、中期独创的釉色品种。……光照见影，故晚清以后又称之为“影青”。」",
    note: "原文摘录。",
    status: "verified",
    sourceId: "dpm-qingbai",
    url: "https://www.dpm.org.cn/collection/ceramic/227243.html",
  },
  {
    id: "jihong-note",
    title: "铜红釉（祭红）",
    source: "故宫博物院 · 词条「红釉」/ 鲜红釉盘说明",
    excerpt:
      "「景德镇窑自元代开始烧造高温铜红釉瓷器，初创阶段呈色多偏暗。明初永乐、宣德时期景德镇窑烧制出纯正鲜艳的红釉……因是当时祭日坛的用器，故也称祭红。」",
    note: "原文摘录。口沿白边「灯草口」是釉层高温垂流变薄露出胎色。本展柜以程序材质示意，不调用绘图模型。",
    status: "verified",
    sourceId: "dpm-xianhong",
    url: "https://www.dpm.org.cn/collection/ceramic/227408.html",
  },
  {
    id: "fencai-note",
    title: "粉彩",
    source: "故宫博物院 · 「粉彩」词条",
    excerpt: "「釉上彩品种之一。与五彩相对而言，故亦称软彩。创烧于康熙晚期，成熟于雍正、乾隆两代。」",
    note: "原文摘录。粉彩属清代釉上彩，回写到宋、元、明即判冲突。",
    status: "verified",
    sourceId: "dpm-fencai",
    url: "https://www.dpm.org.cn/collection/ceramic/226714.html",
  },
  {
    id: "wucai-note",
    title: "五彩",
    source: "故宫博物院 · 词条「五彩」",
    excerpt:
      "「五彩是在宋、元釉上加彩的基础上发展起来的。明宣德时已有五彩……嘉靖、万历时期的官窑釉上彩瓷，以釉下青花和釉上多种彩相结合，称青花五彩。」",
    note: "原文摘录。宋元只有「釉上加彩」的基础，本展把宋、元×五彩判为冲突，属内容包取舍（见审计面板「例外」）。",
    status: "verified",
    sourceId: "dpm-wucai",
    url: "https://www.dpm.org.cn/lemmas/239440.html",
  },
  {
    id: "meiping-note",
    title: "梅瓶器型",
    source: "故宫博物院 · 词条「梅瓶」",
    excerpt: "「小口，短颈，丰肩，肩下渐收敛，圈足，有的附盖。梅瓶为盛酒用具。自宋代开始流行。」",
    note: "原文摘录。",
    status: "verified",
    sourceId: "dpm-meiping",
    url: "https://www.dpm.org.cn/lemmas/239389.html",
  },
];

export const porcelainQA: QAItem[] = [
  {
    id: "q-song-fencai",
    question: "为什么宋代梅瓶不能锁成粉彩？",
    answer:
      "故宫博物院的词条写明：粉彩「创烧于康熙晚期，成熟于雍正、乾隆两代」。宋代景德镇的代表是湖田窑北宋独创的青白瓷。把粉彩画在「宋」上，等于把清代的彩料写进宋代的约束，本展判定为风格冲突，并改锁为影青。",
    citationIds: ["fencai-note", "taolu-yingqing"],
    keywords: ["宋", "宋代", "粉彩", "冲突", "锁定", "釉色", "釉"],
  },
  {
    id: "q-yingqing-name",
    question: "影青为什么叫影青？",
    answer:
      "影青就是青白瓷：釉色介于青、白之间，胎薄釉薄，迎光可以看见刻出的花纹，所以晚清以后又被称作「影青」。它是景德镇湖田窑在北宋初、中期独创的釉色。",
    citationIds: ["taolu-yingqing"],
    keywords: ["影青", "青白", "刻花", "湖田", "名字"],
  },
  {
    id: "q-qinghua-cobalt",
    question: "青花的蓝色从哪来？",
    answer:
      "来自釉下的钴料：用含氧化钴的钴土矿在瓷胎上描绘，再施透明釉，高温还原焰一次烧成。元代景德镇已能烧制成熟的青花。本展柜用程序纹理示意浓淡，不是真实钴料照片。",
    citationIds: ["taolu-qinghua", "tiangong"],
    keywords: ["青花", "钴", "青料", "蓝", "元"],
  },
  {
    id: "q-jihong-hard",
    question: "祭红为什么难得？",
    answer:
      "铜红釉要在高温还原气氛中烧成，对温度和气氛特别敏感，稍有不慎就得不到纯正的红色。景德镇元代已开始烧铜红，但颜色偏暗；明初永乐、宣德才烧出纯正鲜红。口沿那圈白叫「灯草口」，是釉层高温下垂流变薄、露出胎色。",
    citationIds: ["jihong-note"],
    keywords: ["祭红", "铜红", "难得", "宣德", "灯草"],
  },
  {
    id: "q-meiping-use",
    question: "梅瓶最早是干什么的？",
    answer:
      "梅瓶是盛酒用具，自宋代开始流行；明清时器型从瘦长变得肥矮丰硕，也从日用瓷渐渐变成陈设瓷。",
    citationIds: ["meiping-note"],
    keywords: ["梅瓶", "酒", "器型", "用途"],
  },
];

const HONEST_RULE = "依据见审计面板出处（故宫博物院词条）；判定是本展内容包规则，不是馆方禁令。";

function cloneMatrix(): Record<EraId, Record<GlazeId, Compat>> {
  return structuredClone(glazeByEra);
}

let liveMatrix: Record<EraId, Record<GlazeId, Compat>> = cloneMatrix();

export function matrixOf(): Record<EraId, Record<GlazeId, Compat>> {
  return liveMatrix;
}

export function compatOf(era: EraId, glaze: GlazeId): Compat {
  return lookup(liveMatrix, era, glaze);
}

export function setCompat(era: EraId, glaze: GlazeId, c: Compat): void {
  liveMatrix[era][glaze] = c;
}

export function resetMatrix(): void {
  liveMatrix = cloneMatrix();
}

function glazeCiteId(glaze: GlazeId): string {
  if (glaze === "qinghua") return "taolu-qinghua";
  if (glaze === "yingqing") return "taolu-yingqing";
  if (glaze === "jihong") return "jihong-note";
  if (glaze === "fencai") return "fencai-note";
  return "wucai-note";
}

const notableWhy: Record<string, { why: string; citeId: string }> = {
  "song:fencai": {
    why: "粉彩创烧于康熙晚期，回写到宋代即属时代错置。",
    citeId: "fencai-note",
  },
  "song:jihong": {
    why: "景德镇元代才开始烧高温铜红釉；宋代景德镇以青白瓷为主，不宜回写铜红。",
    citeId: "jihong-note",
  },
  "song:wucai": {
    why: "五彩明宣德时始有；宋代只有釉上加彩的基础，本展判冲。",
    citeId: "wucai-note",
  },
  "yuan:jihong": {
    why: "元代景德镇已开始烧高温铜红釉，但初创偏暗，纯正「祭红」属明永乐、宣德，故判勉。",
    citeId: "jihong-note",
  },
  "yuan:fencai": {
    why: "粉彩创烧于清康熙晚期，元代是青花成熟期，不宜回写软彩。",
    citeId: "fencai-note",
  },
  "ming:fencai": {
    why: "粉彩属清代釉上彩；明代对应青花、铜红、五彩，不宜提前写上粉彩。",
    citeId: "fencai-note",
  },
};

export function ruleWhy(era: EraId, glaze: GlazeId): { why: string; citeId: string } {
  const hit = notableWhy[`${era}:${glaze}`];
  if (hit) return { why: `${hit.why}${HONEST_RULE}`, citeId: hit.citeId };
  const c = lookup(liveMatrix, era, glaze);
  const why =
    c === "ok"
      ? "该釉色与此朝在内容包中判定为合。"
      : c === "stretch"
        ? "时代边缘，可作仿宋或仿古说明。"
        : "该釉色与此朝在内容包中判定为冲突。";
  return { why: `${why}${HONEST_RULE}`, citeId: glazeCiteId(glaze) };
}

export function citationsFor(glaze: GlazeId, shape: ShapeId): Citation[] {
  const ids: string[] = ["tiangong"];
  if (glaze === "qinghua") ids.push("taolu-qinghua");
  if (glaze === "yingqing") ids.push("taolu-yingqing");
  if (glaze === "jihong") ids.push("jihong-note");
  if (glaze === "fencai") ids.push("fencai-note");
  if (glaze === "wucai") ids.push("wucai-note");
  if (shape === "meiping") ids.push("meiping-note");
  const map = new Map(porcelainCitations.map((c) => [c.id, c]));
  return ids.map((id) => map.get(id)).filter((c): c is Citation => Boolean(c));
}

export function styleLockMessage(era: EraId, glaze: GlazeId, next: GlazeId): string {
  const eraName = eras.find((e) => e.id === era)!.name;
  const glazeName = glazes.find((g) => g.id === glaze)!.name;
  const nextName = glazes.find((g) => g.id === next)!.name;
  return `${eraName}代与「${glazeName}」在本内容包中判定为风格冲突。已改锁为「${nextName}」，以免把后代彩料写进前朝约束。`;
}
