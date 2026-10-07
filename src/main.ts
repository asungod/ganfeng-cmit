import "./styles.css";
import "./hall-layout.css";
import { parseRoute } from "./app/router";
import { mountHall } from "./app/hall";
import { mountPorcelain } from "./exhibits/porcelain";
import { mountTengwang } from "./exhibits/tengwang";
import { mountHakka } from "./exhibits/hakka";
import { ambience } from "./render/ambience";
import { setAskForceLex } from "./app/labels";
import { guide } from "./app/guide";
import type { Route } from "./data/types";
import { demoLookupLine, mountEngineHud, pushLookupLog } from "./app/engineHud";

const app = document.getElementById("app") as HTMLDivElement;

let unmount: (() => void) | null = null;
function mount(route: Route): void {
  // Always remount: query flags (?arch/?bge/?build/…) live in the hash and must re-apply.
  if (!/fallback/.test(location.hash)) setAskForceLex(false);
  guide.stop();
  unmount?.();
  app.innerHTML = "";
  // Demo lookup line first so route switch still proves the logger even if a 3D context fails.
  const demo = demoLookupLine(route === "hall" ? "hall" : route);
  if (demo) pushLookupLog(demo);
  try {
    if (route === "hall") unmount = mountHall(app);
    else if (route === "ciyu") unmount = mountPorcelain(app);
    else if (route === "gexu") unmount = mountTengwang(app);
    else unmount = mountHakka(app);
  } catch (err) {
    console.warn("mount failed", route, err);
  }
}

function boot(): void {
  const overlay = document.createElement("div");
  overlay.className = "boot";
  overlay.innerHTML = `
    <p class="boot-k">夜展开启</p>
    <p class="boot-t">赣风</p>
    <p class="boot-s">可对话的数字展</p>
  `;
  document.body.appendChild(overlay);
  window.setTimeout(() => overlay.classList.add("is-out"), 900);
  window.setTimeout(() => overlay.remove(), 1600);
}

function paintGuideBtn(btn: HTMLButtonElement): void {
  btn.textContent = guide.enabled ? "讲解开启" : "讲解关闭";
  btn.classList.toggle("is-on", guide.enabled);
}

function ensureChrome(): void {
  if (document.querySelector(".global-chrome")) return;
  const bar = document.createElement("div");
  bar.className = "global-chrome";
  bar.innerHTML = `
    <div class="chrome-btns">
      <button type="button" class="mute" data-mute>声景关闭</button>
      <button type="button" class="mute" data-guide>讲解关闭</button>
    </div>
  `;
  document.body.appendChild(bar);
  const line = document.createElement("p");
  line.className = "guide-line";
  line.setAttribute("data-guide-line", "");
  document.body.appendChild(line);
  guide.attachLine(line);

  bar.addEventListener("click", async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-mute]")) {
      const muted = await ambience.toggleMute();
      const btn = bar.querySelector("[data-mute]") as HTMLButtonElement;
      btn.textContent = muted ? "声景关闭" : "声景开启";
      btn.classList.toggle("is-on", !muted);
      return;
    }
    if (t.closest("[data-guide]")) {
      guide.toggle();
      paintGuideBtn(bar.querySelector("[data-guide]") as HTMLButtonElement);
    }
  });
}

window.addEventListener("hashchange", () => mount(parseRoute(location.hash)));
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") location.hash = "#/";
  if (e.key === "1") location.hash = "#/ciyu";
  if (e.key === "2") location.hash = "#/gexu";
  if (e.key === "3") location.hash = "#/kejia";
});

boot();
ensureChrome();
mountEngineHud();
mount(parseRoute(location.hash));
