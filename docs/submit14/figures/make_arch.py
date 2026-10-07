import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager as fm

FR = fm.FontProperties(fname="/workspace/cmit/fonts-src/static/NotoSerifSC-Regular.ttf")
FB = fm.FontProperties(fname="/workspace/cmit/fonts-src/static/NotoSerifSC-Bold.ttf")

INK = "#1b1410"; PAPER = "#f3ead8"; GOLD = "#b8914a"; DAN = "#8c2d24"; CELADON = "#5f8a7e"; GREY = "#6b5d50"
fig = plt.figure(figsize=(16, 9), dpi=120)
ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 160); ax.set_ylim(0, 90); ax.axis("off")
fig.patch.set_facecolor(PAPER)

def box(x, y, w, h, title, lines=(), fc="#fffaf0", ec=GOLD, tc=INK, lw=1.6, ts=15):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.2", fc=fc, ec=ec, lw=lw))
    ax.text(x + w / 2, y + h - 3.2, title, ha="center", va="center", fontsize=ts, color=tc, fontproperties=FB)
    for i, l in enumerate(lines):
        ax.text(x + w / 2, y + h - 7.6 - i * 3.6, l, ha="center", va="center", fontsize=10.5, color=GREY if tc == INK else tc, fontproperties=FR)

def arrow(x1, y1, x2, y2, label=None, c=GOLD):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(arrowstyle="-|>", color=c, lw=1.6, mutation_scale=16))
    if label:
        ax.text((x1 + x2) / 2 + 0.8, (y1 + y2) / 2 + 1.2, label, fontsize=9.5, color=c, fontproperties=FR)

ax.text(80, 85.5, "赣风 · 可对话的数字展　系统架构", ha="center", fontsize=22, color=INK, fontproperties=FB)
ax.text(80, 81.3, "浏览器内运行 · 离线一键启动 · 运行时不调用任何生成式大模型", ha="center", fontsize=12, color=DAN, fontproperties=FR)

box(4, 60, 26, 15, "访客", ["点击展签 / 改格", "写一句提问"])
box(38, 62, 84, 15, "三条展线（同一套约束语法）", ["瓷语：朝代 × 釉色（史实约束）　阁序：情境 × 意象（原文锚定）", "客家：房间 × 时辰（叙事约定，明示非史料）"], fc="#fbf3e2")
box(130, 60, 26, 15, "渲染", ["three.js 程序器型 / 夜景", "Canvas 2D 围屋室内"])

box(38, 36, 40, 19, "共享约束引擎 table.ts", ["lookup(列, 行) → 合 / 勉 / 冲", "冲 → fallbackRow 改锁", "每次查表写入引擎日志"], ec=DAN, fc="#fff4ef")
box(84, 36, 38, 19, "审计面板「展示 → 验证」", ["evidenceRules：规则原文", "sources.ts：23 条已核出处", "「试一下」默认表实测并对照依据"], ec=CELADON, fc="#eef6f2")

box(4, 6, 60, 24, "问展：只检索、不生成", ["① 意图槽位：BGE 原型相似度 ≥0.40 且领先 ≥0.04", "② 题库检索：BGE-small-zh q8，问句/全文双向量", "　 最高分 ≥0.55 才作答，并附出处卡", "③ 低于阈值 → 「题库未收录」拒答", "④ 模型载入失败 → 词面检索兜底"], ec=GOLD)
box(70, 6, 52, 24, "本地资源（零外网请求）", ["/models：BGE-small-zh-v1.5（量化 q8）", "/ort：ONNX Runtime Web（WASM，单线程）", "/fonts：OFL 字体子集（思源宋/黑、马善政）", "内容包：题库、约束表、出处摘录"], ec=GREY)
box(128, 6, 28, 24, "离线启动器", ["start.bat / .sh / .command", "Go 便携服务器", "Python / PowerShell 备用", "仅监听 127.0.0.1"], ec=GREY)

arrow(30, 67.5, 38, 69)
arrow(122, 69, 130, 67.5)
arrow(60, 62, 58, 55, "选格")
arrow(78, 45.5, 84, 45.5)
ax.text(81, 48.5, "命中规则", ha="center", fontsize=9.5, color=GOLD, fontproperties=FR)
arrow(17, 60, 25, 30.5, "提问")
arrow(40, 30.5, 50, 36, c=DAN)
ax.text(31, 33.2, "锁定槽位 → 查表", fontsize=9.5, color=DAN, fontproperties=FR)
arrow(64, 18, 70, 18)
arrow(122, 18, 128, 18)
arrow(103, 55, 103, 62, c=CELADON)

fig.savefig("/workspace/cmit/submit14/figures/arch.png", facecolor=PAPER)
print("ok")
