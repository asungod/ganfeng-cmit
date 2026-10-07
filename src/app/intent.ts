import { eras, glazes, shapes, type EraId, type GlazeId, type ShapeId } from "../data/porcelain";
import { motifs, moods, type ImageId, type MoodId } from "../data/tengwang";
import { hours, rooms, type HourId, type RoomId } from "../data/hakka";
import type { Route } from "../data/types";

export type PorcelainIntent = {
  era?: EraId;
  glaze?: GlazeId;
  shape?: ShapeId;
  note: string;
  tea: boolean;
};

export type GexuIntent = {
  mood?: MoodId;
  focus?: ImageId;
  note: string;
};

export type HakkaIntent = {
  room?: RoomId;
  hour?: HourId;
  note: string;
};

export function parsePorcelainIntent(q: string): PorcelainIntent | null {
  const s = q.trim();
  if (!s) return null;
  let era: EraId | undefined;
  let glaze: GlazeId | undefined;
  let shape: ShapeId | undefined;
  let tea = false;

  if (/宋/.test(s)) era = "song";
  if (/元/.test(s)) era = "yuan";
  if (/明/.test(s)) era = "ming";
  if (/清/.test(s)) era = "qing";

  if (/粉彩/.test(s)) glaze = "fencai";
  else if (/影青|青白/.test(s)) glaze = "yingqing";
  else if (/青花/.test(s)) glaze = "qinghua";
  else if (/祭红/.test(s)) glaze = "jihong";
  else if (/五彩/.test(s)) glaze = "wucai";
  else if (era === "song" && /釉/.test(s)) glaze = "yingqing";

  if (/梅瓶/.test(s)) shape = "meiping";
  if (/玉壶/.test(s)) shape = "yuhuchun";
  if (/喝茶|茶|斗笠/.test(s)) {
    shape = "bowl";
    if (/喝茶|茶/.test(s)) tea = true;
  }

  if (!era && !glaze && !shape) return null;

  const eName = era ? eras.find((x) => x.id === era)!.name : "";
  const sName = shape ? shapes.find((x) => x.id === shape)!.name : "";
  const gName = glaze ? glazes.find((x) => x.id === glaze)!.name : "";
  const bits = [eName, sName, gName].filter(Boolean);
  let note = bits.length ? `对话写入展陈：${bits.join(" · ")}` : "对话写入展陈";
  if (tea) note = `${note}\n对话写入现有器型：斗笠碗（茶器），不新造器。`;
  return { era, glaze, shape, note, tea };
}

export function parseGexuIntent(q: string): GexuIntent | null {
  const s = q.trim();
  if (!s) return null;
  let mood: MoodId | undefined;
  let focus: ImageId | undefined;

  if (/落霞/.test(s)) {
    focus = "luoxia";
    mood = "luoxia";
  }
  if (/孤鹜/.test(s)) {
    focus = "guwu";
    mood = "luoxia";
  }
  if (/秋水/.test(s)) {
    focus = "qiushui";
    mood = "luoxia";
  }
  if (/长天/.test(s)) {
    focus = "changtian";
    mood = "luoxia";
  }
  if (/渔舟/.test(s)) {
    focus = "yuzhou";
    mood = "yuzhou";
  }
  if (/雁/.test(s)) {
    focus = "yanzhen";
    mood = "yanzhen";
  }
  if (/飞阁/.test(s)) focus = "feige";
  if (/寒潭/.test(s)) {
    focus = "hantan";
    mood = "sanyan";
  }
  if (/彭蠡/.test(s)) {
    focus = "yuzhou";
    mood = "yuzhou";
  }

  if (!mood && !focus) return null;
  const mName = mood ? moods.find((x) => x.id === mood)!.name : "";
  const fName = focus ? motifs.find((x) => x.id === focus)!.name : "";
  const bits = [mName, fName].filter(Boolean);
  return { mood, focus, note: `对话写入展陈：${bits.join(" · ")}` };
}

export function parseHakkaIntent(q: string): HakkaIntent | null {
  const s = q.trim();
  if (!s) return null;
  let room: RoomId | undefined;
  let hour: HourId | undefined;

  if (/祖堂/.test(s)) room = "zutang";
  if (/门楼/.test(s)) room = "menlou";
  if (/角楼/.test(s)) room = "jiaolou";
  if (/禾坪/.test(s)) room = "heping";
  if (/天井/.test(s)) room = "tianjing";
  if (/巷道/.test(s)) room = "xiangdao";
  if (/晨/.test(s)) hour = "dawn";
  if (/午/.test(s)) hour = "noon";
  if (/暮/.test(s)) hour = "dusk";
  if (/夜/.test(s)) hour = "night";

  if (!room && !hour) return null;
  const rName = room ? rooms.find((x) => x.id === room)!.name : "";
  const hName = hour ? hours.find((x) => x.id === hour)!.name : "";
  const bits = [hName, rName].filter(Boolean);
  return { room, hour, note: `对话写入展陈：${bits.join(" · ")}` };
}

