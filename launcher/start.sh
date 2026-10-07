#!/bin/sh
# 赣风离线版 · Linux / macOS 启动脚本
cd "$(dirname "$0")" || exit 1
OS=$(uname -s); ARCH=$(uname -m)
case "$OS-$ARCH" in
  Linux-x86_64) BIN=server/ganfeng-server-linux-amd64 ;;
  Darwin-arm64) BIN=server/ganfeng-server-darwin-arm64 ;;
  Darwin-x86_64) BIN=server/ganfeng-server-darwin-amd64 ;;
  *) BIN="" ;;
esac
if [ -n "$BIN" ] && [ -f "$BIN" ]; then
  chmod +x "$BIN" 2>/dev/null
  # macOS 下载后会带隔离标记，先尝试移除（失败不影响后续备用方案）
  [ "$OS" = Darwin ] && xattr -d com.apple.quarantine "$BIN" 2>/dev/null
  "$BIN" && exit 0
fi
if command -v python3 >/dev/null 2>&1; then
  exec python3 server/serve.py
fi
echo "没有可用的服务器：请安装 Python 3（https://www.python.org/）后重试。"
read -r _
