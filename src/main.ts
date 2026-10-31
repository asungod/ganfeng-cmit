import "./fonts.css";
import "./styles.css";
import "./hall-layout.css";
import "./guofeng-ui.css";
import { parseRoute } from "./app/router";
import { mountHall } from "./app/hall";
import { mountPorcelain } from "./exhibits/porcelain";
import { mountTengwang } from "./exhibits/tengwang";
import { mountHakka } from "./exhibits/hakka";
import { mountWanshou } from "./exhibits/wanshou";
import { ambience } from "./render/ambience";
import { setAskForceLex } from "./app/labels";
import { guide } from "./app/guide";
import type { Route } from "./data/types";
import { demoLookupLine, mountEngineHud, pushLookupLog } from "./app/engineHud";
import { getLang, onLang, t, toggleLang } from "./app/i18n";
import { startEnContent } from "./i18n/domTranslate";

let app = document.getElementById("app") as HTMLDivElement;

let unmount: (() => void) | null = null;
function mount(route: Route): void {
  // Always remount: query flags (?arch/?bge/?build/…) live in the hash and must re-apply.
  document.body.dataset.route = route;
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
    else if (route === "wanshou") unmount = mountWanshou(app);
    else unmount = mountHakka(app);
  } catch (err) {
    console.warn("mount failed", route, err);
  }
  if (getLang() === "en") startEnContent();
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
  if (mute) {
    mute.textContent = ambience.muted ? t("chrome.muteOff") : t("chrome.muteOn");
    mute.classList.toggle("is-on", !ambience.muted);
  }
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
      <button type="button" class="mute is-on" data-mute>${t("chrome.muteOn")}</button>
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
      // Back to Chinese: reload so every translated node returns to its original text.
      if (getLang() === "zh") {
        location.reload();
        return;
      }
      paintChrome(bar);
      // Remount current route so Ask / audit / sys chrome pick up strings, then translate content.
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      startEnContent();
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


/** Browsers block AudioContext until a gesture; unlock once then re-apply current bed. */
function armAmbienceGesture(): void {
  const once = () => {
    window.removeEventListener("pointerdown", once, true);
    window.removeEventListener("keydown", once, true);
    window.removeEventListener("touchstart", once, true);
    void ambience.afterUserGesture();
  };
  window.addEventListener("pointerdown", once, true);
  window.addEventListener("keydown", once, true);
  window.addEventListener("touchstart", once, true);
}

window.addEventListener("hashchange", () => mount(parseRoute(location.hash)));
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") location.hash = "#/";
  if (e.key === "1") location.hash = "#/ciyu";
  if (e.key === "2") location.hash = "#/gexu";
  if (e.key === "3") location.hash = "#/kejia";
  if (e.key === "4") location.hash = "#/wanshou";
});

boot();
ensureChrome();
armAmbienceGesture();
mountEngineHud();
mount(parseRoute(location.hash));
if (getLang() === "en") startEnContent();
