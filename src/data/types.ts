export type Citation = {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  note: string;
  publicDomain?: boolean;
};

export type QAItem = {
  id: string;
  question: string;
  answer: string;
  citationIds: string[];
  keywords: string[];
};

export type PipelineStage = "idle" | "queued" | "stylize" | "cite" | "ready";

export type Route = "hall" | "ciyu" | "gexu" | "kejia";
