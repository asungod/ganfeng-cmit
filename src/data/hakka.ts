import type { Citation, QAItem } from "./types";
import { lookup, type Compat } from "../app/table";
export type { Compat };

export type RoomId =
  | "menlou"
  | "heping"
  | "tianjing"
  | "zutang"
  | "zhengwu"
  | "hengwu"
  | "jiaolou"
  | "xiangdao";

export type HourId = "dawn" | "noon" | "dusk" | "night";

export type Room = {
  id: RoomId;
  name: string;
  role: string;
  walk: string;
  sound: string;
  dialect: { term: string; gloss: string; hint: string };
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Hour = {
  id: HourId;
  name: string;
  blurb: string;
  light: string;
};

export const hours: Hour[] = [
  {
    id: "dawn",
    name: "晨",
    blurb: "禾坪尚空，门楼有雾。脚步声先于人出现。",
    light: "冷青，墙面刚被天光刮过。",
  },
  {
    id: "noon",
    name: "午",
    blurb: "天井灌满白日。蝉在围里，比围外更密。",
    light: "高、白、投影短。祖堂牌位被照得很清楚。",
  },
  {
    id: "dusk",
    name: "暮",
    blurb: "炮眼先暗，祖堂还亮着。这是围屋把昼交给夜的间隙。",
    light: "土墙吃进橘色，巷道先一步变成墨。",
  },
  {
    id: "night",
    name: "夜",
    blurb: "更鼓与风穿过射击孔。防御建筑在夜里才说出自己的句子。",
    light: "灯只留在祖堂与一处横屋。其余交给墙。",
  },
];

export const rooms: Room[] = [
  {
    id: "menlou",
    name: "门楼",
    role: "围屋的正式入口。围门常设三重：外钉铁板的板门、闸门、日常便门（万幼楠《客家民居与赣南围屋》）。",
    walk: "从村路靠近，先看见厚墙与门额，再看见门。可走，不是传送。",
    sound: "石阶、门枢、远处水牛。晨有鸡。",
    dialect: { term: "三重围门", gloss: "板门（外钉铁板）、闸门、日常便门", hint: "「围门一般有三重」见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。本展门楼为示意。" },
    x: 42,
    y: 86,
    w: 16,
    h: 8,
  },
  {
    id: "heping",
    name: "禾坪",
    role: "屋前用于洗涤、凉晒的场地（万幼楠《客家民居与赣南围屋》）。实例中禾坪常在围前（龙南乌石围「围前有禾坪」）；本展平面为示意，把它接在门楼之后以便连续动线。",
    walk: "空间忽然打开。这是围屋留给「外」的一块平地。",
    sound: "晒席、麻雀、正午的蝉。",
    dialect: { term: "禾坪", gloss: "屋前洗涤、凉晒物件的场所", hint: "原文：水塘、禾坪「既是居民洗涤、凉晒物件的场所」。见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。" },
    x: 28,
    y: 68,
    w: 44,
    h: 16,
  },
  {
    id: "tianjing",
    name: "天井",
    role: "雨水、天光。赣南民居在巷中留竖向天井「以采光排水」，天井「狭小而深」；本展把它画在围心（示意）。",
    walk: "穿过禾坪，地面微降，四壁把天裁成方形。",
    sound: "雨天有滴阶；晴天有风从巷道灌入。",
    dialect: { term: "竖向天井", gloss: "巷中留天井，以采光排水", hint: "赣南的天井「狭小而深」。见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。" },
    x: 36,
    y: 48,
    w: 28,
    h: 16,
  },
  {
    id: "zutang",
    name: "祖堂",
    role: "中轴上的祭祀与宗族中心（关西新围「围屋中轴线是祠堂」）。所有房间的朝向都在回答它。",
    walk: "沿中轴走到底。牌位、香、左右对称。人在这里放慢。",
    sound: "晨昏有香；其余时候是极静的木头。",
    dialect: { term: "厅 · 堂", gloss: "赣南客家人一般称堂为「厅」，堂专指祠堂", hint: "见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。" },
    x: 38,
    y: 30,
    w: 24,
    h: 16,
  },
  {
    id: "zhengwu",
    name: "正屋",
    role: "以正厅为中轴的主体房屋：前厅、后厅与两侧厢房、正房合成「正屋」，所有横屋围绕它展开。",
    walk: "从祖堂退到两翼。比横屋更近中轴，也更正式。",
    sound: "坐椅挪动、钟、偶尔的咳嗽。",
    dialect: { term: "正屋", gloss: "前厅、后厅与厢房、正房合成的主体房屋", hint: "见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。" },
    x: 20,
    y: 30,
    w: 16,
    h: 16,
  },
  {
    id: "hengwu",
    name: "横屋",
    role: "正屋两侧扩建的房屋，各房门朝巷开；做饭、睡觉的日常是本展的叙事描写。",
    walk: "离开中轴，进入可以做饭、睡觉、说话的尺度。",
    sound: "灶、碗、孩童。午后有人午睡。",
    dialect: { term: "横屋", gloss: "正屋两侧扩建，各房门朝巷开", hint: "见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。" },
    x: 8,
    y: 36,
    w: 10,
    h: 40,
  },
  {
    id: "jiaolou",
    name: "角楼",
    role: "转角的防御节点（文献称「炮楼」，如关西新围四角各建一座）。炮眼朝外，楼梯陡。",
    walk: "沿外墙走到角。视野突然离开宗族，对着田与路。",
    sound: "风比别处大。夜里风声会改调。",
    dialect: { term: "火角 · 敌楼", gloss: "炮楼的俗称", hint: "「围屋四角构筑有朝外和往上凸出的炮楼（俗称火角、敌楼）」。见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。" },
    x: 8,
    y: 8,
    w: 14,
    h: 14,
  },
  {
    id: "xiangdao",
    name: "巷道",
    role: "正屋与横屋之间的走道称「巷」；围屋顶层另有沿外墙内侧的环形走廊，俗称「外走马」，利于战时调兵。本展把两者合成一条示意动线，连接横屋与角楼。",
    walk: "人顺着墙根走，肩会擦到冷砖。这是「可走」最具体的一段。",
    sound: "回声短，脚步被墙翻倍。",
    dialect: { term: "外走马", gloss: "顶层沿外墙内侧的环形走廊，战时调兵用", hint: "见万幼楠《客家民居与赣南围屋》（客家摇篮网，2014）。" },
    x: 78,
    y: 20,
    w: 14,
    h: 56,
  },
];

export const walkOrder: RoomId[] = [
  "menlou",
  "heping",
  "tianjing",
  "zutang",
  "zhengwu",
  "hengwu",
  "jiaolou",
  "xiangdao",
];

export const hakkaCitations: Citation[] = [
  {
    id: "weiwu-vs-tulou",
    title: "赣南围屋与福建土楼",
    source: "龙南市人民政府《世界围屋之都》（2026）；文化和旅游部官网（2008）",
    excerpt:
      "龙南围屋「以方形围屋居多」，清代早中期确立「围墙高大坚固、四角炮楼凸出」的结构；福建土楼 2008 年列入《世界遗产名录》，「或方或圆，以圆为主」。",
    note: "据两处官方页面原文概括（引号内为原文）。二者都与客家聚居有关，但不是同一物。本展平面为示意，不对应某一座文保单位的测绘。",
    status: "verified",
    sourceId: "ln-weiwu",
    url: "https://www.jxln.gov.cn/lnzf/c103681/202509/339291f127644234b03dbf97406aff2f.shtml",
  },
  {
    id: "axis",
    title: "中轴与祠堂",
    source: "龙南市人民政府《世界围屋之都》· 关西新围",
    excerpt: "「集“家、祠、堡”为一体……围屋中轴线是祠堂，前后三进，五组并列，是客家地区传颂的“九幢十八厅”的典型建筑。」",
    note: "原文摘录。本展把祖堂放在中轴，依据此条；具体房间布置为示意。",
    status: "verified",
    sourceId: "ln-guanxi",
    url: "https://www.jxln.gov.cn/lnzf/c103681/202509/339291f127644234b03dbf97406aff2f.shtml",
  },
  {
    id: "defense",
    title: "厚墙、炮楼",
    source: "龙南市人民政府《世界围屋之都》· 关西新围",
    excerpt: "「围墙高约8米，墙厚1米，围屋四角各建有一座10米高的炮楼。」",
    note: "原文摘录。声景中风穿炮眼是本展的听觉设计，不是史料。",
    status: "verified",
    sourceId: "ln-guanxi",
    url: "https://www.jxln.gov.cn/lnzf/c103681/202509/339291f127644234b03dbf97406aff2f.shtml",
  },
  {
    id: "guanxi",
    title: "龙南关西新围",
    source: "龙南市人民政府《世界围屋之都》（2026-09-24）",
    excerpt:
      "「关西新围……始建于清嘉庆三年（1798），于道光七年（1827）竣工……2001年7月，关西新围被国务院公布为第五批全国重点文物保护单位。」",
    note: "原文摘录。本展不复制其平面，只借用「门楼、禾坪、祠堂、炮楼」这一可走的空间语法。",
    status: "verified",
    sourceId: "ln-guanxi",
    url: "https://www.jxln.gov.cn/lnzf/c103681/202509/339291f127644234b03dbf97406aff2f.shtml",
  },
];


hakkaCitations.push({
  id: "minju",
  title: "正屋、横屋、巷与天井",
  source: "万幼楠《客家民居与赣南围屋》· 客家摇篮网（2014-06-09）",
  excerpt:
    "「便在正屋两侧扩建“横屋”……正屋与横屋间留一走衢，称“巷”……巷中相应留竖向天井，以采光排水。横屋各房间门均朝巷道开。」",
  note: "原文摘录。房间术语与俗称（火角、敌楼、外走马、禾坪）均出自此文；本展平面为示意。",
  status: "verified",
  sourceId: "gn-minju",
  url: "http://www.gnhakka.com/n493/n534/c6120/content.html",
});

export const hakkaQA: QAItem[] = [
  {
    id: "q-tulou",
    question: "围屋和土楼是一回事吗？",
    answer:
      "不是一回事。龙南的赣南围屋以方形居多，四角有凸出的炮楼，中轴是祠堂；福建土楼「或方或圆，以圆为主」，2008 年列入世界遗产名录。本展走的是江西这一路，不把土楼照片贴在赣南标签下。",
    citationIds: ["weiwu-vs-tulou", "guanxi"],
    keywords: ["土楼", "围屋", "区别", "福建", "圆形"],
  },
  {
    id: "q-zutang",
    question: "祖堂为什么在中轴？",
    answer:
      "以龙南关西新围为例，它「集家、祠、堡为一体」，「中轴线是祠堂」。本展照这个语法把祖堂放在中轴：门楼到祖堂是一条礼仪动线，起居在两翼，防御在外墙与炮楼。房间细节是示意。",
    citationIds: ["axis"],
    keywords: ["祖堂", "中轴", "为什么", "宗族"],
  },
  {
    id: "q-jiaolou",
    question: "角楼有什么用？",
    answer:
      "角楼就是文献里的炮楼。关西新围「四角各建有一座10米高的炮楼」，围墙厚1米。它把「家」的内部动线接到「防」的外部观察。夜里风声穿炮眼是本展的声景设计。",
    citationIds: ["defense"],
    keywords: ["角楼", "炮眼", "防御", "用"],
  },
  {
    id: "q-walk",
    question: "时辰和房间怎么互相约束？",
    answer:
      "这张表是本展的叙事约定，不是史料：暮×祖堂为合（黄昏点香），夜×角楼为合（防御值守），禾坪×夜为冲（夜里不凉晒，改锁暮），祖堂×午为勉（日光过白），门楼×晨为合。空间本身（中轴祠堂、四角炮楼）有出处，时辰搭配是设计。",
    citationIds: ["axis", "defense"],
    keywords: ["时辰", "房间", "约束", "暮", "祖堂", "夜", "角楼", "禾坪", "午"],
  },
];

export type MatrixRoomId = "menlou" | "heping" | "zutang" | "jiaolou";

export const matrixRooms: { id: MatrixRoomId; name: string }[] = [
  { id: "menlou", name: "门楼" },
  { id: "heping", name: "禾坪" },
  { id: "zutang", name: "祖堂" },
  { id: "jiaolou", name: "角楼" },
];

/** 时辰 × 空间。冲则改锁时辰，不另造建筑。据中轴/防御说明整理。 */
export const hourByRoom: Record<MatrixRoomId, Record<HourId, Compat>> = {
  menlou: { dawn: "ok", noon: "ok", dusk: "ok", night: "stretch" },
  heping: { dawn: "ok", noon: "ok", dusk: "ok", night: "conflict" },
  zutang: { dawn: "ok", noon: "stretch", dusk: "ok", night: "stretch" },
  jiaolou: { dawn: "stretch", noon: "stretch", dusk: "ok", night: "ok" },
};

export const fallbackHour: Record<MatrixRoomId, HourId> = {
  menlou: "dawn",
  heping: "dusk",
  zutang: "dusk",
  jiaolou: "night",
};

export function isMatrixRoom(id: RoomId): id is MatrixRoomId {
  return id === "menlou" || id === "heping" || id === "zutang" || id === "jiaolou";
}

export function hourCompat(room: RoomId, hour: HourId): Compat {
  if (!isMatrixRoom(room)) return "ok";
  return lookup(hourByRoom, room, hour);
}

const HONEST_HOUR = "时辰搭配是本展叙事约定（非史料）；空间依据见出处。";

export function hourWhy(room: MatrixRoomId, hour: HourId): { why: string; citeId: string } {
  if (room === "zutang" && hour === "dusk") {
    return { why: `暮×祖堂合（祭祀）。${HONEST_HOUR}`, citeId: "axis" };
  }
  if (room === "zutang" && hour === "noon") {
    return { why: `祖堂×午勉（日光过白）。${HONEST_HOUR}`, citeId: "axis" };
  }
  if (room === "jiaolou" && hour === "night") {
    return { why: `角楼×夜合（防御）。${HONEST_HOUR}`, citeId: "defense" };
  }
  if (room === "heping" && hour === "night") {
    return { why: `禾坪×夜冲（夜里不凉晒，改锁暮）。${HONEST_HOUR}`, citeId: "axis" };
  }
  if (room === "menlou" && hour === "dawn") {
    return { why: `门楼×晨合。${HONEST_HOUR}`, citeId: "axis" };
  }
  const c = lookup(hourByRoom, room, hour);
  const citeId = room === "jiaolou" ? "defense" : "axis";
  const why =
    c === "ok" ? "该时辰与此房间在内容包中判定为合。" : c === "stretch" ? "时辰边缘，可作示意说明。" : "该时辰与此房间在内容包中判定为冲突。";
  return { why: `${why}${HONEST_HOUR}`, citeId };
}

export function hourLockMessage(room: RoomId, hour: HourId, next: HourId): string {
  const rName = rooms.find((x) => x.id === room)!.name;
  const hName = hours.find((x) => x.id === hour)!.name;
  const nName = hours.find((x) => x.id === next)!.name;
  const extra = room === "heping" && hour === "night" ? "夜里不凉晒。" : "";
  return `${rName}与「${hName}」在本内容包中判定为冲突。${extra}已改锁为「${nName}」，不另造一座建筑。`;
}

export const hourSounds: Record<HourId, string> = {
  dawn: "鸡、石阶、门枢，雾把远处的牛声滤薄。",
  noon: "蝉把天井填满。禾坪有麻雀啄谷。",
  dusk: "锅碗在横屋，香在祖堂，炮眼先暗。",
  night: "更鼓极远。风穿过射击孔，像墙在呼吸。",
};

export function citationsForRoom(id: RoomId): import("./types").Citation[] {
  const map = new Map(hakkaCitations.map((c) => [c.id, c]));
  const ids: string[] = ["weiwu-vs-tulou"];
  if (id === "zutang" || id === "tianjing" || id === "menlou") ids.push("axis");
  if (id === "jiaolou" || id === "xiangdao") ids.push("defense");
  if (id === "heping" || id === "menlou") ids.push("guanxi");
  return ids.map((i) => map.get(i)!);
}
