#!/bin/sh
# 组装离线一键包：dist → release/赣风-离线版/app，并附启动器、便携服务器、许可文本。
# 用法：npm run build && sh scripts/package.sh [输出目录]
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-"$ROOT/release"}
PKG="$OUT/赣风-离线版"
[ -f "$ROOT/dist/index.html" ] || { echo "先运行 npm run build"; exit 1; }
rm -rf "$PKG"; mkdir -p "$PKG/server" "$PKG/许可"
cp -R "$ROOT/dist" "$PKG/app"
# dist 里不允许有过程截图
if find "$PKG/app" -iname "*.png" -path "*shots*" | grep -q .; then echo "dist 中发现过程截图，停止"; exit 1; fi
cp "$ROOT/launcher/start.bat" "$ROOT/launcher/start.sh" "$ROOT/launcher/start.command" "$PKG/"
cp "$ROOT/launcher/server/serve.py" "$ROOT/launcher/server/serve.ps1" "$PKG/server/"
cp "$ROOT/运行环境.md" "$PKG/运行环境.txt"
cp "$ROOT/LICENSE" "$PKG/许可/LICENSE-赣风代码-MIT.txt"
cp "$ROOT/THIRD_PARTY.md" "$PKG/许可/第三方资源与许可.txt"
cp "$ROOT"/public/fonts/OFL-*.txt "$PKG/许可/"
if command -v go >/dev/null 2>&1; then
  (cd "$ROOT/launcher/server" && for t in windows/amd64 darwin/arm64 darwin/amd64 linux/amd64; do
    os=${t%/*}; ar=${t#*/}; ext=""; [ "$os" = windows ] && ext=".exe"
    CGO_ENABLED=0 GOOS=$os GOARCH=$ar go build -trimpath -ldflags "-s -w" -o "$PKG/server/ganfeng-server-$os-$ar$ext" .
  done)
else
  echo "未找到 Go：包内只有 Python / PowerShell 备用服务器"
fi
chmod +x "$PKG/start.sh" "$PKG/start.command" "$PKG"/server/ganfeng-server-* 2>/dev/null || true
(cd "$OUT" && rm -f 赣风-离线版.zip && python3 -c "import shutil; shutil.make_archive('赣风-离线版', 'zip', '.', '赣风-离线版')")
du -sh "$PKG" "$OUT/赣风-离线版.zip"
