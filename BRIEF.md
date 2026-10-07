# 赣风·可对话的数字展 — CMIT 项目题述（按 2025 AIGC 智能交互准备）

## 一句话
把江西三条文化线做成可走、可问、可约束的数字展。**智能交互创新在于：冲突组合触发约束表规则，规则本身可展开审计，改锁结果在矩阵上 LIVE 回放（冲格×→规则条目→改锁格）。** 本地 BGE-small 语义匹配 + table.ts 确定性路由为工程支撑（非卖点）；三线共用同一查找接口是实现。瓷语器型为 Catmull-Rom 轮廓经 LatheGeometry 实时生成（segs 160），支持瞬时/慢放；可展开生成溯源日志。

## 赛道对位
- 2024 第12届起指定命题即有 AIGC 类 → 智能交互类；2025 第13届沿用。2026 规程未出。
- 备用：自主命题「移动应用开发」（必须能跑，不要 UI 稿）
- 2026 规程未出；通知一出若指定命题改名，只改包装不换核心。

## 三条参观线（评委 5 分钟够走完）
1. 瓷语 — 景德镇：选器型/釉色/朝代约束，程序旋转体器型，引用公开工艺说明（示例数据，非馆方官方）。
2. 阁序 — 滕王阁 / 《滕王阁序》：诗文意象 → 可点击场景（落霞、孤鹜、江水），每段画面绑定原句。
3. 客家 — 赣南围屋与声景：时辰×空间约束矩阵驱动动线；对话可写入时辰或房间。

## 必须能指认的创新（评委一句话）
冲突组合触发约束表规则，规则本身可展开审计，改锁结果在矩阵上 LIVE 回放（冲格×→规则条目→改锁格）——点宋 + 粉彩即可复现。table.ts / 本地 BGE-small 是支撑工程，不是卖点。主屏 Engine: local · table.ts（BGE 细节在「技术明细」）；阈值 0.40（探针实验 n=58 F1 峰值，未做显著性检验）。LatheGeometry 实时生成（segs 160）。独立出处卡片。不上 Qwen-1.8B。

## 开源与原创边界
- 思路借鉴：ComfyUI 工作流图、展陈式交互、轻量 2.5D/three 场景。
- 本项目原创：江西三条线内容包、约束控件、引用条、参观动线、视觉。
- 无 GPU 时用精选静帧 + 可见的管线占位，界面上诚实标明示例 / 程序复原示意（非文物三维扫描）。

## 5 分钟视频脚本
0:00–0:40 题目与问题（展览看完就忘 vs 可对话可约束）
0:40–2:10 瓷语线走完一次（改釉色，引用条出现；轮廓 SVG；geo-hud segs+elapsed）
2:10–3:20 阁序线：点「落霞」出对应句
3:20–4:20 客家线短走
4:20–5:00 创新点复盘 + 开源/许可证

## 提交材料（去年口径）
过程图 5–10 张 JPG；演示视频 ≤5 分钟；介绍文档（平台、软件、操作、亮点）。
队 ≤5 人，可跨校。勿与 AIC「AI+开源」作品复用同一套叙事。

## Round 11（截图 / 口径）
- 代码级复用证明：`#/?arch` 显示真实 import 块（porcelain/tengwang/hakka → table.ts lookup；exhibits → fallbackRow）+ lookup 签名。
- geo-hud：`Vertices · Faces · segs · 档 N/5 · elapsed`；升采样 GIF `ai-critique/r11-grow.gif`（目的＝看见生长，非性能优化）。
- BGE vs lex：同问「宋代的青白瓷瓶子」→ `r11-bge.png`（bge-slot + 槽位/载入 ms）与 `r11-lex.png`（forceLex / lex-slot）。
- 阈值表实测：`public/thresh-bench.json`（n=12，0.20/0.28/0.35 本批均为召回 85.2% / 精确 74.2%；0.28 为代码选用点）。BGE ONNX q8 = 22.9 MiB（24010842 bytes）；本机 BGE载入 1537ms。
- Never claim 国赛一等奖。四选一保留。
- 实拍：`public/shots/r11-{arch,bge,lex,thresh}.png`（1280×800）。