function jsonOfPorcelain(q: string): object | null {
  const p = parsePorcelainIntent(q);
  if (!p) return null;
  const out: Record<string, string> = { via: "lex-slot" };
  if (p.era) out.era = p.era;
  if (p.glaze) out.glaze = p.glaze;
  if (p.shape) out.shape = p.shape;
  return out;
}

function jsonOfGexu(q: string): object | null {
  const p = parseGexuIntent(q);
  if (!p) return null;
  const out: Record<string, string> = { via: "lex-slot" };
  if (p.mood) out.mood = p.mood;
  if (p.focus) out.focus = p.focus;
  return out;
}

function jsonOfHakka(q: string): object | null {
  const p = parseHakkaIntent(q);
  if (!p) return null;
  const out: Record<string, string> = { via: "lex-slot" };
  if (p.room) out.room = p.room;
  if (p.hour) out.hour = p.hour;
  return out;
}

export function intentJson(q: string, line?: Route): object | null {
  if (line === "gexu") return jsonOfGexu(q);
  if (line === "kejia") return jsonOfHakka(q);
  if (line === "ciyu") return jsonOfPorcelain(q);
  return jsonOfPorcelain(q) ?? jsonOfGexu(q) ?? jsonOfHakka(q);
}

export type ParseHit = { token: string; slot: string; value: string };

export type ParseExplain = {
  tokens: string[];
  hits: ParseHit[];
  json: object | null;
};

const LEX = [
  "为什么",
  "什么",
  "怎么",
  "哪里",
  "粉彩",
  "影青",
  "青白",
  "青花",
  "祭红",
  "五彩",
  "梅瓶",
  "玉壶",
  "喝茶",
  "斗笠",
  "落霞",
  "孤鹜",
  "秋水",
  "长天",
  "渔舟",
  "飞阁",
  "寒潭",
  "彭蠡",
  "祖堂",
  "门楼",
  "角楼",
  "禾坪",
  "天井",
  "巷道",
  "宋",
  "元",
  "明",
  "清",
  "釉",
  "茶",
  "雁",
  "晨",
  "午",
  "暮",
  "夜",
].sort((a, b) => b.length - a.length);

export function tokenizeQuery(q: string): string[] {
  const s = q.trim();
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (/[\s，。？?、！!；;：:\u3000]/.test(ch)) {
      i += 1;
      continue;
    }
    let hit = "";
    for (const w of LEX) {
      if (s.startsWith(w, i)) {
        hit = w;
        break;
      }
    }
    if (hit) {
      tokens.push(hit);
      i += hit.length;
    } else {
      tokens.push(ch);
      i += 1;
    }
  }
  return tokens;
}

function porcelainHits(q: string): ParseHit[] {
  const p = parsePorcelainIntent(q);
  if (!p) return [];
  const hits: ParseHit[] = [];
  if (p.era === "song" && /宋/.test(q)) hits.push({ token: "宋", slot: "时代", value: "时代" });
  if (p.era === "yuan" && /元/.test(q)) hits.push({ token: "元", slot: "时代", value: "时代" });
  if (p.era === "ming" && /明/.test(q)) hits.push({ token: "明", slot: "时代", value: "时代" });
  if (p.era === "qing" && /清/.test(q)) hits.push({ token: "清", slot: "时代", value: "时代" });
  if (p.glaze === "fencai" && /粉彩/.test(q)) hits.push({ token: "粉彩", slot: "釉色", value: "粉彩" });
  else if (p.glaze === "yingqing" && /影青|青白/.test(q)) {
    hits.push({ token: /影青/.test(q) ? "影青" : "青白", slot: "釉色", value: "影青" });
  } else if (p.glaze === "qinghua" && /青花/.test(q)) hits.push({ token: "青花", slot: "釉色", value: "青花" });
  else if (p.glaze === "jihong" && /祭红/.test(q)) hits.push({ token: "祭红", slot: "釉色", value: "祭红" });
  else if (p.glaze === "wucai" && /五彩/.test(q)) hits.push({ token: "五彩", slot: "釉色", value: "五彩" });
  else if (p.glaze === "yingqing" && /釉/.test(q)) hits.push({ token: "釉", slot: "釉色", value: "影青（宋默认）" });
  if (p.shape === "meiping" && /梅瓶/.test(q)) hits.push({ token: "梅瓶", slot: "器型", value: "梅瓶" });
  if (p.shape === "yuhuchun" && /玉壶/.test(q)) hits.push({ token: "玉壶", slot: "器型", value: "玉壶春" });
  if (p.shape === "bowl" && /喝茶|茶|斗笠/.test(q)) {
    const tok = /斗笠/.test(q) ? "斗笠" : /喝茶/.test(q) ? "喝茶" : "茶";
    hits.push({ token: tok, slot: "器型", value: "斗笠碗" });
  }
  return hits;
}

