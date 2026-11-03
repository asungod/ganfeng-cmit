#!/usr/bin/env python3
"""把 submit14 的 Markdown 转成可提交的 DOCX（标题/段落/列表/表格/图片/图注）。

用法:
  python md2docx.py 01-作品说明文档.md
  python md2docx.py 01-作品说明文档.md -o 01-作品说明文档.docx

依赖: markdown, beautifulsoup4, lxml, python-docx, Pillow
"""
from __future__ import annotations

import argparse
import os
import re
import sys

import markdown
from bs4 import BeautifulSoup
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

BODY_FONT_CN = "宋体"
HEAD_FONT_CN = "黑体"
LATIN_FONT = "Times New Roman"
IMAGE_WIDTH = Inches(6.05)


def set_run_font(run, cn=BODY_FONT_CN, latin=LATIN_FONT, size=None, bold=None,
                 italic=None, color=None):
    run.font.name = latin
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:eastAsia"), cn)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color is not None:
        run.font.color.rgb = color


def add_inline(par, node, base_size=10.5, base_bold=False):
    """把 HTML 行内节点写进段落，保留 strong/em/code。"""
    if isinstance(node, str):
        if node.strip():
            r = par.add_run(node)
            set_run_font(r, size=base_size, bold=base_bold)
        return
    name = getattr(node, "name", None)
    if name == "br":
        par.add_run().add_break()
        return
    if name == "strong" or name == "b":
        for c in node.children:
            add_inline(par, c, base_size, True)
        return
    if name == "em" or name == "i":
        for c in node.children:
            if isinstance(c, str):
                r = par.add_run(c)
                set_run_font(r, size=base_size, bold=base_bold, italic=True)
            else:
                add_inline(par, c, base_size, base_bold)
        return
    if name == "code":
        r = par.add_run(node.get_text())
        set_run_font(r, cn="等线", latin="Consolas", size=base_size - 0.5)
        r.font.color.rgb = RGBColor(0x8A, 0x2A, 0x1C)
        return
    if name == "a":
        text = node.get_text()
        r = par.add_run(text)
        set_run_font(r, size=base_size, bold=base_bold)
        return
    for c in node.children:
        add_inline(par, c, base_size, base_bold)


def add_table(doc, table_node):
    rows = []
    for tr in table_node.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        rows.append(cells)
    if not rows:
        return
    width = max(len(r) for r in rows)
    t = doc.add_table(rows=len(rows), cols=width)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        for j in range(width):
            cell = t.cell(i, j)
            cell.text = ""
            par = cell.paragraphs[0]
            txt = row[j] if j < len(row) else ""
            r = par.add_run(txt)
            set_run_font(r, size=9, bold=(i == 0))
            if i == 0:
                shd = OxmlElement("w:shd")
                shd.set(qn("w:fill"), "F3EAD8")
                cell._tc.get_or_add_tcPr().append(shd)
    doc.add_paragraph()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()
    src = os.path.abspath(args.src)
    base = os.path.dirname(src)
    out = args.out or os.path.splitext(src)[0] + ".docx"

    with open(src, encoding="utf-8") as f:
        text = f.read()

    html = markdown.markdown(
        text, extensions=["tables", "fenced_code", "sane_lists", "nl2br"]
    )
    soup = BeautifulSoup(html, "lxml")

    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Cm(2.4)
    sec.bottom_margin = Cm(2.4)
    sec.left_margin = Cm(2.6)
    sec.right_margin = Cm(2.6)

    normal = doc.styles["Normal"]
    normal.font.name = LATIN_FONT
    normal.font.size = Pt(10.5)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), BODY_FONT_CN)
    for name, size in (("Heading 1", 16), ("Heading 2", 13), ("Heading 3", 11.5)):
        st = doc.styles[name]
        st.font.name = LATIN_FONT
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.color.rgb = RGBColor(0x2A, 0x1D, 0x14)
        st._element.rPr.rFonts.set(qn("w:eastAsia"), HEAD_FONT_CN)

    missing = []
    body = soup.body or soup
    for el in body.find_all(recursive=False):
        name = el.name
        if name in ("h1", "h2", "h3", "h4"):
            level = int(name[1])
            p = doc.add_heading("", level=min(level, 3))
            add_inline(p, el, base_size={1: 16, 2: 13, 3: 11.5, 4: 11}[level])
            for r in p.runs:
                set_run_font(r, cn=HEAD_FONT_CN, size={1: 16, 2: 13, 3: 11.5, 4: 11}[level], bold=True,
                             color=RGBColor(0x2A, 0x1D, 0x14))
        elif name == "p":
            img = el.find("img")
            if img is not None:
                src_path = img.get("src", "")
                full = os.path.normpath(os.path.join(base, src_path))
                if os.path.exists(full):
                    par = doc.add_paragraph()
                    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    par.add_run().add_picture(full, width=IMAGE_WIDTH)
                else:
                    par = doc.add_paragraph()
                    r = par.add_run(f"[缺图：{src_path}]")
                    set_run_font(r, size=9, color=RGBColor(0xB0, 0x28, 0x1C))
                    missing.append(src_path)
                continue
            # 图注：整段只有 em，且以“图”开头
            em = el.find("em")
            if em is not None and len(el.get_text(strip=True)) == len(em.get_text(strip=True)) and el.get_text(strip=True).startswith("图"):
                par = doc.add_paragraph()
                par.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = par.add_run(el.get_text(" ", strip=True))
                set_run_font(r, size=9, italic=False, color=RGBColor(0x55, 0x45, 0x35))
                continue
            par = doc.add_paragraph()
            par.paragraph_format.space_after = Pt(4)
            par.paragraph_format.line_spacing = 1.35
            add_inline(par, el)
        elif name in ("ul", "ol"):
            style = "List Bullet" if name == "ul" else "List Number"
            for li in el.find_all("li", recursive=False):
                par = doc.add_paragraph(style=style)
                par.paragraph_format.line_spacing = 1.3
                add_inline(par, li)
        elif name == "table":
            add_table(doc, el)
        elif name == "blockquote":
            for p in el.find_all("p"):
                par = doc.add_paragraph()
                par.paragraph_format.left_indent = Cm(0.8)
                add_inline(par, p)
                for r in par.runs:
                    r.font.color.rgb = RGBColor(0x55, 0x45, 0x35)
        elif name == "pre":
            par = doc.add_paragraph()
            r = par.add_run(el.get_text())
            set_run_font(r, cn="等线", latin="Consolas", size=8.5)
        elif name == "hr":
            doc.add_paragraph("―" * 20).alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.save(out)
    print(f"OK {out}")
    if missing:
        print("MISSING IMAGES:", ", ".join(missing), file=sys.stderr)


if __name__ == "__main__":
    main()
