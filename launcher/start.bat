@echo off
chcp 65001 >nul
title 赣风 · 可对话的数字展（离线版） / Ganfeng offline
cd /d "%~dp0"
echo 正在启动赣风离线版……（浏览器会自动打开；关闭本窗口即停止）
echo Starting Ganfeng offline... (a browser opens automatically; close this window to stop)
if not exist "app\index.html" (
  echo [错误 ERROR] 找不到 app\index.html。请先把 zip 完整解压，不要在压缩包里直接双击。
  echo Unzip the whole archive first; do not run start.bat from inside the zip.
  pause
  goto :eof
)
if exist "server\ganfeng-server-windows-amd64.exe" (
  "server\ganfeng-server-windows-amd64.exe"
  if not errorlevel 1 goto :eof
  echo [提示 NOTE] 便携服务器未能启动，尝试备用方案 / portable server failed, trying fallbacks...
)
where py >nul 2>nul && ( py -3 "server\serve.py" & goto :eof )
where python >nul 2>nul && ( python "server\serve.py" & goto :eof )
echo 使用 Windows 自带 PowerShell 备用服务器 / Using built-in PowerShell fallback server...
powershell -NoProfile -ExecutionPolicy Bypass -File "server\serve.ps1"
if errorlevel 1 (
  echo [错误 ERROR] 三种服务器都无法启动。请截图本窗口反馈；或安装 Python 3 后重试。
  echo All three servers failed. Please screenshot this window, or install Python 3 and retry.
)
pause
