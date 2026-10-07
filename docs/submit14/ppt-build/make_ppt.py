import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

B = "/workspace/cmit/submit14/ppt-build/"
S = "/workspace/cmit/submit14/screenshots/"
F = "/workspace/cmit/submit14/figures/"
OUT = "/workspace/cmit/submit14/06-答辩PPT.pptx"
TITLE_FONT = "楷体"; BODY_FONT = "微软雅黑"
GOLD = RGBColor(0xD8, 0xB8, 0x78); PAPER = RGBColor(0xEF, 0xE6, 0xD2); DIM = RGBColor(0xA8, 0x98, 0x80)
DAN = RGBColor(0xB0, 0x3A, 0x2E); CEL = RGBColor(0x7F, 0xA6, 0x96); INK = RGBColor(0x15, 0x11, 0x0D)

prs = Presentation()
prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
TOTAL = 14
zip_mb = os.path.getsize("/workspace/cmit/release/赣风-离线版.zip") / 1e6

def font(run, size, color=PAPER, bold=False, face=BODY_FONT):
    run.font.size = Pt(size); run.font.color.rgb = color; run.font.bold = bold
    run.font.name = face
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {}); rPr.append(el)
        el.set("typeface", face)

def text(slide, x, y, w, h, paras, size=18, color=PAPER, face=BODY_FONT, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.15):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05); tf.margin_top = tf.margin_bottom = Inches(0.03)
    for i, p in enumerate(paras):
        if isinstance(p, str): p = {"t": p}
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = p.get("align", align); para.line_spacing = spacing
        para.space_after = Pt(p.get("after", 6))
        segs = p["t"] if isinstance(p["t"], list) else [(p["t"], {})]
        for seg, st in segs:
            r = para.add_run(); r.text = seg
            font(r, st.get("size", p.get("size", size)), st.get("color", p.get("color", color)), st.get("bold", p.get("bold", False)), st.get("face", p.get("face", face)))
    return tb

def base(n, title, tag=None, sub=None):
    s = prs.slides.add_slide(BLANK)
    s.shapes.add_picture(B + "bg.jpg", 0, 0, prs.slide_width, prs.slide_height)
    if title:
        text(s, 0.75, 0.42, 10.5, 0.8, [{"t": title, "size": 32, "color": GOLD, "face": TITLE_FONT, "bold": True}])
        ln = s.shapes.add_connector(1, Inches(0.8), Inches(1.22), Inches(4.2), Inches(1.22))
        ln.line.color.rgb = DAN; ln.line.width = Pt(2.2)
    if sub:
        text(s, 0.78, 1.3, 11.5, 0.5, [{"t": sub, "size": 15, "color": DIM}])
    # seal
    seal = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(12.2), Inches(0.42), Inches(0.62), Inches(0.62))
    seal.fill.solid(); seal.fill.fore_color.rgb = DAN; seal.line.fill.background()
    seal.adjustments[0] = 0.12
    tf = seal.text_frame; tf.margin_left = tf.margin_right = 0
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER; r = p.add_run(); r.text = "赣风"; font(r, 13, PAPER, True, TITLE_FONT)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    foot = f"{n} / {TOTAL}" + (f"　·　对应评分项：{tag}" if tag else "")
    text(s, 7.2, 6.93, 5.6, 0.35, [{"t": foot, "size": 10.5, "color": DIM, "align": PP_ALIGN.RIGHT}])
    return s

def pic(s, path, x, y, w=None, h=None, border=True):
    p = s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w) if w else None, Inches(h) if h else None)
    if border:
        p.line.color.rgb = RGBColor(0xB8, 0x91, 0x4A); p.line.width = Pt(1)
    return p

