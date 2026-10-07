from PIL import Image, ImageDraw, ImageFont
B = "/workspace/cmit/submit14/ppt-build/bg.jpg"
V = "/workspace/cmit/submit14/video/frames/"
SB = "/workspace/cmit/fonts-src/static/NotoSerifSC-Bold.ttf"
SR = "/workspace/cmit/fonts-src/static/NotoSerifSC-Regular.ttf"
MONO = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
GOLD = (216, 184, 120); PAPER = (239, 230, 210); DIM = (168, 152, 128); DAN = (176, 58, 46)
def f(p, s): return ImageFont.truetype(p, s)
def center(d, y, t, font, fill):
    w = d.textlength(t, font=font); d.text(((1920 - w) / 2, y), t, font=font, fill=fill)

im = Image.open(B).convert("RGB"); d = ImageDraw.Draw(im)
center(d, 300, "赣风", f(SB, 200), GOLD)
center(d, 560, "可对话的数字展", f(SR, 64), PAPER)
center(d, 690, "第十四届全国大学生数字媒体科技作品及创意竞赛 · 指定命题「科技+创意，讲好中国故事」", f(SR, 30), DIM)
center(d, 800, "演示视频 · 粗剪版（无头浏览器逐帧截图合成，可由真机重录替换）", f(SR, 28), DAN)
im.save(V + "00-title.png")

im = Image.open(B).convert("RGB"); d = ImageDraw.Draw(im)
d.text((160, 120), "离线包：解压后双击即可运行", font=f(SB, 54), fill=GOLD)
lines = ["赣风-离线版/", "├─ start.bat          Windows：双击启动", "├─ start.command      macOS：双击启动", "├─ start.sh           Linux", "├─ app/               网页、本地模型、WASM、字体子集", "├─ server/            Go 便携服务器（Win/macOS/Linux）+ Python / PowerShell 备用", "├─ 许可/              代码 MIT、第三方许可、OFL 字体许可", "└─ 运行环境.txt"]
y = 250
for l in lines:
    d.text((180, y), l, font=f(MONO, 34), fill=PAPER); y += 58
d.rectangle([160, 760, 1760, 960], outline=GOLD, width=2)
y = 785
for l in ["$ ./server/ganfeng-server-linux-amd64", "赣风 · 可对话的数字展（离线版）", "已在本机启动： http://127.0.0.1:8789/", "（实际输出；只监听 127.0.0.1，运行时不访问外网）"]:
    d.text((190, y), l, font=f(MONO, 30), fill=DIM if l.startswith("（") else PAPER); y += 42
im.save(V + "12-package.png")

im = Image.open(B).convert("RGB"); d = ImageDraw.Draw(im)
center(d, 300, "赣风 · 可对话的数字展", f(SB, 90), GOLD)
center(d, 460, "指定命题「科技+创意，讲好中国故事」", f(SR, 40), PAPER)
center(d, 580, "开发中使用了 AI 编程助手，详见《人工智能工具使用情况说明》。", f(SR, 34), PAPER)
center(d, 640, "作品运行时不调用任何生成式模型；本视频无配音，仅有中文字幕。", f(SR, 30), DIM)
center(d, 780, "粗剪版：画面为无头浏览器（软件渲染）逐帧截图合成，可由真机录屏替换。", f(SR, 30), DAN)
im.save(V + "13-end.png")
print("ok")
