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

func main() {
	exe, _ := os.Executable()
	root := filepath.Join(filepath.Dir(filepath.Dir(exe)), "app")
	if len(os.Args) > 1 {
		root = os.Args[1]
	}
	if _, err := os.Stat(filepath.Join(root, "index.html")); err != nil {
		fmt.Println("找不到 app/index.html：", root)
		fmt.Println("请保持解压后的目录结构不变（server 与 app 在同一层）。")
		fmt.Print("按回车键退出……")
		fmt.Scanln()
		os.Exit(1)
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
		fmt.Println("8787–8886 端口都被占用，无法启动：", err)
		fmt.Print("按回车键退出……")
		fmt.Scanln()
		os.Exit(1)
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
	fmt.Println("赣风 · 可对话的数字展（离线版）")
	fmt.Println("已在本机启动：", url)
	fmt.Println("浏览器没有自动打开时，请手动复制上面的地址。关闭本窗口即停止。")
	if os.Getenv("GANFENG_NO_BROWSER") == "" {
		openBrowser(url)
	}
	if err := http.Serve(ln, handler); err != nil {
		fmt.Println("服务器停止：", err)
	}
}
