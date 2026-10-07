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
    period: "宋以降",
    blurb: "小口、短颈、丰肩、瘦底。原为贮酒之器，后成陈设经典。肩腹转折最见窑工对曲线的控制。",
  },
  {
    id: "yuhuchun",
    name: "玉壶春瓶",
    period: "宋金定型",
    blurb: "撇口、细颈、垂腹、圈足。瓶名取「玉壶买春」之意。颈与腹的对照，使釉色在光下有一段「走釉」的叙事。",
  },
  {
    id: "bowl",
    name: "斗笠碗",
    period: "宋湖田常见",
    blurb: "敞口斜腹，侧看如斗笠。影青刻花最宜此器：碗壁薄处透光，花纹如影。",
  },
  {
    id: "dish",
    name: "折沿盘",
    period: "元明常见",
    blurb: "折沿便于捧持，盘心是纹样的舞台。青花海水、缠枝莲多从此展开。",
  },
  {
    id: "gu",
    name: "花觚",
    period: "明仿青铜礼器",
    blurb: "喇叭口、长颈、鼓腹。陈设于厅堂中轴，器型本身已是「礼」的引用。",
  },
];

export const glazes: Glaze[] = [
  {
    id: "qinghua",
    name: "青花",
    born: "元景德镇定型",
    blurb: "釉下钴料绘画，罩透明釉一次烧成。钴料在还原焰中呈蓝，料浓处有铁斑，是手工不是滤镜。",
  },
  {
    id: "yingqing",
    name: "影青",
    born: "宋景德镇湖田",
    blurb: "青白瓷。釉色介于青、白之间，薄胎处映影，故称影青。刻花、划花靠釉在凹处积淀显纹。",
  },
  {
    id: "jihong",
    name: "祭红",
    born: "明宣德著名",
    blurb: "铜红釉，烧成窗口极窄。口沿一圈灯草白，是铜挥发留下的边，不是描出来的装饰。",
  },
  {
    id: "fencai",
    name: "粉彩",
    born: "清康熙末、雍正盛",
    blurb: "釉上彩。先以玻璃白打底，再渲染颜色，故花朵有粉润层次。与明代五彩的「硬」正好相对。",
  },
  {
    id: "wucai",
    name: "五彩",
    born: "明嘉万、清康熙",
    blurb: "釉上红、绿、黄、紫等色叠绘，线条肯定。康熙硬彩尤见料色对比，不宜做成渐变滤镜。",
  },
];

export const eras: Era[] = [
  {
    id: "song",
    name: "宋",
    years: "960–1279",
    blurb: "景德镇以青白瓷名世。尚素雅、重釉质与刻划，尚不是青花的时代。",
  },
  {
    id: "yuan",
    name: "元",
    years: "1271–1368",
    blurb: "青花在此成熟。器型偏大，纹样满密，进口青料与本土工艺相遇。",
  },
  {
    id: "ming",
    name: "明",
    years: "1368–1644",
    blurb: "永宣青花、宣德祭红、嘉万五彩。官窑与民窑并行，器型谱系完整。",
  },
  {
    id: "qing",
    name: "清",
    years: "1644–1911",
    blurb: "康熙五彩、雍正粉彩、乾隆转心与仿古。技术极大，约束反而更重要：仿哪一朝，就锁哪一朝的语法。",
  },
];

