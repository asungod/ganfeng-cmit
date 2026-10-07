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
    blurb: "禾坪未晒谷，门楼有雾。脚步声先于人出现。",
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
    role: "唯一的正式入口。内外之间先经过一道被观察的门槛。",
    walk: "从村路靠近，先看见厚墙与门额，再看见门。可走，不是传送。",
    sound: "石阶、门枢、远处水牛。晨有鸡。",
    dialect: { term: "屋家", gloss: "家里、家园", hint: "示例记音：赣南客家常说「转屋家」表示回家。" },
    x: 42,
    y: 86,
    w: 16,
    h: 8,
  },
  {
    id: "heping",
    name: "禾坪",
    role: "门内的空场。晒谷、节庆、临时的公共。",
    walk: "进门之后空间忽然打开。这是围屋给「外」的最后一块平地。",
    sound: "晒席、麻雀、正午的蝉。",
    dialect: { term: "晒谷", gloss: "把稻谷摊在禾坪上晒", hint: "示例。禾坪是生产空间，不只是院子。" },
    x: 28,
    y: 68,
    w: 44,
    h: 16,
  },
  {
    id: "tianjing",
    name: "天井",
    role: "雨水、天光、通风。围屋向天开的一口。",
    walk: "穿过禾坪，地面微降，四壁把天裁成方形。",
    sound: "雨天有滴阶；晴天有风从巷道灌入。",
    dialect: { term: "采光", gloss: "让天进到围心里", hint: "示例。天井是气候装置，不是装饰水景。" },
    x: 36,
    y: 48,
    w: 28,
    h: 16,
  },
  {
    id: "zutang",
    name: "祖堂",
    role: "中轴上的祭祀与宗族中心。所有房间的朝向都在回答它。",
    walk: "沿中轴走到底。牌位、香、左右对称。人在这里放慢。",
    sound: "晨昏有香；其余时候是极静的木头。",
    dialect: { term: "敬祖", gloss: "祭祀祖先", hint: "示例。客家围屋把祖堂放在几何中心，不是放在角落的祠堂附件。" },
    x: 38,
    y: 30,
    w: 24,
    h: 16,
  },
  {
    id: "zhengwu",
    name: "正屋",
    role: "祖堂两侧的正房，长辈与礼仪性起居。",
    walk: "从祖堂退到两翼。比横屋更近中轴，也更正式。",
    sound: "坐椅挪动、钟、偶尔的咳嗽。",
    dialect: { term: "阿公阿婆", gloss: "祖父祖母", hint: "示例称谓。正屋往往留给更长的一辈。" },
    x: 20,
    y: 30,
    w: 16,
    h: 16,
  },
  {
    id: "hengwu",
    name: "横屋",
    role: "两侧纵深的居住与附属空间，生活在此展开。",
    walk: "离开中轴，进入可以做饭、睡觉、说话的尺度。",
    sound: "灶、碗、孩童。午后有人午睡。",
    dialect: { term: "食饭", gloss: "吃饭", hint: "示例。横屋是「食饭」发生的地方，祖堂不是。" },
    x: 8,
    y: 36,
    w: 10,
    h: 40,
  },
  {
    id: "jiaolou",
    name: "角楼",
    role: "转角的防御节点。炮眼朝外，楼梯陡。",
    walk: "沿外墙走到角。视野突然离开宗族，对着田与路。",
    sound: "风比别处大。夜里风声会改调。",
    dialect: { term: "炮眼", gloss: "墙上的射击/观察孔", hint: "示例。角楼让围屋成为可防御的聚落，而不只是大房子。" },
    x: 8,
    y: 8,
    w: 14,
    h: 14,
  },
  {
    id: "xiangdao",
    name: "巷道",
    role: "外墙内侧的环形通道。连接横屋与角楼，也是战时的内部动线。",
    walk: "人顺着墙根走，肩会擦到冷砖。这是「可走」最具体的一段。",
    sound: "回声短，脚步被墙翻倍。",
    dialect: { term: "转", gloss: "走、回、绕", hint: "示例。「转一转」可以是散步，也可以是沿着巷道把围走完。" },
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
    title: "赣南围屋与闽西土楼",
    source: "据公开民居说明整理（示例资料）",
    excerpt:
      "福建土楼以圆形闻名，赣南围屋多方形或近方，砖石或生土厚墙，集居住、宗祠、防御于一。龙南、定南、全南一带遗存较集中。二者都是客家聚居建筑，但不是同一物。",
    note: "示例资料。本展平面为示意，不对应某一座文保单位的测绘。",
  },
  {
    id: "axis",
    title: "中轴与祖堂",
    source: "据公开聚落研究综述整理",
    excerpt:
      "围屋以祖堂为心，中轴对称。门楼、禾坪、天井、祖堂一线贯穿。居住在两翼展开，防御在外墙与角楼完成。几何即伦理。",
    note: "示例资料。",
  },
  {
    id: "defense",
    title: "厚墙、角楼、炮眼",
    source: "据公开建筑说明整理",
    excerpt:
      "赣南历史上有迁徙与地方动荡，围屋外墙厚、开口少，角楼控制视野。它首先是可以住下去的堡，其次才是今天的观光对象。",
    note: "示例资料。声景中的风声穿过炮眼，是建筑功能留下的听觉。",
  },
  {
    id: "guanxi",
    title: "龙南关西新围（示意）",
    source: "据公开导览信息整理",
    excerpt:
      "关西新围是赣南围屋中规模较大、保存较完整的一例，常被用作认识此类建筑的入口。本展不复制其平面，只借用「有门楼、有禾坪、有祖堂、有角楼」这一可走的语法。",
    note: "示例资料，非该围官方导览。",
  },
];

