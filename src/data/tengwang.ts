import type { Citation, QAItem } from "./types";
import { lookup, type Compat } from "../app/table";
export type { Compat };

export type ImageId =
  | "luoxia"
  | "guwu"
  | "qiushui"
  | "changtian"
  | "yuzhou"
  | "yanzhen"
  | "feige"
  | "hantan";

export type ImageMotif = {
  id: ImageId;
  name: string;
  verse: string;
  couplet: string;
  scene: string;
  x: number;
  y: number;
};

export type MoodId = "sanyan" | "luoxia" | "yuzhou" | "yanzhen";

export type Mood = {
  id: MoodId;
  name: string;
  line: string;
  blurb: string;
};

export const moods: Mood[] = [
  {
    id: "sanyan",
    name: "九月三秋",
    line: "时维九月，序属三秋。",
    blurb: "潦水尽、寒潭清。把节令锁成水色与山色，而不是锁成滤镜名。",
  },
  {
    id: "luoxia",
    name: "落霞孤鹜",
    line: "落霞与孤鹜齐飞，秋水共长天一色。",
    blurb: "一句里有四种意象：霞、鹜、水、天。点哪一块，就应回到这一句，而不是另写提示词。",
  },
  {
    id: "yuzhou",
    name: "渔舟唱晚",
    line: "渔舟唱晚，响穷彭蠡之滨。",
    blurb: "声在画外。彭蠡是鄱阳湖一带的古称，渔歌把江面从「看」变成「听」。",
  },
  {
    id: "yanzhen",
    name: "雁阵惊寒",
    line: "雁阵惊寒，声断衡阳之浦。",
    blurb: "北雁南飞，声在衡阳断开。画面里的「阵」要比「一只鸟」更冷。",
  },
];

export const motifs: ImageMotif[] = [
  {
    id: "luoxia",
    name: "落霞",
    verse: "落霞与孤鹜齐飞",
    couplet: "落霞与孤鹜齐飞，秋水共长天一色。",
    scene: "西天烧成一层薄红，不是整屏的橙滤镜。霞在水里有倒影，边缘发金。",
    x: 22,
    y: 28,
  },
  {
    id: "guwu",
    name: "孤鹜",
    verse: "落霞与孤鹜齐飞",
    couplet: "落霞与孤鹜齐飞，秋水共长天一色。",
    scene: "一只，横江。孤是数量，也是位置——它必须离开雁阵，单独成句。",
    x: 38,
    y: 34,
  },
  {
    id: "qiushui",
    name: "秋水",
    verse: "秋水共长天一色",
    couplet: "落霞与孤鹜齐飞，秋水共长天一色。",
    scene: "江面如练，天色沉到水里。水天交界要几乎消失，才叫「一色」。",
    x: 48,
    y: 68,
  },
  {
    id: "changtian",
    name: "长天",
    verse: "秋水共长天一色",
    couplet: "落霞与孤鹜齐飞，秋水共长天一色。",
    scene: "天不是空白，是被江面拉长的一块。远处几乎没有地平线。",
    x: 62,
    y: 22,
  },
  {
    id: "yuzhou",
    name: "渔舟",
    verse: "渔舟唱晚，响穷彭蠡之滨",
    couplet: "渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。",
    scene: "近岸两三只，帆已收。唱晚是声景：点它，应想到鄱阳湖滨，而不是另生一只现代化游船。",
    x: 28,
    y: 74,
  },
  {
    id: "yanzhen",
    name: "雁阵",
    verse: "雁阵惊寒，声断衡阳之浦",
    couplet: "渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。",
    scene: "人字形，远、淡、寒。与孤鹜同在一屏时，阵在天，孤在中。",
    x: 72,
    y: 18,
  },
  {
    id: "feige",
    name: "飞阁",
    verse: "飞阁流丹，下临无地",
    couplet: "层峦耸翠，上出重霄；飞阁流丹，下临无地。",
    scene: "滕王阁在江侧高台。飞檐、丹柱，是建筑，也是王勃此刻的立足点。",
    x: 82,
    y: 48,
  },
  {
    id: "hantan",
    name: "寒潭",
    verse: "潦水尽而寒潭清",
    couplet: "时维九月，序属三秋。潦水尽而寒潭清，烟光凝而暮山紫。",
    scene: "秋潦退了，潭水才清。近岸一块更深的蓝绿，给九月一个温度。",
    x: 16,
    y: 62,
  },
];

