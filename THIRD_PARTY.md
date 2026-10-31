# 第三方资源与许可清单（赣风 · 可对话的数字展）

整理日期：2026-10-31（对齐 HEAD tip · 含 Poly Haven/Kenney/Quaternius CC0 + Freesound 戏曲场面锣鼓 CC-BY）。下表只列**随作品分发或运行时用到**的第三方资源；版本以 package-lock.json 为准。

## 一、运行时随包分发

| 资源 | 版本 | 用途 | 许可 | 来源 |
|---|---|---|---|---|
| three.js | 0.170.0 | 四个展厅的三维渲染（WebGL2，含 postprocessing 泛光/调色与 RGBELoader） | MIT | https://github.com/mrdoob/three.js |
| @huggingface/transformers（Transformers.js） | 4.2.0 | 在浏览器里运行 BGE 向量检索 | Apache-2.0 | https://github.com/huggingface/transformers.js |
| onnxruntime-web | 1.26.0-dev.20260416 | Transformers.js 的 WASM 推理后端（public/ort） | MIT | https://github.com/microsoft/onnxruntime |
| onnxruntime-common | 1.24.3 | 同上（依赖） | MIT | https://github.com/microsoft/onnxruntime |
| BAAI/bge-small-zh-v1.5（ONNX q8 版：Xenova/bge-small-zh-v1.5） | v1.5 | 「问展」题库语义检索（只做向量比对，**不生成文字**） | MIT（模型卡：「FlagEmbedding is licensed under the MIT License. The released models can be used for commercial purposes free of charge.」） | https://huggingface.co/BAAI/bge-small-zh-v1.5 ；ONNX：https://huggingface.co/Xenova/bge-small-zh-v1.5 |
| Ma Shan Zheng（马善政毛笔楷书） | Google Fonts 仓库版 | 标题毛笔字（已裁剪子集） | SIL OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/mashanzheng |
| Noto Serif SC（思源宋体） | Google Fonts 仓库版（可变字重） | 正文宋体（子集，字重 400–700） | SIL OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/notoserifsc |
| Noto Sans SC（思源黑体） | Google Fonts 仓库版（可变字重） | 界面黑体（子集 + GB2312 一级字，字重 300–600） | SIL OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/notosanssc |
| Go 标准库 | Go 1.24 编译 | 便携静态服务器 ganfeng-server（本项目自写，仅用标准库） | BSD-3-Clause（Go 运行时） | https://go.dev/LICENSE |

字体许可原文见 `public/fonts/OFL-*.txt`（离线包里在 `许可/` 目录）。


## 一·补、三维素材 / 3D assets（2026-10-20 新增 · Added 2026-10-20）

全部来自 Poly Haven，许可 CC0 1.0（公有领域贡献，无需署名，本作品仍主动致谢）。均为 1k 分辨率，未改动像素；在程序里按世界坐标平铺，并用颜色系数调色。随包位置：`public/assets3d/`（约 19MB），清单机读版 `public/assets3d/credits.json`，作品内「门厅 → 关于本作品」里有致谢列表。
All from Poly Haven, CC0 1.0 (public domain; no attribution required, credited anyway). 1k resolution, pixels unmodified; tiled in world space and colour-tinted in code. Shipped in `public/assets3d/` (~19 MB); machine-readable list `public/assets3d/credits.json`; credits panel in-app under Lobby → About this work.

| 素材 Asset | 类型 Type | 作者 Author(s) | 用途 Use | 许可 License | 来源 URL |
|---|---|---|---|---|---|
| Qwantani Dusk 2 (Pure Sky) | HDRI | Greg Zaal, Jarod Guest | 阁序天空与环境光 / Tengwang sky & lighting | CC0 1.0 | https://polyhaven.com/a/qwantani_dusk_2_puresky |
| Qwantani Sunset (Pure Sky) | HDRI | Greg Zaal, Jarod Guest | 客家「暮」天空 / Hakka dusk sky | CC0 1.0 | https://polyhaven.com/a/qwantani_sunset_puresky |
| Qwantani Night (Pure Sky) | HDRI | Greg Zaal, Jarod Guest | 客家、万寿宫夜间环境光 / night lighting (Hakka, Wanshou) | CC0 1.0 | https://polyhaven.com/a/qwantani_night_puresky |
| Qwantani (Pure Sky) | HDRI | Greg Zaal, Jarod Guest | 客家「晨/午」、万寿宫日间天空 / day sky (Hakka, Wanshou) | CC0 1.0 | https://polyhaven.com/a/qwantani_puresky |
| Clay Plaster | PBR texture | Amal Kumar | 围屋夯土墙 / rammed-earth walls | CC0 1.0 | https://polyhaven.com/a/clay_plaster |
| Grey Roof Tiles | PBR texture | Rob Tuytel | 围屋瓦顶 / roof tiles | CC0 1.0 | https://polyhaven.com/a/grey_roof_tiles |
| Ceramic Roof 01 | PBR texture | Rob Tuytel | 围屋瓦顶 / roof tiles (v18) | CC0 1.0 | https://polyhaven.com/a/ceramic_roof_01 |
| Dark Wooden Planks | PBR texture | Amal Kumar | 木门、梁、楼板 / wood doors, beams, floors | CC0 1.0 | https://polyhaven.com/a/dark_wooden_planks |
| Kenney Nature Kit（选树／竹／灌木） | 三维模型 glTF | Kenney | 客家／万寿宫／阁序岸边植被 | CC0 1.0 | https://kenney.nl/assets/nature-kit |
| Quaternius Ultimate Nature Pack（CommonTree／Pine／Willow） | 三维模型 glTF | Quaternius | 客家／万寿宫／阁序柳树 | CC0 1.0 | https://quaternius.com/packs/ultimatenature.html |
| Quaternius Modular Men／Women | 三维模型 glTF | Quaternius | 万寿宫香客／观众／戏班（T 姿改挂臂，布料着色） | CC0 1.0 | https://quaternius.com/packs/ultimatemodularcharacters.html |
| Stone Tiles | PBR texture | Christopher Melani | 台基、地面、天井 / platforms, paving, skywells | CC0 1.0 | https://polyhaven.com/a/stone_tiles |
| Brown Mud Dry | PBR texture | Rob Tuytel | 禾坪外地面、江岸 / ground, riverbank | CC0 1.0 | https://polyhaven.com/a/brown_mud_dry |
| Red Plaster Weathered | PBR texture | Amal Kumar | 万寿宫红墙 / temple red walls | CC0 1.0 | https://polyhaven.com/a/red_plaster_weathered |
| Lacquered Cherry Wood | PBR texture | Jenelle van Heerden, Rico Cilliers | 朱漆柱、供桌 / lacquered columns, altar | CC0 1.0 | https://polyhaven.com/a/lacquered_cherry_wood |
| Weathered Planks | PBR texture | Dario Barresi, Dimitrios Savva | （备用，未直接使用）/ spare, not used | CC0 1.0 | https://polyhaven.com/a/weathered_planks |

