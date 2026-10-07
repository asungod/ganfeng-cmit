# 赣风离线版 · 最后备用静态服务器（Windows 自带 PowerShell 5.1，无需安装任何软件）。只监听 127.0.0.1。
$ErrorActionPreference = "Stop"
$root = Join-Path (Split-Path -Parent $PSScriptRoot) "app"
if (-not (Test-Path (Join-Path $root "index.html"))) { Write-Host "找不到 app\index.html"; Read-Host "按回车退出"; exit 1 }
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript"; ".mjs"="text/javascript"; ".css"="text/css";
  ".json"="application/json"; ".wasm"="application/wasm"; ".onnx"="application/octet-stream"; ".woff2"="font/woff2";
  ".svg"="image/svg+xml"; ".png"="image/png"; ".txt"="text/plain; charset=utf-8" }
$listener = $null
foreach ($p in 8787..8886) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://127.0.0.1:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch { }
}
if (-not $listener) { Write-Host "端口都被占用"; Read-Host "按回车退出"; exit 1 }
$url = "http://127.0.0.1:$port/"
Write-Host "赣风 · 可对话的数字展（离线版，PowerShell 备用服务器）"
Write-Host "已在本机启动：$url （关闭本窗口即停止）"
Start-Process $url
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/index.html" }
    $file = [IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart("/") -replace "/", "\")))
    if (-not $file.StartsWith([IO.Path]::GetFullPath($root)) -or -not (Test-Path $file -PathType Leaf)) {
      $ctx.Response.StatusCode = 404
    } else {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" })
      $fs = [IO.File]::OpenRead($file)
      $ctx.Response.ContentLength64 = $fs.Length
      $fs.CopyTo($ctx.Response.OutputStream)
      $fs.Close()
    }
  } catch { } finally { $ctx.Response.Close() }
}