export const poemLines: string[] = [
  "豫章故郡，洪都新府。",
  "星分翼轸，地接衡庐。",
  "襟三江而带五湖，控蛮荆而引瓯越。",
  "时维九月，序属三秋。",
  "潦水尽而寒潭清，烟光凝而暮山紫。",
  "层峦耸翠，上出重霄；飞阁流丹，下临无地。",
  "落霞与孤鹜齐飞，秋水共长天一色。",
  "渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。",
];

export const tengwangCitations: Citation[] = [
  {
    id: "xu-public",
    title: "《滕王阁序》",
    source: "王勃（唐）·《秋日登洪府滕王阁饯别序》· 维基文库（公有领域）",
    excerpt:
      "「落霞与孤鹜齐飞，秋水共长天一色。渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。」本展每个热点都钉回原文中的一句。",
    note: "原文公有领域。写作年龄有「十四岁」与「上元二年」两说，本展不取具体年份。",
    publicDomain: true,
    status: "verified",
    sourceId: "ws-tengwang",
    url: "https://zh.wikisource.org/zh-hans/滕王阁序",
  },
  {
    id: "pengli",
    title: "彭蠡",
    source: "生态中国网《中国最大淡水湖泊—鄱阳湖简介》（2009）",
    excerpt: "「鄱阳湖在古代有过彭蠡泽、彭泽、彭湖、扬澜、宫亭湖等多种称谓。」",
    note: "原文摘录。早期文献的彭蠡泽范围与今鄱阳湖不完全相同，本展写作「鄱阳湖一带的古称」。",
    status: "verified",
    sourceId: "eco-poyang",
    url: "http://www.eco.gov.cn/news_info/22194.html",
  },
  {
    id: "hengyang",
    title: "衡阳之浦",
    source: "孟国栋、孙晓磊《也说“衡阳雁”》，《光明日报》2020-12-07",
    excerpt:
      "「“衡阳雁”意象之所以生成，当与“雁不过衡阳”的观念有关。……南岳衡山有七十二峰，最南端即位于衡阳的回雁峰。……大雁确能飞至衡阳更南之地。」",
    note: "原文摘录。「雁到衡阳而止」是文学意象，不是鸟类迁徙的事实。",
    status: "verified",
    sourceId: "gmw-hengyang",
    url: "https://news.gmw.cn/2020-12/07/content_34435329.htm",
  },
  {
    id: "pavilion",
    title: "滕王阁",
    source: "维基百科「滕王阁」（引《旧唐书·滕王元婴传》）",
    excerpt:
      "「始建于唐永徽四年。为当时任洪州都督的唐高祖李渊之子李元婴所建。……于1989年10月8日建成。」",
    note: "二手资料，已核对条目原文。本展画面是诗文意象的程序绘画，不是实地测绘。",
    status: "verified",
    sourceId: "wiki-tengwangge",
    url: "https://zh.wikipedia.org/zh-cn/滕王阁",
  },
];

