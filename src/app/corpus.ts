import type { Citation, QAItem, Route } from "../data/types";
import { porcelainCitations, porcelainQA } from "../data/porcelain";
import { tengwangCitations, tengwangQA } from "../data/tengwang";
import { hakkaCitations, hakkaQA } from "../data/hakka";
import { guideCitations, guideQA } from "../data/guideQA";
import { routeName } from "./i18n";

export type DocLine = Route | "guide";

export type Doc = {
  line: DocLine;
  lineName: string;
  item: QAItem;
};

function names(): Record<DocLine, string> {
  return {
    hall: routeName("hall"),
    ciyu: routeName("ciyu"),
    gexu: routeName("gexu"),
    kejia: routeName("kejia"),
    guide: routeName("guide"),
  };
}

export const allCitations: Citation[] = [
  ...guideCitations,
  ...porcelainCitations,
  ...tengwangCitations,
  ...hakkaCitations,
];

export function allDocsNow(): Doc[] {
  const N = names();
  return [
    ...guideQA.map((item) => ({ line: "guide" as const, lineName: N.guide, item })),
    ...porcelainQA.map((item) => ({ line: "ciyu" as const, lineName: N.ciyu, item })),
    ...tengwangQA.map((item) => ({ line: "gexu" as const, lineName: N.gexu, item })),
    ...hakkaQA.map((item) => ({ line: "kejia" as const, lineName: N.kejia, item })),
  ];
}

/** Snapshot at load; prefer allDocsNow() when language may have changed. */
export const allDocs: Doc[] = allDocsNow();

export function citationsOf(ids: string[]): Citation[] {
  const map = new Map(allCitations.map((c) => [c.id, c]));
  return ids.map((id) => map.get(id)).filter((c): c is Citation => Boolean(c));
}

export function lineName(id: DocLine): string {
  return names()[id];
}
