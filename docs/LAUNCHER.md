# One-click launcher (v8)

## Offline pack (`赣风-离线版/`)
- **Windows:** double-click `start.bat`.
  - It first checks that `app\index.html` exists. If not, it prints a bilingual message: "unzip the whole folder first".
  - It then tries, in order: `server\ganfeng-server-windows-amd64.exe` → Python 3 `http.server` → an error message telling you what to install.
- **macOS / Linux:** run `start.command` or `start.sh`.
- **The Go portable server** (`launcher/server/main.go`):
  - Port check: it starts at 8787. If that port is busy, it tries the next ports automatically and prints the port it ended up on.
  - It opens the default browser automatically. Set `GANFENG_NO_BROWSER=1` to disable this.
  - Self-check: if the model or ONNX files are missing, it prints a bilingual error that names the missing file, then exits.
  - All failures print bilingual (中文/English) messages and wait for a key press, so the window doesn't flash closed.

## Optional single file
`launcher/single/` embeds the whole built `app/` with `//go:embed all:app`. `sh launcher/build.sh` produces these files in `release-bin/`:

| file | bytes |
|---|---|
| Ganfeng-single-windows-amd64.exe | 96,786,944 |
| Ganfeng-single-linux-amd64 | 96,616,632 |
| ganfeng-server-{windows,darwin-amd64,darwin-arm64,linux}-* | 5.4 to 5.9 MB each |

**Tested on Linux (2026-10-16):**
- The single binary served index, tokenizer JSON and `.wasm` (`application/wasm`) on 127.0.0.1:8787.
- A second instance found 8787 busy and moved to 8788 automatically.

**Not tested:** the Windows .exe was cross-compiled and not run, because we have no Windows machine. Windows SmartScreen may warn about an unsigned exe. The plain `start.bat` route avoids that warning.

The single exe is about 97 MB, so it is **not** put in the submission zip. It can be shipped separately, or rebuilt with `launcher/build.sh` (Go 1.20+).