export const tengwangQA: QAItem[] = [
  {
    id: "q-luoxia",
    question: "「落霞与孤鹜齐飞」写的是什么时候？",
    answer:
      "序文明写「时维九月，序属三秋」。落霞是黄昏，孤鹜是江上的一只水鸟。点「落霞」或「孤鹜」，都应回到同一联，而不是生成另一幅与原文无关的风景。",
    citationIds: ["xu-public"],
    keywords: ["落霞", "孤鹜", "九月", "三秋", "什么时候"],
  },
  {
    id: "q-pengli",
    question: "彭蠡是哪里？",
    answer:
      "彭蠡是鄱阳湖一带的古称（早期文献的范围与今天的湖面不完全一样）。渔舟的歌声「响穷彭蠡之滨」，所以画面里的船是湖滨的渔舟，而不是现代游轮。",
    citationIds: ["pengli", "xu-public"],
    keywords: ["彭蠡", "鄱阳", "渔舟", "哪里"],
  },
  {
    id: "q-tengwang-who",
    question: "滕王是谁？阁为何而建？",
    answer:
      "滕王是唐高祖李渊之子李元婴。阁始建于唐永徽四年（653），因他的封号得名，在南昌赣江东岸。历代屡毁屡建，今天的阁于1989年10月8日重建落成。王勃写的是宴集与饯别，「飞阁流丹」是他当时立足的那座高阁。",
    citationIds: ["pavilion", "xu-public"],
    keywords: ["滕王", "李元婴", "谁", "重建"],
  },
  {
    id: "q-yanzhen",
    question: "雁阵为什么「声断衡阳」？",
    answer:
      "古人有「雁不过衡阳」的观念：衡山七十二峰最南端是衡阳回雁峰，被当作雁南飞的终点。这是文学意象，实际上大雁能飞到更南的地方。王勃借它写声音在远方断开。",
    citationIds: ["hengyang", "xu-public"],
    keywords: ["雁阵", "衡阳", "惊寒", "声断"],
  },
];

export const matrixMotifs: ImageId[] = ["luoxia", "guwu", "qiushui", "yanzhen", "yuzhou"];

const ALL_MOTIFS: ImageId[] = ["luoxia", "guwu", "qiushui", "changtian", "yuzhou", "yanzhen", "feige", "hantan"];

function moodRow(ok: ImageId[], conflict: ImageId[] = []): Record<ImageId, Compat> {
  const row = {} as Record<ImageId, Compat>;
  for (const id of ALL_MOTIFS) {
    if (ok.includes(id)) row[id] = "ok";
    else if (conflict.includes(id)) row[id] = "conflict";
    else row[id] = "stretch";
  }
  return row;
}

/**
 * 意象 × 情境（文本锚定 + 设计约定）。经共享 lookup。
 * 合 = 意象出自该情境锁定的那句原文（维基文库原文可核）；
 * 冲 = 出自另一句，或同联对句但指向另一个地名锚点（渔舟→彭蠡之滨 / 雁阵→衡阳之浦）——本展一个情境只锁一个地名锚点；
 * 其余为勉（同一段景物，可看但不作为锁定焦点）。冲不表示史实上「不能同时出现」。
 */
export const motifByMood: Record<MoodId, Record<ImageId, Compat>> = {
  luoxia: moodRow(["luoxia", "guwu", "qiushui", "changtian"], ["yuzhou", "yanzhen"]),
  yuzhou: moodRow(["yuzhou"], ["yanzhen", "luoxia", "guwu"]),
  yanzhen: moodRow(["yanzhen"], ["yuzhou", "luoxia", "guwu"]),
  sanyan: moodRow(["hantan"], ["yuzhou", "yanzhen"]),
};

/** Preferred motif when mood×motif is conflict (mirror porcelain fallbackGlaze). */
export const fallbackMotif: Record<MoodId, ImageId> = {
  luoxia: "luoxia",
  yuzhou: "yuzhou",
  yanzhen: "yanzhen",
  sanyan: "hantan",
};

export function motifMoodCompat(motif: ImageId, mood: MoodId): Compat {
  return lookup(motifByMood, mood, motif);
}

export function motifLockMessage(mood: MoodId, motif: ImageId, next: ImageId): string {
  const m = moods.find((x) => x.id === mood)?.name ?? mood;
  const a = motifs.find((x) => x.id === motif)?.name ?? motif;
  const b = motifs.find((x) => x.id === next)?.name ?? next;
  return `「${m}」情境与意象「${a}」冲：改锁为「${b}」，不另造无原文锚点的画面。`;
}

export function citationForMotif(id: ImageId): Citation[] {
  const map = new Map(tengwangCitations.map((c) => [c.id, c]));
  const ids: string[] = ["xu-public"];
  if (id === "yuzhou") ids.push("pengli");
  if (id === "yanzhen") ids.push("hengyang");
  if (id === "feige") ids.push("pavilion");
  return ids.map((i) => map.get(i)!);
}