建筑、人物、香烟、灯笼、水面、山体等几何均为本项目程序生成，未使用第三方三维模型。
Architecture, incense smoke, lanterns, water, hills and 阁序 birds are project-authored. Trees/bamboo and 万寿宫 people use Quaternius + Kenney CC0 glTF (listed above); procedural fallbacks remain if assets fail to load.


## 一·补二、音频素材 / Audio（2026-10-31 新增）

可公开再分发的完整赣剧／采茶戏／弋阳腔商用唱段录音极少；本展万寿宫「戏班演出」声景改用 **Freesound 上明确 CC-BY 4.0 授权的京剧戏台场面录音片段**（锣鼓 + 唢呐／京胡等），作戏台背景乐循环。**不是某部赣剧唱段**，亦非唱腔复原。随包位置：`public/audio/opera/`（约 1.1 MB）。
No clearly redistributable full 赣剧/采茶戏 commercial vocal recording was available under CC0/CC-BY; the Wanshou 「戏班演出」 bed uses clearly licensed Beijing-opera **stage percussion (+ suona/jinghu)** field fragments from Freesound (CC-BY 4.0), looped as stage ambience — **not a 赣剧 aria**. Shipped in `public/audio/opera/` (~1.1 MB).

| 素材 Asset | 作者 Author | 用途 Use | 许可 License | 来源 URL |
|---|---|---|---|---|
| beijing-opera-7.wav → `stage-luogu.mp3` | xserra | 万寿宫戏台声景主循环（锣鼓+唢呐场面） | CC-BY 4.0 | https://freesound.org/people/xserra/sounds/162035/ |
| beijing-opera-2.wav → `stage-luogu-b.mp3` | xserra | 备用戏台循环（京胡/笛子/琵琶+锣鼓场面） | CC-BY 4.0 | https://freesound.org/people/xserra/sounds/162034/ |

署名说明（CC-BY）：「戏曲场面锣鼓（京剧戏台录音片段，CC-BY）· 非某部赣剧唱段」— beijing-opera-7 / beijing-opera-2 by xserra, Freesound, CC-BY 4.0；本展仅作万寿宫戏台背景乐。

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
- 作品**没有使用**文物照片或第三方视频素材；三维贴图／植被／人物见上表 CC0；音频仅见上表 Freesound CC-BY 戏台场面锣鼓（非赣剧唱段）。器型是程序生成的（three.js LatheGeometry），釉面是程序绘制的画布纹理，围屋平面是自绘 SVG 示意图。

## 四、AI 工具（详见《AI 工具使用情况说明》）

- 开发阶段：AI 编程助手按作者要求生成了大部分代码与文案初稿；通义千问（访客模式）用于作品评审意见与批评。
- 运行阶段：只有 BGE-small-zh 做语义检索，没有生成式模型，也不联网。

---
## English summary — Third-party resources and licenses
Work title in English: **Ganfeng: A Conversational Digital Exhibition**.
Bundled at runtime: three.js 0.170.0 (MIT); Transformers.js 4.2.0 (Apache-2.0); onnxruntime-web / onnxruntime-common (MIT); BAAI/bge-small-zh-v1.5, ONNX q8 build by Xenova (MIT; used for embedding retrieval only, never generates text); Ma Shan Zheng, Noto Serif SC, Noto Sans SC (SIL OFL 1.1, subset); Go standard library for the self-written portable server (BSD-3-Clause). Build-time only: Vite 5.4.21 (MIT), TypeScript 5.9.3 (Apache-2.0), @types/three (MIT), fontTools + brotli (MIT). Text sources: see the source-verification table (09); classical texts used are public domain (no copyright applies because of their age). No artifact photos or third-party video. 3D textures/vegetation/people: CC0 as listed. Audio: Freesound CC-BY Beijing-opera stage percussion fragments for the Wanshou stage bed only (not a 赣剧 aria).

## 本项目自制/衍生资源（v18–v19）

- earth_grey_* / plaster_grey_*：由 Poly Haven Brown Mud Dry、Clay Plaster（CC0 1.0）去饱和得到的衍生贴图，用于围屋夯土墙，沿用 CC0。
- water_normal_gen.jpg：本项目用程序生成的水面法线贴图（无第三方来源）。
- 水面渲染用 three.js 自带的 Water.js（MIT，随 three.js 发布）。