function gexuHits(q: string): ParseHit[] {
  const p = parseGexuIntent(q);
  if (!p) return [];
  const hits: ParseHit[] = [];
  const pairs: [RegExp, string, string, string][] = [
    [/落霞/, "落霞", "意象", "落霞"],
    [/孤鹜/, "孤鹜", "意象", "孤鹜"],
    [/秋水/, "秋水", "意象", "秋水"],
    [/长天/, "长天", "意象", "长天"],
    [/渔舟/, "渔舟", "意象", "渔舟"],
    [/雁/, "雁", "意象", "雁阵"],
    [/飞阁/, "飞阁", "意象", "飞阁"],
    [/寒潭/, "寒潭", "意象", "寒潭"],
    [/彭蠡/, "彭蠡", "意象", "渔舟"],
  ];
  for (const [re, token, slot, value] of pairs) {
    if (re.test(q)) hits.push({ token, slot, value });
  }
  return hits;
}

function hakkaHits(q: string): ParseHit[] {
  const p = parseHakkaIntent(q);
  if (!p) return [];
  const hits: ParseHit[] = [];
  const roomsHit: [RegExp, string][] = [
    [/祖堂/, "祖堂"],
    [/门楼/, "门楼"],
    [/角楼/, "角楼"],
    [/禾坪/, "禾坪"],
    [/天井/, "天井"],
    [/巷道/, "巷道"],
  ];
  for (const [re, token] of roomsHit) {
    if (re.test(q)) hits.push({ token, slot: "房间", value: token });
  }
  const hoursHit: [RegExp, string][] = [
    [/晨/, "晨"],
    [/午/, "午"],
    [/暮/, "暮"],
    [/夜/, "夜"],
  ];
  for (const [re, token] of hoursHit) {
    if (re.test(q)) hits.push({ token, slot: "时辰", value: token });
  }
  return hits;
}

export function explainParse(q: string, line?: Route): ParseExplain {
  const tokens = tokenizeQuery(q);
  const json = intentJson(q, line);
  let hits: ParseHit[] = [];
  if (line === "gexu") hits = gexuHits(q);
  else if (line === "kejia") hits = hakkaHits(q);
  else if (line === "ciyu") hits = porcelainHits(q);
  else hits = porcelainHits(q).length ? porcelainHits(q) : gexuHits(q).length ? gexuHits(q) : hakkaHits(q);
  return { tokens, hits, json };
}

const SLOT_ZH: Record<string, string> = {
  era: "时代",
  glaze: "釉色",
  shape: "器型",
  mood: "情境",
  focus: "意象",
  room: "房间",
  hour: "时辰",
};

const VALUE_ZH: Record<string, string> = {
  song: "宋",
  yuan: "元",
  ming: "明",
  qing: "清",
  yingqing: "影青",
  qinghua: "青花",
  jihong: "祭红",
  fencai: "粉彩",
  wucai: "五彩",
  meiping: "梅瓶",
  yuhuchun: "玉壶春",
  bowl: "斗笠碗",
  dish: "折沿盘",
  gu: "花觚",
  sanyan: "九月三秋",
  luoxia: "落霞",
  yuzhou: "渔舟",
  yanzhen: "雁阵",
  guwu: "孤鹜",
  qiushui: "秋水",
  changtian: "长天",
  feige: "飞阁",
  hantan: "寒潭",
  zutang: "祖堂",
  menlou: "门楼",
  jiaolou: "角楼",
  heping: "禾坪",
  tianjing: "天井",
  xiangdao: "巷道",
  dawn: "晨",
  noon: "午",
  dusk: "暮",
  night: "夜",
};

export function slotLabel(slot: string): string {
  return SLOT_ZH[slot] ?? slot;
}

export function slotValueLabel(id: string): string {
  return VALUE_ZH[id] ?? id;
}
