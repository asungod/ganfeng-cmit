// 第 4 条线（扩展演示）：西山万寿宫庙会 · 活动 × 时段。
// 事实锚点只取两处官方页面原文（见 sources.ts: ih-wanshou, gov-ich3）；合/勉/冲的划分是本展设计约定。
import type { Compat } from "../app/table";

export type ActId = "kaichao" | "xiban";
export type SlotId = "chendan" | "baitian" | "yewan";

export const acts: { id: ActId; name: string }[] = [
  { id: "kaichao", name: "开朝进香" },
  { id: "xiban", name: "戏班演出" },
];
export const slots: { id: SlotId; name: string }[] = [
  { id: "chendan", name: "晨旦" },
  { id: "baitian", name: "白日" },
  { id: "yewan", name: "夜晚" },
];

/** 活动 × 时段（列=活动，行=时段）。锚点：「八月初一晨旦开朝」「夜晚民间戏班演出」。 */
export const slotByAct: Record<ActId, Record<SlotId, Compat>> = {
  kaichao: { chendan: "ok", baitian: "stretch", yewan: "conflict" },
  xiban: { chendan: "stretch", baitian: "stretch", yewan: "ok" },
};
/** 冲突时改锁到的时段 */
export const preferredSlot: Record<ActId, SlotId> = { kaichao: "chendan", xiban: "yewan" };

export function actCompat(a: ActId, s: SlotId): Compat {
  return slotByAct[a][s];
}
