import json, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
FR = fm.FontProperties(fname="/workspace/cmit/fonts-src/static/NotoSerifSC-Regular.ttf")
FB = fm.FontProperties(fname="/workspace/cmit/fonts-src/static/NotoSerifSC-Bold.ttf")
INK = "#1b1410"; PAPER = "#f3ead8"; GOLD = "#b8914a"; DAN = "#8c2d24"; CELADON = "#5f8a7e"; GREY = "#6b5d50"

d = json.load(open("/workspace/cmit-ganfeng/public/thresh-bench.json"))
calib = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
if calib: calib["threshold"] = 0.55

ncols = 2 if calib else 1
fig, axes = plt.subplots(1, ncols, figsize=(16 if calib else 9, 6.4), dpi=120)
fig.patch.set_facecolor(PAPER)
axes = axes if calib else [axes]

ax = axes[0]
ax.set_facecolor("#fffaf0")
t = [r["threshold"] for r in d["rows"]]
rec = [r["recallRaw"] * 100 for r in d["rows"]]
pre = [r["precisionRaw"] * 100 for r in d["rows"]]
ax.plot(t, rec, "-o", color=CELADON, lw=2.2, label="召回")
ax.plot(t, pre, "-s", color=DAN, lw=2.2, label="精确")
ax.axvline(d["pickThreshold"], color=GOLD, ls="--", lw=1.6)
ax.text(d["pickThreshold"] - 0.003, 72.6, f"选用 {d['pickThreshold']:.2f}", ha="right", color=GOLD, fontproperties=FB, fontsize=12)
for x, a, b in zip(t, rec, pre):
    if x == d["pickThreshold"]:
        ax.annotate(f"{a:.1f}%", (x, a), textcoords="offset points", xytext=(-8, 8), ha="right", color=CELADON, fontproperties=FR)
        ax.annotate(f"{b:.1f}%", (x, b), textcoords="offset points", xytext=(-8, -16), ha="right", color=DAN, fontproperties=FR)
ax.set_ylim(70, 95)
ax.set_xlabel("余弦相似度阈值", fontproperties=FR, fontsize=12)
ax.set_ylabel("%", fontproperties=FR)
ax.set_title(f"① 意图槽位阈值（自建金标问 n={d['n']}）", fontproperties=FB, fontsize=14, color=INK)
ax.legend(prop=FR, frameon=False, loc="lower left")
ax.grid(alpha=0.25)
for s in ax.spines.values(): s.set_color(GREY)

if calib:
    ax = axes[1]
    ax.set_facecolor("#fffaf0")
    th = calib["threshold"]
    for sp, c, mk in (("dev", CELADON, "o"), ("holdout", DAN, "s")):
        rows = calib["sweep"][sp]
        t2 = [r["t"] for r in rows]
        ax.plot(t2, [r["recall"] * 100 for r in rows], "-" + mk, color=c, lw=2, label=f"{sp} 召回")
        ax.plot(t2, [r["precision"] * 100 for r in rows], "--" + mk, color=c, lw=1.6, mfc="none", label=f"{sp} 精确")
    ax.axvline(th, color=GOLD, ls="--", lw=1.6)
    ax.text(th + 0.004, 42, f"作答阈值 {th:.2f}", color=GOLD, fontproperties=FB, fontsize=12)
    ax.set_ylim(40, 103)
    ax.set_xlabel("题库检索最高分阈值（余弦 + 主题词加权）", fontproperties=FR, fontsize=12)
    ax.set_title("② 问展作答阈值（n=101：dev 47 选定，holdout 54 检验）", fontproperties=FB, fontsize=14, color=INK)
    ax.legend(prop=FR, frameon=False, loc="lower left", ncol=2)
    ax.grid(alpha=0.25)
    for s_ in ax.spines.values(): s_.set_color(GREY)

fig.text(0.5, 0.012, "数据：thresh-bench.json（" + d["timestamp"] + "）；docs/calib/qa-calib-result-2026-10-08.json。问句均为开发者自拟，非独立评测；未做显著性检验。", ha="center", fontproperties=FR, fontsize=10, color=GREY)
fig.tight_layout(rect=(0, 0.04, 1, 1))
fig.savefig("/workspace/cmit/submit14/figures/thresh.png", facecolor=PAPER)
print("ok")
