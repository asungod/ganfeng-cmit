// ganfeng-server：赣风离线版的便携静态服务器（无第三方依赖，仅 Go 标准库）。
// 只监听 127.0.0.1，不对外网开放；不上传、不记录任何数据。
package main

import (
	"fmt"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}

func fail(msg, hint string) {
	fmt.Println("[错误 ERROR]", msg)
	fmt.Println(hint)
	fmt.Print("按回车键退出 / Press Enter to exit…")
	fmt.Scanln()
	os.Exit(1)
}

func main() {
	exe, _ := os.Executable()
	root := filepath.Join(filepath.Dir(filepath.Dir(exe)), "app")
	if len(os.Args) > 1 {
		root = os.Args[1]
	}
	if _, err := os.Stat(filepath.Join(root, "index.html")); err != nil {
		fail("找不到 app/index.html / app/index.html not found: "+root,
			"请先完整解压 zip，保持 server 与 app 在同一层；不要在压缩包里直接双击。\nUnzip the whole archive first and keep server/ and app/ side by side; do not run from inside the zip.")
	}
	// 自检：检索模型与推理引擎是否完整 / self-check model + runtime files
	for _, rel := range []string{"models/Xenova/bge-small-zh-v1.5/config.json", "ort"} {
		if _, err := os.Stat(filepath.Join(root, filepath.FromSlash(rel))); err != nil {
			fmt.Println("[警告 WARNING] 缺少文件 missing:", rel, "—— 问展将退回词面检索 / Ask the Exhibit will fall back to keyword search.")
		}
	}
	types := map[string]string{
		".wasm": "application/wasm", ".mjs": "text/javascript", ".js": "text/javascript",
		".json": "application/json", ".onnx": "application/octet-stream", ".woff2": "font/woff2",
		".svg": "image/svg+xml", ".css": "text/css", ".html": "text/html; charset=utf-8",
		".txt": "text/plain; charset=utf-8",
	}
	for ext, t := range types {
		_ = mime.AddExtensionType(ext, t)
	}
	var ln net.Listener
	var err error
	port := 8787
	for ; port < 8887; port++ {
		ln, err = net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
		if err == nil {
			break
		}
	}
	if ln == nil {
		fail(fmt.Sprint("8787–8886 端口都被占用 / ports 8787–8886 are all in use: ", err),
			"请关闭占用端口的程序或重启电脑后再试。Close the program using these ports (or reboot) and try again.")
	}
	if port != 8787 {
		fmt.Println("[提示 NOTE] 8787 被占用，改用 / port 8787 busy, using", port)
	}
	fs := http.FileServer(http.Dir(root))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 去掉 ?import 等查询串，避免模块加载被当成 404
		r.URL.RawQuery = ""
		if strings.HasSuffix(r.URL.Path, ".html") || r.URL.Path == "/" {
			w.Header().Set("Cache-Control", "no-cache")
		}
		fs.ServeHTTP(w, r)
	})
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	fmt.Println("赣风 · 可对话的数字展（离线版） / Ganfeng: A Conversational Digital Exhibition (offline)")
	fmt.Println("已在本机启动 / Running at:", url)
	fmt.Println("浏览器没有自动打开时，请手动复制上面的地址到 Chrome/Edge。关闭本窗口即停止。")
	fmt.Println("If no browser opens, paste the address above into Chrome/Edge. Close this window to stop.")
	if os.Getenv("GANFENG_NO_BROWSER") == "" {
		openBrowser(url)
	}
	if err := http.Serve(ln, handler); err != nil {
		fmt.Println("服务器停止：", err)
	}
}
