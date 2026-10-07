/** Extended gold queries for threshold calibration (n≥50). Mix clear hits, conflicts, near-misses. */

export type GoldItem = {
  q: string;
  line: "ciyu" | "gexu" | "kejia";
  gold: Record<string, string>;
  kind?: "hit" | "conflict" | "near";
};

/** Labeled slot gold for BGE prototype-space thresh bench. */
export const THRESH_GOLD: GoldItem[] = [
  // —— 瓷语 clear ——
  { q: "宋代的青白瓷瓶子", line: "ciyu", gold: { era: "song", glaze: "yingqing", shape: "meiping" }, kind: "hit" },
  { q: "明代青花梅瓶", line: "ciyu", gold: { era: "ming", glaze: "qinghua", shape: "meiping" }, kind: "hit" },
  { q: "元代青花瓷器", line: "ciyu", gold: { era: "yuan", glaze: "qinghua" }, kind: "hit" },
  { q: "清代粉彩盘子", line: "ciyu", gold: { era: "qing", glaze: "fencai", shape: "dish" }, kind: "hit" },
  { q: "祭红釉玉壶春瓶", line: "ciyu", gold: { glaze: "jihong", shape: "yuhuchun" }, kind: "hit" },
  { q: "影青斗笠碗", line: "ciyu", gold: { glaze: "yingqing", shape: "bowl" }, kind: "hit" },
  { q: "五彩花觚", line: "ciyu", gold: { glaze: "wucai", shape: "gu" }, kind: "hit" },
  { q: "明代祭红梅瓶", line: "ciyu", gold: { era: "ming", glaze: "jihong", shape: "meiping" }, kind: "hit" },
  { q: "清代五彩折沿盘", line: "ciyu", gold: { era: "qing", glaze: "wucai", shape: "dish" }, kind: "hit" },
  { q: "青白釉梅瓶", line: "ciyu", gold: { glaze: "yingqing", shape: "meiping" }, kind: "hit" },
  { q: "粉彩玉壶春瓶", line: "ciyu", gold: { glaze: "fencai", shape: "yuhuchun" }, kind: "hit" },
  { q: "青花斗笠碗", line: "ciyu", gold: { glaze: "qinghua", shape: "bowl" }, kind: "hit" },
  { q: "宋朝的影青碗", line: "ciyu", gold: { era: "song", glaze: "yingqing", shape: "bowl" }, kind: "hit" },
  { q: "明朝青花盘子", line: "ciyu", gold: { era: "ming", glaze: "qinghua", shape: "dish" }, kind: "hit" },
  { q: "清粉彩花觚", line: "ciyu", gold: { era: "qing", glaze: "fencai", shape: "gu" }, kind: "hit" },
  // —— 瓷语 conflict / near ——
  { q: "宋代有没有粉彩", line: "ciyu", gold: { era: "song", glaze: "fencai" }, kind: "conflict" },
  { q: "元代影青玉壶春", line: "ciyu", gold: { era: "yuan", glaze: "yingqing", shape: "yuhuchun" }, kind: "conflict" },
  { q: "宋代祭红釉", line: "ciyu", gold: { era: "song", glaze: "jihong" }, kind: "conflict" },
  { q: "元代有粉彩吗", line: "ciyu", gold: { era: "yuan", glaze: "fencai" }, kind: "conflict" },
  { q: "想看一只祭红瓶子", line: "ciyu", gold: { glaze: "jihong", shape: "meiping" }, kind: "near" },
  { q: "有没有影青盘子", line: "ciyu", gold: { glaze: "yingqing", shape: "dish" }, kind: "near" },
  { q: "花觚五彩", line: "ciyu", gold: { glaze: "wucai", shape: "gu" }, kind: "near" },
  { q: "景德镇的宋代梅瓶", line: "ciyu", gold: { era: "song", shape: "meiping" }, kind: "near" },
  { q: "青白瓷玉壶春", line: "ciyu", gold: { glaze: "yingqing", shape: "yuhuchun" }, kind: "near" },

  // —— 阁序 clear ——
  { q: "落霞孤鹜的意境", line: "gexu", gold: { mood: "luoxia", focus: "luoxia" }, kind: "hit" },
  { q: "渔舟唱晚", line: "gexu", gold: { mood: "yuzhou", focus: "yuzhou" }, kind: "hit" },
  { q: "雁阵惊寒", line: "gexu", gold: { mood: "yanzhen", focus: "yanzhen" }, kind: "hit" },
  { q: "点一下落霞", line: "gexu", gold: { mood: "luoxia", focus: "luoxia" }, kind: "hit" },
  { q: "孤鹜与落霞", line: "gexu", gold: { mood: "luoxia", focus: "guwu" }, kind: "hit" },
  { q: "九月三秋寒潭", line: "gexu", gold: { mood: "sanyan", focus: "hantan" }, kind: "hit" },
  { q: "飞阁流丹", line: "gexu", gold: { focus: "feige" }, kind: "hit" },
  { q: "彭蠡之滨渔舟", line: "gexu", gold: { mood: "yuzhou", focus: "yuzhou" }, kind: "hit" },
  { q: "想看雁阵意象", line: "gexu", gold: { mood: "yanzhen", focus: "yanzhen" }, kind: "hit" },
  { q: "长天一色", line: "gexu", gold: { focus: "changtian" }, kind: "hit" },
  { q: "寒潭清澈", line: "gexu", gold: { mood: "sanyan", focus: "hantan" }, kind: "hit" },
  { q: "落霞与孤鹜齐飞", line: "gexu", gold: { mood: "luoxia", focus: "guwu" }, kind: "hit" },
  // —— 阁序 conflict / near ——
  { q: "渔舟情境配雁阵", line: "gexu", gold: { mood: "yuzhou", focus: "yanzhen" }, kind: "conflict" },
  { q: "秋水共长天一色", line: "gexu", gold: { mood: "luoxia", focus: "qiushui" }, kind: "near" },
  { q: "唱晚的渔舟", line: "gexu", gold: { mood: "yuzhou", focus: "yuzhou" }, kind: "near" },
  { q: "惊寒的雁阵", line: "gexu", gold: { mood: "yanzhen", focus: "yanzhen" }, kind: "near" },
  { q: "孤鹜飞过秋水", line: "gexu", gold: { mood: "luoxia", focus: "guwu" }, kind: "near" },

  // —— 客家 clear ——
  { q: "暮时去祖堂", line: "kejia", gold: { hour: "dusk", room: "zutang" }, kind: "hit" },
  { q: "夜宿角楼", line: "kejia", gold: { hour: "night", room: "jiaolou" }, kind: "hit" },
  { q: "晨入门楼", line: "kejia", gold: { hour: "dawn", room: "menlou" }, kind: "hit" },
  { q: "午时在禾坪", line: "kejia", gold: { hour: "noon", room: "heping" }, kind: "hit" },
  { q: "暮色天井", line: "kejia", gold: { hour: "dusk", room: "tianjing" }, kind: "hit" },
  { q: "巷道午后", line: "kejia", gold: { hour: "noon", room: "xiangdao" }, kind: "hit" },
  { q: "祖堂清晨", line: "kejia", gold: { hour: "dawn", room: "zutang" }, kind: "hit" },
  { q: "角楼黄昏", line: "kejia", gold: { hour: "dusk", room: "jiaolou" }, kind: "hit" },
  { q: "门楼夜里", line: "kejia", gold: { hour: "night", room: "menlou" }, kind: "hit" },
  { q: "夜色中的巷道", line: "kejia", gold: { hour: "night", room: "xiangdao" }, kind: "hit" },
  { q: "晨光门楼", line: "kejia", gold: { hour: "dawn", room: "menlou" }, kind: "hit" },
  // —— 客家 conflict / near ——
  { q: "夜到禾坪", line: "kejia", gold: { hour: "night", room: "heping" }, kind: "conflict" },
  { q: "禾坪夜巡", line: "kejia", gold: { hour: "night", room: "heping" }, kind: "conflict" },
  { q: "祖堂夜晚", line: "kejia", gold: { hour: "night", room: "zutang" }, kind: "near" },
  { q: "想去天井看看", line: "kejia", gold: { room: "tianjing" }, kind: "near" },
  { q: "现在是暮时", line: "kejia", gold: { hour: "dusk" }, kind: "near" },
  { q: "围屋角楼夜色", line: "kejia", gold: { hour: "night", room: "jiaolou" }, kind: "near" },
];

export const THRESH_LEVELS = [0.2, 0.24, 0.28, 0.32, 0.35, 0.4] as const;

export function goldCount(): number {
  return THRESH_GOLD.length;
}
