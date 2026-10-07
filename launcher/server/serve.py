#!/usr/bin/env python3
"""赣风离线版 · 备用静态服务器（Python 3.8+ 标准库）。只监听 127.0.0.1。"""
import functools
import http.server
import os
import socket
import sys
import webbrowser

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".mjs": "text/javascript",
        ".js": "text/javascript",
        ".json": "application/json",
        ".onnx": "application/octet-stream",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
    }

    def log_message(self, *args):
        pass

def free_port(start=8787):
    for p in range(start, start + 100):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    sys.exit("8787–8886 端口都被占用")

if __name__ == "__main__":
    if not os.path.isfile(os.path.join(ROOT, "index.html")):
        sys.exit("找不到 app/index.html，请保持解压后的目录结构不变。")
    port = free_port()
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=ROOT))
    url = f"http://127.0.0.1:{port}/"
    print("赣风 · 可对话的数字展（离线版，Python 备用服务器）")
    print("已在本机启动：", url, "（关闭本窗口即停止）")
    if not os.environ.get("GANFENG_NO_BROWSER"):
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