/** 朝代 × 釉色 的风格一致性。冲突时管线会改锁并写明理由。 */
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
    jihong: "conflict",
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
    source: "宋应星《天工开物》（明，公有领域）",
    excerpt:
      "「陶成雅器，有素肌玉骨之象焉。」景德镇以高岭土与瓷石二元配方，使胎骨致密、釉面如玉，是后文青花、颜色釉的底子。",
    note: "示例摘录，据通行本整理，非馆方释文。",
    publicDomain: true,
  },
  {
    id: "taolu-qinghua",
    title: "青花",
    source: "蓝浦《景德镇陶录》（清，公有领域）",
    excerpt:
      "青花以钴料绘于釉下，再罩透明釉入窑。元以后景德镇定型，料分浓淡，图案有缠枝、鱼藻、云龙诸路。",
    note: "示例条目，据公开工艺说明整理。",
    publicDomain: true,
  },
  {
    id: "taolu-yingqing",
    title: "青白瓷 / 影青",
    source: "据《景德镇陶录》及公开工艺说明整理",
    excerpt:
      "青白瓷釉含铁量低，还原焰中现淡青。宋湖田窑刻花斗笠碗，釉在刀痕处积厚，纹如影，故俗称影青。",
    note: "示例资料，非某一博物馆展签原文。",
  },
  {
    id: "jihong-note",
    title: "铜红釉（祭红）",
    source: "据公开陶瓷工艺说明整理",
    excerpt:
      "铜红对窑温与气氛极敏感，古有「十窑九不成」之说。宣德祭红口沿常见灯草白，为铜在口沿挥发所致。",
    note: "示例资料。本展柜以程序材质模拟釉面，不调用绘图模型。",
  },
  {
    id: "fencai-note",
    title: "粉彩",
    source: "据公开工艺说明整理",
    excerpt:
      "粉彩在烧成的釉面上以玻璃白打底，再以油料渲染，低温二次烧成。花朵因而有粉润，与五彩的平涂硬彩不同。",
    note: "示例资料。粉彩属清代釉上彩系统，不宜回写到宋代器。",
  },
  {
    id: "wucai-note",
    title: "五彩",
    source: "据公开工艺说明整理",
    excerpt:
      "五彩以红绿黄紫等釉上色料勾填，可与釉下青花配合（斗彩、青花五彩）。康熙硬彩对比强烈，线条清楚。",
    note: "示例资料。",
  },
  {
    id: "meiping-note",
    title: "梅瓶器型",
    source: "据公开器型说明整理",
    excerpt:
      "梅瓶小口可封，丰肩承酒，瘦底稳定。宋已有之，元明青花梅瓶常作云龙、缠枝。陈设时肩线应被光线咬住。",
    note: "示例资料。",
  },
];

export const porcelainQA: QAItem[] = [
  {
    id: "q-song-fencai",
    question: "为什么宋代梅瓶不能锁成粉彩？",
    answer:
      "粉彩是清代釉上彩，康熙末才进入景德镇的成熟语法。宋代景德镇的代表是青白瓷。若把粉彩画在「宋」上，等于把后代的颜料库写进前朝的约束——本展会判定为风格冲突，并改锁为影青。",
    citationIds: ["fencai-note", "taolu-yingqing"],
    keywords: ["宋", "宋代", "粉彩", "冲突", "锁定", "釉色", "釉"],
  },
  {
    id: "q-yingqing-name",
    question: "影青为什么叫影青？",
    answer:
      "青白釉本身偏青白，真正「显影」的是刻花：刀痕凹处积釉变深，薄处透光，纹样像影子贴在碗壁上。所以它不是一层蓝色滤镜，而是胎、刀、釉三者的关系。",
    citationIds: ["taolu-yingqing"],
    keywords: ["影青", "青白", "刻花", "湖田", "名字"],
  },
  {
    id: "q-qinghua-cobalt",
    question: "青花的蓝色从哪来？",
    answer:
      "来自釉下钴料。元代成熟期常用进口青料，浓处或见铁锈斑；明代以后国产料与配方多次变化，蓝的色阶并不只有一种。本展柜用程序纹理示意料分浓淡，不是真实钴料照片。",
    citationIds: ["taolu-qinghua", "tiangong"],
    keywords: ["青花", "钴", "青料", "蓝", "元"],
  },
  {
    id: "q-jihong-hard",
    question: "祭红为什么难得？",
    answer:
      "铜红釉对温度和还原气氛的窗口极窄，稍偏就红不成、或烧成肝、或褪成灰。口沿那圈白不是描的，是铜挥发留下的「灯草边」。本展用材质参数去接近这种现象，并标明示例。",
    citationIds: ["jihong-note"],
    keywords: ["祭红", "铜红", "难得", "宣德", "灯草"],
  },
  {
    id: "q-meiping-use",
    question: "梅瓶最早是干什么的？",
    answer:
      "小口便于封贮，丰肩承酒，是酒器，后来才成为厅堂陈设。把酒器的肩线做成展柜里的轮廓，等于把功能史也锁进器型约束。",
    citationIds: ["meiping-note"],
    keywords: ["梅瓶", "酒", "器型", "用途"],
  },
];

const HONEST_RULE = "本内容包规则，据公开工艺说明整理，不是馆方禁令。";

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
    why: "粉彩清康熙末，不宜回写宋代器。",
    citeId: "fencai-note",
  },
  "song:jihong": {
    why: "祭红以明宣德著名，宋代景德镇以青白瓷为主，不宜回写铜红釉。",
    citeId: "jihong-note",
  },
  "song:wucai": {
    why: "五彩属明嘉万以后的釉上彩系统，不宜回写宋代器。",
    citeId: "wucai-note",
  },
  "yuan:fencai": {
    why: "粉彩清康熙末才进入成熟语法，元代是青花时代，不宜回写软彩。",
    citeId: "fencai-note",
  },
  "ming:fencai": {
    why: "粉彩属清代釉上彩；明代对应青花、祭红、五彩，不宜提前写上粉彩。",
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
