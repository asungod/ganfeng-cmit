import type { Citation, QAItem, Route } from "../data/types";
import { porcelainCitations, porcelainQA } from "../data/porcelain";
import { tengwangCitations, tengwangQA } from "../data/tengwang";
import { hakkaCitations, hakkaQA } from "../data/hakka";
import { guideCitations, guideQA } from "../data/guideQA";

export type DocLine = Route | "guide";

export type Doc = {
  line: DocLine;
  lineName: string;
  item: QAItem;
};

const NAMES: Record<DocLine, string> = {
  hall: "门厅",
  ciyu: "瓷语",
  gexu: "阁序",
  kejia: "客家",
  guide: "开源边界",
};

export const allCitations: Citation[] = [
  ...guideCitations,
  ...porcelainCitations,
  ...tengwangCitations,
  ...hakkaCitations,
];

export const allDocs: Doc[] = [
  ...guideQA.map((item) => ({ line: "guide" as const, lineName: NAMES.guide, item })),
  ...porcelainQA.map((item) => ({ line: "ciyu" as const, lineName: NAMES.ciyu, item })),
  ...tengwangQA.map((item) => ({ line: "gexu" as const, lineName: NAMES.gexu, item })),
  ...hakkaQA.map((item) => ({ line: "kejia" as const, lineName: NAMES.kejia, item })),
];

export function citationsOf(ids: string[]): Citation[] {
  const map = new Map(allCitations.map((c) => [c.id, c]));
  return ids.map((id) => map.get(id)).filter((c): c is Citation => Boolean(c));
}

export function lineName(id: DocLine): string {
  return NAMES[id];
}
