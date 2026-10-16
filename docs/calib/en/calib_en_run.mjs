// Runs every EN calibration question through window.__gfAgent.byEnglish in the built app (headless Chrome).
import { createRequire } from "node:module"; import fs from "node:fs";
const require = createRequire(process.env.PUPPETEER_FROM || "/workspace/cmit/e2e/"); const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE || "http://127.0.0.1:18791/";
const S = JSON.parse(fs.readFileSync(new URL("./qa-calib-en-set.json", import.meta.url)));
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, protocolTimeout: 900000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage(); await p.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
const qs = [...S.in_domain.map((x) => ({ split: x[0], q: x[1], gold: x[2], kind: "in" })), ...S.out_of_domain.map((x) => ({ split: x[0], q: x[1], gold: [], kind: "ood" }))];
const rows = await p.evaluate(async (qs) => { const a = window.__gfAgent; a.warmup(); for (let k = 0; k < 400 && a.status !== "ready"; k++) await new Promise((r) => setTimeout(r, 500));
  const o = []; for (const x of qs) { await a.byEnglish(x.q); o.push({ ...x, raw: +a.lastRawBestEn.toFixed(4), doc: a.lastRawDocEn }); } return { status: a.status, rows: o }; }, qs);
fs.writeFileSync(new URL("./qa-calib-en-raw.json", import.meta.url), JSON.stringify({ when: new Date().toISOString(), ...rows }, null, 1));
console.log(rows.status, rows.rows.length); await b.close();
