// ganfeng-single：单文件版（可选）。把构建好的 app/ 用 go:embed 打进一个可执行文件，
// 双击即在 127.0.0.1 起服务并打开浏览器。仅 Go 标准库；不对外网开放、不记录数据。
// 构建：launcher/build.sh（会先把 dist/ 复制到本目录 app/）。
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

//go:embed all:app
var appFS embed.FS

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

func fail(msg string) {
	fmt.Println("[错误 ERROR]", msg)
	fmt.Print("按回车键退出 / Press Enter to exit…")
	fmt.Scanln()
	os.Exit(1)
}

func main() {
	for ext, t := range map[string]string{".wasm": "application/wasm", ".mjs": "text/javascript", ".js": "text/javascript",
		".json": "application/json", ".onnx": "application/octet-stream", ".woff2": "font/woff2", ".svg": "image/svg+xml",
		".css": "text/css", ".html": "text/html; charset=utf-8"} {
		_ = mime.AddExtensionType(ext, t)
	}
	sub, err := fs.Sub(appFS, "app")
	if err != nil {
		fail(err.Error())
	}
	var ln net.Listener
	port := 8787
	for ; port < 8887; port++ {
		if ln, err = net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port)); err == nil {
			break
		}
	}
	if ln == nil {
		fail("8787–8886 端口都被占用 / ports 8787–8886 all in use")
	}
	files := http.FileServer(http.FS(sub))
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.RawQuery = ""
		if strings.HasSuffix(r.URL.Path, ".html") || r.URL.Path == "/" {
			w.Header().Set("Cache-Control", "no-cache")
		}
		files.ServeHTTP(w, r)
	})
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	fmt.Println("赣风（单文件版） / Ganfeng (single-file):", url)
	fmt.Println("关闭本窗口即停止 / Close this window to stop.")
	if os.Getenv("GANFENG_NO_BROWSER") == "" {
		openBrowser(url)
	}
	if err := http.Serve(ln, h); err != nil {
		fail(err.Error())
	}
}