## Round 12（截图 / 口径）
- Demo Mode 默认 ~480ms/档；geo-hud「参数化拟合中 · Demo Mode」。一键「瞬时」/ `#/ciyu?instant` → segs 160 ≤50ms。`#/ciyu?build` 保持 Demo 供 GIF。
- 多态证明：`#/?arch` 并列 `lookup(liveMatrix|motifByMood|hourByRoom, …)` + 三按钮运行时试查写 `<pre data-poly-out>`。
- 软：槽位芯片 `[时代:宋]`；ask 出处条；thresh 业务句（召回 85.2% / 精确 74.2%，n=12）。
- 实拍：`public/shots/r12-{demo,instant,arch-poly}.png`；可选 `ai-critique/r12-grow.gif`。
- Never claim 国赛一等奖。四选一保留。


## Round 13（截图 / 口径）
- 默认 Instant：访客路径 segs 160 ≤50ms；无默认 480ms ramp。geo-hud「瞬时完成 · segs 160 · elapsed」。
- 「生成溯源」可展开日志（语义匹配→lookup→LatheGeometry ms）；`#/ciyu?log` 或旁路展开。慢放仅 `慢放演示(评委)` / `#/ciyu?build`。
- 矩阵改锁 LIVE：`#/ciyu?conflict` 冲格红 × + SVG 箭头→改锁格；客家同源；arch 客家试查迷你格夜→暮。
- 软：黄 `[Fallback: lex-slot 激活]`；阈值「原型边界测试集 (n=12) 阈值敏感度分析」；出处独立组件；文案无云端/无通用生成式大模型 + BGE-small 本地。
- 实拍：`public/shots/r13-{instant,log,rewrite-grid}.png`（1280×800）。
- Never claim 国赛一等奖。四选一保留。


## Round 14（截图 / 口径）
- 术语：UI/BRIEF「槽位填充」→「语义检索 · 原型匹配」/「本地语义匹配」；parse-strip 标题「语义匹配」；via 仍 `bge-slot`/`lex-slot`。
- 分数可视：每槽 score bar + 阈值线 0.28；说明「本原型空间标定；非通用句对 0.7+」。可选 margin：best−second<0.04 留空可降 lex。**拒绝把阈值抬到 0.75**（与实测好命中 ~0.53–0.67、n=12 三档同指标矛盾，属虚构口径）。
- LIVE 矩阵改锁扩到阁序+客家：`#/gexu?conflict`（渔舟×雁阵→冲→渔舟）、`#/kejia?conflict`（禾坪×夜→暮）；×+箭头同瓷语。
- `#/?arch` 同屏三列 + `table.ts 调用日志` 自动跑三行 lookup（瓷/阁/客冲→fallback）。
- 软：溯源/parse 一行「语义命中 … 0.xx」；量级对照芯片 22.9MiB ONNX vs 「通用 1.8B 级约数 GB、需 GPU」（非假延迟 bench）。
- 实拍：`public/shots/r14-{gexu-rewrite,kejia-rewrite,arch-triptych}.png`（1280×800）。
- Never claim 国赛一等奖。四选一保留。

## Round 15（截图 / 口径）
- 问展完整链路：`#/ciyu?askpipe` 自动跑「宋代有没有粉彩」→ parse-strip 语义匹配分数+阈值线 0.28 → matrix 冲→影青 → 出处组件；geo-hud segs 160 · elapsed。
- `#/?arch` 增「约束表原文」真实一行 `{era,glaze,status,fallback}` + 阁/客 one-liner（citeId 来自 corpus，无虚构页码）。
- 阈值折线：读 `thresh-bench.json`；本批三档未拉开，标 0.28 为代码默认；文案「小规模原型验证集 n=12 初步标定；后续需 n≥100」。
- 模型对照表：BGE 22.9 MiB 实测载入/槽位 ms + 金标槽命中；1.8B 公开量级对照；lex 实测算命中。算法句：余弦相似度 ≥0.28。
- 实拍：`public/shots/r15-{askpipe,arch-row,calib,model-cmp}.png`（1280×800）。
- Never claim 国赛一等奖。四选一保留。

