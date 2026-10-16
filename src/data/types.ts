export type Citation = {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  note: string;
  publicDomain?: boolean;
  /** verified=出处已逐字核对（见 src/data/sources.ts）；pending=待核；design=本展设计约定，非史实断言 */
  status?: "verified" | "pending" | "design";
  /** sources.ts 里的出处 id */
  sourceId?: string;
  url?: string;
};

export type QAItem = {
  id: string;
  question: string;
  answer: string;
  citationIds: string[];
  keywords: string[];
};

export type PipelineStage = "idle" | "queued" | "stylize" | "cite" | "ready";

export type Route = "hall" | "ciyu" | "gexu" | "kejia" | "wanshou";
