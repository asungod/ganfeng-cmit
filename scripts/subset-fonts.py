#!/usr/bin/env python3
"""把 OFL 字体裁剪成本展实际用到的字（+ 常用字），输出 woff2 到 public/fonts/。

用法：python3 scripts/subset-fonts.py <原始字体目录>
原始字体（OFL 1.1）来自 https://github.com/google/fonts/tree/main/ofl ：
  mashanzheng/MaShanZheng-Regular.ttf
  notoserifsc/NotoSerifSC[wght].ttf
  notosanssc/NotoSansSC[wght].ttf
需要：fonttools、brotli。
"""
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_DIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = ROOT / "public" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)


def project_chars() -> set[str]:
    chars: set[str] = set()
    files = list((ROOT / "src").rglob("*")) + [ROOT / "index.html", ROOT / "public" / "thresh-bench.json"]
    for f in files:
        if f.is_file() and f.suffix in {".ts", ".css", ".html", ".json"}:
            chars |= set(f.read_text(encoding="utf-8"))
    return chars


def gb2312_level1() -> set[str]:
    out = set()
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return out


BASE = set(chr(c) for c in range(0x20, 0x7F)) | set("，。、；：？！“”‘’（）《》〈〉【】「」『』—…·～　×→←↑↓✓✗①②③④⑤")
used = project_chars() | BASE
common = used | gb2312_level1()


def build(src: str, out: str, chars: set[str], wght: tuple[int, int] | None) -> None:
    font = TTFont(SRC_DIR / src)
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text="".join(sorted(c for c in chars if c.isprintable())))
    sub.subset(font)
    if wght and "fvar" in font:
        # 先裁字再限制字重轴（反过来会触发 fontTools 的懒加载 KeyError）
        font = instancer.instantiateVariableFont(font, {"wght": wght})
    font.flavor = "woff2"
    font.save(OUT / out)
    print(f"{out}: {(OUT / out).stat().st_size / 1024:.0f} KB")


print(f"project chars: {len(used)}, with GB2312-1: {len(common)}")
build("mashanzheng-MaShanZheng-Regular.ttf", "MaShanZheng-subset.woff2", used, None)
build("notoserifsc-NotoSerifSC[wght].ttf", "NotoSerifSC-subset.woff2", used, (400, 700))
build("notosanssc-NotoSansSC[wght].ttf", "NotoSansSC-subset.woff2", common, (300, 600))