def card(s, x, y, w, h, head, body, color=GOLD, size=16):
    box = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    box.fill.solid(); box.fill.fore_color.rgb = RGBColor(0x22, 0x1B, 0x14); box.line.color.rgb = color; box.line.width = Pt(1.2)
    text(s, x + 0.2, y + 0.15, w - 0.4, 0.6, [{"t": head, "size": 21, "color": color, "face": TITLE_FONT, "bold": True}])
    text(s, x + 0.2, y + 0.8, w - 0.4, h - 0.9, body, size=size)

def table(s, x, y, w, rows, colw, size=13, rowh=0.42):
    t = s.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(rowh * len(rows))).table
    for j, cw in enumerate(colw): t.columns[j].width = Inches(cw)
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            c = t.cell(i, j); c.text = ""
            c.fill.solid(); c.fill.fore_color.rgb = RGBColor(0x3A, 0x2C, 0x1C) if i == 0 else (RGBColor(0x1E, 0x18, 0x12) if i % 2 else RGBColor(0x26, 0x1E, 0x16))
            p = c.text_frame.paragraphs[0]; r = p.add_run(); r.text = val
            font(r, size, GOLD if i == 0 else PAPER, i == 0)
            c.margin_left = c.margin_right = Inches(0.08)
    return t

# 1 封面
s = base(1, None)
pic(s, B + "crop-gexu.png", 6.0, 1.15, w=6.75)
text(s, 0.9, 1.3, 5.2, 1.6, [{"t": "赣风", "size": 80, "color": GOLD, "face": TITLE_FONT, "bold": True}])
text(s, 0.95, 2.85, 5.2, 0.6, [{"t": "可对话的数字展", "size": 28, "color": PAPER, "face": TITLE_FONT}])
text(s, 0.95, 3.7, 5.0, 1.4, [
    {"t": "第十四届全国大学生数字媒体科技作品及创意竞赛", "size": 15, "color": DIM},
    {"t": "指定命题 · 科技+创意，讲好中国故事", "size": 15, "color": DIM},
])
text(s, 0.95, 5.2, 5.0, 1.4, [
    {"t": "团队成员：【待填】", "size": 16},
    {"t": "指导教师：【待填】　　学校：【待填】", "size": 16},
])
text(s, 6.0, 5.2, 6.75, 0.5, [{"t": "截图：阁序 · 滕王阁夜景（程序生成，非照片）", "size": 11, "color": DIM, "align": PP_ALIGN.RIGHT}])

# 2 问题
s = base(2, "问题：文化内容里的「穿越」", "选题价值与导向")
text(s, 0.8, 1.6, 5.3, 4.8, [
    {"t": "宋代的梅瓶，配上清代才有的粉彩。", "size": 22, "color": GOLD, "face": TITLE_FONT, "after": 14},
    "数字展、短视频、AI 生成图里，这类年代错配很常见。",
    "观众看不出错在哪；作者被问「凭什么这样讲」，也常常拿不出依据。",
    {"t": "我们想做的，是一个讲错了会被自己拦下来的展。", "color": PAPER, "bold": True, "after": 0},
], size=18)
pic(s, B + "crop-conflict.png", 6.3, 1.55, w=6.3)
text(s, 6.3, 6.25, 6.3, 0.4, [{"t": "宋 × 粉彩 → 判「冲」→ 自动改锁为影青，并说明理由", "size": 12, "color": DIM}])

# 3 我们的回答
s = base(3, "我们的回答：把文化知识写成可审计的约束表", "选题 / 创新性")
text(s, 0.8, 1.55, 11.8, 0.8, [{"t": "每一个「为什么这样讲」，都能展开出处、当场试一遍。", "size": 20}])
card(s, 0.8, 2.5, 3.75, 3.7, "准确", ["约束表的每一格都是 合 / 勉 / 冲。", "史实类规则绑定博物馆、非遗网、政府网页的原文摘录。"])
card(s, 4.8, 2.5, 3.75, 3.7, "可追溯", ["冲突时不硬拼，自动改锁到可行的格子。", "回放「冲格 → 规则条目 → 改锁格」，每次查表写入引擎日志。"], color=CEL)
card(s, 8.8, 2.5, 3.75, 3.7, "可验证", ["审计面板列出命中、边界、例外三类案例。", "点「试一下」用默认表现场复现，实测结果与依据逐条对照。"], color=DAN)

