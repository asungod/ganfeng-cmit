import "./fonts.css";
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
import { getLang, onLang, t, toggleLang } from "./app/i18n";

let app = document.getElementById("app") as HTMLDivElement;

let unmount: (() => void) | null = null;
function mount(route: Route): void {
  // Always remount: query flags (?arch/?bge/?build/…) live in the hash and must re-apply.
  if (!/fallback/.test(location.hash)) setAskForceLex(false);
  guide.stop();
  unmount?.();
  // 换一个新的空容器：各展柜挂在 root 上的 click/input 监听随旧节点一起丢弃，
  // 避免切换展柜后旧展柜的处理器继续响应（真机浏览器回归中发现的异常来源）。
  const fresh = app.cloneNode(false) as HTMLDivElement;
  app.replaceWith(fresh);
  app = fresh;
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
    <p class="boot-k">${t("boot.k")}</p>
    <p class="boot-t">赣风</p>
    <p class="boot-s">${t("boot.s")}</p>
  `;
  document.body.appendChild(overlay);
  window.setTimeout(() => overlay.classList.add("is-out"), 900);
  window.setTimeout(() => overlay.remove(), 1600);
}

function paintGuideBtn(btn: HTMLButtonElement): void {
  btn.textContent = guide.enabled ? t("chrome.guideOn") : t("chrome.guideOff");
  btn.classList.toggle("is-on", guide.enabled);
}

function paintChrome(bar: HTMLElement): void {
  const mute = bar.querySelector("[data-mute]") as HTMLButtonElement | null;
  const langBtn = bar.querySelector("[data-lang]") as HTMLButtonElement | null;
  if (mute && !mute.classList.contains("is-on")) mute.textContent = t("chrome.muteOff");
  if (mute?.classList.contains("is-on")) mute.textContent = t("chrome.muteOn");
  const guideBtn = bar.querySelector("[data-guide]") as HTMLButtonElement | null;
  if (guideBtn) paintGuideBtn(guideBtn);
  if (langBtn) {
    langBtn.textContent = t("chrome.lang");
    langBtn.title = t("chrome.langTitle");
  }
}

function ensureChrome(): void {
  if (document.querySelector(".global-chrome")) return;
  document.documentElement.lang = getLang() === "en" ? "en" : "zh-CN";
  const bar = document.createElement("div");
  bar.className = "global-chrome";
  bar.innerHTML = `
    <div class="chrome-btns">
      <button type="button" class="mute" data-lang title="">EN</button>
      <button type="button" class="mute" data-mute>${t("chrome.muteOff")}</button>
      <button type="button" class="mute" data-guide>${t("chrome.guideOff")}</button>
    </div>
  `;
  document.body.appendChild(bar);
  paintChrome(bar);
  const line = document.createElement("p");
  line.className = "guide-line";
  line.setAttribute("data-guide-line", "");
  document.body.appendChild(line);
  guide.attachLine(line);

  bar.addEventListener("click", async (e) => {
    const el = e.target as HTMLElement;
    if (el.closest("[data-lang]")) {
      toggleLang();
      paintChrome(bar);
      // Remount current route so Ask / audit / sys chrome pick up strings.
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      return;
    }
    if (el.closest("[data-mute]")) {
      const muted = await ambience.toggleMute();
      const btn = bar.querySelector("[data-mute]") as HTMLButtonElement;
      btn.textContent = muted ? t("chrome.muteOff") : t("chrome.muteOn");
      btn.classList.toggle("is-on", !muted);
      return;
    }
    if (el.closest("[data-guide]")) {
      guide.toggle();
      paintGuideBtn(bar.querySelector("[data-guide]") as HTMLButtonElement);
    }
  });
  onLang(() => paintChrome(bar));
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
