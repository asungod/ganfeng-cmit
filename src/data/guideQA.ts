import type { Citation, QAItem } from "./types";

export const guideCitations: Citation[] = [
  {
    id: "honest-api",
    title: "本展会生成什么——以及不会生成什么",
    source: "赣风 · 开源边界与诚实声明",
    excerpt: "无付费 API，无 GPU。所谓生成是精选静帧、程序材质与可见管线。问展只根据内容包作答。",
    note: "本展自述，不是馆方官方释文。",
    status: "design",
  },
  {
    id: "honest-vase",
    title: "程序复原，非馆藏",
    source: "瓷语展柜说明",
    excerpt: "眼前梅瓶是程序器型与釉面，用来讲约束，不是某馆藏品照片。",
    note: "近看会露出程序材质。",
    status: "design",
  },
];

export const guideQA: QAItem[] = [
  {
    id: "q-chatgpt",
    question: "这是 ChatGPT 套壳吗？用了网上的大模型吗？",
    answer:
      "不是。三条线的画面是程序场景；问展用浏览器内的小检索模型在题库里找带出处的答案，找不到就拒绝。不调用付费接口，也不把游客的话送去外部大模型。",
    citationIds: ["honest-api"],
    keywords: ["ChatGPT", "套壳", "大模型", "API", "收费", "GPT", "通义"],
  },
  {
    id: "q-photo",
    question: "能不能帮我生成一张滕王阁或梅瓶的照片？",
    answer:
      "不能另写提示词出图。阁序把王勃原句钉在三维夜阁上，瓷语把时代语法锁在器型上。游客问的是展柜里有没有出处，不是再要一张风景图。",
    citationIds: ["honest-api", "honest-vase"],
    keywords: ["生成", "照片", "出图", "提示词", "画画"],
  },
  {
    id: "q-real-vase",
    question: "展柜里的梅瓶是博物馆藏品吗？",
    answer:
      "不是馆藏原件。这是程序复原的梅瓶，用来把器型、釉色、朝代锁在一起。引用条给的是故宫博物院词条等可查证出处的原文摘录，展柜本身不是馆藏。",
    citationIds: ["honest-vase"],
    keywords: ["馆藏", "真的", "文物", "原件", "梅瓶"],
  },
  {
    id: "q-why-small",
    question: "为什么用小模型，不直接接网上的大模型？",
    answer:
      "评委要看的是约束和出处，不是聊天是否流利。小模型只在题库里检索；题库没有的问题会说「未收录」。这样句子不会无出处地混进展柜。",
    citationIds: ["honest-api"],
    keywords: ["小模型", "为什么", "检索", "题库", "拒绝"],
  },
];