# 4 三条线
s = base(4, "三条展线，三类规则", "创新性与原创贡献")
table(s, 0.8, 1.7, 11.7, [
    ["展线", "约束表", "规则性质", "依据与标注"],
    ["瓷语 · 景德镇", "朝代 × 釉色（器型另列）", "史实约束", "故宫博物院词条、非遗网等原文摘录；合/勉/冲 的划分标明是本展规则"],
    ["阁序 · 滕王阁", "情境 × 意象", "原文锚定 + 设计约定", "王勃《滕王阁序》原句；「一个情境只锁一个地名锚点」标为设计约定"],
    ["客家 · 赣南围屋", "房间 × 时辰", "叙事约定（明示非史料）", "空间要素有龙南市政府、专业文章出处；时辰搭配每格写明「非史料」"],
], [2.2, 2.6, 2.4, 4.5], size=14, rowh=0.9)
text(s, 0.8, 5.6, 11.7, 0.9, [{"t": "三条线共用同一个 lookup / fallbackRow：换一套内容，就是一个新的可审计展。", "size": 18, "color": GOLD}])

# 5 参观顺序
s = base(5, "参观顺序：赣鄱千年三站", "叙事 / 选题")
stops = [("唐", "阁序", "王勃《滕王阁序》\n落霞、孤鹜、秋水、长天"), ("宋 · 元 · 明 · 清", "瓷语", "景德镇釉色与器型\n影青、青花、祭红、五彩、粉彩"), ("赣南", "客家", "客家围屋\n营造技艺 2014 年列入国家级非遗")]
ln = s.shapes.add_connector(1, Inches(1.4), Inches(3.35), Inches(12.0), Inches(3.35)); ln.line.color.rgb = RGBColor(0xB8, 0x91, 0x4A); ln.line.width = Pt(2)
for i, (era, name, desc) in enumerate(stops):
    x = 1.0 + i * 4.0
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 1.55), Inches(3.17), Inches(0.36), Inches(0.36))
    dot.fill.solid(); dot.fill.fore_color.rgb = DAN; dot.line.color.rgb = GOLD
    text(s, x, 2.2, 3.5, 0.8, [{"t": era, "size": 18, "color": DIM, "align": PP_ALIGN.CENTER}])
    text(s, x, 3.8, 3.5, 0.8, [{"t": name, "size": 30, "color": GOLD, "face": TITLE_FONT, "bold": True, "align": PP_ALIGN.CENTER}])
    text(s, x, 4.7, 3.5, 1.2, [{"t": l, "size": 15, "align": PP_ALIGN.CENTER, "after": 2} for l in desc.split("\n")])
text(s, 0.8, 6.15, 11.7, 0.5, [{"t": "门厅里三扇门可以任意进入；建议顺序按朝代排列。", "size": 14, "color": DIM}])

# 6 演示① 冲突与改锁
s = base(6, "演示①：冲突与改锁", "技术实现与规范")
pic(s, S + "03-冲突改锁.png", 0.8, 1.5, w=5.85)
pic(s, B + "crop-gexu-conflict.png", 6.85, 1.5, w=5.7)
text(s, 0.8, 4.92, 5.85, 1.6, [
    {"t": "瓷语：宋 × 粉彩", "size": 17, "color": GOLD, "bold": True},
    "查表结果为「冲」，自动改锁为影青；矩阵上画出「冲格 → 改锁格」箭头，审计面板自动展开。",
], size=14)
text(s, 6.85, 4.92, 5.7, 1.6, [
    {"t": "阁序：渔舟唱晚 × 雁阵", "size": 17, "color": GOLD, "bold": True},
    "同一联的两个地名锚点（彭蠡、衡阳）不放进同一情境，改锁为渔舟，镜头随之移动。",
], size=14)

