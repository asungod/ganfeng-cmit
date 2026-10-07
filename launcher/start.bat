@echo off
chcp 65001 >nul
title 赣风 · 可对话的数字展（离线版）
cd /d "%~dp0"
echo 正在启动赣风离线版……（关闭本窗口即停止）
if exist "server\ganfeng-server-windows-amd64.exe" (
  "server\ganfeng-server-windows-amd64.exe"
  if not errorlevel 1 goto :eof
)
where py >nul 2>nul && ( py -3 "server\serve.py" & goto :eof )
where python >nul 2>nul && ( python "server\serve.py" & goto :eof )
echo 使用 Windows 自带 PowerShell 备用服务器……
powershell -NoProfile -ExecutionPolicy Bypass -File "server\serve.ps1"
pause
