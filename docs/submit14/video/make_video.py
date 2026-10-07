import subprocess, os, json
V = "/workspace/cmit/submit14/video/"
FR = V + "frames/"; SS = "/workspace/cmit/submit14/screenshots/"
TMP = "/tmp/gfvid/"; os.makedirs(TMP, exist_ok=True)
FPS = 30; XF = 0.6
# (image, seconds, (zoom_end, cx, cy), subtitle)
SEG = [
 (FR+"00-title.png", 8, (1.0, 960, 540), "赣风，一个可以对话、也可以核验的江西数字展。"),
 (SS+"01-门厅.png", 14, (1.45, 960, 650), "三条线：瓷语、阁序、客家。我们想讲好中国故事，也想让每一句讲得有依据。"),
 (FR+"03-hall-guide.png", 14, (1.6, 960, 960), "建议的顺序：先读唐代的《滕王阁序》，再看景德镇瓷器的年代，最后走进赣南客家围屋。"),
 (FR+"04-ciyu-song.png", 14, (1.25, 700, 520), "宋代的梅瓶，能不能配粉彩？"),
 (SS+"03-冲突改锁.png", 14, (1.3, 760, 300), "点下粉彩，系统查表判定为「冲」。"),
 (SS+"03-冲突改锁.png", 20, (2.6, 230, 700), "它自动改锁为宋代影青，并在矩阵上回放「冲格 → 规则条目 → 改锁格」。"),
 (SS+"04-审计验证.png", 26, (2.4, 300, 420), "为什么？审计面板给出依据：故宫博物院词条，「粉彩创烧于康熙晚期」，附网址和访问日期。"),
 (FR+"07-ciyu-try-yuan-jihong.png", 24, (2.4, 300, 560), "每条规则都能现场验证。元代景德镇已能烧铜红，但呈色偏暗，所以判为「勉」——这是核对后改正的一条。"),
 (SS+"05-阁序.png", 14, (1.3, 900, 450), "阁序把王勃的原句钉在画面上。"),
 (SS+"06-阁序冲突改锁.png", 16, (1.35, 1100, 300), "渔舟和雁阵出自同一联，却指向彭蠡和衡阳两地；本展规定一个情境只锁一个地名，于是改锁。"),
 (FR+"09-gexu-status.png", 18, (2.2, 1650, 560), "这是设计约定，不是史实断言。界面把「已核」「设计约定」「待核」分开标出。"),
 (FR+"10a-kejia-menlou.png", 12, (1.3, 960, 400), "客家围屋可以沿动线走进去。"),
 (FR+"10b-kejia-heping.png", 14, (1.3, 1100, 400), "禾坪夜里不凉晒，判「冲」，改锁为黄昏。时辰搭配是本展的叙事约定。"),
 (SS+"07-客家祖堂.png", 14, (1.35, 1000, 420), "空间依据来自龙南市政府等出处：祠堂在中轴，四角有炮楼。"),
 (FR+"11-ask-pengli.png", 14, (1.5, 960, 820), "问展在浏览器里用小模型检索题库，答案附出处卡。"),
 (SS+"08-问展作答.png", 10, (1.5, 960, 840), "换个说法问，也能检索到对应条目。"),
 (SS+"09-题库外拒答.png", 12, (1.5, 960, 840), "题库外的问题直接拒答：不联网，也不接大模型。"),
 (SS+"10-架构与阈值.png", 14, (1.6, 1000, 800), "作答阈值 0.55 用 101 条自拟问句标定，已知局限也写在文档里。"),
 (FR+"12-package.png", 18, (1.0, 960, 540), "整个作品可以离线运行，解压后双击即可打开。"),
 (FR+"13-end.png", 10, (1.0, 960, 540), "赣风 · 可对话的数字展"),
]
def run(cmd):
    print(" ".join(cmd)[:160], flush=True)
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
clips = []
for i, (img, dur, (z, cx, cy), _) in enumerate(SEG):
    out = f"{TMP}seg{i:02d}.mp4"; clips.append(out)
    if os.path.exists(out): continue
    n = int(dur * FPS)
    # upscale x2 to reduce zoompan jitter; coordinates in upscaled space
    zexpr = f"1+({z}-1)*on/{n}"
    xexpr = f"max(0,min(iw-iw/zoom,(({cx}*2-960*2)*({zexpr}-1)/max({z}-1,0.0001)+960*2)-iw/zoom/2))" if z > 1 else "0"
    yexpr = f"max(0,min(ih-ih/zoom,(({cy}*2-540*2)*({zexpr}-1)/max({z}-1,0.0001)+540*2)-ih/zoom/2))" if z > 1 else "0"
    vf = f"scale=3840:2160,zoompan=z='{zexpr}':x='{xexpr}':y='{yexpr}':d={n}:s=1920x1080:fps={FPS},format=yuv420p"
    run(["ffmpeg", "-y", "-loop", "1", "-i", img, "-vf", vf, "-frames:v", str(n), "-c:v", "libx264", "-preset", "medium", "-crf", "20", out])
# subtitles (ASS) with offsets accounting crossfades
def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"
ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "", "[V4+ Styles]",
 "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
 "Style: Sub,Noto Sans CJK SC,46,&H00F2EBDD,&H000000FF,&H00100C08,&H96000000,0,0,0,0,100,100,1,0,3,2,0,2,120,120,46,1",
 "Style: Tag,Noto Sans CJK SC,26,&H0078B8D8,&H000000FF,&H00100C08,&H96000000,0,0,0,0,100,100,0,0,3,1,0,7,60,60,40,1",
 "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
t = 0.0; total = sum(s[1] for s in SEG) - XF * (len(SEG) - 1)
for i, (_, dur, _, sub) in enumerate(SEG):
    st = t + (XF if i else 0.0); en = t + dur - (XF if i < len(SEG) - 1 else 0) - 0.05
    ass.append(f"Dialogue: 0,{ts(st)},{ts(en)},Sub,,0,0,0,,{sub}")
    t += dur - XF
ass.append(f"Dialogue: 1,{ts(0)},{ts(total)},Tag,,0,0,0,,粗剪版 · 无头浏览器逐帧截图合成 · 可由真机重录替换")
open(TMP + "subs.ass", "w", encoding="utf-8").write("\n".join(ass) + "\n")
srt = []
t = 0.0
def st2(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = int(x % 60); ms = int(round((x - int(x)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
for i, (_, dur, _, sub) in enumerate(SEG):
    st = t + (XF if i else 0.0); en = t + dur - (XF if i < len(SEG) - 1 else 0) - 0.05
    srt += [str(i + 1), f"{st2(st)} --> {st2(en)}", sub, ""]
    t += dur - XF
open(V + "赣风-演示视频-粗剪版.srt", "w", encoding="utf-8").write("\n".join(srt))
# xfade chain + burn subs
inputs = []; [inputs.extend(["-i", c]) for c in clips]
fc = []; prev = "[0:v]"; off = 0.0
for i in range(1, len(clips)):
    off += SEG[i - 1][1] - XF
    lab = f"[v{i}]"
    fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{lab}")
    prev = lab
fc.append(f"{prev}subtitles={TMP}subs.ass,format=yuv420p[out]")
run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[out]", "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-movflags", "+faststart", V + "赣风-演示视频-粗剪版.mp4"])
print("TOTAL", total)