# 7 演示② 展示→验证
s = base(7, "演示②：展示 → 验证", "创新性 / 完成度与可验证性")
pic(s, B + "crop-audit.png", 0.8, 1.45, h=5.3)
text(s, 3.0, 1.55, 9.6, 5.2, [
    {"t": "审计面板里的一条规则，包含四样东西：", "size": 19, "color": GOLD, "after": 12},
    "① 依据状态：已核 / 本展说明 / 待核，盖章显示。",
    "② 规则依据：只显示已核出处的原文摘录，附网址和访问日期。",
    "③ 同类案例：命中、边界、例外各一。例如「明末与康熙晚期之间仍判冲」。",
    "④ 试一下：用出厂约束表现场复现，显示「实测 冲 ✓ 与依据一致」。如果访客改过表格，会显示「✗ 与依据不一致」。",
    {"t": "headless Chrome 端到端回归：三条线 24 个「试一下」全部 ✓，无页面异常。", "size": 15, "color": CEL, "after": 0},
], size=17)

# 8 内容准确性
s = base(8, "内容准确性：23 条出处，全部打开原页逐字核对", "完成度与可验证性")
for i, (num, lab, col) in enumerate([("23", "登记出处", GOLD), ("23", "已打开原页核对", CEL), ("2", "其中二手资料", DAN)]):
    x = 0.8 + i * 2.25
    text(s, x, 1.6, 2.1, 1.0, [{"t": num, "size": 54, "color": col, "face": TITLE_FONT, "bold": True, "align": PP_ALIGN.CENTER}])
    text(s, x, 2.75, 2.1, 0.5, [{"t": lab, "size": 14, "color": DIM, "align": PP_ALIGN.CENTER}])
text(s, 0.8, 3.5, 6.6, 3.2, [
    {"t": "来源：故宫博物院、上海博物馆、常州市武进区博物馆、中国非物质文化遗产网、维基文库、生态中国网、《光明日报》、龙南市人民政府、文化和旅游部；二手资料为维基百科「滕王阁」条目和万幼楠《客家民居与赣南围屋》。", "size": 14},
    {"t": "滕王阁年份目前只能引维基百科：南昌市政府页面连接超时，已在核对表中注明。", "size": 14, "color": DIM},
], size=14)
text(s, 7.7, 1.6, 4.9, 5.0, [
    {"t": "核对中纠正的错误（举例）", "size": 18, "color": GOLD, "bold": True, "after": 10},
    "「灯草白」改为「灯草口」，成因改为釉层高温垂流变薄。",
    "元 × 祭红：冲 → 勉（元代已能烧铜红，只是呈色偏暗）。",
    "「二元配方」原先误挂在《天工开物》名下，改引非遗网。",
    "7 条无出处的客家方言词条全部删除，换成有原文的空间术语（三重围门、竖向天井、外走马……）。",
    "禾坪用途按原文改为「洗涤、凉晒」。",
], size=14)

# 9 技术架构
s = base(9, "技术架构", "技术实现与规范")
pic(s, F + "arch.png", 1.4, 1.45, w=10.5)

# 10 问展
s = base(10, "问展：只检索，不生成", "技术实现与规范")
pic(s, F + "thresh.png", 0.8, 1.45, w=11.7)
text(s, 0.8, 6.15, 11.7, 0.8, [
    {"t": [("两个阈值：", {"bold": True, "color": GOLD}), ("槽位 0.40（n=58，2026-09-04 实测）；作答 0.55（n=101，dev 47 问选定，holdout 54 问检验：召回 88.2%、精确 78.9%）。同主题难例（如「滕王阁门票多少钱」）10 条中误答 4 条，作为已知局限写进文档。", {})], "size": 13},
], size=13)

