#!/bin/sh
# 构建便携服务器（4 平台）与可选的 Windows 单文件版。需要 Go 1.20+，先 npm run build 生成 dist/。
set -e
cd "$(dirname "$0")"
OUT=${OUT:-../release-bin}; mkdir -p "$OUT"
for t in windows/amd64 darwin/amd64 darwin/arm64 linux/amd64; do
  os=${t%/*}; arch=${t#*/}; ext=""; [ "$os" = windows ] && ext=.exe
  (cd server && CGO_ENABLED=0 GOOS=$os GOARCH=$arch go build -trimpath -ldflags "-s -w" -o "../$OUT/ganfeng-server-$os-$arch$ext" .)
done
rm -rf single/app && cp -r ../dist single/app
(cd single && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o "../$OUT/Ganfeng-single-windows-amd64.exe" .)
(cd single && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o "../$OUT/Ganfeng-single-linux-amd64" .)
rm -rf single/app
ls -l "$OUT"
