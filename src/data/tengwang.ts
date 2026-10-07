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
    blurb: "声在画外。彭蠡即鄱阳，渔火与橹声把江面从「看」变成「听」。",
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
    source: "王勃（唐）· 公有领域",
    excerpt:
      "唐高宗时王勃省父过南昌，于滕王阁宴上作《秋日登洪府滕王阁饯别序》。文中写节令、江景、建筑与羁旅，落霞一联为后世传诵。",
    note: "原文公有领域。本展摘句为示例导览，不作学术校勘声明。",
    publicDomain: true,
  },
  {
    id: "pengli",
    title: "彭蠡",
    source: "据公开地理说明整理",
    excerpt:
      "彭蠡即今鄱阳湖一带古称。渔舟唱晚「响穷彭蠡之滨」，把听觉边界推到湖岸，而不是停在阁前栏杆。",
    note: "示例资料。",
  },
  {
    id: "hengyang",
    title: "衡阳之浦",
    source: "据公开典故说明整理",
    excerpt:
      "传说南飞之雁至衡阳回雁峰而止。声断，是空间的切断，也是季节的切断。与孤鹜不同：阵是集体的寒。",
    note: "示例资料。",
  },
  {
    id: "pavilion",
    title: "滕王阁",
    source: "据公开史地说明整理",
    excerpt:
      "阁在南昌赣江之滨，唐永徽中滕王李元婴始建，历代废兴。今阁为1989年重建。本展画面是诗文意象的程序绘画，不是实地测绘。",
    note: "示例资料。建筑外形为示意剪影。",
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
      "彭蠡是鄱阳湖的古称。渔舟的声音被写到湖滨为止，所以画面里的船应是江—湖系统里的渔舟，而不是现代游轮。",
    citationIds: ["pengli", "xu-public"],
    keywords: ["彭蠡", "鄱阳", "渔舟", "哪里"],
  },
  {
    id: "q-tengwang-who",
    question: "滕王是谁？阁为何而建？",
    answer:
      "滕王是唐高祖之子李元婴。阁因他得名，建于南昌赣江侧。王勃写的是宴集与饯别，飞阁流丹是他当时立足的那座高阁——历代重建，名字仍把人钉在原句上。",
    citationIds: ["pavilion", "xu-public"],
    keywords: ["滕王", "李元婴", "谁", "重建"],
  },
  {
    id: "q-yanzhen",
    question: "雁阵为什么「声断衡阳」？",
    answer:
      "典故里南飞的雁到衡阳回雁峰不再南去，声音在那里断开。它和孤鹜是两种冷：一只是单独，一阵是集体的季节。",
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

/** 意象 × 情境。合=属于该联；跨联硬冲=conflict；其余勉。经共享 lookup。 */
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
