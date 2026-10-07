import type { Citation, QAItem } from "../data/types";

export type AskVia = "slip" | "bge" | "lex" | "none";

export type AskResult = {
  ok: boolean;
  question: string;
  answer: string;
  citations: Citation[];
  via?: AskVia;
  score?: number;
  line?: string;
  hitTitle?: string;
};

export function ask(
  pack: QAItem[],
  citations: Citation[],
  query: string,
): AskResult {
  const q = query.trim();
  if (!q) {
    return {
      ok: false,
      question: q,
      answer: "请先点一条问展纸条，或写入与当前展线有关的词。",
      citations: [],
      via: "none",
    };
  }
  const hit = pack.find((item) => item.question === q);
  if (hit) return finish(hit, citations, q);

  const tokens = q.toLowerCase().split(/[\s，。？?、]+/).filter((t) => t.length >= 1);
  let best: QAItem | null = null;
  let score = 0;
  for (const item of pack) {
    let s = 0;
    for (const k of item.keywords) {
      if (q.includes(k)) s += 2;
    }
    for (const t of tokens) {
      if (t.length >= 2 && item.question.includes(t)) s += 1;
    }
    if (s > score) {
      score = s;
      best = item;
    }
  }
  if (best && score >= 2) return finish(best, citations, q);

  return {
    ok: false,
    question: q,
    answer:
      "题库未收录这一问。赣风只根据当前展线的示例资料作答，不接外部模型，以免无出处的句子混进展柜。",
    citations: [],
    via: "none",
  };
}

function finish(item: QAItem, citations: Citation[], question: string): AskResult {
  const map = new Map(citations.map((c) => [c.id, c]));
  return {
    ok: true,
    question,
    answer: item.answer,
    citations: item.citationIds.map((id) => map.get(id)).filter((c): c is Citation => Boolean(c)),
    via: "slip",
    hitTitle: item.question,
  };
}
