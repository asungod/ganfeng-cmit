# Static deployment notes (v8). Not deployed.

`npm run build` produces `dist/`. This is a pure static site: no backend, no API keys, and no external model calls. It can be hosted from any subpath.

## What makes it subpath-safe
- `vite.config.ts` sets `base: "./"`. JS, CSS, font and favicon URLs are all relative.
- The model and ONNX runtime locations are computed from `document.baseURI` (`src/app/agent.ts`):
  - `env.localModelPath = new URL("models/", document.baseURI).pathname`
  - `wasm.wasmPaths = new URL("ort/", document.baseURI).href`
  - **Note:** `localModelPath` must be a *path*, not a full `http://…` URL. With a full URL, Transformers.js 4.2 silently skipped the tokenizer files and BGE fell back to keyword mode. We found this in v8 testing and fixed it.
- `qa-calib.json` and `thresh-bench.json` are fetched with relative paths.
- Routing is hash-based (`#/ciyu`). No server rewrite rules are needed, and a 404 page is not needed either.

**Verified 2026-10-16:**
- Served `dist/` at `http://127.0.0.1:18793/ganfeng/` (a subpath) and loaded it in headless Chrome.
- BGE status was `ready`. Model, tokenizer and ONNX were requested under `/ganfeng/…`. The server log showed 0 × 404.

## Sizes (GitHub Pages limit: 100 MB per file; 1 GB site recommended)
dist has 27 files, 114.5 MB in total. Largest files:

| file | bytes |
|---|---|
| ort/ort-wasm-simd-threaded.jsep.wasm | 26,101,073 |
| models/Xenova/bge-small-zh-v1.5/onnx/model_quantized.onnx | 24,010,842 |
| ort/ort-wasm-simd-threaded.asyncify.wasm | 23,567,050 |
| assets/ort-wasm-simd-threaded.asyncify-*.wasm (Vite copy) | 23,567,050 |
| ort/ort-wasm-simd-threaded.wasm | 12,942,611 |

Every file is under 100 MB, so Git LFS is not needed. Plain git pushes will warn about files over 50 MB, and none of these are that large.

## Steps (to be done by the account owner)
1. Run `npm ci && npm run build`.
2. Publish the *contents* of `dist/` to the Pages branch or folder, for example by pushing `dist/` to a `gh-pages` branch or using the official "Deploy static content" GitHub Action.
3. Add an empty `.nojekyll` file at the site root. This is recommended so Jekyll does not process the files. No paths start with `_`, but the file is a cheap safeguard.
4. Make sure the host serves `.wasm` as `application/wasm`. GitHub Pages, Netlify and Cloudflare Pages already do. Python's `http.server` and our Go server also do.
5. The first visit downloads about 40 MB (model plus one wasm). After that, the browser cache is used.

**Not done:** no deployment and no account actions were taken.
