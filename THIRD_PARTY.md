# 第三方资源与许可清单（赣风 · 可对话的数字展）

整理日期：2026-10-08。下表只列**随作品分发或运行时用到**的第三方资源；版本以 package-lock.json 为准。

## 一、运行时随包分发

| 资源 | 版本 | 用途 | 许可 | 来源 |
|---|---|---|---|---|
| three.js | 0.170.0 | 瓷语展柜、阁序夜景的三维渲染（WebGL2） | MIT | https://github.com/mrdoob/three.js |
| @huggingface/transformers（Transformers.js） | 4.2.0 | 在浏览器里运行 BGE 向量检索 | Apache-2.0 | https://github.com/huggingface/transformers.js |
| onnxruntime-web | 1.26.0-dev.20260416 | Transformers.js 的 WASM 推理后端（public/ort） | MIT | https://github.com/microsoft/onnxruntime |
| onnxruntime-common | 1.24.3 | 同上（依赖） | MIT | https://github.com/microsoft/onnxruntime |
| BAAI/bge-small-zh-v1.5（ONNX q8 版：Xenova/bge-small-zh-v1.5） | v1.5 | 「问展」题库语义检索（只做向量比对，**不生成文字**） | MIT（模型卡：「FlagEmbedding is licensed under the MIT License. The released models can be used for commercial purposes free of charge.」） | https://huggingface.co/BAAI/bge-small-zh-v1.5 ；ONNX：https://huggingface.co/Xenova/bge-small-zh-v1.5 |
| Ma Shan Zheng（马善政毛笔楷书） | Google Fonts 仓库版 | 标题毛笔字（已裁剪子集） | SIL OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/mashanzheng |
| Noto Serif SC（思源宋体） | Google Fonts 仓库版（可变字重） | 正文宋体（子集，字重 400–700） | SIL OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/notoserifsc |
| Noto Sans SC（思源黑体） | Google Fonts 仓库版（可变字重） | 界面黑体（子集 + GB2312 一级字，字重 300–600） | SIL OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/notosanssc |
| Go 标准库 | Go 1.24 编译 | 便携静态服务器 ganfeng-server（本项目自写，仅用标准库） | BSD-3-Clause（Go 运行时） | https://go.dev/LICENSE |

字体许可原文见 `public/fonts/OFL-*.txt`（离线包里在 `许可/` 目录）。

## 二、仅开发/构建时使用（不进运行包）

| 资源 | 版本 | 用途 | 许可 |
|---|---|---|---|
| Vite | 5.4.21 | 开发服务器与打包 | MIT |
| TypeScript | 5.9.3 | 类型检查与编译 | Apache-2.0 |
| @types/three | 0.170.0 | three.js 类型声明 | MIT |
| fontTools + brotli（Python） | 4.65.0 | 字体子集化脚本 scripts/subset-fonts.py | MIT |

## 三、文字内容的出处

- 《滕王阁序》（王勃，唐）、《天工开物》（宋应星，明）：原文属公有领域，引自维基文库。
- 瓷器与围屋的事实性说明：引自故宫博物院、中国非物质文化遗产网、龙南市人民政府、文化和旅游部、光明日报、生态中国网、维基百科等公开页面，只摘录短句，并标明出处与访问日期。完整列表见 `src/data/sources.ts`（离线包内审计面板可查）。
- 作品**没有使用**文物照片、第三方三维模型、第三方音频或视频素材：器型是程序生成的（three.js LatheGeometry），釉面是程序绘制的画布纹理，围屋平面是自绘 SVG 示意图。

## 四、AI 工具（详见《AI 工具使用情况说明》）

- 开发阶段：AI 编程助手按作者要求生成了大部分代码与文案初稿；通义千问（访客模式）用于作品评审意见与批评。
- 运行阶段：只有 BGE-small-zh 做语义检索，没有生成式模型，也不联网。
