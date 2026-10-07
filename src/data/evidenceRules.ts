import type { EvRule } from "../app/evidence";
import type { EraId, GlazeId } from "./porcelain";
import type { ImageId, MoodId } from "./tengwang";
import type { HourId, MatrixRoomId } from "./hakka";

/** 每条约束规则的依据与验证案例。出处 id 见 sources.ts；摘录只用已核出处。 */

const GLAZE_RULE: Record<GlazeId, Omit<EvRule, "status" | "statusText">> = {
  fencai: {
    claim: "粉彩「创烧于康熙晚期，成熟于雍正、乾隆两代」→ 宋、元、明 × 粉彩判冲，清 × 粉彩判合。",
    sourceIds: ["dpm-fencai", "shm-fencai"],
    cases: [
      { a: "song", b: "fencai", tag: "命中", label: "宋代梅瓶上粉彩", note: "早约六百年，改锁影青" },
      { a: "ming", b: "fencai", tag: "边界", label: "明末与康熙晚期之间", note: "明亡于1644，粉彩康熙晚期才出现，仍判冲" },
      { a: "qing", b: "fencai", tag: "例外", label: "清代粉彩", note: "规则不触发" },
    ],
  },
  jihong: {
    claim:
      "景德镇元代开始烧高温铜红釉、初创偏暗；永乐、宣德烧出纯正红釉，亦称祭红 → 宋判冲、元判勉、明清判合。",
    sourceIds: ["dpm-xianhong", "dpm-hongyou"],
    cases: [
      { a: "song", b: "jihong", tag: "命中", label: "宋代景德镇铜红", note: "铜红在景德镇始于元，改锁影青" },
      { a: "yuan", b: "jihong", tag: "边界", label: "元代铜红", note: "已能烧但偏暗；本轮据故宫词条由「冲」改「勉」" },
      { a: "ming", b: "jihong", tag: "例外", label: "明永宣祭红", note: "规则不触发" },
    ],
  },
  wucai: {
    claim:
      "「明宣德时已有五彩」，嘉靖、万历多青花五彩，康熙为主流；宋、元只有釉上加彩的基础 → 宋元判冲（本展取舍）、明清判合。",
    sourceIds: ["dpm-wucai"],
    cases: [
      { a: "song", b: "wucai", tag: "命中", label: "宋代五彩", note: "改锁影青" },
      { a: "yuan", b: "wucai", tag: "边界", label: "元代五彩", note: "词条说五彩在宋元釉上加彩基础上发展；判冲是本展取舍，可被质疑" },
      { a: "ming", b: "wucai", tag: "例外", label: "明嘉万五彩", note: "规则不触发" },
    ],
  },
  qinghua: {
    claim: "「元代景德镇已能烧制成熟的青花瓷器」，明清为主流 → 元明清判合；宋早于成熟期判勉。",
    sourceIds: ["dpm-qinghua", "ihchina-jdz"],
    cases: [
      { a: "song", b: "qinghua", tag: "边界", label: "宋代青花", note: "早于成熟期，只作勉（仿古/探索说明）" },
      { a: "yuan", b: "qinghua", tag: "例外", label: "元青花", note: "规则不触发" },
      { a: "ming", b: "qinghua", tag: "例外", label: "明青花", note: "规则不触发" },
    ],
  },
  yingqing: {
    claim:
      "青白瓷是「景德镇湖田窑在北宋初、中期独创」；湖田窑元代仍烧青白瓷，「明代以烧造青花瓷为主」→ 宋元判合，明清判勉。",
    sourceIds: ["dpm-qingbai"],
    cases: [
      { a: "song", b: "yingqing", tag: "例外", label: "宋代影青", note: "规则不触发" },
      { a: "ming", b: "yingqing", tag: "边界", label: "明代影青", note: "湖田窑明代以青花为主，判勉" },
      { a: "qing", b: "yingqing", tag: "边界", label: "清代仿影青", note: "仿古，判勉" },
    ],
  },
};

export function porcelainRule(_era: EraId, glaze: GlazeId): EvRule {
  return {
    status: "verified",
    statusText: "已核 · 依据为故宫博物院等公开页面原文；合/勉/冲的划分是本展内容包规则。",
    ...GLAZE_RULE[glaze],
  };
}