## Round 16（截图 / 口径）
- 阈值扩展标定：金标问 n=58（瓷语/阁序/客家，含清晰命中、冲突、近误）；阈值档 0.20/0.24/0.28/0.32/0.35/0.40。
- 实测曲线：0.20→召回89.3%/精确77.1%, 0.24→召回89.3%/精确77.1%, 0.28→召回89.3%/精确77.1%, 0.32→召回89.3%/精确78.3%, 0.35→召回89.3%/精确79.4%, 0.40→召回87.6%/精确82.8%。**代码默认改为 0.40**（F1 最优；不再默认 0.28）。`public/thresh-bench.json` 含 n、per-threshold、timestamp（2026-09-04 17:50 CST）。
- 折线 caption：「小规模扩展标定 n=58」；arch 读 JSON 动态标默认档。
- 未做可用性小测 / 无编造用户数据（本轮跳过 study shell）。
- 实拍：`public/shots/r16-calib-n50.png`（1280×800）。
- Never claim 国赛一等奖。四选一保留。

## Round 17（截图 / 口径）
- 主屏统一引擎可视：常驻右上角 `Engine: BGE-small ONNX q8 · 22.9 MiB · 阈值 0.40 · table.ts`（门厅+三线）。
- 侧边/顶栏 **lookup 日志** live strip：约束查找时写入 `[瓷]/[阁]/[客]` 行；切线自动 append demo lookup；保留最近 3–5 行；**不必打开 #/?arch**。
- 门厅按钮「阈值标定曲线」→ `#/?calib`。
- 软：冲突改锁 ×+箭头更大更慢 + 「重放改锁」；出处独立卡片；文案缩短 BGE、去掉「拒绝 0.75」「非通用句对 0.7+」。
- 可用性小测按作者安排后续再做，本轮未做（不编造用户数据）。
- 实拍：`public/shots/r17-{engine-hud,switch-log,calib-btn}.png`（1280×800）。
- Never claim 国赛一等奖。四选一保留。

## Round 18（截图 / 口径）
- 创新叙事重构（Qwen r17 刀 2）：headline = 冲突改锁可见；BGE + table.ts 降为工程支撑。可用性小测（刀 1）按作者延期，本轮 SKIP。
- Top5 视觉对齐：parse-strip score bar 加厚 + 阈值线标 0.40；3s rewrite GIF；出处卡片强化；calib Precision/Recall/F1 + 「n=58 … F1 最优 0.40」；Engine HUD 显示实测 slot/lookup ms，FPS/Memory 仅 performance API 有则显示。
- 实拍：`public/shots/r18-{hall-lede,scores,cite,calib}.png`；`ai-critique/r18-rewrite.gif` + `public/shots/r18-rewrite-still.png`（1280×800）。本轮 box WebGL 不可用，lathe ms 未测；UI chrome 实拍仍交付。
- Never claim 国赛一等奖。四选一保留。无编造用户研究数据。

## Round 19（截图 / 口径）
- Qwen r18 刀 A：约束表审计面板落地（规则原文可展开；冲格×→规则条目→改锁格）。刀 B（10 人可用性小测）SKIP / 永久延期本轮。
- Soft Top5：headline 改为「冲突组合触发约束表规则…可展开审计…LIVE 回放」；去掉稻草人「而不是生成好看的错图」。Engine HUD 降级为 `Engine: local · table.ts`，BGE/ONNX/阈值收到「技术明细」。calib caption：「探针实验 n=58，0.40 为该样本 F1 峰值，未做显著性检验」。askpipe e2e trace（问句→BGE→lookup→冲突→改锁→出处，含实测 ms）。
- 实拍：`public/shots/r19-{audit,hud-demote,trace}.png`（+ calib / rewrite-still）；`ai-critique/r19-*.jpg`。
- Never claim 国赛一等奖。四选一保留。无编造用户研究数据。无 study UI。