# 11 完成度
s = base(11, "完成度：离线一键运行，真机回归", "完成度与可验证性")
text(s, 0.8, 1.6, 6.0, 5.0, [
    {"t": "离线包", "size": 20, "color": GOLD, "face": TITLE_FONT, "bold": True},
    f"压缩包约 {zip_mb:.0f} MB；双击 start.bat / start.command / start.sh 即可运行。",
    "启动器是 Go 便携服务器（Windows、macOS、Linux），另带 Python / PowerShell 备用；只监听 127.0.0.1。",
    "模型、WASM、字体都在本地；字体是 OFL 子集（约 2.0 MB）。运行时不访问外网。",
], size=15)
text(s, 7.0, 1.6, 5.6, 5.0, [
    {"t": "真机浏览器回归修掉的 bug", "size": 20, "color": GOLD, "face": TITLE_FONT, "bold": True},
    "切换展柜后，旧展柜的点击监听还在，会对新展柜报错 → 每次挂载换新容器。",
    "客家平面图点房间没反应（时辰属性挂在外层，点击被拦截）→ 选择器限定为按钮。",
    "瓷语釉色 / 朝代按钮不同步审计面板 → 已修。",
    "题库外问题被误答 → 作答阈值重新标定为 0.55。",
], size=15)

# 12 AI
s = base(12, "AI 使用与人机协同", "原创贡献 / 展示与答辩")
table(s, 0.8, 1.6, 11.7, [
    ["工具", "用在哪里", "是否进入作品"],
    ["AI 编程与写作助手【填写实际产品名】", "代码、界面文案初稿、资料检索摘录、文档初稿", "是：大部分代码由它按作者要求生成"],
    ["通义千问（访客模式）", "扮演评委提批评意见", "否：只提供意见"],
    ["BGE-small-zh-v1.5（非生成式）", "运行时句向量检索与意图匹配", "是：只算向量，不生成文字或图像"],
], [3.9, 4.6, 3.2], size=13, rowh=0.62)
text(s, 0.8, 4.4, 11.7, 2.2, [
    {"t": "我负责的部分：【待填，由本人填写，必须属实】", "size": 18, "color": DAN, "bold": True},
    {"t": "运行时不调用任何生成式模型。展内事实性陈述都绑定出处，或标明「本展说明 / 待核」。", "size": 15},
], size=15)

# 13 应用
s = base(13, "应用场景与价值", "应用与传播价值")
card(s, 0.8, 1.7, 3.75, 4.3, "展厅导览屏", ["离线运行，不依赖网络和账号。", "观众提问只在馆方题库里检索，答不了就明说。"])
card(s, 4.8, 1.7, 3.75, 4.3, "课堂", ["用「试一下」讲证据意识：结论从哪来，边界在哪里。"], color=CEL)
card(s, 8.8, 1.7, 3.75, 4.3, "场馆自维护", ["约束表和出处表是普通数据文件。", "场馆可以按自己的研究成果改格、补出处，换一套内容就是新展。"], color=DAN)

# 14 不足
s = base(14, "不足与下一步", "诚实 / 可迭代")
text(s, 0.8, 1.6, 5.8, 5.0, [
    {"t": "不足", "size": 22, "color": GOLD, "face": TITLE_FONT, "bold": True},
    "还没有做观众测试；标定问句都是开发者自拟的。",
    "同主题、问法不同的题库外问题会被答偏。",
    "滕王阁年份依赖维基百科；客家术语依据的是专业署名文章。",
    "画面是程序化示意，不是测绘复原。",
], size=18)
text(s, 7.0, 1.6, 5.6, 5.0, [
    {"t": "下一步", "size": 22, "color": GOLD, "face": TITLE_FONT, "bold": True},
    "请教博物馆和地方专业人士，补一手出处。",
    "邀请真实观众提问，扩充独立评测集。",
    "给题库外难例加「答非所问」检测（例如问价格、门票时拒答）。",
    "扩展到更多赣鄱文化主题。",
], size=18)

prs.save(OUT)
print("saved", OUT)