const MOOD_RULE: Record<MoodId, Omit<EvRule, "status" | "statusText">> = {
  luoxia: {
    claim: "落霞、孤鹜、秋水、长天同出一联「落霞与孤鹜齐飞，秋水共长天一色」→ 判合；渔舟、雁阵出自下一联 → 判冲，改锁回落霞。",
    sourceIds: ["ws-tengwang"],
    cases: [
      { a: "luoxia", b: "guwu", tag: "例外", label: "落霞孤鹜 × 孤鹜", note: "同句，规则不触发" },
      { a: "luoxia", b: "yuzhou", tag: "命中", label: "落霞孤鹜 × 渔舟", note: "跨句，改锁落霞" },
      { a: "luoxia", b: "yanzhen", tag: "命中", label: "落霞孤鹜 × 雁阵", note: "跨句，改锁落霞" },
    ],
  },
  yuzhou: {
    claim:
      "「渔舟唱晚，响穷彭蠡之滨」锚定彭蠡（鄱阳湖一带古称）。雁阵是同联对句，但指向「衡阳之浦」——本展一个情境只锁一个地名锚点，故判冲（设计约定）。",
    sourceIds: ["ws-tengwang", "eco-poyang"],
    cases: [
      { a: "yuzhou", b: "yanzhen", tag: "命中", label: "渔舟唱晚 × 雁阵", note: "同联对句、地名锚点不同，改锁渔舟（设计约定）" },
      { a: "yuzhou", b: "luoxia", tag: "命中", label: "渔舟唱晚 × 落霞", note: "跨句，改锁渔舟" },
      { a: "yuzhou", b: "yuzhou", tag: "例外", label: "渔舟唱晚 × 渔舟", note: "同句，规则不触发" },
    ],
  },
  yanzhen: {
    claim:
      "「雁阵惊寒，声断衡阳之浦」锚定衡阳；「雁不过衡阳」是古人观念形成的文学意象（光明日报 2020）。渔舟指向彭蠡 → 判冲（设计约定）。",
    sourceIds: ["ws-tengwang", "gmw-hengyang"],
    cases: [
      { a: "yanzhen", b: "yuzhou", tag: "命中", label: "雁阵惊寒 × 渔舟", note: "地名锚点不同，改锁雁阵" },
      { a: "yanzhen", b: "qiushui", tag: "边界", label: "雁阵惊寒 × 秋水", note: "同一段江景，判勉" },
      { a: "yanzhen", b: "yanzhen", tag: "例外", label: "雁阵惊寒 × 雁阵", note: "同句，规则不触发" },
    ],
  },
  sanyan: {
    claim: "「时维九月，序属三秋。潦水尽而寒潭清」→ 寒潭判合；渔舟、雁阵属后文另一联的声景 → 判冲；其余同段景物判勉。",
    sourceIds: ["ws-tengwang"],
    cases: [
      { a: "sanyan", b: "yuzhou", tag: "命中", label: "九月三秋 × 渔舟", note: "改锁寒潭" },
      { a: "sanyan", b: "luoxia", tag: "边界", label: "九月三秋 × 落霞", note: "同一个秋日，判勉" },
      { a: "sanyan", b: "hantan", tag: "例外", label: "九月三秋 × 寒潭", note: "同句，规则不触发" },
    ],
  },
};

export function tengwangRule(mood: MoodId, _motif: ImageId): EvRule {
  return {
    status: "verified",
    statusText: "已核（原文）· 意象出自哪一句可在维基文库原文核对；「冲」是文本锚定的设计约定，不表示史实上不能同时出现。",
    ...MOOD_RULE[mood],
  };
}

const ROOM_SRC: Record<MatrixRoomId, string[]> = {
  menlou: ["ln-guanxi"],
  heping: ["ln-guanxi"],
  zutang: ["ln-guanxi"],
  jiaolou: ["ln-guanxi", "ln-weiwu"],
};

const ROOM_CLAIM: Record<MatrixRoomId, string> = {
  menlou: "门楼是围屋入口（空间示意）。时辰搭配「晨合、夜勉」是本展叙事约定。",
  heping: "禾坪是晒谷的公共空地（乌石围「围前有禾坪」）。「夜里不晒谷 → 夜判冲、改锁暮」是本展叙事约定。",
  zutang: "关西新围「中轴线是祠堂」。「暮合（黄昏点香）、午勉（日光过白）」是本展叙事约定。",
  jiaolou: "关西新围「四角各建有一座10米高的炮楼」。「夜合（值守）」是本展叙事约定。",
};

export function hakkaRule(room: MatrixRoomId, _hour: HourId): EvRule {
  return {
    status: "design",
    statusText: "设计约定 · 空间要素（中轴祠堂、四角炮楼、围前禾坪）有官方出处；时辰 × 房间的合/勉/冲是叙事约定，不是史料。",
    claim: ROOM_CLAIM[room],
    sourceIds: ROOM_SRC[room],
    cases: [
      { a: "heping", b: "night", tag: "命中", label: "禾坪 × 夜", note: "夜里不晒谷，改锁暮" },
      { a: "zutang", b: "noon", tag: "边界", label: "祖堂 × 午", note: "日光过白，判勉" },
      { a: "jiaolou", b: "night", tag: "例外", label: "角楼 × 夜", note: "规则不触发" },
    ],
  };
}