export const hakkaQA: QAItem[] = [
  {
    id: "q-tulou",
    question: "围屋和土楼是一回事吗？",
    answer:
      "不是。它们同属客家大型聚居建筑，但赣南围屋以方形、中轴祖堂更为典型，闽西土楼有许多圆形。本展走的是江西这一路，避免把土楼照片直接贴在赣南标签下。",
    citationIds: ["weiwu-vs-tulou", "guanxi"],
    keywords: ["土楼", "围屋", "区别", "福建", "圆形"],
  },
  {
    id: "q-zutang",
    question: "祖堂为什么在中轴？",
    answer:
      "因为围屋先是宗族的容器。祖堂在几何中心，门楼到祖堂的一条线是礼仪动线；吃饭睡觉在两翼，打仗瞭望在外墙。走一遍，比听一句「重视祖先」更清楚。",
    citationIds: ["axis"],
    keywords: ["祖堂", "中轴", "为什么", "宗族"],
  },
  {
    id: "q-jiaolou",
    question: "角楼有什么用？",
    answer:
      "转角处的视野最好，炮眼朝外。它把「家」的内部动线接到「防」的外部观察。夜里走巷道去角楼，风声会先告诉你墙有多厚。",
    citationIds: ["defense"],
    keywords: ["角楼", "炮眼", "防御", "用"],
  },
  {
    id: "q-walk",
    question: "时辰和房间怎么互相约束？",
    answer:
      "暮×祖堂为合：黄昏点香，中轴祭祀。夜×角楼为合：防御在夜里才说出自己的句子。禾坪×夜为冲：无晒谷，改锁暮，不另造一座建筑。祖堂×午为勉：日光过白。门楼×晨为合。规则据中轴与防御两条说明整理，不是馆方禁令。",
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

const HONEST_HOUR = "本内容包规则，据中轴与防御说明整理，不是馆方禁令。";

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
    return { why: `禾坪×夜冲（无晒谷，改锁暮）。${HONEST_HOUR}`, citeId: "axis" };
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
  const extra = room === "heping" && hour === "night" ? "无晒谷。" : "";
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
